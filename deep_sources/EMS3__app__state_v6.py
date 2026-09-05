from __future__ import annotations
import copy, hashlib, json, uuid, re
from urllib.parse import urlparse, parse_qs
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from .config import APP_VERSION, DEFAULT_SETTINGS, ROOT_FOLDER_ID
from .editorial_schema.migrations import TARGET_SCHEMA_VERSION, migrate_settings
from .paths import (local_editorial_state_path, local_state_meta_path, editorial_journal_path, portable_editorial_state_path, portable_state_meta_path,
                    history_dir, history_export_path, portable_history_dir, device_identity_path, conflicts_dir)
from .github_v6 import GitHubV6, GitHubError, STATE_PATH
from .cloud_activity import append_activity, make_event
from .core_logging import write_log
from .drive_v6 import natural_key
from .routes import canonical_slug, normalize_site_routes
from .seo import normalize_seo_settings

class StateError(RuntimeError): pass

def merge(base:dict,incoming:dict)->dict:
    out=copy.deepcopy(base)
    for k,v in (incoming or {}).items():
        if isinstance(v,dict) and isinstance(out.get(k),dict): out[k]=merge(out[k],v)
        else: out[k]=copy.deepcopy(v)
    return out



def _normalize_immersive(site_builder:dict)->None:
    raw=site_builder.get('immersive') if isinstance(site_builder.get('immersive'),dict) else {}
    quality=str(raw.get('quality') or 'auto').strip().lower()
    if quality not in {'auto','high','medium','low','fallback'}: quality='auto'
    try: intensity=max(.2,min(1.5,float(raw.get('intensity',1.0))))
    except Exception: intensity=1.0
    site_builder['immersive']={
        'enabled':raw.get('enabled') is not False,
        'runtime_version':'3.1',
        'visual_proof':raw.get('visual_proof') is not False,
        'quality':quality,
        'intensity':intensity,
        'glb_asset_id':str(raw.get('glb_asset_id') or 'studio-orbit-dish').strip() or 'studio-orbit-dish',
        'debug':raw.get('debug') is True,
        'fallback':raw.get('fallback') is not False,
    }

def _normalize_site_tree(site_builder:dict)->None:
    """Keep legacy saves aligned with the current system navigation tree.

    Older portable/editorial states store ``site_tree.nodes`` as a full list, so
    a normal deep merge cannot add system panels introduced by later releases.
    Merge known nodes by stable id and preserve extension nodes instead.
    """
    default_tree=copy.deepcopy((DEFAULT_SETTINGS.get('site_builder') or {}).get('site_tree') or {})
    previous=site_builder.get('site_tree') if isinstance(site_builder.get('site_tree'),dict) else {}
    default_nodes=[row for row in default_tree.get('nodes') or [] if isinstance(row,dict) and row.get('id')]
    previous_nodes=[row for row in previous.get('nodes') or [] if isinstance(row,dict) and row.get('id')]
    by_id={str(row.get('id')):row for row in previous_nodes}
    default_ids={str(row.get('id')) for row in default_nodes}
    nodes=[]
    for source in default_nodes:
        node=merge(source,by_id.get(str(source.get('id')),{}))
        # Structural ownership stays with the application; labels/order may be
        # retained from the save, but a stale state cannot redirect a system node.
        for field in ('id','parent_id','kind'):
            if field in source: node[field]=source[field]
        if source.get('tab'): node['tab']=source['tab']
        nodes.append(node)
    retired={'categories-projects','categories-drive','project-template','project-presentation'}
    for row in previous_nodes:
        node_id=str(row.get('id') or '')
        if node_id and node_id not in default_ids and node_id not in retired:
            nodes.append(copy.deepcopy(row))
    tree=merge(default_tree,previous)
    tree['root_id']=str(default_tree.get('root_id') or 'site')
    tree['nodes']=nodes
    try: tree['version']=max(int(default_tree.get('version') or 1),int(previous.get('version') or 1))
    except Exception: tree['version']=int(default_tree.get('version') or 1)
    site_builder['site_tree']=tree

SHARED_PAGE_BLOCK_TYPES = {'text','process','accordion','cta','spacer','full_media','editorial_gallery','related_projects','quote_cta'}
SERVICE_BLOCK_EXTENSIONS = {'service_hero','service_benefits','service_deliverables','service_pricing'}
SERVICE_BLOCK_TYPES = SHARED_PAGE_BLOCK_TYPES | SERVICE_BLOCK_EXTENSIONS
LEGACY_SERVICE_BLOCK_TYPE_MAP = {
    'service_overview':'text','service_process':'process','service_faq':'accordion','service_cta':'cta','media':'full_media','service_gallery':'editorial_gallery'
}

def _default_service_blocks(category:dict,item:dict)->list[dict]:
    """V7.9.7.1: services use the shared page-block schema; commercial-only blocks stay extensions."""
    prefix=canonical_slug(item.get('id') or item.get('title') or 'servico','servico')
    return [
        {'id':f'{prefix}-hero','type':'service_hero','visible':True,'label':'Hero comercial','section_width':'full','section_size':'large','section_background':'none'},
        {'id':f'{prefix}-overview','type':'text','visible':True,'label':'Descrição','eyebrow':'Sobre o serviço','title':'','body':'','section_width':'content','section_size':'normal','section_background':'none'},
        {'id':f'{prefix}-benefits','type':'service_benefits','visible':bool(item.get('benefits')),'label':'Benefícios','eyebrow':'Benefícios','title':'Por que este serviço','body':'','items':[],'section_width':'content','section_size':'normal','section_background':'surface'},
        {'id':f'{prefix}-deliverables','type':'service_deliverables','visible':True,'label':'Entregáveis','eyebrow':'Entregáveis','title':'O que está incluído','body':'','items':[],'section_width':'content','section_size':'normal','section_background':'none'},
        {'id':f'{prefix}-pricing','type':'service_pricing','visible':True,'label':'Preço, prazo e revisões','eyebrow':'Investimento','title':'Escopo comercial','body':'','section_width':'content','section_size':'normal','section_background':'surface'},
        {'id':f'{prefix}-process','type':'process','visible':True,'label':'Processo','eyebrow':'Processo','title':'Como o projeto acontece','body':'','section_width':'content','section_size':'normal','section_background':'none'},
        {'id':f'{prefix}-cases','type':'related_projects','visible':bool(item.get('related_projects')),'label':'Cases relacionados','eyebrow':'Cases','title':'Projetos relacionados','body':'','items':copy.deepcopy(item.get('related_projects') or []),'section_width':'wide','section_size':'normal','section_background':'none','columns':'3','max_items':6,'card_style':'editorial','show_category':True},
        {'id':f'{prefix}-cta','type':'cta','visible':True,'label':'CTA','eyebrow':'Vamos conversar','title':'Pronto para começar?','body':'Conte o que você precisa e receba uma proposta adequada ao projeto.','button_label':'','button_url':'','section_width':'content','section_size':'normal','section_background':'accent'},
    ]

def _normalize_service_blocks(category:dict,item:dict)->None:
    raw=item.get('blocks')
    blocks=_default_service_blocks(category,item) if not isinstance(raw,list) else copy.deepcopy(raw)
    normalized=[]; seen=set()
    for index,source in enumerate(blocks):
        if not isinstance(source,dict): continue
        block=copy.deepcopy(source); legacy_type=str(block.get('type') or 'text').strip(); block_type=LEGACY_SERVICE_BLOCK_TYPE_MAP.get(legacy_type,legacy_type)
        if block_type not in SERVICE_BLOCK_TYPES: block_type='text'
        block['type']=block_type
        block_id=str(block.get('id') or f"{canonical_slug(item.get('id') or 'servico','servico')}-block-{index+1}").strip()
        if block_id in seen: block_id=f'{block_id}-{index+1}'
        seen.add(block_id); block['id']=block_id
        block['order']=int(block.get('order') or ((index+1)*10)); block['visible']=block.get('visible') is not False
        if 'desktop_visible' in source: block['desktop_visible']=source.get('desktop_visible') is not False
        else: block.pop('desktop_visible',None)
        if 'mobile_visible' in source: block['mobile_visible']=source.get('mobile_visible') is not False
        else: block.pop('mobile_visible',None)
        block['label']=str(block.get('label') or block_type.replace('_',' ').title())
        for field in ('eyebrow','title','body','button_label','button_url','media_id','caption','service_id','quote_action_label'):
            block[field]=str(block.get(field) or '')
        widths={'full','wide','content','narrow','contained'}; sizes={'compact','normal','large','viewport'}; backgrounds={'none','surface','accent','accent-soft','dark'}
        block['section_width']=str(block.get('section_width') or 'content') if str(block.get('section_width') or 'content') in widths else 'content'
        block['section_size']=str(block.get('section_size') or 'normal') if str(block.get('section_size') or 'normal') in sizes else 'normal'
        block['section_background']=str(block.get('section_background') or 'none') if str(block.get('section_background') or 'none') in backgrounds else 'none'
        if 'mobile_section_width' in source and str(source.get('mobile_section_width') or 'auto')!='auto': block['mobile_section_width']=str(source.get('mobile_section_width')) if str(source.get('mobile_section_width')) in {'full','contained'} else 'auto'
        else: block.pop('mobile_section_width',None)
        if 'mobile_section_size' in source and str(source.get('mobile_section_size') or 'inherit')!='inherit': block['mobile_section_size']=str(source.get('mobile_section_size')) if str(source.get('mobile_section_size')) in {'compact','normal','large'} else 'inherit'
        else: block.pop('mobile_section_size',None)
        items=block.get('items') if isinstance(block.get('items'),list) else []
        # Legacy service process/FAQ data is moved into the same body syntax used by Page Builder.
        if legacy_type=='service_process' and not block['body']:
            block['body']='\n'.join(f"{str(value).strip()} |" for value in items if str(value).strip())
        elif legacy_type=='service_faq' and not block['body']:
            lines=[]
            for row in items:
                if isinstance(row,dict):
                    q=str(row.get('question') or row.get('q') or '').strip(); a=str(row.get('answer') or row.get('a') or '').strip()
                    if q or a: lines.append(f'{q} | {a}')
                elif str(row).strip(): lines.append(f'{str(row).strip()} |')
            block['body']='\n'.join(lines)
        if block_type in {'service_benefits','service_deliverables'}:
            block['items']=[str(value).strip() for value in items if str(value).strip()]
        elif block_type=='quote_cta':
            block['service_id']=str(block.get('service_id') or item.get('id') or '').strip()
            block['quote_action_label']=str(block.get('quote_action_label') or block.get('button_label') or 'Adicionar ao orçamento').strip()
            block['items']=[]
        elif block_type=='related_projects':
            related=[]; related_seen=set()
            for row in items:
                if isinstance(row,dict):
                    project_id=str(row.get('project_id') or row.get('id') or '').strip()
                    if not project_id or project_id in related_seen: continue
                    related_seen.add(project_id)
                    related.append({'id':str(row.get('id') or f'related-{len(related)+1}'),'project_id':project_id,'title':str(row.get('title') or '').strip(),'description':str(row.get('description') or '').strip(),'action_label':str(row.get('action_label') or '').strip()})
                elif str(row).strip() and str(row).strip() not in related_seen:
                    project_id=str(row).strip(); related_seen.add(project_id); related.append({'id':f'related-{len(related)+1}','project_id':project_id,'title':'','description':'','action_label':''})
            block['items']=related[:24]
            block['columns']=str(block.get('columns') or '3') if str(block.get('columns') or '3') in {'2','3','4'} else '3'
            block['max_items']=max(1,min(24,int(block.get('max_items') or 6)))
            block['card_style']=str(block.get('card_style') or 'editorial') if str(block.get('card_style') or 'editorial') in {'editorial','cover','minimal'} else 'editorial'
            block['show_category']=block.get('show_category') is not False
        else:
            block['items']=copy.deepcopy(items)
        media_ids=block.get('media_ids') if isinstance(block.get('media_ids'),list) else []
        block['media_ids']=[str(value).strip() for value in media_ids if str(value).strip()][:24]
        normalized.append(block)
    # V7.9.8.0: every service has a relation slot without forcing visible content.
    if not any(str(block.get('type') or '')=='related_projects' for block in normalized):
        prefix=canonical_slug(item.get('id') or item.get('title') or 'servico','servico')
        cta_order=next((int(block.get('order') or 9999) for block in normalized if block.get('type')=='cta'),9999)
        normalized.append({'id':f'{prefix}-cases','type':'related_projects','visible':bool(item.get('related_projects')),'label':'Cases relacionados','eyebrow':'Cases','title':'Projetos relacionados','body':'','button_label':'','button_url':'','media_id':'','caption':'','service_id':'','quote_action_label':'','items':copy.deepcopy(item.get('related_projects') or []),'media_ids':[],'section_width':'wide','section_size':'normal','section_background':'none','columns':'3','max_items':6,'card_style':'editorial','show_category':True,'order':max(10,cta_order-5)})
    item['blocks']=sorted(normalized,key=lambda block:(int(block.get('order') or 0),str(block.get('id') or '')))
    related_block=next((block for block in item['blocks'] if block.get('type')=='related_projects'),None)
    item['related_projects']=copy.deepcopy((related_block or {}).get('items') or [])
    item['blocks_version']=3

def _normalize_services(site_builder:dict)->None:
    services=dict(site_builder.get('services') or {})
    services['visible']=services.get('visible') is not False
    services['show_on_home']=services.get('show_on_home') is not False
    services['slug']=canonical_slug(services.get('slug') or 'servicos','servicos')
    services['layout_style']=str(services.get('layout_style') or 'editorial') if str(services.get('layout_style') or 'editorial') in {'editorial','showcase','catalog'} else 'editorial'
    services['catalog_density']=str(services.get('catalog_density') or 'comfortable') if str(services.get('catalog_density') or 'comfortable') in {'comfortable','compact'} else 'comfortable'
    services['cover_ratio']=str(services.get('cover_ratio') or 'portrait') if str(services.get('cover_ratio') or 'portrait') in {'portrait','square','wide'} else 'portrait'
    for field in ('show_prices','show_deliverables','show_deadlines','show_revisions','process_visible','brief_visible'):
        services[field]=services.get(field) is not False
    brief_button=str(services.get('brief_button') or '').strip()
    services['brief_button']='Abrir orçamento' if not brief_button or brief_button=='Enviar solicitação no WhatsApp' else brief_button
    services['quote_enabled']=services.get('quote_enabled',services.get('brief_visible',True)) is not False
    services['quote_show_estimate']=services.get('quote_show_estimate') is not False
    services['quote_show_deadline']=services.get('quote_show_deadline') is not False
    services['quote_show_revisions']=services.get('quote_show_revisions') is not False
    try: services['quote_state_version']=max(1,int(services.get('quote_state_version') or 1))
    except (TypeError,ValueError): services['quote_state_version']=1
    quote_text_defaults={
        'quote_title':'Seu orçamento',
        'quote_intro':'Revise os serviços, quantidades e referências antes de enviar o briefing.',
        'quote_finish_label':'Enviar solicitação',
        'quote_whatsapp_intro':str(services.get('whatsapp_message') or 'Olá! Gostaria de solicitar um orçamento.'),
        'quote_dock_label':'Orçamento',
        'quote_item_action_label':'Adicionar ao orçamento',
        'quote_case_action_label':'Quero algo semelhante',
    }
    for field,default in quote_text_defaults.items(): services[field]=str(services.get(field) or default).strip()
    if services.get('quote_finish_label')=='Finalizar pelo WhatsApp': services['quote_finish_label']='Enviar solicitação'
    offer=dict(services.get('offer_notification') or {})
    offer['enabled']=offer.get('enabled') is True
    try: offer['delay_seconds']=max(0,min(300,int(float(offer.get('delay_seconds',8)))))
    except (TypeError,ValueError): offer['delay_seconds']=8
    offer['title']=str(offer.get('title') or 'Gostou deste projeto?').strip()
    offer['message']=str(offer.get('message') or 'Podemos criar algo semelhante para sua marca.').strip()
    offer['cta_label']=str(offer.get('cta_label') or 'Solicitar orçamento').strip()
    offer['cta_target']=str(offer.get('cta_target') or 'quote') if str(offer.get('cta_target') or 'quote') in {'quote','services','related_service'} else 'quote'
    offer['position']=str(offer.get('position') or 'bottom_right') if str(offer.get('position') or 'bottom_right') in {'bottom_left','bottom_right','top_left','top_right'} else 'bottom_right'
    offer['dismissible']=offer.get('dismissible') is not False
    offer['frequency']=str(offer.get('frequency') or 'once_per_session') if str(offer.get('frequency') or 'once_per_session') in {'once_per_session','once_per_page','every_hours','every_days'} else 'once_per_session'
    try: offer['frequency_value']=max(1,min(365,int(float(offer.get('frequency_value',24)))))
    except (TypeError,ValueError): offer['frequency_value']=24
    allowed_pages={'home','project','services','service','category','custom'}
    raw_pages=offer.get('pages') if isinstance(offer.get('pages'),list) else ['home','project','services','service','category','custom']
    offer['pages']=[value for value in dict.fromkeys(str(value).strip() for value in raw_pages) if value in allowed_pages] or ['home','project','services','service','category','custom']
    offer['related_service_id']=str(offer.get('related_service_id') or '').strip()
    offer['use_theme_colors']=offer.get('use_theme_colors') is not False
    for field in ('background_color','text_color','accent_color'):
        value=str(offer.get(field) or '').strip()
        offer[field]=value if (len(value)==7 and value.startswith('#')) else ''
    services['offer_notification']=offer
    steps=services.get('process_steps') if isinstance(services.get('process_steps'),list) else []
    services['process_steps']=[str(value).strip() for value in steps if str(value).strip()][:6]
    categories=services.get('categories') if isinstance(services.get('categories'),list) else []
    normalized=[]; category_ids=set()
    for category_index,raw_category in enumerate(categories):
        if not isinstance(raw_category,dict): continue
        category=copy.deepcopy(raw_category)
        category_id=str(category.get('id') or f'service-category-{category_index+1}').strip()
        if category_id in category_ids: category_id=f'{category_id}-{category_index+1}'
        category_ids.add(category_id); category['id']=category_id
        category['order']=int(category.get('order') or ((category_index+1)*10))
        category['visible']=category.get('visible') is not False
        category['featured']=bool(category.get('featured'))
        category['title']=str(category.get('title') or 'Área de serviço')
        category['short_title']=str(category.get('short_title') or category['title'])
        category['description']=str(category.get('description') or '')
        category['cover_media_id']=str(category.get('cover_media_id') or '')
        category['show_cover']=category.get('show_cover') is not False
        # V7.12.20 Stage 2 / ADR-005: service category covers are explicit only.
        # Legacy states may still carry auto_cover=true, but canonical normalization
        # removes the field so it can never reactivate Portfolio-derived fallback.
        category.pop('auto_cover', None)
        category['cover_fit']=str(category.get('cover_fit') or 'cover') if str(category.get('cover_fit') or 'cover') in {'cover','contain'} else 'cover'
        try: category['cover_position_x']=max(0,min(100,int(float(category.get('cover_position_x',50)))))
        except (TypeError,ValueError): category['cover_position_x']=50
        try: category['cover_position_y']=max(0,min(100,int(float(category.get('cover_position_y',50)))))
        except (TypeError,ValueError): category['cover_position_y']=50
        try: category['overlay_strength']=max(0.0,min(0.85,float(category.get('overlay_strength',0.38))))
        except (TypeError,ValueError): category['overlay_strength']=0.38
        category['text_alignment']=str(category.get('text_alignment') or 'left') if str(category.get('text_alignment') or 'left') in {'left','center','right'} else 'left'
        category['visual_height']=str(category.get('visual_height') or 'large') if str(category.get('visual_height') or 'large') in {'compact','medium','large'} else 'large'
        raw_items=category.get('services') if isinstance(category.get('services'),list) else []
        items=[]; item_ids=set()
        for item_index,raw_item in enumerate(raw_items):
            if not isinstance(raw_item,dict): continue
            item=copy.deepcopy(raw_item)
            item_id=str(item.get('id') or f'{category_id}-item-{item_index+1}').strip()
            if item_id in item_ids: item_id=f'{item_id}-{item_index+1}'
            item_ids.add(item_id); item['id']=item_id
            item['order']=int(item.get('order') or ((item_index+1)*10))
            item['visible']=item.get('visible') is not False
            item['featured']=bool(item.get('featured'))
            item['title']=str(item.get('title') or 'Serviço')
            item['description']=str(item.get('description') or '')
            item['slug']=canonical_slug(item.get('slug') or item['title'], canonical_slug(item_id,'servico'))
            item['page_enabled']=item.get('page_enabled') is not False
            item['cover_media_id']=str(item.get('cover_media_id') or '')
            item['page_eyebrow']=str(item.get('page_eyebrow') or category.get('short_title') or category.get('title') or 'Serviço')
            item['page_title']=str(item.get('page_title') or item['title'])
            item['page_intro']=str(item.get('page_intro') or item['description'])
            item['cta_label']=str(item.get('cta_label') or 'Solicitar orçamento')
            item['price_type']=str(item.get('price_type') or 'from') if str(item.get('price_type') or 'from') in {'from','fixed','quote'} else 'from'
            try: item['price']=max(0,float(item.get('price') or 0))
            except (TypeError,ValueError): item['price']=0
            item['unit']=str(item.get('unit') or '')
            item['deadline']=str(item.get('deadline') or '')
            try: item['revisions']=max(0,int(item.get('revisions') or 0))
            except (TypeError,ValueError): item['revisions']=0
            packages=[]; package_ids=set()
            for package_index,raw_package in enumerate(item.get('packages') if isinstance(item.get('packages'),list) else []):
                if not isinstance(raw_package,dict): continue
                label=str(raw_package.get('label') or raw_package.get('name') or '').strip()
                if not label: continue
                package_id=canonical_slug(raw_package.get('id') or label,f'pacote-{package_index+1}')
                if package_id in package_ids: package_id=f'{package_id}-{package_index+1}'
                package_ids.add(package_id)
                price_type=str(raw_package.get('price_type') or 'fixed')
                if price_type not in {'from','fixed','quote'}: price_type='fixed'
                try: package_price=max(0,float(raw_package.get('price') or 0))
                except (TypeError,ValueError): package_price=0
                raw_package_revisions=raw_package.get('revisions')
                package_revisions=None
                if raw_package_revisions not in (None,''):
                    try: package_revisions=max(0,int(raw_package_revisions))
                    except (TypeError,ValueError): package_revisions=None
                package_deliverables=raw_package.get('deliverables') if isinstance(raw_package.get('deliverables'),list) else []
                packages.append({
                    'id':package_id,'label':label,'price_type':price_type,'price':package_price,
                    'unit':str(raw_package.get('unit') or item.get('unit') or '').strip(),
                    'description':str(raw_package.get('description') or '').strip(),
                    'deadline':str(raw_package.get('deadline') or '').strip(),
                    'revisions':package_revisions,
                    'deliverables':[str(value).strip() for value in package_deliverables if str(value).strip()][:16],
                })
            item['packages']=packages[:12]
            deliverables=item.get('deliverables') if isinstance(item.get('deliverables'),list) else []
            item['deliverables']=[str(value).strip() for value in deliverables if str(value).strip()]
            benefits=item.get('benefits') if isinstance(item.get('benefits'),list) else []
            item['benefits']=[str(value).strip() for value in benefits if str(value).strip()]
            process_steps=item.get('process_steps') if isinstance(item.get('process_steps'),list) else []
            item['process_steps']=[str(value).strip() for value in process_steps if str(value).strip()][:8]
            faq=item.get('faq') if isinstance(item.get('faq'),list) else []
            item['faq']=[{'question':str(row.get('question') or '').strip(),'answer':str(row.get('answer') or '').strip()} for row in faq if isinstance(row,dict) and (str(row.get('question') or '').strip() or str(row.get('answer') or '').strip())][:12]
            _normalize_service_blocks(category,item)
            items.append(item)
        category['services']=sorted(items,key=lambda item:(int(item.get('order') or 0),item.get('title','').casefold()))
        normalized.append(category)
    services['categories']=sorted(normalized,key=lambda category:(int(category.get('order') or 0),category.get('title','').casefold()))
    site_builder['services']=services

def _ensure_services_menu(site_builder:dict)->None:
    """Ensure the Services route exists without overwriting editorial menu visibility.

    V7.12.13 makes ``global.header.menu_items`` the canonical editorial source.
    Services can remain published while the user intentionally hides its menu item.
    """
    services=site_builder.get('services') or {}
    global_config=site_builder.setdefault('global',{})
    header=global_config.setdefault('header',{})
    menu=header.get('menu_items') if isinstance(header.get('menu_items'),list) else []
    service_item=next((item for item in menu if isinstance(item,dict) and str(item.get('id') or '')=='services'),None)
    target=f"/{str(services.get('slug') or 'servicos').strip('/')}/"
    if service_item is None:
        menu.append({
            'id':'services',
            'label':str(services.get('menu_label') or 'Serviços'),
            'target':target,
            'visible':services.get('visible') is not False,
            'order':15,
        })
    else:
        service_item['target']=target
        service_item['label']=str(service_item.get('label') or services.get('menu_label') or 'Serviços')
        if 'visible' not in service_item:
            service_item['visible']=services.get('visible') is not False
    header['menu_items']=menu

def _safe_menu_target(value:str,fallback:str='#')->str:
    raw=str(value or '').strip()
    if not raw:
        return fallback
    parsed=urlparse(raw)
    if parsed.scheme:
        if parsed.scheme.lower() in {'http','https'} and parsed.netloc:
            return raw
        return fallback
    if raw.startswith(('/', '#')):
        return raw
    return fallback

def _normalize_header_menu(site_builder:dict)->None:
    """NAV-001 canonical menu sanitizer without structural injection.

    ``global.header.menu_items`` is the editorial owner. DEFAULT_SETTINGS is only
    used by the normal ``merge`` migration when an old save has no menu field at
    all. Once a save contains a menu list (including an intentionally empty list),
    normalization preserves its ids, labels, targets, order, visibility and
    parent relationships. No Services/custom-page/theme route is auto-injected.
    """
    global_config=site_builder.setdefault('global',{})
    header=global_config.setdefault('header',{})
    raw=header.get('menu_items') if isinstance(header.get('menu_items'),list) else []
    normalized=[]; seen=set()
    for index,source in enumerate(raw):
        if not isinstance(source,dict):
            continue
        item=copy.deepcopy(source)
        item_id=str(item.get('id') or '').strip()
        if not item_id or item_id in seen:
            continue
        seen.add(item_id)
        raw_target=str(item.get('target') or '')
        valid_target=bool(_safe_menu_target(raw_target,'')) and item.get('target_valid',True) is not False
        try: order=int(item.get('order'))
        except (TypeError,ValueError): order=(index+1)*10
        item.update({
            'id':item_id,
            'label':str(item.get('label') if item.get('label') is not None else ''),
            'target':raw_target,
            'visible':item.get('visible') is not False,
            'order':order,
            'parent_id':str(item.get('parent_id') or ''),
            'target_valid':valid_target,
        })
        normalized.append(item)
    header['menu_schema_version']=2
    header['menu_items']=normalized

def _sync_legacy_navigation_from_menu(site_builder:dict)->None:
    """Mirror canonical menu values into legacy fields for old editor controls only."""
    header=((site_builder.get('global') or {}).get('header') or {})
    menu=header.get('menu_items') if isinstance(header.get('menu_items'),list) else []
    by_id={str(item.get('id') or ''):item for item in menu if isinstance(item,dict)}
    navigation=site_builder.setdefault('navigation',{})
    for item_id,label_key,visible_key in (
        ('projects','projects_label','projects_visible'),
        ('about','about_label','about_visible'),
        ('contact','contact_label','contact_visible'),
    ):
        item=by_id.get(item_id)
        if not item:
            continue
        navigation[label_key]=str(item.get('label') or navigation.get(label_key) or '').strip()
        navigation[visible_key]=item.get('visible') is not False
    if by_id.get('services') is not None:
        navigation['show_services_link']=by_id['services'].get('visible') is not False
    if by_id.get('contact') is not None:
        navigation['show_contact_link']=by_id['contact'].get('visible') is not False


FLOATING_CONTROL_POSITIONS = {'bottom_left','bottom_right','top_left','top_right'}
FLOATING_CONTROL_STYLES = {'theme','accent','minimal','custom'}
FLOATING_CONTROL_SHAPES = {'pill','rounded','square','circle'}

def _normalize_floating_controls(site_builder:dict, source_controls:dict|None=None)->None:
    """ADR-006: normalize independent Menu/WhatsApp/Quote presentation state.

    Old saves used one ``navigation.floating_*`` group. That group is migration
    input only; the public renderer reads ``site_builder.floating_controls``.
    Legacy mirrors remain for old editor/state compatibility but are never the
    authority for public placement.
    """
    navigation=site_builder.setdefault('navigation',{})
    services=site_builder.setdefault('services',{})
    source=source_controls if isinstance(source_controls,dict) else {}
    legacy_position='bottom_right' if str(navigation.get('floating_position') or '').lower()=='right' else 'bottom_left'
    try: legacy_size=max(32,min(72,int(float(navigation.get('floating_button_size') or 42))))
    except (TypeError,ValueError): legacy_size=42

    legacy={
        'menu':{
            'visible':navigation.get('side_menu_enabled') is not False,
            'position':legacy_position,'offset_x':0,'offset_y':0,'size':legacy_size,
            'label':str(navigation.get('menu_label') or 'Menu'),'style':'theme','shape':'pill','background_color':'','foreground_color':'','border_color':'',
        },
        'whatsapp':{
            'visible':navigation.get('floating_whatsapp_visible') is not False,
            'position':legacy_position,'offset_x':0,'offset_y':0,'size':legacy_size,
            'label':str(navigation.get('floating_whatsapp_label') or 'WhatsApp'),'style':'theme','shape':'circle','background_color':'#25D366','foreground_color':'#FFFFFF','border_color':'#25D366','display_mode':'icon',
            'number':str(navigation.get('floating_whatsapp_number') or ''),
            'message':str(navigation.get('floating_whatsapp_message') or ''),
        },
        'quote':{
            'visible':True,'position':legacy_position,'offset_x':0,'offset_y':0,'size':legacy_size,
            'label':str(services.get('quote_dock_label') or 'Orçamento'),'style':'theme','shape':'pill','background_color':'','foreground_color':'','border_color':'','show_icon':True,
        },
    }

    def number(value,default,minimum,maximum):
        try: return max(minimum,min(maximum,int(round(float(value)))))
        except (TypeError,ValueError): return default
    def control(name):
        fallback=legacy[name]
        raw=source.get(name) if isinstance(source.get(name),dict) else {}
        position=str(raw.get('position') or fallback['position'])
        if position not in FLOATING_CONTROL_POSITIONS: position=fallback['position']
        style=str(raw.get('style') or fallback['style'])
        if style not in FLOATING_CONTROL_STYLES: style='theme'
        shape=str(raw.get('shape') or fallback.get('shape') or ('circle' if name=='whatsapp' else 'pill'))
        if shape not in FLOATING_CONTROL_SHAPES: shape='circle' if name=='whatsapp' else 'pill'
        def color(value):
            value=str(value or '').strip()
            return value if (not value or re.fullmatch(r'#[0-9A-Fa-f]{6}',value)) else ''
        row={
            'visible':raw.get('visible',fallback['visible']) is not False,
            'position':position,
            'offset_x':number(raw.get('offset_x',fallback.get('offset_x',0)),0,-240,240),
            'offset_y':number(raw.get('offset_y',fallback.get('offset_y',0)),0,-240,240),
            'size':number(raw.get('size',fallback.get('size',42)),42,32,72),
            'label':str(raw.get('label') or fallback.get('label') or name.title()).strip() or str(fallback.get('label') or name.title()),
            'style':style,
            'shape':shape,
            'background_color':color(raw.get('background_color',fallback.get('background_color',''))),
            'foreground_color':color(raw.get('foreground_color',fallback.get('foreground_color',''))),
            'border_color':color(raw.get('border_color',fallback.get('border_color',''))),
        }
        if name=='whatsapp':
            row['display_mode']='label' if str(raw.get('display_mode') or fallback.get('display_mode') or 'icon')=='label' else 'icon'
            row['number']=''.join(ch for ch in str(raw.get('number',fallback.get('number','')) or '') if ch.isdigit())
            row['message']=str(raw.get('message',fallback.get('message','')) or '')
        if name=='quote': row['show_icon']=raw.get('show_icon',fallback.get('show_icon',True)) is not False
        return row

    controls={name:control(name) for name in ('menu','whatsapp','quote')}
    site_builder['floating_controls']=controls

    # Compatibility mirrors only. Public rendering must not read shared
    # navigation.floating_position/button_size/gap as placement authority.
    menu=controls['menu']; whatsapp=controls['whatsapp']; quote=controls['quote']
    navigation['side_menu_enabled']=menu['visible']
    navigation['menu_label']=menu['label']
    navigation['floating_whatsapp_visible']=whatsapp['visible']
    navigation['floating_whatsapp_label']=whatsapp['label']
    navigation['floating_whatsapp_number']=whatsapp['number']
    navigation['floating_whatsapp_message']=whatsapp['message']
    services['quote_dock_label']=quote['label']

def _version_tuple(value:str)->tuple[int, ...]:
    try:
        return tuple(int(part) for part in str(value or '').split('.') if part != '')
    except Exception:
        return ()

def _youtube_video_id(value:str)->str:
    raw=str(value or '').strip()
    if re.fullmatch(r'[A-Za-z0-9_-]{11}',raw):
        return raw
    try: parsed=urlparse(raw)
    except Exception: return ''
    host=str(parsed.hostname or '').lower()
    if host.startswith('www.'): host=host[4:]
    if host.startswith('m.'): host=host[2:]
    video_id=''
    if host=='youtu.be':
        video_id=next((part for part in str(parsed.path or '').split('/') if part),'')
    elif host=='youtube.com' or host.endswith('.youtube.com') or host=='youtube-nocookie.com' or host.endswith('.youtube-nocookie.com'):
        parts=[part for part in str(parsed.path or '').split('/') if part]
        if str(parsed.path or '')=='/watch':
            video_id=(parse_qs(parsed.query).get('v') or [''])[0]
        elif len(parts)>=2 and parts[0] in {'embed','shorts','live'}:
            video_id=parts[1]
    return video_id if re.fullmatch(r'[A-Za-z0-9_-]{11}',video_id or '') else ''

def _safe_youtube_channel_url(value:str)->str:
    raw=str(value or '').strip()
    if not raw: return ''
    try: parsed=urlparse(raw)
    except Exception: return ''
    host=str(parsed.hostname or '').lower()
    if host.startswith('www.'): host=host[4:]
    if host.startswith('m.'): host=host[2:]
    return raw if (parsed.scheme in {'http','https'} and (host=='youtube.com' or host.endswith('.youtube.com'))) else ''

def _normalize_home_youtube_showcase(site_builder:dict, source_app_version:str='')->None:
    """V7.12.15: migrate and sanitize the editable YouTube showcase block.

    Legacy states receive one configured widget immediately after the main Projects
    block. In 7.12.15+ saves, deleting it is respected and it is never recreated.
    Every existing showcase is normalized into a safe video id; arbitrary iframe
    URLs are never exported by the state contract.
    """
    source_version=_version_tuple(source_app_version)
    home=site_builder.setdefault('home',{})
    blocks=home.get('blocks') if isinstance(home.get('blocks'),list) else []
    # V7.12.16 recovery: the showcase is a required installed Home block unless the
    # editor records an explicit tombstone. Version-only migration was fragile: a
    # local state could already report 7.12.15 while missing the block, so preview
    # and publication diverged.
    removed_explicitly=home.get('youtube_showcase_removed') is True
    has_showcase=any(isinstance(block,dict) and str(block.get('type') or '')=='youtube_showcase' for block in blocks)
    if not removed_explicitly and not has_showcase:
        showcase={
            'id':'youtube-showcase-main','type':'youtube_showcase','label':'YouTube Showcase','visible':True,
            'youtube_url':'https://www.youtube.com/watch?v=G_2jdXfXxiI','title':'','body':'',
            'primary_cta_label':'Assistir','youtube_cta_label':'Ver no YouTube','channel_url':'',
            'channel_cta_label':'Conheça o canal','show_external_link':True,'show_channel_link':False,
            'ratio':'16:9','width':'wide','text_align':'left','section_size':'normal',
            'section_width':'wide','section_background':'none',
        }
        blocks=copy.deepcopy(blocks)
        insert_at=next((index+1 for index,block in enumerate(blocks) if isinstance(block,dict) and str(block.get('type') or '')=='projects'),len(blocks))
        blocks.insert(insert_at,showcase)
    normalized=[]
    for source in blocks:
        if not isinstance(source,dict):
            continue
        block=copy.deepcopy(source)
        if str(block.get('type') or '')=='youtube_showcase':
            video_id=_youtube_video_id(block.get('youtube_url') or block.get('video_id'))
            block['video_id']=video_id
            block['youtube_valid']=bool(video_id)
            if video_id and not str(block.get('youtube_url') or '').strip():
                block['youtube_url']=f'https://www.youtube.com/watch?v={video_id}'
            block['channel_url']=_safe_youtube_channel_url(block.get('channel_url'))
            block['show_external_link']=block.get('show_external_link') is not False
            block['show_channel_link']=block.get('show_channel_link') is True
            block['primary_cta_label']=str(block.get('primary_cta_label') or 'Assistir').strip() or 'Assistir'
            block['youtube_cta_label']=str(block.get('youtube_cta_label') or 'Ver no YouTube').strip() or 'Ver no YouTube'
            block['channel_cta_label']=str(block.get('channel_cta_label') or 'Conheça o canal').strip() or 'Conheça o canal'
            block['ratio']=str(block.get('ratio') or '16:9') if str(block.get('ratio') or '16:9') in {'16:9','4:3','1:1'} else '16:9'
            block['width']=str(block.get('width') or 'wide') if str(block.get('width') or 'wide') in {'normal','wide','full'} else 'wide'
        normalized.append(block)
    home['blocks']=normalized
    if any(str(block.get('type') or '')=='youtube_showcase' for block in normalized):
        home['youtube_showcase_removed']=False

def normalize(settings:dict)->dict:
    # Stage 5.5: schema evolution is explicit and deterministic before the
    # historical semantic normalizers run. The migration function always works
    # on a deep copy, so merely opening the editor never mutates caller state.
    incoming=copy.deepcopy(settings or {})
    source_app_version=str(incoming.get('app_version') or '').strip()
    migrated=migrate_settings(incoming,TARGET_SCHEMA_VERSION)
    source_builder=(migrated.get('site_builder') or {}) if isinstance(migrated.get('site_builder'),dict) else {}
    source_floating_controls=copy.deepcopy(source_builder.get('floating_controls')) if isinstance(source_builder.get('floating_controls'),dict) else None
    s=merge(DEFAULT_SETTINGS,migrated)
    s['schema_version']=max(int(s.get('schema_version') or 1),TARGET_SCHEMA_VERSION,int(DEFAULT_SETTINGS.get('schema_version') or 1))
    s['app_version']=APP_VERSION
    ws=dict(s.get('workspace') or {})
    # V6.0.2: the Drive root is real workspace state. Never overwrite a root
    # selected/discovered by the user with the historical default constant.
    ws['drive_root_id']=str(ws.get('drive_root_id') or ROOT_FOLDER_ID).strip()
    ws['drive_root_name']=str(ws.get('drive_root_name') or 'Portfólio Aesthetic').strip()
    s['workspace']=ws
    identity=dict(s.get('identity') or {})
    publication=dict(s.get('publication') or {})
    public_url=str(identity.get('public_url') or '').strip()
    host=urlparse(public_url).hostname if public_url else ''
    activation=dict(publication.get('domain_activation') or {})
    activation_confirmed=bool(activation.get('confirmed'))
    activation_domain=str(activation.get('domain') or '').strip().lower().rstrip('.')
    # V6.3.0 recovery: V6.2.0/6.2.1 could silently migrate the active site to
    # mensagemstudio.shop while that domain was only being discussed/prepared.
    # A non-default host is accepted only after an explicit activation record.
    from .config import PUBLIC_DOMAIN, PUBLIC_URL
    if host and host != PUBLIC_DOMAIN and not (activation_confirmed and activation_domain == host.lower().rstrip('.')):
        identity['public_url']=PUBLIC_URL
        s['identity']=identity
        host=PUBLIC_DOMAIN
        publication['public_domain']=PUBLIC_DOMAIN
        publication.pop('domain_activation', None)
    elif host:
        publication['public_domain']=host
    else:
        identity['public_url']=PUBLIC_URL
        s['identity']=identity
        publication['public_domain']=PUBLIC_DOMAIN
    s['publication']=publication
    site_builder=s.setdefault('site_builder',{})
    # V7.12.17: Portfolio categories belong exclusively to the horizontal
    # navigation in HOME. Legacy `menu` / `sticky` states are migrated to the
    # normal-flow bar so the global Menu can mirror only the editor menu tree.
    filters=((site_builder.setdefault('projects',{})).setdefault('filters',{}))
    source_version=_version_tuple(source_app_version)
    filters['display_mode']='inline'
    navigation=site_builder.setdefault('navigation',{})
    navigation['show_top_link']=False
    navigation['show_home_sections']=False
    navigation['show_drive_sections']=False
    _normalize_home_youtube_showcase(site_builder,source_app_version)
    _normalize_immersive(site_builder)
    _normalize_site_tree(site_builder)
    _normalize_services(site_builder)
    _normalize_floating_controls(site_builder,source_floating_controls)
    normalize_site_routes(site_builder,resolve_conflicts=True)
    normalize_seo_settings(s)
    # NAV-001: no route/service/page is allowed to inject itself into the canonical menu.
    _normalize_header_menu(site_builder)
    _sync_legacy_navigation_from_menu(site_builder)
    return s

def canonical(settings:dict)->bytes:
    s=copy.deepcopy(settings or {}); s.pop('_cloud',None)
    return json.dumps(s,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
def revision(settings:dict)->str: return hashlib.sha256(canonical(settings)).hexdigest()[:20]


def _selection_signature(item:dict)->dict:
    return {
        'id':str((item or {}).get('id') or ''),
        'project_id':str((item or {}).get('project_id') or ''),
        'media_id':str((item or {}).get('media_id') or ''),
        'mobile_media_id':str((item or {}).get('mobile_media_id') or ''),
        'title':str((item or {}).get('title') or ''),
    }

def _editorial_selection_map(settings:dict)->dict:
    """Return user-curated section selections using stable editorial keys.

    This intentionally ignores auto-generated catalog content. It records only
    blocks with explicit ``items`` arrays, so the journal can prove exactly
    which Banners/projects were selected before and after a Save.
    """
    out={}
    builder=(settings or {}).get('site_builder') or {}
    hero=(builder.get('hero') or {}) if isinstance(builder.get('hero'),dict) else {}
    hero_slides=hero.get('slides') or []
    if isinstance(hero_slides,list):
        out['hero:home:slides']=[{
            'id':str((slide or {}).get('id') or ''),
            'project_id':'',
            'media_id':str((slide or {}).get('media_id') or ''),
            'mobile_media_id':str((slide or {}).get('mobile_media_id') or ''),
            'title':'',
        } for slide in hero_slides if isinstance(slide,dict)]
    for section_id,page in ((builder.get('section_pages') or {}).items() if isinstance(builder.get('section_pages'),dict) else []):
        if not isinstance(page,dict): continue
        for block in page.get('blocks') or []:
            if not isinstance(block,dict) or not isinstance(block.get('items'),list): continue
            key=f'section:{section_id}:{block.get("id") or block.get("type") or "block"}'
            out[key]=[_selection_signature(item) for item in block.get('items') or [] if isinstance(item,dict)]
    for block in ((builder.get('home') or {}).get('blocks') or []):
        if not isinstance(block,dict) or not isinstance(block.get('items'),list): continue
        key=f'home:{block.get("id") or block.get("type") or "block"}'
        out[key]=[_selection_signature(item) for item in block.get('items') or [] if isinstance(item,dict)]
    for page_id,page in ((builder.get('custom_pages') or {}).items() if isinstance(builder.get('custom_pages'),dict) else []):
        if not isinstance(page,dict): continue
        for block in page.get('sections') or []:
            if not isinstance(block,dict) or not isinstance(block.get('items'),list): continue
            key=f'custom:{page_id}:{block.get("id") or block.get("type") or "block"}'
            out[key]=[_selection_signature(item) for item in block.get('items') or [] if isinstance(item,dict)]
    return out

def editorial_selection_changes(before:dict,after:dict)->list[dict]:
    old=_editorial_selection_map(before or {}); new=_editorial_selection_map(after or {})
    changes=[]
    for key in sorted(set(old)|set(new)):
        if old.get(key,[])==new.get(key,[]): continue
        scope,page_id,block_id=(key.split(':',2)+['',''])[:3]
        kind='hero-slide-selection' if scope=='hero' and block_id=='slides' else 'section-content-selection'
        changes.append({'kind':kind,'scope':scope,'page_id':page_id,'block_id':block_id,'before':old.get(key,[]),'after':new.get(key,[])})
    return changes

def _parse_iso(value:str):
    raw=str(value or '').strip()
    if not raw: return None
    try:
        return datetime.fromisoformat(raw.replace('Z','+00:00')).astimezone(timezone.utc)
    except Exception:
        return None

def device_identity()->str:
    path=device_identity_path()
    if path.exists():
        value=path.read_text(encoding='utf-8-sig',errors='replace').strip()
        if value: return value
    value='device-'+uuid.uuid4().hex[:16]
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(value+'\n',encoding='utf-8')
    return value

def apply_settings(catalog:dict,settings:dict)->dict:
    result=copy.deepcopy(catalog); folder_settings=settings.get('folders',{}); media_settings=settings.get('projects',{}); project_settings=settings.get('project_sections',{})
    def walk(nodes):
        for idx,node in enumerate(nodes):
            if node.get('type')=='folder':
                d=int(node.get('depth') or 0); f=folder_settings.get(node.get('id'),{}); p=project_settings.get(node.get('id'),{}) if d==2 else {}
                node['title']=p.get('title') or f.get('title') or node.get('name'); node['description']=p.get('description',f.get('description','')); node['visible']=p.get('visible',f.get('visible',True)); node['order']=int(p.get('order',f.get('order',idx))); node['_editor_order_explicit']=('order' in p or 'order' in f); node['featured']=bool(p.get('featured',False)); node['hero']=bool(p.get('hero',False)); node['cover_media_id']=str(p.get('cover_media_id') or ''); node['title_size']=int(p.get('title_size') or 0) if d==2 else 0; node['description_size']=int(p.get('description_size') or 0) if d==2 else 0; node['case_builder']=copy.deepcopy(p.get('case_builder',{})) if d==2 else {}; node['project_entity']=d==2; walk(node.get('children',[]))
            else:
                c=media_settings.get(node.get('id'),{}); node['title']=c.get('title') or node.get('name','').rsplit('.',1)[0]; node['description']=c.get('description',''); node['visible']=c.get('visible',True); node['order']=int(c.get('order',idx)); node['_editor_order_explicit']='order' in c; node['featured']=bool(c.get('featured',False)); node['hero']=bool(c.get('hero',False)); node['collection_id']=str(c.get('collection_id') or ''); node['grid_visible']=bool(c.get('grid_visible',True)); node['gallery_group']=str(c.get('gallery_group') or '').strip(); node['case_builder']=copy.deepcopy(c.get('case_builder',{}))
        nodes.sort(key=lambda n:(n.get('order',999999),natural_key(n.get('title',''))))
    walk(result.get('root',{}).get('children',[])); result['settings_identity']=copy.deepcopy(settings.get('identity',{})); return result

class EditorialStateV6:
    def __init__(self):
        self.settings=normalize({}); self.source='default'; self.cloud_sha=''; self.cloud_commit=''; self.cloud_revision=''; self.cloud_saved=False; self.last_error=''
        self.local_saved=False; self.portable_saved=False; self.portable_error=''
        self.device_id=device_identity(); self.local_saved_at=''; self.cloud_saved_at=''; self.cloud_device_id=''
        self.load_local()

    def _write(self,path:Path,settings:dict):
        path.parent.mkdir(parents=True,exist_ok=True)
        tmp=path.with_suffix(path.suffix+'.tmp')
        tmp.write_text(json.dumps(settings,ensure_ascii=False,indent=2,sort_keys=True),encoding='utf-8')
        tmp.replace(path)

    def _try_portable_write(self,path:Path,settings:dict|None=None,text:str|None=None)->tuple[bool,str]:
        try:
            path.parent.mkdir(parents=True,exist_ok=True)
            if settings is not None: self._write(path,settings)
            else: path.write_text(text or '',encoding='utf-8')
            return True,''
        except Exception as e:
            write_log('editor',f'Cópia portátil não pôde ser atualizada em {path}: {e}')
            return False,str(e)

    def _history(self,settings:dict)->dict:
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ'); rev=revision(settings)
        p=history_dir()/f'{stamp}_{rev}.json'; self._write(p,settings)
        # Best-effort mirror beside the project for users who copy the folder.
        try:
            pp=portable_history_dir()/p.name; self._write(pp,settings)
        except Exception as e:
            write_log('editor',f'Histórico portátil não pôde ser espelhado: {e}')
        return {'path':str(p),'revision':rev,'sha256':hashlib.sha256(canonical(settings)).hexdigest()}

    def preserve_conflict(self,incoming:dict,kind:str,metadata:dict|None=None)->dict:
        """Keep a rejected draft intact before returning a concurrency/route error."""
        stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S.%fZ')
        draft=copy.deepcopy(incoming if isinstance(incoming,dict) else {})
        draft_revision=revision(draft)
        document={
            'format':'studioframe-conflict-v1','kind':str(kind or 'editorial-conflict'),
            'created_at':datetime.now(timezone.utc).isoformat(),'device_id':self.device_id,
            'current_revision':revision(self.settings),'draft_revision':draft_revision,
            'metadata':copy.deepcopy(metadata or {}),'settings':draft,
        }
        path=conflicts_dir()/f'{stamp}_{kind}_{draft_revision}.json'
        self._write(path,document)
        write_log('editor',f'Rascunho de conflito preservado kind={kind} revision={draft_revision}')
        return {'path':str(path),'draft_revision':draft_revision,'current_revision':revision(self.settings)}

    def append_editorial_journal(self,kind:str,status:str,revision_value:str='',details:dict|None=None)->dict:
        event={
            'at':datetime.now(timezone.utc).isoformat(),
            'kind':str(kind or 'editorial-event'),
            'status':str(status or 'info'),
            'revision':str(revision_value or revision(self.settings)),
            'device_id':self.device_id,
            'details':copy.deepcopy(details or {}),
        }
        path=editorial_journal_path(); path.parent.mkdir(parents=True,exist_ok=True)
        with path.open('a',encoding='utf-8') as fh:
            fh.write(json.dumps(event,ensure_ascii=False,sort_keys=True)+'\n')
        return event

    def read_editorial_journal(self,limit:int=80)->list[dict]:
        path=editorial_journal_path()
        if not path.exists(): return []
        rows=[]
        try:
            for line in path.read_text(encoding='utf-8',errors='ignore').splitlines():
                try:
                    row=json.loads(line)
                    if isinstance(row,dict): rows.append(row)
                except Exception: continue
        except Exception: return []
        return rows[-max(1,min(int(limit or 80),300)):][::-1]

    def load_local(self)->dict:
        # LocalAppData is the canonical local state. A portable copy is only a
        # secondary import source so a stale file beside the application cannot
        # overwrite a newer workstation save.
        candidates=[local_editorial_state_path(),portable_editorial_state_path()]
        for p in candidates:
            if p.exists():
                try:
                    obj=json.loads(p.read_text(encoding='utf-8-sig'))
                    if isinstance(obj,dict):
                        self.settings=normalize(obj)
                        self.source='local-cache' if p==local_editorial_state_path() else 'portable-project'
                        self._write(local_editorial_state_path(),self.settings)
                        self.local_saved=True
                        try:
                            meta_path=local_state_meta_path() if local_state_meta_path().exists() else portable_state_meta_path()
                            meta=json.loads(meta_path.read_text(encoding='utf-8-sig')) if meta_path.exists() else {}
                            self.local_saved_at=str((meta or {}).get('saved_at') or '')
                        except Exception:
                            self.local_saved_at=''
                        self.portable_saved=portable_editorial_state_path().exists()
                        return self.payload()
                except Exception as e: self.last_error=str(e)
        self.settings=normalize({}); self.source='default'
        self._write(local_editorial_state_path(),self.settings); self.local_saved=True
        ok,err=self._try_portable_write(portable_editorial_state_path(),settings=self.settings)
        self.portable_saved=ok; self.portable_error=err
        return self.payload()

    def save_local(self,incoming:dict)->dict:
        self.settings=normalize(incoming)
        # This is the only mandatory local write.
        self._write(local_editorial_state_path(),self.settings); self.local_saved=True
        hist=self._history(self.settings)
        ok,err=self._try_portable_write(portable_editorial_state_path(),settings=self.settings)
        self.portable_saved=ok; self.portable_error=err
        saved_at=datetime.now(timezone.utc).isoformat(); self.local_saved_at=saved_at
        meta={'app_version':APP_VERSION,'revision':revision(self.settings),'saved_at':saved_at,'device_id':self.device_id,'history':hist,'local_saved':True,'portable_saved':ok,'portable_error':err}
        try: local_state_meta_path().write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
        except Exception as e: write_log('editor',f'Metadata local não pôde ser atualizada: {e}')
        try: self._try_portable_write(portable_state_meta_path(),text=json.dumps(meta,ensure_ascii=False,indent=2))
        except Exception: pass
        self.source='local-cache'; self.cloud_saved=False
        write_log('editor',f'Estado local salvo revision={meta["revision"]} portable={ok}')
        return {**self.payload(),'history':hist,'local_saved':True,'portable_saved':ok,'portable_error':err,'message':'Projeto salvo localmente.' if ok else 'Projeto salvo localmente; cópia portátil ao lado do programa não pôde ser atualizada.'}

    def local_revision(self)->str:
        """Return the revision actually persisted in the canonical local save."""
        path=local_editorial_state_path()
        if not path.exists(): return ''
        try:
            obj=json.loads(path.read_text(encoding='utf-8-sig'))
            return revision(normalize(obj)) if isinstance(obj,dict) else ''
        except Exception as e:
            raise StateError(f'Não foi possível verificar o save local: {e}') from e

    def assert_local_revision(self,expected_revision:str)->dict:
        expected=str(expected_revision or '').strip()
        actual=self.local_revision()
        if not expected or actual!=expected:
            raise StateError(f'Revisão local divergente: esperado={expected or "vazio"} salvo={actual or "vazio"}. Salve novamente antes de gerar/publicar.')
        return {'ok':True,'revision':actual,'path':str(local_editorial_state_path())}

    def set_drive_root_local(self, root_id:str, root_name:str='')->dict:
        root_id=str(root_id or '').strip()
        if not root_id: raise StateError('ID da pasta raiz do Google Drive está vazio.')
        incoming=copy.deepcopy(self.settings); ws=dict(incoming.get('workspace') or {}); ws['drive_root_id']=root_id
        if root_name: ws['drive_root_name']=str(root_name).strip()
        incoming['workspace']=ws
        return self.save_local(incoming)

    def sync_cloud_current(self, snapshot:dict|None=None, expected_remote_sha:str|None=None)->dict:
        """Persist the already-saved current state to GitHub and verify read-back.

        This method never performs another local save/history write. It is safe
        to run in the background after the editor has already confirmed the
        local save.
        """
        gh=GitHubV6(); snapshot=normalize(copy.deepcopy(snapshot if isinstance(snapshot,dict) else self.settings)); rev=revision(snapshot); saved_at=datetime.now(timezone.utc).isoformat()
        cloud_document=copy.deepcopy(snapshot)
        cloud_document['_cloud']={'format':'studioframe-editorial-v1','revision':rev,'saved_at':saved_at,'device_id':self.device_id,'app_version':APP_VERSION}
        try:
            result=gh.write_json_verified(cloud_document,STATE_PATH,gh.state_branch,expected_sha=expected_remote_sha,message=f'StudioFrame {APP_VERSION}: salva estado editorial {rev}')
        except Exception as e:
            self.last_error=str(e); self.cloud_saved=False
            write_log('github',f'Falha sync cloud: {e}')
            return {'cloud_saved':False,'remote_error':str(e),'ok':False,
                    'message':'GitHub não confirmou a cópia em nuvem.'}
        activity={}
        try: activity=append_activity(make_event('editorial-sync','ok',device_id=self.device_id,revision=rev,details={'commit':result.get('commit_sha','')}),gh)
        except Exception as e: write_log('github',f'Estado salvo, mas atividade online não foi gravada: {e}')
        self.cloud_sha=result['blob_sha']; self.cloud_commit=result['commit_sha']; self.cloud_revision=rev; self.cloud_saved=True; self.cloud_saved_at=saved_at; self.cloud_device_id=self.device_id; self.source='github-cloud'; self.last_error=''
        return {**self.payload(),'cloud_saved':True,'synced_revision':rev,'activity_saved':bool(activity.get('saved')),'ok':True,'message':'Estado salvo no GitHub e verificado por read-back.'}

    def save_cloud(self,incoming:dict|None=None)->dict:
        # Local persistence is always completed first and is never invalidated by
        # a GitHub permission/network failure.
        local=self.save_local(incoming if isinstance(incoming,dict) else self.settings)
        remote=self.sync_cloud_current()
        if not remote.get('cloud_saved'):
            return {**local,'cloud_saved':False,'remote_error':remote.get('remote_error',''),'ok':True,
                    'message':'Projeto salvo localmente. O GitHub não confirmou a cópia em nuvem.'}
        return {**self.payload(),'history':local.get('history'),'local_saved':True,'portable_saved':local.get('portable_saved',False),'portable_error':local.get('portable_error',''),'cloud_saved':True,'ok':True,'message':'Estado salvo no GitHub e verificado por read-back.'}

    def fetch_cloud(self)->dict:
        gh=GitHubV6(); remote=gh.read_json(STATE_PATH,gh.state_branch)
        if not remote.get('exists'): raise StateError('data/editorial-state.json ainda não existe no GitHub.')
        if not isinstance(remote.get('data'),dict): raise StateError('Estado editorial do GitHub é inválido.')
        return remote

    def fetch_cloud_snapshot(self, expected_revision:str='')->dict:
        """Read and validate the authoritative GitHub editorial snapshot.

        V7.12.18 cloud-first contract: Build/Publish never infer truth from the
        workstation cache. They consume the exact state confirmed by GitHub.
        """
        remote=self.fetch_cloud(); document=remote.get('data') or {}; metadata=dict(document.get('_cloud') or {}) if isinstance(document,dict) else {}
        settings=normalize(document); remote_revision=revision(settings); declared=str(metadata.get('revision') or '').strip()
        if declared and declared!=remote_revision:
            raise StateError(f'Estado cloud inconsistente: metadata={declared} conteúdo={remote_revision}.')
        expected=str(expected_revision or '').strip()
        if expected and expected!=remote_revision:
            raise StateError(f'Revisão cloud divergente: esperado={expected} nuvem={remote_revision}. Salve e aguarde a confirmação da nuvem antes de gerar/publicar.')
        return {'settings':settings,'revision':remote_revision,'sha':str(remote.get('sha') or ''),'commit_sha':str(remote.get('commit_sha') or ''),'metadata':metadata}

    def apply_cloud_remote(self,remote:dict,*,record_activity:bool=True)->dict:
        document=remote['data']; metadata=dict(document.get('_cloud') or {}) if isinstance(document,dict) else {}
        self.settings=normalize(document); remote_revision=revision(self.settings); declared_revision=str(metadata.get('revision') or '').strip();
        if declared_revision and declared_revision!=remote_revision: raise StateError(f'Estado cloud inconsistente: metadata={declared_revision} conteúdo={remote_revision}.')
        self.cloud_sha=remote['sha']; self.cloud_commit=remote.get('commit_sha') or ''; self.cloud_revision=remote_revision; self.cloud_saved=True; self.cloud_saved_at=str(metadata.get('saved_at') or ''); self.cloud_device_id=str(metadata.get('device_id') or ''); self.source='github-cloud'; self.last_error=''
        self._write(local_editorial_state_path(),self.settings); self.local_saved=True
        ok,err=self._try_portable_write(portable_editorial_state_path(),settings=self.settings); self.portable_saved=ok; self.portable_error=err
        self._history(self.settings); write_log('editor',f'Estado recuperado do GitHub commit={self.cloud_commit}')
        if record_activity:
            try: append_activity(make_event('editorial-recovery','ok',device_id=self.device_id,revision=revision(self.settings),details={'source_device_id':self.cloud_device_id,'commit':self.cloud_commit}))
            except Exception as e: write_log('github',f'Atividade online de recuperação não foi gravada: {e}')
        return self.payload()

    def recover_cloud(self)->dict:
        return self.apply_cloud_remote(self.fetch_cloud())

    def import_file(self,data:dict)->dict:
        if not isinstance(data,dict): raise StateError('Save importado precisa ser JSON objeto.')
        return self.save_local(data)

    def export_history(self)->dict:
        snapshots=[]
        for p in sorted(history_dir().glob('*.json')):
            try:
                data=json.loads(p.read_text(encoding='utf-8-sig'))
                if isinstance(data,dict): snapshots.append({'file':p.name,'settings':data})
            except Exception: pass
        bundle={'format':'studioframe-history-v1','exported_at':datetime.now(timezone.utc).isoformat(),'current_revision':revision(self.settings),'snapshots':snapshots,'current':copy.deepcopy(self.settings)}
        history_export_path().parent.mkdir(parents=True,exist_ok=True)
        history_export_path().write_text(json.dumps(bundle,ensure_ascii=False,indent=2),encoding='utf-8')
        return {'path':str(history_export_path()),'snapshots':len(snapshots)}

    def import_history(self,bundle:dict)->dict:
        if not isinstance(bundle,dict) or bundle.get('format')!='studioframe-history-v1': raise StateError('Arquivo de histórico StudioFrame inválido.')
        imported=0
        for snap in bundle.get('snapshots') or []:
            data=(snap or {}).get('settings') if isinstance(snap,dict) else None
            if isinstance(data,dict): self._history(normalize(data)); imported+=1
        current=bundle.get('current')
        if isinstance(current,dict): self.save_local(current)
        return {**self.payload(),'imported_snapshots':imported,'settings':copy.deepcopy(self.settings)}

    def payload(self)->dict:
        return {
            'settings':copy.deepcopy(self.settings),'source':self.source,
            'remote_modified_time':revision(self.settings),
            'storage':'github-cloud-authoritative' if self.cloud_saved else 'local-cache-pending-cloud',
            'cloud_saved':self.cloud_saved,'cloud_sha':self.cloud_sha,'cloud_commit':self.cloud_commit,'cloud_revision':self.cloud_revision,
            'local_saved_at':self.local_saved_at,'cloud_saved_at':self.cloud_saved_at,'cloud_device_id':self.cloud_device_id,'device_id':self.device_id,
            'remote_backend':'github' if self.cloud_saved else '', 'remote_error':self.last_error,
            'local_saved':bool(self.local_saved and local_editorial_state_path().exists()),
            'local_path':str(local_editorial_state_path()),
            'portable_saved':bool(self.portable_saved and portable_editorial_state_path().exists()),
            'portable_path':str(portable_editorial_state_path()),
            'portable_error':self.portable_error,
        }
