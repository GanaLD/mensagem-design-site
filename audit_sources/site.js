try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (_) {}
const STUDIOFRAME_INITIAL_HASH = String(location.hash || '');
const $ = (s) => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let DATA = {};
const IS_EDITOR_PREVIEW = Boolean(window.__PB_PREVIEW_DATA__);
let active = 'all';
let revealObserver = null;
let sectionNavigatorObserver = null;
let heroTimer = null;
let heroIndex = 0;
let heroProjects = [];
let heroSoundEnabled = false;
const SITE_AUDIO = {config:null,videoId:'',player:null,playerPromise:null,playing:false,muted:false,volume:30,userWantsPlaying:false,resumeAfterMedia:false,ducked:false,policyPause:false,firstInteractionHandler:null};
let activeGallery = [];
let activeGalleryIndex = 0;
let activeGalleryTitle = '';
let visualLayout = {};
let projectScrollY = 0;

// V7.8.8 Publication Parity diagnostics. This object is intentionally limited
// to public rendering metadata; it never contains credentials, Drive tokens or
// private paths.
const SF_RUNTIME_DIAGNOSTICS = window.__STUDIOFRAME_RUNTIME_DIAGNOSTICS__ = window.__STUDIOFRAME_RUNTIME_DIAGNOSTICS__ || {
  manifest_url:'', manifest_fetch_status:'not-started', loaded_revision:'', block_count:0,
  rendered_block_count:0, unknown_block_count:0, failed_block_count:0, blocks:[], errors:[]
};
function sfSourceRevision(){return String(DATA?.source_revision||DATA?.editorial_revision||DATA?.revision||'');}
function sfResetBlockDiagnostics(blocks=[]){SF_RUNTIME_DIAGNOSTICS.block_count=blocks.filter((block)=>block&&block.visible!==false).length;SF_RUNTIME_DIAGNOSTICS.rendered_block_count=0;SF_RUNTIME_DIAGNOSTICS.unknown_block_count=0;SF_RUNTIME_DIAGNOSTICS.failed_block_count=0;SF_RUNTIME_DIAGNOSTICS.blocks=[];SF_RUNTIME_DIAGNOSTICS.errors=[];}
function sfRecordBlock(block,status,detail=''){const record={id:String(block?.id||''),type:String(block?.type||''),status:String(status||''),detail:String(detail||'').slice(0,280)};SF_RUNTIME_DIAGNOSTICS.blocks.push(record);if(status==='rendered')SF_RUNTIME_DIAGNOSTICS.rendered_block_count+=1;if(status==='unknown')SF_RUNTIME_DIAGNOSTICS.unknown_block_count+=1;if(status==='failed'){SF_RUNTIME_DIAGNOSTICS.failed_block_count+=1;SF_RUNTIME_DIAGNOSTICS.errors.push(record);}return record;}
function sfMarkBlockNode(node,block,renderer=''){if(!node)return node;node.dataset.sfBlockType=String(block?.type||'');node.dataset.sfBlockId=String(block?.id||'');node.dataset.sfRenderer=String(renderer||'');node.dataset.sfRevision=sfSourceRevision();return node;}
function sfBlockFallback(block,status,error){const node=document.createElement('section');node.className='modular-block sf-runtime-block-fallback';sfMarkBlockNode(node,block,status==='unknown'?'unknown':'error-boundary');node.dataset.sfRenderStatus=status;const dev=IS_EDITOR_PREVIEW||location.protocol==='file:'||Boolean(window.__STUDIOFRAME_DEV_MODE__);if(dev){node.innerHTML=`<div class="sf-adv-inner"><strong>${status==='unknown'?'UNKNOWN BLOCK TYPE':'BLOCK RENDER ERROR'}: ${esc(block?.type||'unknown')}</strong><small>${esc(String(error?.message||error||'').slice(0,180))}</small></div>`;}else{node.hidden=true;node.setAttribute('aria-hidden','true');}return node;}
window.StudioFrameRuntimeDiagnostics=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(SF_RUNTIME_DIAGNOSTICS))});
function sfEmitPublicationQaProof(){
  try{
    const params=new URLSearchParams(location.search||'');
    const nonce=String(params.get('sf_publication_qa')||'').trim();
    if(!nonce)return null;
    const expectedRevision=String(params.get('sf_expected_revision')||'').trim();
    const revision=sfSourceRevision();
    const blocks=((((DATA||{}).site_builder||{}).home||{}).blocks||[]).filter((block)=>block&&block.visible!==false&&block.id);
    const expectedBlockIds=blocks.map((block)=>String(block.id));
    const expectedSourcePorts=blocks.filter((block)=>block.theme_source_port_id).map((block)=>({block_id:String(block.id),port_id:String(block.theme_source_port_id||''),theme_id:String(block.theme_source_theme_id||''),port_status:String(block.theme_port_status||''),fidelity_status:String(block.theme_fidelity_status||''),ab_status:String(block.theme_ab_status||'')}));
    const renderedNodes=[...document.querySelectorAll('[data-sf-block-id]')];
    const renderedBlockIds=[...new Set(renderedNodes.filter((node)=>!['unknown','failed'].includes(String(node.dataset.sfRenderStatus||''))).map((node)=>String(node.dataset.sfBlockId||'')).filter(Boolean))];
    const failedBlockIds=[...new Set(renderedNodes.filter((node)=>String(node.dataset.sfRenderStatus||'')==='failed').map((node)=>String(node.dataset.sfBlockId||'')).filter(Boolean))];
    const unknownBlockIds=[...new Set(renderedNodes.filter((node)=>String(node.dataset.sfRenderStatus||'')==='unknown').map((node)=>String(node.dataset.sfBlockId||'')).filter(Boolean))];
    const renderedSourcePorts=renderedNodes.filter((node)=>String(node.dataset.themeSourcePortId||'')).map((node)=>({block_id:String(node.dataset.sfBlockId||''),port_id:String(node.dataset.themeSourcePortId||''),theme_id:String(node.dataset.themeSourceTheme||''),port_status:String(node.dataset.themePortStatus||''),fidelity_status:String(node.dataset.themeFidelityStatus||''),ab_status:String(node.dataset.themeAbStatus||'')}));
    const renderedSet=new Set(renderedBlockIds);const missingBlockIds=expectedBlockIds.filter((id)=>!renderedSet.has(id));
    const renderedSourceByBlock=new Map(renderedSourcePorts.map((row)=>[row.block_id,row]));
    const expectedSourceBlocks=new Set(expectedSourcePorts.map((row)=>row.block_id));
    const missingSourcePortIds=[];const sourcePortMismatches=[];
    expectedSourcePorts.forEach((expected)=>{const actual=renderedSourceByBlock.get(expected.block_id);if(!actual){missingSourcePortIds.push(expected.port_id);return;}const fields=['port_id','theme_id','port_status','fidelity_status','ab_status'];const diff=fields.filter((key)=>String(actual[key]||'')!==String(expected[key]||''));if(diff.length)sourcePortMismatches.push({block_id:expected.block_id,expected,actual,fields:diff});});
    const unexpectedSourcePorts=renderedSourcePorts.filter((row)=>row.block_id&&!expectedSourceBlocks.has(row.block_id));
    const sourcePortsOk=!missingSourcePortIds.length&&!sourcePortMismatches.length&&!unexpectedSourcePorts.length;
    const domOk=Boolean((!expectedRevision||revision===expectedRevision)&&!missingBlockIds.length&&!failedBlockIds.length&&!unknownBlockIds.length&&sourcePortsOk);
    const proof={type:'STUDIOFRAME_PUBLICATION_DOM_PROOF',nonce,revision,expected_revision:expectedRevision,manifest_url:String(SF_RUNTIME_DIAGNOSTICS.manifest_url||''),manifest_fetch_status:String(SF_RUNTIME_DIAGNOSTICS.manifest_fetch_status||''),expected_block_ids:expectedBlockIds,rendered_block_ids:renderedBlockIds,missing_block_ids:missingBlockIds,failed_block_ids:failedBlockIds,unknown_block_ids:unknownBlockIds,expected_source_ports:expectedSourcePorts,rendered_source_ports:renderedSourcePorts,missing_source_port_ids:missingSourcePortIds,source_port_mismatches:sourcePortMismatches,unexpected_source_ports:unexpectedSourcePorts,rendered_block_count:renderedBlockIds.length,dom_ok:domOk,ok:domOk};
    document.documentElement.dataset.sfPublicationQa=proof.ok?'pass':'fail';
    document.documentElement.dataset.sfPublicationQaRevision=revision;
    try{if(window.opener&&window.opener!==window)window.opener.postMessage(proof,'*');}catch(_){}
    try{if(window.parent&&window.parent!==window)window.parent.postMessage(proof,'*');}catch(_){}
    return proof;
  }catch(error){console.error('[StudioFrame][PUBLICATION_PARITY] DOM proof error',error);return null;}
}

function esc(value = '') {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}

async function load() {
  if (window.__PB_PREVIEW_DATA__) {
    DATA = window.__PB_PREVIEW_DATA__;
    SF_RUNTIME_DIAGNOSTICS.manifest_url='editor-preview://manifest';
    SF_RUNTIME_DIAGNOSTICS.manifest_fetch_status='preview';
  } else if (location.protocol === 'http:' || location.protocol === 'https:') {
    try {
      const liveUrl = `${publicAssetBase()}data/portfolio.json?sf_live=${Date.now()}`;
      SF_RUNTIME_DIAGNOSTICS.manifest_url=liveUrl;SF_RUNTIME_DIAGNOSTICS.manifest_fetch_status='loading';
      const response = await fetch(liveUrl, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache, no-store, max-age=0', 'Pragma':'no-cache' } });
      if (!response.ok) throw new Error(`portfolio.json HTTP ${response.status}`);
      DATA = await response.json();
      SF_RUNTIME_DIAGNOSTICS.manifest_fetch_status='ok';
    } catch (error) {
      SF_RUNTIME_DIAGNOSTICS.manifest_fetch_status=`failed:${String(error?.message||error).slice(0,160)}`;
      if (!window.__PB_PUBLIC_DATA__) throw error;
      console.warn('Manifesto online indisponível; usando snapshot inline como fallback:', error);
      DATA = window.__PB_PUBLIC_DATA__;
      SF_RUNTIME_DIAGNOSTICS.manifest_fetch_status='inline-fallback';
    }
  } else if (window.__PB_PUBLIC_DATA__) {
    DATA = window.__PB_PUBLIC_DATA__;
  } else {
    const response = await fetch(`${publicAssetBase()}data/portfolio.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`portfolio.json HTTP ${response.status}`);
    DATA = await response.json();
  }
  SF_RUNTIME_DIAGNOSTICS.loaded_revision=sfSourceRevision();
  document.documentElement.dataset.sfRevision=SF_RUNTIME_DIAGNOSTICS.loaded_revision;
  hydrateHostedAssetUrls(DATA);
  warmMediaOrigins(DATA);
  const identity = DATA.identity || {};
  document.documentElement.style.setProperty('--accent', identity.accent_color || '#2FD59A');
  applyRuntimeSeo();
  $('#logo').textContent = identity.studio_name || 'MENSAGEM STUDIO';
  $('#footerName').textContent = identity.studio_name || 'MENSAGEM STUDIO';
  const footerSite = $('#footerSite');
  if (footerSite) { footerSite.href = identity.site_url || '#'; footerSite.hidden = !identity.site_url; }
  $('#heroTitle').textContent = identity.portfolio_title || 'Portfólio';
  $('#heroDescription').textContent = identity.description || '';
  $('#heroLine').textContent = identity.hero_line || '';
  renderSiteBuilder();
  renderHero();
  setupSiteAudio((DATA.site_builder || {}).audio || {});
  const briefingPage = isBriefingPage();
  const serviceDetail = currentServiceDetail();
  const servicesPage = isServicesPage();
  const customPage = currentCustomPage();
  const seoRoute = currentSeoRoute();
  if(briefingPage){ await renderBriefingPage(); }
  else if(serviceDetail){ renderServiceDetailPage(serviceDetail.category, serviceDetail.item); }
  else if(servicesPage){ renderServicesPage(); }
  else if(customPage){ renderCustomPage(customPage); }
  else if(['clients','client','tag','about','contact','quote','search','archive','not_found'].includes(String(seoRoute?.kind||''))){ renderV9DiscoveryRoute(seoRoute); }
  else if(seoRoute?.kind==='category'){
    renderFilters();
    select(String(seoRoute.entity_id||'all'), false);
    renderHomeComposition();
    renderServicesHome();
  }
  else if(seoRoute?.kind==='project'){
    renderFilters();
    const project=(DATA.projects||[]).find((row)=>String(row.project_id||row.id||'')===String(seoRoute.project_id||'')||String(row.project_entity_id||'')===String(seoRoute.entity_id||''));
    const sectionId=String(project?.section_id||'all');
    select(sectionId, false);
    renderHomeComposition();
    renderServicesHome();
    if(project) requestAnimationFrame(()=>openProjectDetail(project));
  } else {
    renderFilters();
    const hashSection = sectionFromLocation();
    const publicFilters = publicPortfolioFilterItems();
    const validFilterIds = new Set(publicFilters.map((item) => String(item.id)));
    const initialFilter = hashSection && validFilterIds.has(String(hashSection)) ? hashSection : (publicFilters.length ? publicFilters[0].id : 'all');
    select(initialFilter, false);
    renderHomeComposition();
    renderServicesHome();
    placeHomeHorizontalNavigation();
  }
  setupV9PerformanceRuntime();
  setupGlobalMediaCanvasV789();
  setupHeroAdvancedV91();
  if(!sfImmersiveV31Enabled())setupHeroGsapScroll();
  else { SF_HERO_GSAP_CONTROLLER?.abort?.(); SF_HERO_GSAP_CONTROLLER=null; }
  if(!sfImmersiveV31Enabled())setupThreeDSceneV91();
  else { SF_THREE_D_CONTROLLER?.abort?.(); SF_THREE_D_CONTROLLER=null; }
  setupPhaserSceneV91();
  setupR22ShowcaseHub();
  await setupImmersiveV31();
  sfApplyAuthoringPreviewModesV789();
  loadQuoteState();
  loadQuoteReceipt();
  ensureGlobalQuoteUI();
  renderQuoteHome();
  renderBriefingHomeEntry();
  setupServiceOfferNotification();
  renderSideNavigation();
  setupSectionNavigator((DATA.site_builder || {}).section_navigator || {});
  bindMotion();
  await initializeStudioFrameMotionV77();
setTimeout(sfEmitPublicationQaProof,350);
}

function publicAssetBase() {
  const configured = String(window.__PB_ASSET_BASE__ || '');
  if (configured) return configured.endsWith('/') ? configured : `${configured}/`;
  if (location.protocol === 'file:') return './';
  return location.pathname === '/site' || location.pathname.startsWith('/site/') ? '/site/' : '/';
}

function hostedAssetBase() {
  return new URL(publicAssetBase(), location.href).href;
}

// Runtime JS/CSS lives under /assets in a published bundle, but the editor
// serves those same canonical files through /preview-assets. Keep this
// resolver separate from publicAssetBase(), which remains the site/data root.
function studioFrameRuntimeAssetUrl(relative='') {
  const clean=String(relative||'').replace(/^\/+/, '').replace(/^assets\//, '');
  if (IS_EDITOR_PREVIEW) return new URL(`/preview-assets/${clean}`, location.origin).href;
  return new URL(`assets/${clean}`, hostedAssetBase()).href;
}

async function initializeStudioFrameMotionV77(){
  const manifest=DATA?.motion_runtime||{};
  if(!manifest?.enabled){window.StudioFrameMotionV77?.destroy?.();return null;}
  try{
    const url=studioFrameRuntimeAssetUrl('motion/motion-runtime.js');
    const runtime=await import(url);
    return await runtime.initializeStudioFrameMotionV77(manifest);
  }catch(error){console.warn('[StudioFrame][MOTION] runtime indisponível; conteúdo preservado.',error);return null;}
}
function refreshStudioFrameMotionV77(root=document){return window.StudioFrameMotionV77?.refresh?.(root);}

function ensureStudioFrameAdvancedComponents(){const id='studioframe-advanced-components-runtime';if(document.getElementById(id)){window.StudioFrameAdvancedComponents?.refresh?.(document);return;}const script=document.createElement('script');script.id=id;script.src=studioFrameRuntimeAssetUrl('components/advanced-components.js');script.defer=true;script.addEventListener('load',()=>window.StudioFrameAdvancedComponents?.refresh?.(document),{once:true});document.head.append(script);}

function hydrateHostedAssetUrls(value) {
  const base = hostedAssetBase();
  const visit = (current) => {
    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        if (typeof item === 'string' && item.startsWith('assets/')) current[index] = `${base}${item}`;
        else visit(item);
      });
      return;
    }
    if (!current || typeof current !== 'object') return;
    Object.entries(current).forEach(([key, item]) => {
      if (typeof item === 'string' && item.startsWith('assets/')) current[key] = `${base}${item}`;
      else visit(item);
    });
  };
  visit(value);
}

function isStudioFrameVideoPlaybackCandidate(url) {
  const value = String(url || '').trim();
  if (!value || /^(?:javascript|data|vbscript):/i.test(value)) return false;
  try {
    const parsed = new URL(value, location.href);
    const host = String(parsed.hostname || '').toLowerCase();
    const path = String(parsed.pathname || '').toLowerCase();
    if (host === 'accounts.google.com' || host.endsWith('.accounts.google.com')) return false;
    if (host === 'drive.google.com') {
      if (path !== '/uc') return false;
      const id = parsed.searchParams.get('id');
      const mode = String(parsed.searchParams.get('export') || '').toLowerCase();
      return /^[A-Za-z0-9_-]{10,}$/.test(String(id || '')) && ['view','download'].includes(mode);
    }
    if (host === 'drive.usercontent.google.com') {
      const id = parsed.searchParams.get('id');
      return path === '/download' && /^[A-Za-z0-9_-]{10,}$/.test(String(id || ''));
    }
    return true;
  } catch (_) {
    const lowered = value.toLowerCase();
    if (/drive\.google\.com|drive\.usercontent\.google\.com|accounts\.google\.com|servicelogin/i.test(lowered)) return false;
    return true;
  }
}

function driveFileIdFromCandidate(item = {}, url = '') {
  try {
    const parsed = new URL(String(url || ''), location.href);
    const queryId = parsed.searchParams.get('id');
    if (/^[A-Za-z0-9_-]{10,}$/.test(String(queryId || ''))) return String(queryId);
    const match = parsed.pathname.match(/\/d\/([A-Za-z0-9_-]{10,})/);
    if (match) return match[1];
  } catch (_) {}
  const directCandidates = [
    item.drive_file_id, item.file_id, item.media_id, item.cover_media_id, item.id,
    item.media_url, item.preview_url, item.external_url,
    ...(item.media_candidates || []), ...(item.preview_candidates || []),
    ...(item.thumbnail_candidates || []), item.thumbnail_url,
  ];
  for (const candidate of directCandidates) {
    const raw = String(candidate || '').trim();
    const direct = raw.replace(/^(?:media|video|drive):/i, '');
    if (/^[A-Za-z0-9_-]{10,}$/.test(direct)) return direct;
    try {
      const parsed = new URL(raw, location.href);
      const queryId = parsed.searchParams.get('id');
      if (/^[A-Za-z0-9_-]{10,}$/.test(String(queryId || ''))) return String(queryId);
      const pathMatch = parsed.pathname.match(/\/d\/([A-Za-z0-9_-]{10,})/);
      if (pathMatch) return pathMatch[1];
    } catch (_) {}
  }
  return '';
}

function videoSourceCandidates(item = {}) {
  const original = uniqueUrls([item.media_url, ...(item.media_candidates || [])]);
  const id = driveFileIdFromCandidate(item, original[0]);
  const canonical = id ? [
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`,
    `https://drive.google.com/uc?id=${encodeURIComponent(id)}&export=download`,
  ] : [];
  return uniqueUrls([...canonical, ...original]).filter(isStudioFrameVideoPlaybackCandidate);
}

function videoChunkCandidates(item = {}) {
  return uniqueUrls(item.video_chunk_urls || []);
}

async function buildChunkedVideoObjectUrl(item = {}, video = null) {
  const urls = videoChunkCandidates(item);
  if (!urls.length) return '';
  const parts = [];
  let loaded = 0;
  const total = Number(item.video_chunk_bytes || 0);
  if (video) {
    video.dataset.chunkLoading = '1';
    video.dataset.chunkProgress = '0';
  }
  for (const url of urls) {
    const response = await fetch(url, { cache: 'force-cache', credentials: 'same-origin' });
    if (!response.ok) throw new Error(`chunk HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    if (!data.byteLength) throw new Error('chunk vazio');
    parts.push(data); loaded += data.byteLength;
    if (video) video.dataset.chunkProgress = String(total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0);
  }
  const blob = new Blob(parts, { type: String(item.video_chunk_mime || item.mime || 'video/mp4') });
  const objectUrl = URL.createObjectURL(blob);
  if (video) {
    video.dataset.chunkLoading = '0';
    video.dataset.chunkProgress = '100';
    video.__studioframeObjectUrl = objectUrl;
  }
  return objectUrl;
}

function bindPublishedVideoSource(video, item = {}, exhausted = null, options = {}) {
  const chunks = videoChunkCandidates(item);
  if (!chunks.length) return bindVideoSourceFallback(video, videoSourceCandidates(item), exhausted, options);
  const directFallbacks = videoSourceCandidates(item);
  let started = false;
  const defer = Boolean(options.defer);
  const ensure = () => {
    if (started) return;
    started = true;
    buildChunkedVideoObjectUrl(item, video).then((objectUrl) => {
      bindVideoSourceFallback(video, [objectUrl, ...directFallbacks], exhausted, { ...options, defer:false, metadataReady:false, timeoutMs:Math.max(45000, Number(options.timeoutMs || 45000)) });
    }).catch((error) => {
      mediaDiagnostic(item, 'failed', '', `chunked-video:${error?.message || error}`);
      bindVideoSourceFallback(video, directFallbacks, exhausted, { ...options, defer:false });
    });
  };
  video.__studioframeEnsureSource = ensure;
  video.addEventListener('emptied', () => {
    if (video.__studioframeObjectUrl && video.dataset.failed === '1') {
      try { URL.revokeObjectURL(video.__studioframeObjectUrl); } catch (_) {}
      video.__studioframeObjectUrl = '';
    }
  });
  if (!defer) ensure();
  return video;
}

const MEDIA_LOAD_TIMEOUT_MS = 6500;
const MEDIA_NEAR_VIEWPORT_MARGIN = '420px 0px';
const MEDIA_FAILED_URL_TTL_MS = 60000;
const MEDIA_FAILED_URLS = new Map();
const MEDIA_DIAGNOSTICS = window.__STUDIOFRAME_MEDIA_DIAGNOSTICS__ = window.__STUDIOFRAME_MEDIA_DIAGNOSTICS__ || { loaded:0, failed:0, fallback:0, events:[] };
const MEDIA_ERROR_NAMES = {1:'MEDIA_ERR_ABORTED',2:'MEDIA_ERR_NETWORK',3:'MEDIA_ERR_DECODE',4:'MEDIA_ERR_SRC_NOT_SUPPORTED'};
function mediaDiagnostic(item, status, url = '', detail = '', video = null) {
  const errorCode=Number(video?.error?.code||0);
  const event={at:new Date().toISOString(),id:String(item?.id||item?.cover_media_id||''),title:String(item?.title||''),status,url:String(url||''),detail:String(detail||''),media_error_code:errorCode,media_error_name:MEDIA_ERROR_NAMES[errorCode]||'',media_error_message:String(video?.error?.message||''),network_state:Number(video?.networkState??-1),ready_state:Number(video?.readyState??-1),current_time:Number(video?.currentTime||0),duration:Number.isFinite(video?.duration)?Number(video.duration):null,final_source:String(video?.dataset?.finalSource||'')};
  MEDIA_DIAGNOSTICS.events.push(event); if(MEDIA_DIAGNOSTICS.events.length>120) MEDIA_DIAGNOSTICS.events.splice(0,MEDIA_DIAGNOSTICS.events.length-120);
  if(status==='loaded') MEDIA_DIAGNOSTICS.loaded++; else if(status==='failed') MEDIA_DIAGNOSTICS.failed++; else if(status==='fallback') MEDIA_DIAGNOSTICS.fallback++;
}

function mediaUrlRecentlyFailed(url) {
  const failedAt = MEDIA_FAILED_URLS.get(String(url || ''));
  if (!failedAt) return false;
  if (Date.now() - failedAt > MEDIA_FAILED_URL_TTL_MS) { MEDIA_FAILED_URLS.delete(String(url || '')); return false; }
  return true;
}
function markMediaUrlFailed(url) { if (url) MEDIA_FAILED_URLS.set(String(url), Date.now()); }

function warmMediaOrigins(data = {}) {
  const urls = [];
  const push = (value) => { if (typeof value === 'string' && /^https?:\/\//i.test(value)) urls.push(value); };
  (data.hero_projects || data.projects || []).slice(0, 8).forEach((item) => {
    push(item?.thumbnail_url); push(item?.media_url); push(item?.preview_url);
    (item?.thumbnail_candidates || []).slice(0, 2).forEach(push);
  });
  Object.values(data.hero_assets || {}).slice(0, 4).forEach((item) => { push(item?.thumbnail_url); push(item?.media_url); });
  const origins = [...new Set(urls.map((value) => { try { return new URL(value, location.href).origin; } catch (_) { return ''; } }).filter(Boolean))].slice(0, 3);
  origins.forEach((origin) => {
    if ([...document.head.querySelectorAll('link[data-sf-preconnect]')].some((link) => link.dataset.sfPreconnect === origin)) return;
    const preconnect = document.createElement('link'); preconnect.rel = 'preconnect'; preconnect.href = origin; preconnect.crossOrigin = 'anonymous'; preconnect.dataset.sfPreconnect = origin; document.head.append(preconnect);
    const dns = document.createElement('link'); dns.rel = 'dns-prefetch'; dns.href = origin; document.head.append(dns);
  });
}

function bindVideoSourceFallback(video, candidates, exhausted = null, { defer = false, timeoutMs = 14000, metadataReady = true } = {}) {
  const allSources = uniqueUrls(candidates || []);
  const sources = [
    ...allSources.filter((url) => !mediaUrlRecentlyFailed(url)),
    ...allSources.filter((url) => mediaUrlRecentlyFailed(url)),
  ];
  let sourceIndex = 0;
  let started = false;
  let sourceReady = false;
  let timer = null;
  let activeUrl = '';
  let terminal = false;
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = null; };
  const ready = () => {
    sourceReady = true;
    clearTimer();
    video.dataset.failed = '0';
    video.dataset.ready = '1';
    video.classList.add('is-media-ready');
    video.dataset.finalSource = video.currentSrc || video.src || activeUrl;
    mediaDiagnostic({id:video.dataset.mediaId||'',title:video.dataset.mediaTitle||''},'loaded',video.dataset.finalSource,'video-ready',video);
  };
  const next = (reason = 'error') => {
    if (terminal) return;
    clearTimer();
    if (activeUrl && !sourceReady) {
      markMediaUrlFailed(activeUrl);
      mediaDiagnostic({id:video.dataset.mediaId||'',title:video.dataset.mediaTitle||''},'failed',activeUrl,reason,video);
    }
    sourceReady = false;
    video.dataset.ready = '0';
    video.classList.remove('is-media-ready');
    if (sourceIndex >= sources.length) {
      terminal = true;
      video.dataset.failed = '1';
      video.dataset.finalSource = activeUrl;
      video.removeAttribute('src');
      try { video.load(); } catch (_) {}
      mediaDiagnostic({id:video.dataset.mediaId||'',title:video.dataset.mediaTitle||''},'fallback',activeUrl,'byte-sources-exhausted',video);
      video.dispatchEvent(new CustomEvent('studioframe:video-exhausted'));
      if (typeof exhausted === 'function') exhausted();
      return;
    }
    video.dataset.failed = '0';
    activeUrl = sources[sourceIndex++];
    video.dataset.sourceIndex = String(sourceIndex - 1);
    video.dataset.sourceCandidate = activeUrl;
    mediaDiagnostic({id:video.dataset.mediaId||'',title:video.dataset.mediaTitle||''},'attempt',activeUrl,'loadstart',video);
    video.src = activeUrl;
    try { video.load(); } catch (_) {}
    timer = setTimeout(() => { if (!sourceReady) { mediaDiagnostic({id:video.dataset.mediaId||'',title:video.dataset.mediaTitle||''},'timeout',activeUrl,'source-timeout',video); next('timeout'); } }, Math.max(4000, Number(timeoutMs || 14000)));
  };
  const ensure = () => { if (started) return; started = true; next('initial'); };
  video.addEventListener('error', () => { if(!terminal) next(`browser-error:${MEDIA_ERROR_NAMES[Number(video.error?.code||0)]||'UNKNOWN'}`); });
  video.addEventListener('loadedmetadata', () => mediaDiagnostic({id:video.dataset.mediaId||'',title:video.dataset.mediaTitle||''},'loadedmetadata',video.currentSrc||activeUrl,'loadedmetadata',video));
  if (metadataReady) video.addEventListener('loadedmetadata', ready);
  else video.addEventListener('loadedmetadata', () => {
    clearTimer();
    timer = setTimeout(() => { if (!sourceReady) next('frame-timeout'); }, Math.max(30000, Number(timeoutMs || 45000)));
  });
  video.addEventListener('loadeddata', ready);
  video.addEventListener('canplay', () => { mediaDiagnostic({id:video.dataset.mediaId||'',title:video.dataset.mediaTitle||''},'canplay',video.currentSrc||activeUrl,'canplay',video); ready(); });
  video.__studioframeEnsureSource = ensure;
  if (!defer) ensure();
  return video;
}

function configureInlineVideoPlayer(video, item = {}, { autoplay = false, muted = false, loop = false, controls = true, preload = 'metadata' } = {}) {
  video.controls = Boolean(controls);
  video.playsInline = true;
  video.autoplay = Boolean(autoplay);
  video.muted = Boolean(muted);
  video.loop = Boolean(loop);
  video.preload = String(preload || 'metadata');
  video.poster = item.thumbnail_url || (item.thumbnail_candidates || [])[0] || '';
  video.dataset.mediaId = String(item.id || '');
  video.dataset.mediaTitle = String(item.title || '');
  video.setAttribute('controlsList', 'nodownload noremoteplayback');
  video.setAttribute('disableRemotePlayback', '');
  video.disableRemotePlayback = true;
  video.addEventListener('contextmenu', (event) => event.preventDefault());
  video.addEventListener('dragstart', (event) => event.preventDefault());
  return video;
}

function ensureVideoSource(video) {
  if (!video) return;
  if (typeof video.__studioframeEnsureSource === 'function') video.__studioframeEnsureSource();
}

function createResilientVideo(item = {}, options = {}) {
  const { exhausted = null, defer = false, timeoutMs = 45000, metadataReady = false, className = '', ...playerOptions } = options || {};
  const video = configureInlineVideoPlayer(document.createElement('video'), item, playerOptions);
  if (className) video.className = className;
  video.dataset.mediaContract = 'v71211';
  bindVideoOrientation(video, item);
  bindPublishedVideoSource(video, item, exhausted, { defer, timeoutMs, metadataReady });
  return video;
}

function drivePreviewUrl(item = {}, autoplay = false) {
  // Phase 11 compatibility alias: historical callers keep the symbol, but it
  // resolves only to a direct byte-source. Google Drive Viewer navigation is forbidden.
  void autoplay;
  return videoSourceCandidates(item)[0] || '';
}

function createDriveEmbedFrame(item = {}, { autoplay = false, className = '', loading = 'lazy' } = {}) {
  // Phase 11: intentionally no iframe is created for video. Drive is an origin,
  // never the visitor interface. Parameters remain for API compatibility.
  void item; void autoplay; void className; void loading;
  return null;
}

const CARD_DRIVE_PREVIEW = { frame:null, owner:null, item:null };
function mountCardDrivePreview(button, item) {
  // Legacy compatibility hook. Card motion preview is always the native
  // StudioFrame <video> path managed by bindCardVideoPreview().
  void button; void item;
  return null;
}
function unmountCardDrivePreview(button) {
  if (button) button.classList.remove('is-drive-previewing');
  const legacy = CARD_DRIVE_PREVIEW.frame;
  if (legacy) {
    try { if (legacy.tagName === 'VIDEO') legacy.pause(); } catch (_) {}
    try { legacy.removeAttribute('src'); legacy.load?.(); } catch (_) {}
    legacy.remove();
  }
  CARD_DRIVE_PREVIEW.frame = null;
  CARD_DRIVE_PREVIEW.owner = null;
  CARD_DRIVE_PREVIEW.item = null;
}

function bindDeferredAutoplay(video, target = video, { threshold = 0.18 } = {}) {
  if (!video) return;
  if (!('IntersectionObserver' in window)) { ensureVideoSource(video); if (video.autoplay) video.play().catch(() => {}); return; }
  const loader = new IntersectionObserver((entries, observer) => {
    if (entries.some((entry) => entry.isIntersecting)) { ensureVideoSource(video); observer.disconnect(); }
  }, { rootMargin: MEDIA_NEAR_VIEWPORT_MARGIN, threshold: 0 });
  loader.observe(target);
  const player = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!video.autoplay) return;
      if (entry.isIntersecting && entry.intersectionRatio >= threshold) { ensureVideoSource(video); video.play().catch(() => {}); }
      else video.pause();
    });
  }, { threshold: [0, threshold, .5, .85] });
  player.observe(target);
}

function hexToRgbTuple(value, fallback = '7,7,7') {
  const raw = String(value || '').trim();
  const match = raw.match(/^#([0-9a-f]{6})$/i);
  if (!match) return fallback;
  const hex = match[1];
  return `${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)}`;
}

const MOBILE_ESSENTIAL_MENU_IDS = new Set(['home','projects','services']);

function markHeaderMenuNode(node, item) {
  if (!node || !item) return node;
  const itemId = String(item.id || '');
  node.dataset.menuItemId = itemId;
  node.dataset.mobileEssential = MOBILE_ESSENTIAL_MENU_IDS.has(itemId) ? 'true' : 'false';
  return node;
}

function publicMenuItems(surface='side') {
  const projected=DATA.site_builder?.public_menu?.items;
  const legacy=DATA.site_builder?.global?.header?.menu_items;
  const source=Array.isArray(projected)?projected:(Array.isArray(legacy)?legacy:[]);
  return source.filter((item)=>{
    if(!item||item.visible===false)return false;
    const surfaces=Array.isArray(item.surfaces)?item.surfaces:['header','side'];
    return surfaces.includes(surface);
  }).slice().sort((a,b)=>Number(a.order||0)-Number(b.order||0));
}

function applyGlobalHeader(builder, navigation, identity) {
  const header = builder.global?.header || {};
  const headerNode = $('#header');
  if (!headerNode) return;
  const items = publicMenuItems('header');
  const nodeById = { projects:$('#menu'), about:$('#navAbout'), contact:$('#navContact') };
  const topnav = $('#topnav');
  topnav?.querySelectorAll('[data-dynamic-menu-item]').forEach((node)=>node.remove());
  Object.values(nodeById).forEach((node)=>{if(node)node.hidden=true;});
  const sorted=items.slice();
  const childMap=new Map(); sorted.forEach((item)=>{if(item.parent_id){if(!childMap.has(item.parent_id))childMap.set(item.parent_id,[]);childMap.get(item.parent_id).push(item);}});
  sorted.filter((item)=>!item.parent_id).forEach((item)=>{
    const children=(childMap.get(item.id)||[]).filter((child)=>child.visible!==false);
    if(children.length && item.target){
      const wrapper=document.createElement('div');wrapper.className='topnav-dropdown';wrapper.dataset.dynamicMenuItem=item.id;markHeaderMenuNode(wrapper,item);const parent=document.createElement('a');parent.href=publicRouteHref(item.target);parent.textContent=item.label||'Página';parent.className='topnav-dropdown-parent';const submenu=document.createElement('div');submenu.className='topnav-submenu';children.forEach((child)=>{const a=document.createElement('a');a.href=publicRouteHref(child.target||'#');a.textContent=child.label||'Página';submenu.append(a);});wrapper.append(parent,submenu);wrapper.hidden=item.visible===false;topnav?.append(wrapper);return;
    }
    let node = nodeById[item.id]; if(!node&&item.target){node=document.createElement('a');node.dataset.dynamicMenuItem=item.id;node.href=publicRouteHref(item.target);nodeById[item.id]=node;} if(!node)return;markHeaderMenuNode(node,item);node.textContent=item.label||node.textContent;node.hidden=false;if(node.tagName==='A'&&item.target)node.href=publicRouteHref(item.target);topnav?.append(node);
  });
  const height = Math.max(48, Math.min(160, Number(header.height || 72)));
  const pad = Math.max(1, Math.min(12, Number(header.padding_x || 4)));
  const opacity = Math.max(0, Math.min(100, Number(header.background_opacity ?? 84))) / 100;
  const blur = Math.max(0, Math.min(40, Number(header.blur ?? 18)));
  const desktopFont = Math.max(7, Math.min(32, Number(header.font_size_desktop || 10)));
  const mobileFont = Math.max(9, Math.min(32, Number(header.font_size_mobile || 12)));
  const itemGap = Math.max(4, Math.min(80, Number(header.item_gap || 22)));
  document.documentElement.style.setProperty('--site-header-height', `${height}px`);
  document.documentElement.style.setProperty('--site-header-padding-x', `${pad}vw`);
  document.documentElement.style.setProperty('--site-header-bg-rgb', hexToRgbTuple(header.background_color || '#070707'));
  document.documentElement.style.setProperty('--site-header-bg-opacity', String(opacity));
  document.documentElement.style.setProperty('--site-header-blur', `${blur}px`);
  document.documentElement.style.setProperty('--site-header-text', header.text_color || '#f4f4ef');
  document.documentElement.style.setProperty('--site-header-hover', header.hover_color || '#ffffff');
  const headerFont = header.font_family === 'body' ? 'var(--body)' : header.font_family === 'system' ? 'Arial, sans-serif' : 'var(--display)';
  document.documentElement.style.setProperty('--site-header-font-family', headerFont);
  document.documentElement.style.setProperty('--site-header-font-desktop', `${desktopFont}px`);
  document.documentElement.style.setProperty('--site-header-font-mobile', `${mobileFont}px`);
  document.documentElement.style.setProperty('--site-header-font-weight', String(header.font_weight || '500'));
  document.documentElement.style.setProperty('--site-header-gap', `${itemGap}px`);
  headerNode.dataset.headerMode = header.background_mode || 'adaptive';
  headerNode.dataset.headerBorder = header.border === false ? 'off' : 'on';
  document.body.dataset.headerSticky = header.sticky === false ? 'off' : 'on';
  document.body.dataset.headerMobileMode = header.mobile_mode || 'drawer';
  const logo = $('#logo');
  if (logo) {
    logo.href = '/';
    logo.hidden = header.logo_visible === false;
    logo.dataset.logoMode = header.logo_mode === 'image' ? 'image' : 'text';
    logo.style.setProperty('--logo-height-desktop', `${Math.max(16,Math.min(120,Number(header.logo_height_desktop||34)))}px`);
    logo.style.setProperty('--logo-height-mobile', `${Math.max(14,Math.min(96,Number(header.logo_height_mobile||28)))}px`);
    logo.replaceChildren();
    const media = header.logo_mode === 'image' ? publicMediaById(header.logo_media_id || '') : null;
    if (media && media.type === 'image') {
      const image = imageWithFallback(media,[media.media_url,...(media.media_candidates||[]),media.thumbnail_url,...(media.thumbnail_candidates||[])],{lazy:false,priority:'high'});
      image.alt = header.logo_alt || identity.studio_name || 'Mensagem Studio';
      image.classList?.add('site-logo-image');
      logo.append(image);
    } else {
      logo.dataset.logoMode = 'text';
      logo.textContent = header.logo_label || identity.studio_name || 'MENSAGEM STUDIO';
    }
  }
  if(currentCustomPage()){ const about=$('#navAbout'),contact=$('#navContact'); if(about)about.href='/#about'; if(contact)contact.href='/#contact'; if(logo)logo.href='/'; }
}

function socialIconSvg(id){
  const paths={instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1" class="fill"/>',behance:'<path d="M3 6h7a4 4 0 0 1 0 8H3V6Zm0 8h8a4 4 0 0 1 0 8H3v-8Zm11-5h7M14 16h8c0-4-1.6-6-4-6s-4 2-4 6c0 3.2 1.7 5 4.5 5 1.8 0 3-.6 3.8-1.8"/>',linkedin:'<path d="M5 9v10M5 5v.1M10 19V9m0 4c1-2.5 7-3.5 7 2v4M17 13v6"/>',youtube:'<path d="M4 7.5c.4-1.4 1.5-2 3.1-2.2C9 5 11 5 12 5s3 .1 4.9.3c1.6.2 2.7.8 3.1 2.2.3 1.2.5 3 .5 4.5s-.2 3.3-.5 4.5c-.4 1.4-1.5 2-3.1 2.2-1.9.2-3.9.3-4.9.3s-3-.1-4.9-.3c-1.6-.2-2.7-.8-3.1-2.2-.3-1.2-.5-3-.5-4.5s.2-3.3.5-4.5Z"/><path d="m10 9 5 3-5 3V9Z" class="fill"/>',whatsapp:'<path d="M20 11.5a8 8 0 0 1-11.7 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"/><path d="M9 8.5c.5 3 2 4.5 5 5.5.8.3 1.4-.7 1.8-1.2"/> '};
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[id]||'<circle cx="12" cy="12" r="8"/>'}</g></svg>`;
}
function applyGlobalFooter(builder, identity){
  const footer=builder.global?.footer||{}; const node=$('#globalFooter'); if(!node)return; node.hidden=footer.visible===false; if(node.hidden)return;
  const brand=$('#footerName'); if(brand)brand.textContent=footer.studio_name||identity.studio_name||'MENSAGEM STUDIO'; const tagline=$('#footerTagline'); if(tagline)tagline.textContent=footer.tagline||''; const copyright=$('#footerCopyright'); if(copyright)copyright.textContent=footer.copyright||'';
  const whatsapp=$('#footerWhatsapp'); const number=String(footer.whatsapp_number||'5541999999937').replace(/\D/g,''); if(whatsapp){const message=encodeURIComponent(footer.whatsapp_message||'');whatsapp.href=number?`https://wa.me/${number}${message?`?text=${message}`:''}`:'#';whatsapp.hidden=footer.whatsapp_visible===false||!number;whatsapp.querySelector('span').textContent=footer.whatsapp_label||'Contrate nossos serviços de design';}
  const socials=$('#footerSocials'); if(socials){socials.replaceChildren();(Array.isArray(footer.socials)?footer.socials:[]).filter((item)=>item.visible!==false&&item.url).sort((a,b)=>Number(a.order||0)-Number(b.order||0)).forEach((item)=>{const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener';a.setAttribute('aria-label',item.label||item.id);a.title=item.label||item.id;a.innerHTML=socialIconSvg(item.id);socials.append(a);});}
  node.dataset.align=footer.alignment||'between';node.dataset.divider=footer.divider===false?'off':'on';document.documentElement.style.setProperty('--footer-bg',footer.background_color||'#070707');document.documentElement.style.setProperty('--footer-text',footer.text_color||'#f4f4ef');document.documentElement.style.setProperty('--footer-muted',footer.muted_color||'#8e918f');document.documentElement.style.setProperty('--footer-font-size',`${Math.max(9,Number(footer.font_size||12))}px`);document.documentElement.style.setProperty('--footer-icon-size',`${Math.max(14,Number(footer.icon_size||20))}px`);document.documentElement.style.setProperty('--footer-gap',`${Math.max(4,Number(footer.gap||18))}px`);
}

const PUBLIC_SITE_THEME_PRESETS = {
  apple:{typography_preset:'studio',border_style:'soft',container_width:'wide',section_spacing:'generous',button_style:'pill',cta_style:'solid',grid_language:'balanced',image_treatment:'soft',overlay_style:'soft',motion_preset:'subtle',reveal_preset:'lift',parallax_preset:'subtle',navigation_treatment:'floating',background_texture:'off',section_navigator:'dots',hero_treatment:'cover'},
  dark:{typography_preset:'studio',border_style:'soft',container_width:'wide',section_spacing:'normal',button_style:'pill',cta_style:'solid',grid_language:'balanced',image_treatment:'clean',overlay_style:'gradient',motion_preset:'balanced',reveal_preset:'lift',parallax_preset:'subtle',navigation_treatment:'floating',background_texture:'grain',section_navigator:'off',hero_treatment:'cover'},
  light:{typography_preset:'humanist',border_style:'hairline',container_width:'wide',section_spacing:'generous',button_style:'rounded',cta_style:'solid',grid_language:'balanced',image_treatment:'framed',overlay_style:'soft',motion_preset:'subtle',reveal_preset:'fade',parallax_preset:'off',navigation_treatment:'bar',background_texture:'grid',section_navigator:'dots',hero_treatment:'split'},
  contrast:{typography_preset:'grotesk',border_style:'strong',container_width:'full',section_spacing:'cinematic',button_style:'square',cta_style:'split',grid_language:'mosaic',image_treatment:'high-contrast',overlay_style:'ink',motion_preset:'expressive',reveal_preset:'clip',parallax_preset:'medium',navigation_treatment:'minimal',background_texture:'off',section_navigator:'rail',hero_treatment:'lettering'},
  renaissance:{typography_preset:'editorial-condensed',border_style:'hairline',container_width:'editorial',section_spacing:'cinematic',button_style:'editorial',cta_style:'outline',grid_language:'editorial-asymmetric',image_treatment:'full-bleed',overlay_style:'ink',motion_preset:'cinematic',reveal_preset:'clip',parallax_preset:'medium',navigation_treatment:'editorial',background_texture:'paper',section_navigator:'chapters',hero_treatment:'editorial'},
};
function applySiteAppearance(builder = {}, identity = {}) {
  const rawAppearance = builder.appearance || {};
  const mode = ['apple','dark','light','contrast','renaissance','custom'].includes(rawAppearance.color_mode) ? rawAppearance.color_mode : 'dark';
  const appearance = {...(PUBLIC_SITE_THEME_PRESETS[mode]||PUBLIC_SITE_THEME_PRESETS.dark),...rawAppearance,color_mode:mode};
  const defaults = mode === 'apple'
    ? {bg:'#F5F5F7',surface:'#FFFFFF',text:'#1D1D1F',muted:'#6E6E73',accent:'#0071E3'}
    : mode === 'light'
    ? {bg:'#F3F6FA',surface:'#FFFFFF',text:'#172033',muted:'#58697D',accent:'#006B5B'}
    : (mode === 'contrast'
      ? {bg:'#030303',surface:'#111111',text:'#FFFFFF',muted:'#E0E0E0',accent:'#66F2C2'}
      : mode === 'renaissance'
        ? {bg:'#F7F7EE',surface:'#ECEBDD',text:'#292919',muted:'#6C6B5B',accent:'#B8E600'}
        : {bg:'#07090D',surface:'#111722',text:'#F4F7FB',muted:'#AAB5C4',accent:identity.accent_color||'#2FD59A'});
  const legacyDarkPalette = mode === 'renaissance'
    && String(appearance.background_color||'').toUpperCase() === '#070707'
    && String(appearance.text_color||'').toUpperCase() === '#F4F4EF';
  const values = legacyDarkPalette
    ? {...defaults}
    : {bg:appearance.background_color||defaults.bg,surface:appearance.surface_color||defaults.surface,text:appearance.text_color||defaults.text,muted:appearance.muted_color||defaults.muted,accent:appearance.accent_color||defaults.accent};
  document.documentElement.style.setProperty('--bg',values.bg);
  document.documentElement.style.setProperty('--surface',values.surface);
  document.documentElement.style.setProperty('--text',values.text);
  document.documentElement.style.setProperty('--muted',values.muted);
  document.documentElement.style.setProperty('--accent',values.accent);
  document.documentElement.style.setProperty('--line',`color-mix(in srgb, ${values.text} 19%, transparent)`);
  document.documentElement.style.setProperty('--site-block-radius',`${Math.max(0,Math.min(40,Number(appearance.block_radius??14)))}px`);
  const containerWidths={narrow:'1080px',standard:'1280px',wide:'1520px',editorial:'1680px',full:'100%'};
  const sectionSpaces={compact:'clamp(46px,6vh,78px)',normal:'clamp(64px,9vh,118px)',generous:'clamp(82px,12vh,158px)',cinematic:'clamp(104px,16vh,220px)'};
  const borderWeights={none:'0px',soft:'1px',hairline:'1px',strong:'2px'};
  document.documentElement.style.setProperty('--site-container-max',containerWidths[appearance.container_width]||containerWidths.wide);
  document.documentElement.style.setProperty('--site-section-space',sectionSpaces[appearance.section_spacing]||sectionSpaces.normal);
  document.documentElement.style.setProperty('--site-border-weight',borderWeights[appearance.border_style]||'1px');
  const brandFont = appearance.brand_font_family === 'body' ? 'var(--body)' : (appearance.brand_font_family === 'system' ? 'Arial, sans-serif' : 'var(--display)');
  document.documentElement.style.setProperty('--site-brand-font-family',brandFont);
  document.documentElement.style.setProperty('--site-brand-font-desktop',`${Math.max(8,Math.min(48,Number(appearance.brand_font_size_desktop??12)))}px`);
  document.documentElement.style.setProperty('--site-brand-font-mobile',`${Math.max(8,Math.min(40,Number(appearance.brand_font_size_mobile??12)))}px`);
  document.documentElement.style.setProperty('--site-brand-font-weight',String(appearance.brand_font_weight||'500'));
  document.documentElement.style.setProperty('--site-brand-letter-spacing',`${Math.max(-.05,Math.min(.4,Number(appearance.brand_letter_spacing??.16)))}em`);
  document.documentElement.style.setProperty('--site-brand-text-transform',appearance.brand_text_transform==='none'?'none':'uppercase');
  document.documentElement.style.setProperty('--site-brand-color',appearance.brand_color||values.text);
  const accentHex=String(values.accent||'#2FD59A').trim();
  const accentMatch=accentHex.match(/^#([0-9a-f]{6})$/i);
  if(accentMatch){const n=parseInt(accentMatch[1],16),r=(n>>16)&255,g=(n>>8)&255,b=n&255,l=(.2126*r+.7152*g+.0722*b)/255;document.documentElement.style.setProperty('--accent-contrast',l>.56?'#08110d':'#ffffff');}
  const logo=$('#logo');
  if(logo&&logo.dataset.logoMode!=='image'){logo.textContent=appearance.brand_title||logo.textContent||identity.studio_name||'MENSAGEM STUDIO';logo.hidden=appearance.brand_title_visible===false;}
  document.body.dataset.siteColorMode=mode;
  document.body.dataset.backgroundStyle=appearance.background_style||'aurora';
  document.body.dataset.blockStyle=appearance.block_style||'glass';
  document.body.dataset.blockSpacing=appearance.block_spacing||'normal';
  document.body.dataset.shadowStyle=appearance.shadow_style||'soft';
  document.body.dataset.themeTypography=appearance.typography_preset||'studio';
  document.body.dataset.themeBorders=appearance.border_style||'soft';
  document.body.dataset.themeContainer=appearance.container_width||'wide';
  document.body.dataset.themeSectionSpacing=appearance.section_spacing||'normal';
  document.body.dataset.themeButtons=appearance.button_style||'pill';
  document.body.dataset.themeCtas=appearance.cta_style||'solid';
  document.body.dataset.themeGrid=appearance.grid_language||'balanced';
  document.body.dataset.themeImages=appearance.image_treatment||'clean';
  document.body.dataset.themeOverlay=appearance.overlay_style||'gradient';
  document.body.dataset.themeMotion=appearance.motion_preset||'balanced';
  document.body.dataset.themeReveal=appearance.reveal_preset||'lift';
  document.body.dataset.themeParallax=appearance.parallax_preset||'subtle';
  document.body.dataset.themeNavigation=appearance.navigation_treatment||'floating';
  document.body.dataset.themeTexture=appearance.background_texture||'off';
  document.body.dataset.themeSectionNavigator=appearance.section_navigator||'off';
  document.body.dataset.themeHero=appearance.hero_treatment||'cover';
  const themeMeta=document.querySelector('meta[name="theme-color"]');if(themeMeta)themeMeta.content=values.bg;
  return appearance;
}

function letteringSegments(value=''){
  const text=String(value||'').trim();
  if(!text)return ['', ''];
  const comma=text.indexOf(',');
  if(comma>0&&comma<text.length-1)return [text.slice(0,comma+1).trim(),text.slice(comma+1).trim()];
  const words=text.split(/\s+/).filter(Boolean);
  if(words.length<4)return [text,''];
  const mid=Math.ceil(words.length/2);
  return [words.slice(0,mid).join(' '),words.slice(mid).join(' ')];
}
function applyLetteringCopy(primary,outline,value,style='split'){
  const text=String(value||'').trim();
  if(style==='split'){const [solid,stroke]=letteringSegments(text);if(primary)primary.textContent=solid;if(outline)outline.textContent=stroke;return;}
  if(primary)primary.textContent=text;if(outline)outline.textContent='';
}

const FLOATING_POSITIONS=['bottom_left','bottom_right','top_left','top_right'],FLOATING_STYLES=['theme','accent','minimal','custom'],FLOATING_SHAPES=['pill','rounded','square','circle'];
const WHATSAPP_MARK_SVG='<svg viewBox="0 0 448 385" focusable="false" aria-hidden="true"><path d="M380.9 97.1C339-3 283.7 0 226.2 0 120.9 0 35.3 85.6 35.3 190.9c0 33.7 8.8 66.6 25.5 95.5L33.7 385l101-26.5c27.9 15.2 59.3 23.2 91.4 23.2h.1c105.2 0 192.6-85.6 192.6-190.9 0-51-19.9-98.9-56.8-134.8zM226.2 349.4c-28.6 0-56.7-7.7-81.2-22.3l-5.8-3.5-59.9 15.7 16-58.4-3.8-6c-16-25.4-24.4-54.7-24.4-84.6 0-87.8 71.4-159.3 159.4-159.3 42.6 0 82.6 16.6 112.7 46.8 30.1 30.1 46.7 70.2 46.7 112.9 0 87.9-71.5 159.4-159.7 159.4zm87.4-119.3c-4.8-2.4-28.4-14-32.8-15.6-4.4-1.6-7.6-2.4-10.8 2.4s-12.4 15.6-15.2 18.8c-2.8 3.2-5.6 3.6-10.4 1.2-28.3-14.1-46.8-25.2-65.4-57-4.9-8.4 4.9-7.8 14.1-25.9 1.6-3.2.8-6-.4-8.4-1.2-2.4-10.8-26-14.8-35.6-3.9-9.4-7.9-8.1-10.8-8.3-2.8-.1-6-.2-9.2-.2s-8.4 1.2-12.8 6c-4.4 4.8-16.8 16.4-16.8 40s17.2 46.4 19.6 49.6c2.4 3.2 33.8 51.6 82 72.4 30.5 13.2 42.5 14.3 57.8 12 9.3-1.4 28.4-11.6 32.4-22.8 4-11.2 4-20.8 2.8-22.8-1.2-2-4.4-3.2-9.2-5.6z"/></svg>';
function ensureFloatingControlGlyphs(){const icon=$('.site-floating-whatsapp-icon');if(icon&&!icon.querySelector('svg'))icon.innerHTML=WHATSAPP_MARK_SVG;}
function floatingControlsFor(builder={},navigation={}){
  const services=builder.services||{},src=builder.floating_controls||{},pos=navigation.floating_position==='right'?'bottom_right':'bottom_left',size=Math.max(32,Math.min(72,Number(navigation.floating_button_size||42))),num=(v,d,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(v))?Math.round(Number(v)):d)),color=v=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v):'',norm=(x={},d={})=>({visible:x.visible??d.visible??true,position:FLOATING_POSITIONS.includes(x.position)?x.position:d.position||pos,offset_x:num(x.offset_x??d.offset_x,0,-240,240),offset_y:num(x.offset_y??d.offset_y,0,-240,240),size:num(x.size??d.size,size,32,72),label:String(x.label||d.label||''),style:FLOATING_STYLES.includes(x.style)?x.style:d.style||'theme',shape:FLOATING_SHAPES.includes(x.shape)?x.shape:d.shape||'pill',background_color:color(x.background_color??d.background_color),foreground_color:color(x.foreground_color??d.foreground_color),border_color:color(x.border_color??d.border_color)});
  const menu=norm(src.menu,{visible:navigation.side_menu_enabled!==false,label:navigation.menu_label||'Menu',shape:'pill'}),whatsapp=norm(src.whatsapp,{visible:navigation.floating_whatsapp_visible!==false,label:navigation.floating_whatsapp_label||'WhatsApp',shape:'circle'}),quote=norm(src.quote,{visible:true,label:services.quote_dock_label||'Orçamento',shape:'pill'});
  whatsapp.display_mode=String(src.whatsapp?.display_mode||'icon')==='label'?'label':'icon';whatsapp.number=String(src.whatsapp?.number??navigation.floating_whatsapp_number??'').replace(/\D/g,'');whatsapp.message=String(src.whatsapp?.message??navigation.floating_whatsapp_message??'');quote.show_icon=src.quote?.show_icon!==false;return {menu,whatsapp,quote};
}
function applyFloatingControlNode(node,name,c){if(!node)return;Object.assign(node.dataset,{floatingControl:name,floatingPosition:c.position,floatingStyle:c.style,floatingShape:c.shape||'pill'});const s=node.style;s.setProperty('--floating-control-size',`${c.size}px`);s.setProperty('--floating-offset-x',`${c.offset_x}px`);s.setProperty('--floating-offset-y',`${c.offset_y}px`);s.setProperty('--floating-stack-offset','0px');if(c.background_color)s.setProperty('--floating-custom-bg',c.background_color);else s.removeProperty('--floating-custom-bg');if(c.foreground_color)s.setProperty('--floating-custom-fg',c.foreground_color);else s.removeProperty('--floating-custom-fg');if(c.border_color)s.setProperty('--floating-custom-border',c.border_color);else s.removeProperty('--floating-custom-border');node.hidden=c.visible===false;}
function layoutFloatingControls(){
  const rank={menu:0,whatsapp:1,quote:2,ambient:3},groups={};
  const visible=(node)=>node&&!node.hidden&&getComputedStyle(node).display!=='none'&&node.getBoundingClientRect().height>0;
  const controls=[...document.querySelectorAll('.site-floating-control[data-floating-control]')].filter(visible);
  const obstacleSelector='#header,.filters,.services-jump-nav,[data-context-bar],[data-floating-obstacle],.section-navigator,.project-back,.hero-open,.hero-sound-toggle,.quote-cta-button';
  const obstacles=[...document.querySelectorAll(obstacleSelector)].filter((node)=>visible(node)&&!controls.some((control)=>control===node||control.contains(node)));
  const viewport=window.visualViewport,viewportTop=Math.max(0,Math.round(viewport?.offsetTop||0)),viewportBottom=Math.min(innerHeight,Math.round((viewport?.offsetTop||0)+(viewport?.height||innerHeight)));
  const topBars=obstacles.map((node)=>node.getBoundingClientRect()).filter((rect)=>rect.top<=viewportTop+12&&rect.bottom>viewportTop&&rect.bottom<Math.min(viewportBottom-80,viewportTop+280));
  const safeTop=Math.max(viewportTop+12,...topBars.map((rect)=>rect.bottom+12));
  const safeBottom=Math.max(12,innerHeight-viewportBottom+12);
  document.documentElement.style.setProperty('--floating-safe-top-px',`${Math.round(safeTop)}px`);
  document.documentElement.style.setProperty('--floating-safe-bottom-px',`${Math.round(safeBottom)}px`);
  controls.forEach((node)=>{node.style.setProperty('--floating-safe-shift-y','0px');(groups[node.dataset.floatingPosition||'bottom_left']||=[]).push(node);});
  Object.values(groups).forEach((group)=>{let x=0;group.sort((a,b)=>(rank[a.dataset.floatingControl]??9)-(rank[b.dataset.floatingControl]??9)).forEach((node)=>{node.style.setProperty('--floating-stack-offset',`${Math.round(x)}px`);x+=node.getBoundingClientRect().width+8;});});
  controls.forEach((node)=>{
    const rect=node.getBoundingClientRect(),topPosition=(node.dataset.floatingPosition||'').startsWith('top');
    let shift=topPosition&&rect.top<safeTop?safeTop-rect.top:(!topPosition&&rect.bottom>viewportBottom-12?viewportBottom-12-rect.bottom:0);
    const current=()=>({left:rect.left,right:rect.right,top:rect.top+shift,bottom:rect.bottom+shift});
    const ordered=[...obstacles].sort((a,b)=>topPosition?a.getBoundingClientRect().top-b.getBoundingClientRect().top:b.getBoundingClientRect().bottom-a.getBoundingClientRect().bottom);
    ordered.forEach((obstacle)=>{const shifted=current(),other=obstacle.getBoundingClientRect(),overlaps=shifted.left<other.right+10&&shifted.right>other.left-10&&shifted.top<other.bottom+10&&shifted.bottom>other.top-10;if(!overlaps)return;const candidate=topPosition?other.bottom+12-shifted.top:other.top-12-shifted.bottom;if((topPosition&&candidate>0)||(!topPosition&&candidate<0))shift+=candidate;});
    const clamped=current();
    if(clamped.top<viewportTop+8)shift+=viewportTop+8-clamped.top;
    if(clamped.bottom>viewportBottom-8)shift+=viewportBottom-8-clamped.bottom;
    node.style.setProperty('--floating-safe-shift-y',`${Math.round(shift)}px`);
  });
  if(!window.__studioframeFloatingLayoutBound){window.__studioframeFloatingLayoutBound=1;let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;layoutFloatingControls();});};addEventListener('resize',schedule,{passive:true});addEventListener('scroll',schedule,{passive:true});addEventListener('hashchange',schedule);addEventListener('popstate',schedule);new MutationObserver(schedule).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','class']});}
}
function applyFloatingControls(builder={},navigation={}){ensureFloatingControlGlyphs();const c=floatingControlsFor(builder,navigation),m=$('#siteFloatingMenuControl'),w=$('#siteFloatingWhatsappControl'),wa=$('#floatingWhatsapp'),q=$('#globalQuoteDock');applyFloatingControlNode(m,'menu',c.menu);document.body.classList.toggle('side-menu-enabled',c.menu.visible!==false);document.body.dataset.menuPanelSide=c.menu.position.endsWith('right')?'right':'left';if($('#siteMenuLabel'))$('#siteMenuLabel').textContent=c.menu.label||'Menu';applyFloatingControlNode(w,'whatsapp',c.whatsapp);if(wa){const f=builder.global?.footer||{},s=builder.services||{},n=String(c.whatsapp.number||f.whatsapp_number||s.whatsapp_number||'').replace(/\D/g,''),msg=String(c.whatsapp.message||f.whatsapp_message||s.whatsapp_message||'').trim();wa.href=n?`https://wa.me/${n}${msg?`?text=${encodeURIComponent(msg)}`:''}`:'#';wa.dataset.displayMode=c.whatsapp.display_mode||'icon';w.hidden=c.whatsapp.visible===false||!n;const label=$('#floatingWhatsappLabel');if(label){label.textContent=c.whatsapp.label||'WhatsApp';label.hidden=c.whatsapp.display_mode!=='label';}wa.setAttribute('aria-label',c.whatsapp.label||'Abrir WhatsApp')}if(q){applyFloatingControlNode(q,'quote',c.quote);q.hidden=!quoteEnabled()||c.quote.visible===false;q.dataset.showIcon=c.quote.show_icon===false?'false':'true';const l=q.querySelector('[data-quote-label]');if(l)l.textContent=c.quote.label||'Orçamento';const icon=q.querySelector('.quote-dock-icon');if(icon)icon.hidden=c.quote.show_icon===false;q.setAttribute('aria-label',c.quote.label||'Orçamento')}requestAnimationFrame(layoutFloatingControls);return c}

function safePublicContactUrl(value=''){const raw=String(value||'').trim();if(!raw)return '';try{const parsed=new URL(raw);return ['https:','http:'].includes(parsed.protocol)?parsed.href:'';}catch(_error){return '';}}
function renderStructuredAboutContact(builder={},identity={}){
  const about=builder.about||{},contact=builder.contact||{},profile=$('#aboutStructuredProfile');if(profile){profile.replaceChildren();const headline=String(about.headline||'').trim(),location=String(about.location||'').trim(),education=(Array.isArray(about.education)?about.education:[]).filter((row)=>row&&row.visible!==false&&(row.institution||row.course||row.degree||row.period||row.description)),specialties=(Array.isArray(about.specialties)?about.specialties:[]).map((value)=>String(value||'').trim()).filter(Boolean);if(headline||location){const intro=document.createElement('div');intro.className='about-profile-meta';if(headline){const strong=document.createElement('strong');strong.textContent=headline;intro.append(strong);}if(location){const span=document.createElement('span');span.textContent=location;intro.append(span);}profile.append(intro);}if(education.length){const group=document.createElement('section');group.className='about-profile-group about-education';const label=document.createElement('small');label.textContent='FORMAÇÃO';const list=document.createElement('div');list.className='about-education-list';education.sort((a,b)=>Number(a.order||0)-Number(b.order||0)).forEach((row)=>{const article=document.createElement('article');const main=document.createElement('div');const title=document.createElement('strong');title.textContent=[row.course,row.degree].filter(Boolean).join(' · ')||row.institution||'Formação';const institution=document.createElement('span');institution.textContent=[row.institution,row.period].filter(Boolean).join(' · ');main.append(title);if(institution.textContent)main.append(institution);article.append(main);if(row.description){const p=document.createElement('p');p.textContent=row.description;article.append(p);}list.append(article);});group.append(label,list);profile.append(group);}if(specialties.length){const group=document.createElement('section');group.className='about-profile-group about-specialties';const label=document.createElement('small');label.textContent='ESPECIALIDADES';const list=document.createElement('div');list.className='about-specialty-list';specialties.forEach((value)=>{const span=document.createElement('span');span.textContent=value;list.append(span);});group.append(label,list);profile.append(group);}const linkedin=safePublicContactUrl(about.linkedin_url);if(linkedin){const link=document.createElement('a');link.className='about-linkedin';link.href=linkedin;link.target='_blank';link.rel='noopener';link.textContent='LinkedIn ↗';profile.append(link);}profile.hidden=!profile.children.length;}
  document.body.dataset.aboutContactCombined=about.combine_contact===true?'true':'false';
  const site=$('#contactSite'),instagram=$('#contactInstagram'),linkedin=$('#contactLinkedin'),email=$('#contactEmail'),whatsapp=$('#contactWhatsapp');const footer=builder.global?.footer||{},floating=builder.floating_controls?.whatsapp||{};if(site){site.href=identity.site_url||'#';site.hidden=!identity.site_url;}const instagramUrl=safePublicContactUrl(contact.instagram_url||identity.instagram_url);if(instagram){instagram.href=instagramUrl||'#';instagram.hidden=!instagramUrl;}const linkedinUrl=safePublicContactUrl(contact.linkedin_url||about.linkedin_url);if(linkedin){linkedin.href=linkedinUrl||'#';linkedin.hidden=!linkedinUrl;}const emailValue=String(contact.email||'').trim();if(email){email.href=emailValue?`mailto:${emailValue}`:'#';email.hidden=!emailValue;}const phone=String(contact.whatsapp||floating.number||footer.whatsapp_number||'').replace(/\D/g,''),message=String(floating.message||footer.whatsapp_message||'').trim();if(whatsapp){whatsapp.href=phone?`https://wa.me/${phone}${message?`?text=${encodeURIComponent(message)}`:''}`:'#';whatsapp.hidden=!phone;whatsapp.textContent=`${contact.cta_label||'Vamos trabalhar juntos'} ↗`;}}

function applyThemeRuntimeFoundation(builder={}) {
  const applyResolved=()=>{
    // The runtime script may finish loading after an editor-preview patch. Always
    // resolve against the newest draft instead of the builder captured by the
    // initial persisted render, otherwise that late load can restore an old theme.
    const currentBuilder=DATA.site_builder&&typeof DATA.site_builder==='object'?DATA.site_builder:builder;
    if(window.StudioFrameThemeRuntime?.manifestFromBuilder){DATA.theme_runtime=window.StudioFrameThemeRuntime.manifestFromBuilder(currentBuilder,DATA.theme_runtime||{});return window.StudioFrameThemeRuntime.apply(DATA.theme_runtime);}
    const cfg=currentBuilder.theme||{},id=String(cfg.theme_id||DATA.theme_runtime?.active_theme?.id||'studioframe-default'),variant=String(cfg.theme_variant_id||DATA.theme_runtime?.active_variant?.id||`${id}--base`);document.body.dataset.sfTheme=id;document.body.dataset.sfThemeVariant=variant.startsWith(`${id}--`)?variant:`${id}--base`;return null;
  };
  document.documentElement.dataset.sfThemeRuntime='7.8.7';
  const scriptId='studioframe-theme-runtime-script';
  if(!document.getElementById(scriptId)){const script=document.createElement('script');script.id=scriptId;script.src=studioFrameRuntimeAssetUrl('themes/theme-runtime.js');script.async=true;script.addEventListener('load',applyResolved,{once:true});document.head.append(script);}else applyResolved();
  return DATA.theme_runtime||{};
}

function renderSiteBuilder() {
  const builder = DATA.site_builder || {};
  const navigation = builder.navigation || {};
  const hero = builder.hero || {};
  const lettering = builder.lettering || {};
  const projects = builder.projects || {};
  const about = builder.about || {};
  const contact = builder.contact || {};
  const identity = DATA.identity || {};
  applyGlobalHeader(builder, navigation, identity);
  const appearance = applySiteAppearance(builder, identity);
  applyThemeRuntimeFoundation(builder);
  applyGlobalFooter(builder, identity);
  const animations = builder.animations || {};
  const globalAnimation = animations.global || {};
  const textAnimation = animations.texts || {};
  visualLayout = builder.layout || {};
  const requestedPerformance=['auto','light','balanced','cinematic'].includes(visualLayout.performance_profile)?visualLayout.performance_profile:'auto';
  const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  const constrainedDevice=Boolean(connection?.saveData)||Number(navigator.deviceMemory||8)<=4||Number(navigator.hardwareConcurrency||8)<=4||matchMedia('(max-width: 800px)').matches||reduced;
  document.body.dataset.performanceProfile=requestedPerformance==='auto'?(constrainedDevice?'light':'balanced'):requestedPerformance;
  const motionPreset = visualLayout.motion_enabled === false ? 'off' : (appearance.motion_preset || visualLayout.motion_preset || 'cinematic');
  document.body.dataset.motion = motionPreset;
  document.body.dataset.reveal = appearance.reveal_preset || visualLayout.reveal_style || 'cinematic';
  document.body.dataset.projectViewer = visualLayout.project_viewer || 'fullscreen';
  document.body.dataset.cardInteraction = visualLayout.card_interaction || 'responsive';
  document.body.dataset.cardVideoPreview = visualLayout.card_video_preview === false ? 'off' : (visualLayout.card_video_preview_mode || 'hover');
  document.body.dataset.ambient = visualLayout.ambient_motion === false ? 'off' : (visualLayout.ambient_strength || 'medium');
  document.body.dataset.backgroundMotion = appearance.background_animation || globalAnimation.background_motion || document.body.dataset.ambient || 'medium';
  document.body.dataset.sectionFlow = globalAnimation.section_flow || 'integrated';
  document.body.dataset.textAnimation = textAnimation.type || 'reveal';
  document.body.dataset.textDirection = textAnimation.direction || 'up';
  document.documentElement.style.setProperty('--text-duration', `${Math.max(0, Number(textAnimation.duration ?? 800))}ms`);
  document.documentElement.style.setProperty('--text-delay', `${Math.max(0, Number(textAnimation.delay ?? 100))}ms`);
  document.documentElement.style.setProperty('--text-easing', textAnimation.easing || 'ease-out');
  document.documentElement.style.setProperty('--text-offset', `${Math.max(0, Number(textAnimation.offset ?? 40))}px`);
  document.body.classList.toggle('hero-expand-enabled', visualLayout.hero_expand !== false);
  document.body.classList.toggle('card-parallax-enabled', appearance.parallax_preset !== 'off' && visualLayout.card_parallax !== false);

  const heroNode = $('#hero');
  if (heroNode) {
    heroNode.dataset.height = hero.height || 'fullscreen';
    heroNode.dataset.format = hero.format || 'cinema21';
    heroNode.dataset.fit = hero.fit || 'cover';
    heroNode.dataset.mobileFit = hero.mobile_fit || hero.fit || 'cover';
    heroNode.dataset.mobileFormat = hero.mobile_format || 'portrait45';
    heroNode.dataset.textPosition = hero.text_position || 'bottom-left';
    heroNode.dataset.overlay = hero.overlay || 'medium';
    heroNode.dataset.effect = hero.effect || 'cinematic';
    heroNode.dataset.productScroll = (hero.effect || 'cinematic') === 'zoom' ? 'enabled' : 'disabled';
    const refW=Math.max(640,Number(hero.reference_width||2560));
    const refH=Math.max(320,Number(hero.reference_height||1080));
    heroNode.style.setProperty('--hero-reference-ratio', String(refW/refH));
    heroNode.style.setProperty('--hero-reference-height-vw', `${(refH/refW)*100}vw`);
    heroNode.style.setProperty('--hero-frame-bg', hero.frame_bg || '#090909');
    heroNode.style.setProperty('--hero-position-x', `${Math.max(0, Math.min(100, Number(hero.position_x ?? 50)))}%`);
    heroNode.style.setProperty('--hero-position-y', `${Math.max(0, Math.min(100, Number(hero.position_y ?? 50)))}%`);
    heroNode.style.setProperty('--hero-mobile-position-x', `${Math.max(0, Math.min(100, Number(hero.mobile_position_x ?? hero.position_x ?? 50)))}%`);
    heroNode.style.setProperty('--hero-mobile-position-y', `${Math.max(0, Math.min(100, Number(hero.mobile_position_y ?? hero.position_y ?? 50)))}%`);
    const mobileRefW=Math.max(480,Number(hero.mobile_reference_width||1080));
    const mobileRefH=Math.max(480,Number(hero.mobile_reference_height||1350));
    heroNode.style.setProperty('--hero-mobile-reference-ratio', String(mobileRefW/mobileRefH));
    heroNode.style.setProperty('--hero-mobile-reference-height-vw', `${(mobileRefH/mobileRefW)*100}vw`);
  }
  if ($('#heroTitle')) $('#heroTitle').textContent = hero.title || identity.portfolio_title || 'Portfólio';
  if ($('#heroDescription')) $('#heroDescription').textContent = hero.subtitle || identity.description || '';
  if ($('#heroKicker')) $('#heroKicker').textContent = hero.kicker || 'Portfólio · Direção criativa';
  if ($('#heroCtaLabel')) $('#heroCtaLabel').textContent = hero.cta_label || 'Explorar projeto';
  if ($('#heroScrollLabel')) $('#heroScrollLabel').textContent = hero.scroll_label || 'Role para explorar';
  document.documentElement.style.setProperty('--hero-rotation-ms', `${Math.max(3, Math.min(20, Number(hero.rotation_seconds || 6.2))) * 1000}ms`);

  const letteringNode = $('#lettering');
  if (letteringNode) {
    letteringNode.hidden = lettering.visible === false || !String(lettering.text || identity.hero_line || '').trim();
    letteringNode.dataset.style = lettering.style || 'split';
    letteringNode.dataset.direction = lettering.direction || 'left';
    letteringNode.dataset.speed = lettering.speed || 'medium';
  }
  if ($('#letteringEyebrow')) $('#letteringEyebrow').textContent = lettering.eyebrow || identity.studio_name || 'Mensagem Studio';
  const letteringText = String(lettering.text || identity.hero_line || '');
  applyLetteringCopy($('#letteringText'),$('#letteringClone'),letteringText,lettering.style||'split');

  if ($('#sideMenuTitle')) $('#sideMenuTitle').textContent = navigation.menu_title || 'Navegação';
  if ($('#sideMenuStudio')) $('#sideMenuStudio').textContent = identity.studio_name || 'Mensagem Studio';
  document.documentElement.style.setProperty('--site-menu-panel-width', `${Math.max(320,Math.min(760,Number(navigation.menu_panel_width||520)))}px`);
  document.documentElement.style.setProperty('--site-menu-text-size', `${Math.max(24,Math.min(64,Number(navigation.menu_text_size||48)))}px`);
  applyFloatingControls(builder,navigation);

  const projectsHasEyebrow=Object.prototype.hasOwnProperty.call(projects,'eyebrow');
  const projectsHasTitle=Object.prototype.hasOwnProperty.call(projects,'title');
  const projectEyebrowText=String(projectsHasEyebrow?(projects.eyebrow??''):'Portfólio selecionado').trim();
  const projectHeadingText=String(projectsHasTitle?(projects.title??''):'Projetos').trim();
  if ($('#projectsEyebrow')) {$('#projectsEyebrow').textContent=projectEyebrowText;$('#projectsEyebrow').hidden=!projectEyebrowText;}
  if ($('#projectsTitle')) {$('#projectsTitle').textContent=projectHeadingText;$('#projectsTitle').hidden=!projectHeadingText;}
  const configuredIntro=publicHomeBlocks().find((block)=>block?.type==='intro');
  const introText=String(configuredIntro?.title ?? 'Design, vídeo e direção criativa para marcas que precisam se destacar.').trim();
  const introNode=$('#introBlock');if(introNode){introNode.hidden=configuredIntro?.visible===false||!introText;introNode.classList.toggle('is-empty-heading',!introText);}
  const projectHeading=$('#portfolioHeading');if(projectHeading)projectHeading.hidden=projects.visible===false||projects.header_visible===false||(!projectHeadingText&&!projectEyebrowText);
  const showProjects = projects.visible !== false;
  const filterBarMode=['menu','inline'].includes(projects.filters?.display_mode)?projects.filters.display_mode:'inline';
  document.body.dataset.filterBarMode=filterBarMode;
  $('#portfolioHeading')?.toggleAttribute('hidden', !showProjects || projects.header_visible===false || (!projectHeadingText&&!projectEyebrowText));
  $('#filters')?.toggleAttribute('hidden', !showProjects || filterBarMode==='menu');
  $('#projects')?.toggleAttribute('hidden', !showProjects);

  if ($('#aboutEyebrow')) $('#aboutEyebrow').textContent = about.eyebrow || 'Mensagem Studio';
  if ($('#aboutTitle')) $('#aboutTitle').textContent = about.title || '';
  if ($('#aboutBody')) $('#aboutBody').textContent = about.body || '';
  $('#about')?.toggleAttribute('hidden', about.visible === false);

  if ($('#contactEyebrow')) $('#contactEyebrow').textContent = contact.eyebrow || 'Contato';
  if ($('#contactTitle')) $('#contactTitle').textContent = contact.title || '';
  if ($('#contactBody')) $('#contactBody').textContent = contact.body || '';
  $('#contact')?.toggleAttribute('hidden', contact.visible === false);

  renderStructuredAboutContact(builder,identity);
}

const CORE_HOME_BLOCK_IDS = {
  hero: 'hero', intro: 'introBlock', lettering: 'lettering', projects_header:'portfolioHeading', projects: 'projectsBlock', about: 'about', contact: 'contact',
};

function publicHomeBlocks() {
  const defaults = [
    { id:'core-hero', type:'hero', visible:true, core:true, section_size:'viewport', section_width:'full' },
    { id:'core-intro', type:'intro', visible:true, core:true, eyebrow:'O QUE FAZEMOS', title:'Design, vídeo e direção criativa para marcas que precisam se destacar.', section_size:'normal', section_width:'full' },
    { id:'core-lettering', type:'lettering', visible:true, core:true, eyebrow:'MENSAGEM STUDIO', title:'Ideias que ganham forma, ritmo e presença.', section_size:'normal', section_width:'full' },
    { id:'core-projects-header', type:'projects_header', visible:true, core:true, eyebrow:'Portfólio selecionado', title:'Projetos', body:'', text_align:'left', section_size:'normal', section_width:'content' },
    { id:'core-projects', type:'projects', visible:true, core:true, section_size:'normal', section_width:'full', grid_columns:'3' },
    { id:'youtube-showcase-main', type:'youtube_showcase', label:'YouTube Showcase', visible:true, youtube_url:'https://www.youtube.com/watch?v=G_2jdXfXxiI', title:'', body:'', primary_cta_label:'Assistir', youtube_cta_label:'Ver no YouTube', channel_url:'', channel_cta_label:'Conheça o canal', show_external_link:true, show_channel_link:false, ratio:'16:9', width:'wide', section_size:'normal', section_width:'wide', section_background:'none' },
    { id:'core-about', type:'about', visible:true, core:true, section_size:'normal', section_width:'full' },
    { id:'core-contact', type:'contact', visible:true, core:true, section_size:'normal', section_width:'full' },
  ];
  if (!Array.isArray(DATA.site_builder?.home?.blocks)) return defaults;
  const configured=DATA.site_builder.home.blocks.filter((block) => block && block.type).map((block) => ({ section_size:'normal', section_width:'full', section_background:'none', ...block }));
  const removed=DATA.site_builder.home.youtube_showcase_removed===true;
  if(!removed&&!configured.some((block)=>block.type==='youtube_showcase')){
    const required={...defaults.find((block)=>block.type==='youtube_showcase')};
    const projectIndex=configured.findIndex((block)=>block.type==='projects');
    configured.splice(projectIndex>=0?projectIndex+1:configured.length,0,required);
  }
  return configured;
}

function projectForBlock(ref = '') {
  const projects = (DATA.projects || []).filter((project) => !project.hidden);
  if (ref) {
    const match = projects.find((project) => String(project.project_id || '') === String(ref) || String(project.id || '') === String(ref));
    if (match) return match;
  }
  return projects.find((project) => project.featured) || projects.find((project) => project.hero) || projects[0] || null;
}

function blockHeading(block, fallbackTitle = '') {
  const head = document.createElement('div');
  head.className = 'modular-heading';
  if (block.eyebrow) {
    const eyebrow = document.createElement('small');
    eyebrow.textContent = block.eyebrow;
    head.append(eyebrow);
  }
  const titleText = block.title || fallbackTitle;
  if (titleText) {
    const title = document.createElement('h2');
    title.textContent = titleText;
    title.dataset.parallaxText = '10';
    head.append(title);
  }
  if (block.body) {
    const body = document.createElement('p');
    body.textContent = block.body;
    head.append(body);
  }
  return head;
}

function blockPoster(project, className = '') {
  const media = document.createElement('div');
  media.className = `modular-media ${className}`.trim();
  const inner = document.createElement('div');
  inner.className = 'modular-media-inner';
  if (visualLayout.card_parallax !== false) inner.dataset.parallax = 'detail';
  const asset = heroAsset(project);
  const image = poster(asset);
  inner.append(image);
  media.append(inner);
  return media;
}

function bindBlockOpen(node, project) {
  if (!node || !project) return;
  node.classList.add('is-clickable');
  node.setAttribute('role', 'button');
  node.setAttribute('tabindex', '0');
  node.setAttribute('aria-label', `Abrir projeto ${project.title || ''}`.trim());
  const open = () => openProjectDetail(project);
  node.addEventListener('click', (event) => {
    if (event.target.closest('a,button,video,iframe')) return;
    open();
  });
  node.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); }
  });
}

function createShowcaseBlock(block) {
  const project = projectForBlock(block.project_id);
  if (!project) return null;
  const section = document.createElement('section');
  section.className = 'modular-block block-showcase reveal';
  const media = blockPoster(project, 'showcase-media');
  const copy = blockHeading(block, project.title);
  if (!block.body && project.description) {
    const p = document.createElement('p'); p.textContent = project.description; copy.append(p);
  }
  const action = document.createElement('span'); action.className = 'modular-action'; action.textContent = 'Ver projeto ↗'; copy.append(action);
  section.append(media, copy);
  bindBlockOpen(section, project);
  return section;
}

function createFullMediaBlock(block,context={}) {
  const section=document.createElement('section');section.className='modular-block block-full-media reveal';if(block.title) section.append(blockHeading(block));
  if(block.media_id&&typeof context.mediaResolver==='function'){
    const direct=context.mediaResolver(block.media_id),media=document.createElement('div');media.className='full-media-stage';const directNode=context.mediaNode?.(direct)||null;if(directNode)media.append(directNode);else return null;section.append(media);if(block.caption){const cap=document.createElement('p');cap.className='service-commercial-caption';cap.textContent=block.caption;section.append(cap);}return section;
  }
  const project=projectForBlock(block.project_id);if(!project)return null;const gallery=galleryFor(project);const mediaItem=(gallery.items||[]).find((item)=>['image','video'].includes(item.type))||project;const media=document.createElement('div');media.className='full-media-stage';if(mediaItem.type==='video')media.append(projectVideo(mediaItem));else{const inner=document.createElement('div');inner.className='modular-media-inner';inner.dataset.parallax='detail';inner.append(projectImage(mediaItem));media.append(inner);}section.append(media);bindBlockOpen(media,project);return section;
}

function createSplitBlock(block) {
  const project = projectForBlock(block.project_id);
  if (!project) return null;
  const section = document.createElement('section');
  section.className = `modular-block block-split reveal media-${block.media_side === 'right' ? 'right' : 'left'}`;
  const media = blockPoster(project, 'split-media');
  const copy = blockHeading(block, project.title);
  if (!block.body && project.description) { const p=document.createElement('p'); p.textContent=project.description; copy.append(p); }
  section.append(media, copy);
  bindBlockOpen(media, project);
  return section;
}

function createHorizontalProjectsBlock(block) {
  const projects = editorialProjectsForBlock(block, 12);
  if (!projects.length) return null;
  const section = document.createElement('section');
  section.className = 'modular-block block-horizontal reveal';
  section.append(blockHeading(block, 'Projetos em destaque'));
  const track = document.createElement('div'); track.className = 'horizontal-project-track';
  projects.forEach((project, index) => track.append(card(project, index)));
  section.append(track);
  return section;
}

function modularProjectsForCategory(categoryId = 'all', limit = 12) {
  return (DATA.projects || []).filter((project) => {
    if (project.hidden) return false;
    if (!categoryId || categoryId === 'all') return true;
    return String(project.section_id || project.physical_category_id || '') === String(categoryId);
  }).slice(0, Math.max(1, Number(limit) || 12));
}

function startContinuousCarousel(section, viewport, strip, { speed = 30, direction = 'left', loop = true, pauseOnHover = true } = {}) {
  let raf=0,last=0,paused=false,visible=true,x=0,cycle=0;
  const velocity=Math.max(8,Math.min(160,Number(speed||30))) * (direction==='right'?1:-1);
  const measure=()=>{
    const full=Math.max(strip.scrollWidth,strip.getBoundingClientRect().width);
    cycle=Math.max(1,loop?full/2:Math.max(0,full-viewport.clientWidth));
    if(direction==='right'&&x===0&&loop)x=-cycle;
  };
  const tick=(time)=>{
    if(!section.isConnected){cancelAnimationFrame(raf);return;}
    if(!last)last=time;
    const delta=Math.min(48,time-last);last=time;
    if(!paused&&visible&&cycle>1){
      x+=velocity*delta/1000;
      if(loop){while(x<=-cycle)x+=cycle;while(x>=0)x-=cycle;}
      else x=Math.max(-cycle,Math.min(0,x));
      strip.style.transform=`translate3d(${x.toFixed(2)}px,0,0)`;
    }
    raf=requestAnimationFrame(tick);
  };
  requestAnimationFrame(()=>{measure();raf=requestAnimationFrame(tick);});
  if(pauseOnHover){
    section.addEventListener('pointerenter',()=>{paused=true;});
    section.addEventListener('pointerleave',()=>{paused=false;last=performance.now();});
    section.addEventListener('focusin',()=>{paused=true;});
    section.addEventListener('focusout',()=>{paused=false;last=performance.now();});
  }
  const visibilityObserver=new IntersectionObserver((entries)=>{visible=entries.some((entry)=>entry.isIntersecting);if(visible)last=performance.now();},{threshold:[0,.02]});
  visibilityObserver.observe(section);
  if('ResizeObserver' in window)new ResizeObserver(()=>{measure();}).observe(viewport);
  return section;
}

function createAutoCarouselBlock(block) {
  const projects = editorialProjectsForBlock(block, 8);
  if (!projects.length) return null;
  const section = document.createElement('section');
  section.className = 'modular-block block-auto-carousel reveal';
  section.dataset.speed = block.speed || 'medium';
  section.dataset.direction = block.direction || 'left';
  section.dataset.pauseHover = block.pause_on_hover === false ? 'false' : 'true';
  section.dataset.motionMode = block.motion_mode === 'manual' ? 'manual' : 'auto';
  section.dataset.cardGap = block.card_gap || 'normal';
  section.dataset.hoverEffect = block.hover_effect || 'glow';
  section.append(blockHeading(block, 'Em destaque'));
  const viewport = document.createElement('div'); viewport.className = 'auto-carousel-viewport';
  const strip = document.createElement('div'); strip.className = 'auto-carousel-strip';
  const addSet = (clone = false) => projects.forEach((project, index) => {
    const node = applyCarouselCardAppearance(card(project, index), block);
    node.classList.add('auto-carousel-card');
    if (clone) { node.dataset.carouselClone = '1'; node.setAttribute('aria-hidden','true'); node.tabIndex = -1; }
    strip.append(node);
  });
  addSet(false);
  const autoMode = section.dataset.motionMode === 'auto';
  if (autoMode) addSet(true);
  viewport.append(strip); section.append(viewport);
  if (!autoMode || (reduced && block.force_motion !== true)) {
    viewport.classList.add('is-manual');
    return section;
  }
  const pxPerSecond = { slow:18, medium:30, fast:48 }[block.speed || 'medium'] || 30;
  return startContinuousCarousel(section,viewport,strip,{speed:pxPerSecond,direction:block.direction||'left',loop:true,pauseOnHover:block.pause_on_hover!==false});
}

function createSpotlightBlock(block) {
  const project = projectForBlock(block.project_id);
  if (!project) return null;
  const section = document.createElement('section');
  section.className = 'modular-block block-spotlight reveal';
  const media = blockPoster(project, 'spotlight-media');
  const copy = blockHeading(block, project.title);
  if (!block.body && project.description) { const p=document.createElement('p'); p.textContent=project.description; copy.append(p); }
  const action = document.createElement('button'); action.type='button'; action.className='spotlight-action story-link'; action.textContent = block.button_label || 'Ver projeto';
  action.addEventListener('click', (event) => { event.stopPropagation(); openProjectDetail(project); });
  copy.append(action); section.append(media, copy); bindBlockOpen(media, project);
  return section;
}

function createMarqueeBlock(block) {
  const text = String(block.title || '').trim();
  if (!text) return null;
  const section = document.createElement('section'); section.className='modular-block block-marquee reveal';
  section.dataset.speed = block.speed || 'medium'; section.dataset.direction = block.direction || 'left';
  if (block.eyebrow) { const eyebrow=document.createElement('div'); eyebrow.className='marquee-eyebrow'; eyebrow.textContent=block.eyebrow; section.append(eyebrow); }
  const viewport=document.createElement('div'); viewport.className='marquee-viewport';
  const track=document.createElement('div'); track.className='marquee-strip';
  for(let i=0;i<4;i++){ const span=document.createElement('span'); span.textContent=text; if(i>1) span.setAttribute('aria-hidden','true'); track.append(span); }
  viewport.append(track); section.append(viewport); return section;
}

function createCtaBlock(block,context={}) {
  const section=document.createElement('section');section.className='modular-block block-cta reveal';const copy=blockHeading(block,context.defaultTitle||'Vamos criar algo juntos?');const raw=String(block.button_url||context.defaultButtonUrl||'').trim();const label=block.button_label||context.defaultButtonLabel||'Entrar em contato';if(label){const allowed=/^(https?:|mailto:|tel:)/i.test(raw)?raw:'';const action=document.createElement(allowed?'a':'button');action.className='cta-action story-link';action.textContent=label;if(allowed){action.href=allowed;if(/^https?:/i.test(allowed)){action.target='_blank';action.rel='noopener';}}else{action.type='button';action.addEventListener('click',()=>$('#contact')?.scrollIntoView({behavior:'auto'}));}copy.append(action);}section.append(copy);return section;
}

function createTextBlock(block) {
  const section = document.createElement('section');
  section.className = 'modular-block block-text reveal';
  section.append(blockHeading(block));
  return section;
}

function structuredLines(value='') {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const split = line.indexOf('|');
    return split < 0 ? { lead:line, body:'' } : { lead:line.slice(0,split).trim(), body:line.slice(split+1).trim() };
  });
}

function createStructuredContentBlock(block, type) {
  const items = structuredLines(block.body);
  if (!items.length) return null;
  const section = document.createElement('section');
  section.className = `modular-block block-${type} reveal`;
  section.append(blockHeading({ ...block, body:'' }, block.title || ''));
  const list = document.createElement('div'); list.className = `${type}-list`;
  items.forEach((item, index) => {
    if (type === 'accordion') {
      const details=document.createElement('details');details.className='accordion-item';
      const summary=document.createElement('summary');summary.innerHTML=`<span>${String(index+1).padStart(2,'0')}</span><strong>${esc(item.lead)}</strong><b>＋</b>`;
      const p=document.createElement('p');p.textContent=item.body;details.append(summary,p);list.append(details);return;
    }
    const article=document.createElement('article');article.className=`${type}-item`;
    const number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');
    const lead=document.createElement(type==='metrics'?'strong':'h3');lead.textContent=item.lead;
    const body=document.createElement('p');body.textContent=item.body;
    article.append(number,lead,body);list.append(article);
  });
  section.append(list);return section;
}

function createCustomLetteringBlock(block) {
  const text = String(block.title || '').trim();
  if (!text) return null;
  const section = document.createElement('section');
  section.className = 'modular-block block-lettering reveal';
  section.dataset.style = block.style || 'split';
  section.dataset.direction = block.direction || 'left';
  section.dataset.speed = 'medium';
  if (block.eyebrow) { const eyebrow=document.createElement('div'); eyebrow.className='lettering-eyebrow'; eyebrow.textContent=block.eyebrow; section.append(eyebrow); }
  const mask=document.createElement('div'); mask.className='lettering-mask';
  const track=document.createElement('div'); track.className='lettering-track block-lettering-track'; track.dataset.modularLettering='1';
  const primary=document.createElement('span'); primary.className='lettering-primary';
  const outline=document.createElement('span'); outline.className='lettering-outline'; outline.setAttribute('aria-hidden','true');
  applyLetteringCopy(primary,outline,text,section.dataset.style);
  track.append(primary,outline); mask.append(track); section.append(mask);
  return section;
}

function createVideoFeatureBlock(block) {
  const project = projectForBlock(block.project_id);
  if (!project) return null;
  const gallery = galleryFor(project);
  const item = (gallery.items || []).find((entry) => entry.type === 'video') || (project.type === 'video' ? project : null);
  if (!item) return createShowcaseBlock(block);
  const section=document.createElement('section'); section.className='modular-block block-video-feature reveal';
  const copy=blockHeading(block,project.title);
  if (!block.body && project.description) { const p=document.createElement('p'); p.textContent=project.description; copy.append(p); }
  const media=document.createElement('div'); media.className='video-feature-stage';
  media.append(projectVideoFallback(item,{autoplay:block.autoplay!==false}));
  section.append(copy,media);
  return section;
}

function publicMediaById(mediaId = '') {
  const id = String(mediaId || '');
  if (!id) return null;
  for (const project of (DATA.projects || [])) {
    if (String(project.id || '') === id) return { ...project, _project: project };
    const item = (project.gallery_items || []).find((entry) => String(entry.id || '') === id);
    if (item) return { ...item, _project: project };
  }
  const asset = (DATA.hero_assets || []).find?.((entry) => String(entry.id || '') === id);
  return asset ? { ...asset, _project: null } : null;
}

function editorialProjectFromItem(item = {}) {
  let project = projectForBlock(item.project_id || '');
  const media = publicMediaById(item.media_id || '');
  if (!project && media?._project) project = media._project;
  if (!project) return null;
  const result = { ...project };
  if (item.title) result.title = item.title;
  if (item.description) result.description = item.description;
  if (media) {
    result.type = media.type || result.type;
    result.media_url = media.media_url || result.media_url;
    result.media_candidates = media.media_candidates || result.media_candidates;
    result.thumbnail_url = media.thumbnail_url || media.media_url || result.thumbnail_url;
    result.thumbnail_candidates = media.thumbnail_candidates || media.media_candidates || result.thumbnail_candidates;
    result.preview_url = media.preview_url || result.preview_url;
    result.preview_candidates = media.preview_candidates || result.preview_candidates;
    result.editorial_media_id = media.id || '';
  }
  result.editorial_action_label = item.action_label || '';
  result.editorial_action_url = item.action_url || '';
  return result;
}

function safeEditorialActionUrl(value='') {
  const raw=String(value||'').trim();
  if(!raw)return '';
  if(raw.startsWith('/')||raw.startsWith('#'))return raw;
  try { const parsed=new URL(raw); return ['https:','http:','mailto:','tel:'].includes(parsed.protocol)?parsed.href:''; }
  catch (_error) { return ''; }
}
function safeLinkUrl(value=''){return safeEditorialActionUrl(value);}

function editorialProjectsForBlock(block, fallbackLimit = 12) {
  const configured = Array.isArray(block.items) ? block.items.map(editorialProjectFromItem).filter(Boolean) : [];
  if (configured.length) return configured;
  if (block.content_mode === 'selected') return [];
  return modularProjectsForCategory(block.category_id || 'all', fallbackLimit);
}

function applyCarouselCardAppearance(node, block = {}) {
  if (!node) return node;
  const media = node.querySelector('.media');
  const ratios = { '16x9':'16 / 9', '4x3':'4 / 3', '1x1':'1 / 1', '4x5':'4 / 5' };
  if (media) media.style.aspectRatio = ratios[block.card_ratio || '16x9'] || ratios['16x9'];
  node.dataset.carouselHover = block.hover_effect || 'glow';
  node.style.setProperty('--carousel-cards-desktop', String(Math.max(2, Math.min(4, Number(block.cards_desktop || 3)))));
  node.style.setProperty('--carousel-cards-mobile', String(Math.max(1, Math.min(2, Number(block.cards_mobile || 1)))));
  return node;
}

function createEditorialCarouselBlock(block) {
  const projects = editorialProjectsForBlock(block, 12);
  if (!projects.length) return null;
  const section = document.createElement('section');
  const format = block.format === 'card45' ? 'card45' : 'wide';
  const mode = block.motion_mode === 'auto' ? 'auto' : 'manual';
  section.className = `modular-block editorial-section block-editorial-carousel format-${format} mode-${mode} reveal`;
  section.dataset.speed = block.speed || 'medium';
  section.dataset.direction = block.direction || 'left';
  section.dataset.cardGap = block.card_gap || 'normal';
  section.dataset.hoverEffect = block.hover_effect || 'glow';
  section.append(blockHeading(block, 'Projetos em movimento'));
  const shell=document.createElement('div'); shell.className='editorial-carousel-shell';
  const viewport=document.createElement('div'); viewport.className='editorial-carousel-viewport';
  const strip=document.createElement('div'); strip.className='editorial-carousel-strip';
  const appendSet=(clone=false)=>projects.forEach((project,index)=>{
    const node=applyCarouselCardAppearance(card(project,index),block); node.classList.add('editorial-carousel-card');
    if(project.editorial_action_label) node.dataset.actionLabel=project.editorial_action_label;
    if(project.editorial_action_url) node.dataset.actionUrl=project.editorial_action_url;
    if(clone){node.dataset.carouselClone='1';node.setAttribute('aria-hidden','true');node.tabIndex=-1;}
    strip.append(node);
  });
  appendSet(false); if(mode==='auto'&&!reduced) appendSet(true);
  viewport.append(strip); shell.append(viewport);
  const controls=String(block.controls||'arrows');
  if(controls!=='none'){
    const control=document.createElement('div'); control.className=`editorial-carousel-controls controls-${controls}`;
    const prev=document.createElement('button'); prev.type='button';prev.className='carousel-prev';prev.textContent='←';prev.setAttribute('aria-label','Anterior');
    const next=document.createElement('button'); next.type='button';next.className='carousel-next';next.textContent='→';next.setAttribute('aria-label','Próximo');
    const status=document.createElement('span'); status.className='carousel-status'; status.textContent=`01 / ${String(projects.length).padStart(2,'0')}`;
    if(controls==='arrows'||controls==='base') control.append(prev,next);
    if(controls==='number'||controls==='base') control.append(status);
    if(controls==='indicators'){
      const dots=document.createElement('div');dots.className='carousel-dots';projects.forEach((_,index)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',`Ir para item ${index+1}`);b.classList.toggle('is-active',index===0);b.addEventListener('click',()=>viewport.scrollTo({left:index*viewport.clientWidth*.72,behavior:reduced?'auto':'smooth'}));dots.append(b);});control.append(dots);
    }
    const step=()=>Math.max(260,format==='wide'?viewport.clientWidth*.78:viewport.clientWidth/3);
    prev.addEventListener('click',()=>viewport.scrollBy({left:-step(),behavior:reduced?'auto':'smooth'}));
    next.addEventListener('click',()=>viewport.scrollBy({left:step(),behavior:reduced?'auto':'smooth'}));
    viewport.addEventListener('scroll',()=>{const approx=Math.max(0,Math.min(projects.length-1,Math.round(viewport.scrollLeft/step())));status.textContent=`${String(approx+1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}`;control.querySelectorAll('.carousel-dots button').forEach((dot,index)=>dot.classList.toggle('is-active',index===approx));},{passive:true});
    shell.append(control);
  }
  section.append(shell);
  if(mode==='auto'&&!reduced){
    let raf=0,last=0,paused=false; const px={slow:18,medium:30,fast:48}[block.speed||'medium']||30; const direction=block.direction==='right'?-1:1;
    const tickAuto=(time)=>{if(!last)last=time;const delta=Math.min(40,time-last);last=time;if(!paused&&viewport.scrollWidth>viewport.clientWidth){viewport.scrollLeft+=direction*px*delta/1000;const half=viewport.scrollWidth/2;if(direction>0&&viewport.scrollLeft>=half)viewport.scrollLeft-=half;if(direction<0&&viewport.scrollLeft<=0)viewport.scrollLeft+=half;}raf=requestAnimationFrame(tickAuto)}; raf=requestAnimationFrame(tickAuto);
    if(block.pause_on_hover!==false){section.addEventListener('pointerenter',()=>paused=true);section.addEventListener('pointerleave',()=>{paused=false;last=performance.now()});}
    section.addEventListener('DOMNodeRemoved',()=>raf&&cancelAnimationFrame(raf),{once:true});
  }
  return section;
}

function createEditorialBlocksBlock(block) {
  const projects=editorialProjectsForBlock(block,9); if(!projects.length)return null;
  const section=document.createElement('section'); section.className=`modular-block editorial-section block-editorial-projects layout-${block.layout||'three'} effect-${block.section_effect||'integrated'} reveal`; section.append(blockHeading(block,'Seleção de projetos'));
  const grid=document.createElement('div');grid.className='editorial-project-grid';projects.forEach((project,index)=>{const node=card(project,index);node.classList.add('editorial-project-card');grid.append(node)});section.append(grid);return section;
}

function normalizeYouTubeVideoId(value='') {
  const raw=String(value||'').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  let url;
  try { url=new URL(raw); } catch (_error) { return ''; }
  const host=String(url.hostname||'').toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
  let id='';
  if (host==='youtu.be') id=String(url.pathname||'').split('/').filter(Boolean)[0]||'';
  else if (host==='youtube.com'||host.endsWith('.youtube.com')||host==='youtube-nocookie.com'||host.endsWith('.youtube-nocookie.com')) {
    if (url.pathname==='/watch') id=url.searchParams.get('v')||'';
    else {
      const parts=String(url.pathname||'').split('/').filter(Boolean);
      if (['embed','shorts','live'].includes(parts[0])) id=parts[1]||'';
    }
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
}

function normalizeSiteAudioConfig(value={}) {
  const position=['bottom_left','bottom_right','top_left','top_right'].includes(value.control_position)?value.control_position:'bottom_left';
  const start=['paused','after_first_interaction','manual'].includes(value.start_mode)?value.start_mode:'manual';
  const behavior=['pause','duck','keep'].includes(value.video_audio_behavior)?value.video_audio_behavior:'pause';
  return {ambient_enabled:value.ambient_enabled===true,source:'youtube',youtube_url:String(value.youtube_url||''),initial_volume:Math.max(0,Math.min(100,Number(value.initial_volume??30))),loop:value.loop!==false,start_mode:start,control_visible:value.control_visible!==false,control_position:position,video_audio_behavior:behavior};
}
function ensureYouTubeIframeApi() {
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(window.__studioframeYouTubeApiPromise)return window.__studioframeYouTubeApiPromise;
  window.__studioframeYouTubeApiPromise=new Promise((resolve,reject)=>{
    const previous=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{try{if(typeof previous==='function')previous();}catch(_error){}resolve(window.YT);};
    let script=document.querySelector('script[data-studioframe-youtube-api]');
    if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.dataset.studioframeYoutubeApi='1';document.head.append(script);}
    script.addEventListener('error',()=>reject(new Error('YouTube IFrame API indisponível')),{once:true});
  });
  return window.__studioframeYouTubeApiPromise;
}
function destroyAmbientAudioPlayer() {
  try{SITE_AUDIO.player?.destroy?.();}catch(_error){}
  SITE_AUDIO.player=null;SITE_AUDIO.playerPromise=null;SITE_AUDIO.videoId='';SITE_AUDIO.playing=false;SITE_AUDIO.userWantsPlaying=false;SITE_AUDIO.resumeAfterMedia=false;SITE_AUDIO.ducked=false;
  $('#studioframeAmbientPlayer')?.remove();
}
function updateAmbientAudioControl() {
  const root=$('#ambientAudioControl');if(!root)return;
  root.dataset.audioState=SITE_AUDIO.playing?'playing':'paused';root.dataset.audioMuted=SITE_AUDIO.muted?'true':'false';
  const play=root.querySelector('[data-audio-play]'),mute=root.querySelector('[data-audio-mute]'),volume=root.querySelector('[data-audio-volume]');
  if(play){play.textContent=SITE_AUDIO.playing?'Ⅱ':'▶';play.setAttribute('aria-label',SITE_AUDIO.playing?'Pausar música ambiente':'Reproduzir música ambiente');play.setAttribute('aria-pressed',SITE_AUDIO.playing?'true':'false');}
  if(mute){mute.textContent=SITE_AUDIO.muted?'×':'◖';mute.setAttribute('aria-label',SITE_AUDIO.muted?'Ativar som da música ambiente':'Silenciar música ambiente');mute.setAttribute('aria-pressed',SITE_AUDIO.muted?'true':'false');}
  if(volume)volume.value=String(SITE_AUDIO.volume);
  requestAnimationFrame(()=>{if(typeof layoutFloatingControls==='function')layoutFloatingControls();});
}
function ensureAmbientAudioControl(config) {
  let root=$('#ambientAudioControl');
  if(!root){
    root=document.createElement('div');root.id='ambientAudioControl';root.className='site-floating-control ambient-audio-control';root.dataset.floatingControl='ambient';root.innerHTML='<span class="ambient-audio-label">AMBIENTE</span><button type="button" data-audio-play aria-label="Reproduzir música ambiente">▶</button><button type="button" data-audio-mute aria-label="Silenciar música ambiente">◖</button><input data-audio-volume type="range" min="0" max="100" step="1" value="30" aria-label="Volume da música ambiente">';
    root.querySelector('[data-audio-play]').addEventListener('click',()=>{SITE_AUDIO.playing?pauseAmbientAudio(true):playAmbientAudio(true);});
    root.querySelector('[data-audio-mute]').addEventListener('click',()=>{SITE_AUDIO.muted=!SITE_AUDIO.muted;try{SITE_AUDIO.muted?SITE_AUDIO.player?.mute?.():SITE_AUDIO.player?.unMute?.();}catch(_error){}updateAmbientAudioControl();});
    root.querySelector('[data-audio-volume]').addEventListener('input',(event)=>{SITE_AUDIO.volume=Math.max(0,Math.min(100,Number(event.target.value||0)));try{SITE_AUDIO.player?.setVolume?.(SITE_AUDIO.volume);}catch(_error){}updateAmbientAudioControl();});
    document.body.append(root);
  }
  root.dataset.floatingPosition=config.control_position;root.dataset.floatingStyle='theme';root.dataset.floatingShape='pill';root.style.setProperty('--floating-control-size','38px');root.style.setProperty('--floating-offset-x','0px');root.style.setProperty('--floating-offset-y','0px');root.hidden=!(config.ambient_enabled&&config.control_visible&&normalizeYouTubeVideoId(config.youtube_url));
  updateAmbientAudioControl();return root;
}
function ensureAmbientAudioPlayer() {
  const config=SITE_AUDIO.config||normalizeSiteAudioConfig({}),videoId=normalizeYouTubeVideoId(config.youtube_url);
  if(!config.ambient_enabled||!videoId)return Promise.resolve(null);
  if(SITE_AUDIO.player&&SITE_AUDIO.videoId===videoId)return Promise.resolve(SITE_AUDIO.player);
  if(SITE_AUDIO.playerPromise&&SITE_AUDIO.videoId===videoId)return SITE_AUDIO.playerPromise;
  destroyAmbientAudioPlayer();SITE_AUDIO.videoId=videoId;
  const host=document.createElement('div');host.id='studioframeAmbientPlayer';host.className='ambient-audio-player-host';document.body.append(host);
  SITE_AUDIO.playerPromise=ensureYouTubeIframeApi().then((YT)=>new Promise((resolve,reject)=>{
    let settled=false;
    const player=new YT.Player(host,{videoId,playerVars:{autoplay:0,controls:0,disablekb:1,playsinline:1,rel:0,loop:config.loop?1:0,playlist:config.loop?videoId:undefined,origin:location.origin},events:{
      onReady:()=>{SITE_AUDIO.player=player;SITE_AUDIO.volume=config.initial_volume;player.setVolume?.(SITE_AUDIO.volume);SITE_AUDIO.muted?player.mute?.():player.unMute?.();settled=true;updateAmbientAudioControl();resolve(player);},
      onStateChange:(event)=>{const playing=event.data===YT.PlayerState.PLAYING,ended=event.data===YT.PlayerState.ENDED;SITE_AUDIO.playing=playing;if(ended&&config.loop&&SITE_AUDIO.userWantsPlaying)player.playVideo?.();updateAmbientAudioControl();},
      onError:()=>{SITE_AUDIO.playing=false;updateAmbientAudioControl();if(!settled)reject(new Error('Falha ao preparar música ambiente do YouTube'));},
    }});
  }));
  return SITE_AUDIO.playerPromise;
}
async function playAmbientAudio(userInitiated=false) {
  if(!SITE_AUDIO.config?.ambient_enabled)return false;
  if(userInitiated)SITE_AUDIO.userWantsPlaying=true;
  if(heroSoundEnabled)await setHeroSoundEnabled(false,{resumeAmbient:false});
  claimAmbientPlayback();
  try{const player=await ensureAmbientAudioPlayer();if(!player)return false;player.setVolume?.(SITE_AUDIO.ducked?Math.max(2,Math.round(SITE_AUDIO.volume*.2)):SITE_AUDIO.volume);SITE_AUDIO.muted?player.mute?.():player.unMute?.();player.playVideo?.();SITE_AUDIO.playing=true;updateAmbientAudioControl();return true;}catch(_error){SITE_AUDIO.playing=false;updateAmbientAudioControl();return false;}
}
function pauseAmbientAudio(userInitiated=false) {
  if(userInitiated){SITE_AUDIO.userWantsPlaying=false;SITE_AUDIO.resumeAfterMedia=false;}
  try{SITE_AUDIO.player?.pauseVideo?.();}catch(_error){}
  SITE_AUDIO.playing=false;updateAmbientAudioControl();
}
function audibleSiteMedia(except=null){return [...document.querySelectorAll('video,audio')].filter((media)=>media!==except&&!media.paused&&!media.muted&&Number(media.volume||0)>0);}
function siteAudioHandleMediaStart(media) {
  if(!media||media.muted||Number(media.volume||0)<=0||!SITE_AUDIO.config?.ambient_enabled)return;
  const behavior=SITE_AUDIO.config.video_audio_behavior;
  if(behavior==='pause'&&SITE_AUDIO.playing){SITE_AUDIO.resumeAfterMedia=SITE_AUDIO.userWantsPlaying;SITE_AUDIO.policyPause=true;pauseAmbientAudio(false);}
  else if(behavior==='duck'&&SITE_AUDIO.player){SITE_AUDIO.ducked=true;SITE_AUDIO.player.setVolume?.(Math.max(2,Math.round(SITE_AUDIO.volume*.2)));}
}
function siteAudioHandleMediaStop(media) {
  if(audibleSiteMedia(media).length)return;
  if(SITE_AUDIO.ducked){SITE_AUDIO.ducked=false;SITE_AUDIO.player?.setVolume?.(SITE_AUDIO.volume);}
  if(SITE_AUDIO.resumeAfterMedia&&SITE_AUDIO.userWantsPlaying){SITE_AUDIO.resumeAfterMedia=false;SITE_AUDIO.policyPause=false;playAmbientAudio(false);}
}
function setupSiteAudio(value={}) {
  const config=normalizeSiteAudioConfig(value),videoId=normalizeYouTubeVideoId(config.youtube_url),changed=SITE_AUDIO.videoId&&SITE_AUDIO.videoId!==videoId;
  SITE_AUDIO.config=config;SITE_AUDIO.volume=config.initial_volume;
  if(SITE_AUDIO.firstInteractionHandler){document.removeEventListener('pointerdown',SITE_AUDIO.firstInteractionHandler,true);SITE_AUDIO.firstInteractionHandler=null;}
  ensureAmbientAudioControl(config);
  if(!config.ambient_enabled||!videoId){destroyAmbientAudioPlayer();updateAmbientAudioControl();return;}
  if(changed)destroyAmbientAudioPlayer();
  ensureAmbientAudioPlayer().catch(()=>{});
  if(config.start_mode==='after_first_interaction'){
    SITE_AUDIO.firstInteractionHandler=(event)=>{if(event.target?.closest?.('#ambientAudioControl'))return;document.removeEventListener('pointerdown',SITE_AUDIO.firstInteractionHandler,true);SITE_AUDIO.firstInteractionHandler=null;playAmbientAudio(true);};
    document.addEventListener('pointerdown',SITE_AUDIO.firstInteractionHandler,true);
  }
}
function isManualProjectVideo(media){return Boolean(media?.tagName==='VIDEO'&&(media.matches?.('.project-inline-video,.viewer-media')||(media.controls&&media.closest?.('#projectDetail'))||(media.controls&&media.closest?.('.lightbox'))));}
// One coordinator owns all user-facing playback. Muted decorative loops remain
// visual motion, while every controllable/audible video, audio element, ambient
// track and user-started embed is mutually exclusive across the whole site.
const MEDIA_PLAYBACK_COORDINATOR={active:null,kind:'',embeddedHost:null,coordinating:false};
function isNativePlaybackElement(media){return Boolean(media&&['VIDEO','AUDIO'].includes(media.tagName));}
function isManagedNativePlayback(media){return Boolean(isNativePlaybackElement(media)&&(media.tagName==='AUDIO'||media.controls||!media.muted||media.matches?.('.project-inline-video,.viewer-media')));}
function pauseOtherManagedNativePlayback(active=null){
  if(MEDIA_PLAYBACK_COORDINATOR.coordinating)return;
  MEDIA_PLAYBACK_COORDINATOR.coordinating=true;
  try{document.querySelectorAll('video,audio').forEach((media)=>{if(media!==active&&isManagedNativePlayback(media)&&!media.paused){try{media.pause();}catch(_error){}}});}
  finally{MEDIA_PLAYBACK_COORDINATOR.coordinating=false;}
}
function stopEmbeddedPlaybackExcept(host=null){
  const previous=MEDIA_PLAYBACK_COORDINATOR.embeddedHost;
  if(!previous||previous===host)return;
  const frames=previous.tagName==='IFRAME'?[previous]:[...(previous.querySelectorAll?.('iframe')||[])];
  frames.forEach((frame)=>{if(frame.id==='studioframeAmbientPlayer')return;try{frame.dataset.playbackSrc=frame.dataset.playbackSrc||frame.getAttribute('src')||'';frame.src='about:blank';frame.dataset.playbackPaused='1';}catch(_error){}});
  previous.classList?.remove('is-exclusive-playing');
  MEDIA_PLAYBACK_COORDINATOR.embeddedHost=null;
}
function registerEmbeddedPlayback(host,frame=null){
  if(!host)return;MEDIA_PLAYBACK_COORDINATOR.embeddedHost=host;MEDIA_PLAYBACK_COORDINATOR.active=frame||host;MEDIA_PLAYBACK_COORDINATOR.kind='embed';host.classList?.add('is-exclusive-playing');
  const frames=frame?[frame]:(host.tagName==='IFRAME'?[host]:[...(host.querySelectorAll?.('iframe')||[])]);frames.forEach((item)=>item.dataset.studioframeActiveEmbed='1');
}
function claimEmbeddedPlayback(host){
  if(!host)return;pauseOtherManagedNativePlayback();
  if(SITE_AUDIO.playing){SITE_AUDIO.resumeAfterMedia=false;SITE_AUDIO.policyPause=false;pauseAmbientAudio(false);}
  stopEmbeddedPlaybackExcept(host);registerEmbeddedPlayback(host);
}
function claimNativePlayback(media){
  if(!isManagedNativePlayback(media))return;
  MEDIA_PLAYBACK_COORDINATOR.active=media;MEDIA_PLAYBACK_COORDINATOR.kind=media.tagName.toLowerCase();
  pauseOtherManagedNativePlayback(media);stopEmbeddedPlaybackExcept();
  if(media.tagName==='VIDEO')bindExclusiveProjectPlayback(media);
  siteAudioHandleMediaStart(media);
}
function claimAmbientPlayback(){
  SITE_AUDIO.resumeAfterMedia=false;SITE_AUDIO.policyPause=false;
  pauseOtherManagedNativePlayback();stopEmbeddedPlaybackExcept();
  MEDIA_PLAYBACK_COORDINATOR.active=SITE_AUDIO.player;MEDIA_PLAYBACK_COORDINATOR.kind='ambient';
}
let ACTIVE_MANUAL_DRIVE_FRAME=null;
let PROJECT_DRIVE_PLAYBACK_WATCH_TIMER=0;
function isProjectDriveFrameCandidate(frame){return Boolean(frame?.tagName==='IFRAME'&&frame.matches?.('.project-drive-embed'));}
function isManualProjectDriveFrame(frame){return Boolean(isProjectDriveFrameCandidate(frame)&&frame.closest?.('#projectDetail'));}
function resetManualProjectDriveFrame(frame){if(!isManualProjectDriveFrame(frame)||frame.dataset.playbackResetting==='1')return;const src=String(frame.dataset.playbackSrc||frame.getAttribute('src')||'');if(!src||src==='about:blank')return;frame.dataset.playbackSrc=src;frame.dataset.playbackResetting='1';try{frame.src='about:blank';}catch(_error){}setTimeout(()=>{if(frame.isConnected){try{frame.src=src;}catch(_error){}}delete frame.dataset.playbackResetting;},0);}
function stopOtherManualProjectMedia(active){document.querySelectorAll('#projectDetail video,.lightbox video').forEach((video)=>{if(video!==active&&isManualProjectVideo(video)&&!video.paused){try{video.pause();}catch(_error){}}});document.querySelectorAll('#projectDetail iframe.project-drive-embed').forEach((frame)=>{if(frame!==active&&isManualProjectDriveFrame(frame))resetManualProjectDriveFrame(frame);});}
function activateManualProjectDriveFrame(frame){if(!isManualProjectDriveFrame(frame)||frame.dataset.playbackResetting==='1')return;if(ACTIVE_MANUAL_DRIVE_FRAME===frame)return;ACTIVE_MANUAL_DRIVE_FRAME=frame;claimEmbeddedPlayback(frame);stopOtherManualProjectMedia(frame);}
function watchManualProjectDriveFocus(){const detail=$('#projectDetail');if(!detail||detail.hidden){ACTIVE_MANUAL_DRIVE_FRAME=null;return;}const active=document.activeElement;if(isManualProjectDriveFrame(active))activateManualProjectDriveFrame(active);}
function startManualProjectDrivePlaybackWatch(){if(PROJECT_DRIVE_PLAYBACK_WATCH_TIMER)return;PROJECT_DRIVE_PLAYBACK_WATCH_TIMER=window.setInterval(watchManualProjectDriveFocus,120);}
function stopManualProjectDrivePlaybackWatch(){if(PROJECT_DRIVE_PLAYBACK_WATCH_TIMER){clearInterval(PROJECT_DRIVE_PLAYBACK_WATCH_TIMER);PROJECT_DRIVE_PLAYBACK_WATCH_TIMER=0;}ACTIVE_MANUAL_DRIVE_FRAME=null;}
function bindExclusiveProjectDriveFrame(frame){if(!isProjectDriveFrameCandidate(frame)||frame.dataset.exclusivePlaybackBound==='1')return frame;frame.dataset.exclusivePlaybackBound='1';frame.dataset.playbackSrc=String(frame.getAttribute('src')||frame.src||'');frame.addEventListener('focus',()=>activateManualProjectDriveFrame(frame));frame.addEventListener('load',watchManualProjectDriveFocus);return frame;}
function bindExclusiveProjectPlayback(activeVideo){if(!isManualProjectVideo(activeVideo))return;ACTIVE_MANUAL_DRIVE_FRAME=null;stopOtherManualProjectMedia(activeVideo);}
window.addEventListener('blur',()=>{setTimeout(watchManualProjectDriveFocus,0);});
document.addEventListener('play',(event)=>{const media=event.target;if(isNativePlaybackElement(media))claimNativePlayback(media);},true);
document.addEventListener('pause',(event)=>{const media=event.target;if(isNativePlaybackElement(media))siteAudioHandleMediaStop(media);},true);
document.addEventListener('ended',(event)=>{const media=event.target;if(isNativePlaybackElement(media))siteAudioHandleMediaStop(media);},true);
document.addEventListener('volumechange',(event)=>{const media=event.target;if(!isNativePlaybackElement(media))return;if(!media.paused&&!media.muted&&Number(media.volume||0)>0){claimNativePlayback(media);siteAudioHandleMediaStart(media);}else siteAudioHandleMediaStop(media);},true);
document.addEventListener('click',(event)=>{const trigger=event.target.closest?.('[data-youtube-play],.youtube-showcase-play');if(!trigger)return;const host=trigger.closest('[data-sf-youtube],.youtube-showcase-stage')||trigger.parentElement;claimEmbeddedPlayback(host);setTimeout(()=>registerEmbeddedPlayback(host,host?.querySelector?.('iframe')),0);},true);

function safeYouTubeChannelUrl(value='') {
  const raw=String(value||'').trim(); if(!raw)return '';
  try {
    const url=new URL(raw); const host=String(url.hostname||'').toLowerCase().replace(/^www\./,'').replace(/^m\./,'');
    if(host==='youtube.com'||host.endsWith('.youtube.com')) return url.href;
  } catch (_error) {}
  return '';
}

function createYouTubeShowcaseBlock(block) {
  const videoId=normalizeYouTubeVideoId(block.youtube_url||block.video_id||'');
  if(!videoId)return null;
  const displayMode=block.display_mode||'full_bleed';
  const fullBleed=displayMode==='full_bleed';
  const section=document.createElement('section');
  section.className=`modular-block editorial-section block-youtube-showcase width-${fullBleed?'full':(['normal','full','wide'].includes(block.width)?block.width:'wide')} reveal`;
  section.dataset.youtubeVideoId=videoId;
  section.dataset.displayMode=displayMode;
  section.style.setProperty('--youtube-showcase-height',`${Math.max(35,Math.min(100,Number(block.height_vh||78)))}vh`);
  section.style.setProperty('--youtube-showcase-focus-x',`${Math.max(0,Math.min(100,Number(block.focal_x??50)))}%`);
  section.style.setProperty('--youtube-showcase-focus-y',`${Math.max(0,Math.min(100,Number(block.focal_y??50)))}%`);
  if(block.title||block.eyebrow||block.body)section.append(blockHeading(block,block.title||''));

  const stage=document.createElement('div'); stage.className=`youtube-showcase-stage ratio-${String(block.ratio||'16:9').replace(':','x')}`;if(block.media_movement!==false)stage.dataset.parallax='detail';
  const selectedCover=publicMediaById(block.cover_media_id||block.media_id||'');
  const selectedRecord=selectedCover?projectCoverRecord(selectedCover):null;
  const youtubeCandidates=[
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  ];
  const thumbnailCandidates=uniqueUrls(selectedRecord?[
    selectedRecord.thumbnail_url,...(selectedRecord.thumbnail_candidates||[]),
    ...(selectedRecord.type==='image'?[selectedRecord.media_url,...(selectedRecord.media_candidates||[])]:[]),
    ...youtubeCandidates,
  ]:youtubeCandidates);
  const thumbnail=document.createElement('img'); thumbnail.className='youtube-showcase-thumbnail'; thumbnail.loading='lazy'; thumbnail.decoding='async'; thumbnail.alt=selectedRecord?.title||block.title||'Prévia do vídeo no YouTube';
  thumbnail.style.objectPosition='var(--youtube-showcase-focus-x) var(--youtube-showcase-focus-y)';
  thumbnail.dataset.coverSource=selectedRecord?'editor-selected-media':'youtube-thumbnail';
  let thumbnailCandidateIndex=0;
  const advanceThumbnail=()=>{if(thumbnailCandidateIndex>=thumbnailCandidates.length-1)return false;thumbnailCandidateIndex+=1;thumbnail.src=thumbnailCandidates[thumbnailCandidateIndex];return true;};
  thumbnail.src=thumbnailCandidates[thumbnailCandidateIndex];
  thumbnail.addEventListener('error',advanceThumbnail);
  thumbnail.addEventListener('load',()=>{if(thumbnail.naturalWidth&&thumbnail.naturalWidth<640)advanceThumbnail();});

  const shade=document.createElement('span'); shade.className='youtube-showcase-shade'; shade.setAttribute('aria-hidden','true');
  const play=document.createElement('button'); play.type='button'; play.className='youtube-showcase-play'; play.setAttribute('aria-label',block.primary_cta_label||'Assistir vídeo no YouTube');
  const playIcon=document.createElement('span'); playIcon.className='youtube-showcase-play-icon'; playIcon.textContent='▶'; playIcon.setAttribute('aria-hidden','true');
  const playLabel=document.createElement('strong'); playLabel.textContent=block.primary_cta_label||'Assistir'; play.append(playIcon,playLabel);
  stage.append(thumbnail,shade,play);

  const loadPlayer=()=>{
    if(stage.dataset.playerLoaded==='1')return;
    stage.dataset.playerLoaded='1';
    const iframe=document.createElement('iframe'); iframe.className='youtube-showcase-player'; iframe.loading='lazy'; iframe.title=block.title||'Vídeo do YouTube'; iframe.allow='autoplay; encrypted-media; picture-in-picture; web-share'; iframe.allowFullscreen=true; iframe.referrerPolicy='strict-origin-when-cross-origin'; iframe.src=`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    const fallback=document.createElement('a'); fallback.className='youtube-showcase-fallback'; fallback.href=`https://www.youtube.com/watch?v=${videoId}`; fallback.target='_blank'; fallback.rel='noopener noreferrer'; fallback.textContent=block.youtube_cta_label||'Assistir no YouTube';
    stage.replaceChildren(iframe,fallback);
    registerEmbeddedPlayback(stage,iframe);
    requestAnimationFrame(()=>{try{iframe.focus({preventScroll:true});}catch(_error){iframe.focus();}});
  };
  play.addEventListener('click',loadPlayer);
  section.append(stage);

  const actions=[];
  if(block.show_external_link!==false){const link=document.createElement('a');link.href=`https://www.youtube.com/watch?v=${videoId}`;link.target='_blank';link.rel='noopener noreferrer';link.textContent=block.youtube_cta_label||'Ver no YouTube';actions.push(link);}
  const channelUrl=safeYouTubeChannelUrl(block.channel_url||'');
  if(block.show_channel_link===true&&channelUrl){const link=document.createElement('a');link.href=channelUrl;link.target='_blank';link.rel='noopener noreferrer';link.textContent=block.channel_cta_label||'Conheça o canal';actions.push(link);}
  if(actions.length){const bar=document.createElement('div');bar.className='youtube-showcase-actions';actions.forEach((link)=>bar.append(link));section.append(bar);}
  return section;
}

function createHomeVideoBlock(block) {
  const media=publicMediaById(block.media_id||''); if(!media||media.type!=='video')return null;
  const section=document.createElement('section');section.className=`modular-block editorial-section block-home-video width-${block.width||'full'} scroll-${block.scroll_behavior||'parallax'} effect-${block.section_effect||'reveal'} reveal`;
  if(block.title||block.eyebrow||block.body)section.append(blockHeading(block,block.title||''));
  const stage=document.createElement('div');stage.className=`home-video-stage ratio-${String(block.ratio||'16:9').replace(':','x')}`;
  if(block.scroll_behavior==='parallax')stage.dataset.parallax='detail';stage.append(projectVideoFallback(media,{autoplay:block.autoplay!==false}));section.append(stage);return section;
}

function createEditorialGalleryBlock(block,context={}) {
  const section=document.createElement('section');section.className=`modular-block editorial-section block-editorial-gallery columns-${block.columns||'3'} style-${block.gallery_style||'uniform'} reveal`;section.append(blockHeading(block,'Galeria'));const grid=document.createElement('div');grid.className='editorial-gallery-grid';
  if(Array.isArray(block.media_ids)&&block.media_ids.length&&typeof context.mediaResolver==='function'){
    block.media_ids.map(context.mediaResolver).filter(Boolean).forEach((media)=>{const figure=document.createElement('figure');figure.className='editorial-gallery-direct-media';const node=context.mediaNode?.(media);if(node)figure.append(node);if(media.title){const caption=document.createElement('figcaption');caption.textContent=media.title;figure.append(caption);}grid.append(figure);});if(!grid.children.length)return null;section.append(grid);return section;
  }
  const projects=editorialProjectsForBlock(block,12);if(!projects.length)return null;projects.forEach((project,index)=>{const node=card(project,index);node.classList.add('editorial-gallery-card');grid.append(node)});section.append(grid);return section;
}

function createHighlightsBlock(block) {
  const projects=editorialProjectsForBlock(block,5);if(!projects.length)return null;
  const section=document.createElement('section');section.className=`modular-block editorial-section block-highlights layout-${block.layout||'feature_cards'} reveal`;section.append(blockHeading(block,'Projetos em destaque'));
  const grid=document.createElement('div');grid.className='highlight-grid';projects.forEach((project,index)=>{const node=card(project,index);node.classList.add(index===0?'highlight-feature':'highlight-card');grid.append(node)});section.append(grid);return section;
}

function createSpacerBlock(block) {
  const section=document.createElement('section');
  section.className=`editorial-spacer size-${block.size||'medium'} transition-${block.transition||'atmosphere'}`;
  section.setAttribute('role','separator');
  section.setAttribute('aria-label',block.title||'Transição entre seções');
  const visual=document.createElement('span');visual.className='editorial-spacer-visual';visual.setAttribute('aria-hidden','true');
  visual.append(document.createElement('i'),document.createElement('b'),document.createElement('i'));
  section.append(visual);
  if(block.title){const title=document.createElement('strong');title.className='editorial-spacer-title';title.textContent=block.title;section.append(title);}
  return section;
}

function applyHomeBlockTypography(node, block = {}) {
  if (!node) return;
  node.classList.add('sf-home-block');
  const fontMap = {
    display: 'var(--display)',
    body: 'var(--body)',
    system: 'Arial, Helvetica, sans-serif',
    serif: 'Georgia, Times New Roman, serif',
    mono: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  };
  const colorMap = { text:'var(--text)', accent:'var(--accent)', muted:'var(--muted)' };
  const setOrRemove = (name, value) => {
    if (value === undefined || value === null || value === '' || value === 'auto') node.style.removeProperty(name);
    else node.style.setProperty(name, value);
  };
  node.style.setProperty('--sf-heading-font', fontMap[block.font_family || 'display'] || fontMap.display);
  node.style.setProperty('--sf-heading-weight', String(block.title_weight || '400'));
  node.style.setProperty('--sf-text-align', block.text_align || 'left');
  node.style.setProperty('--sf-text-transform', block.text_transform || 'none');
  node.style.setProperty('--sf-title-color', colorMap[block.title_color || 'text'] || colorMap.text);
  node.style.setProperty('--sf-eyebrow-color', colorMap[block.eyebrow_color || 'accent'] || colorMap.accent);
  setOrRemove('--sf-title-size', block.title_size ? `${block.title_size}px` : '');
  setOrRemove('--sf-eyebrow-size', block.eyebrow_size ? `${block.eyebrow_size}px` : '');
  setOrRemove('--sf-body-size', block.body_size ? `${block.body_size}px` : '');
  setOrRemove('--sf-title-line-height', block.title_line_height || '');
  setOrRemove('--sf-title-letter-spacing', block.title_letter_spacing || '');
}

function applyHomeSectionFrame(node, block = {}) {
  if (!node) return;
  applySharedPageBlockFrame(node,block);
  [...node.classList].filter((name)=>name.startsWith('sf-grid-cols-')||name.startsWith('sf-card-ratio-')||name.startsWith('sf-grid-gap-')).forEach((name)=>node.classList.remove(name));
  if (block.type === 'projects') {
    node.classList.add(`sf-grid-cols-${block.grid_columns || '2'}`);
    node.classList.add(`sf-card-ratio-${block.card_ratio || '4x3'}`);
    node.classList.add(`sf-grid-gap-${block.grid_gap || 'normal'}`);
  }
  applyHomeBlockTypography(node, block);
}

function applyCoreBlockOverrides(node, block, builder) {
  const explicit = (field, fallback='') => Object.prototype.hasOwnProperty.call(block, field) ? block[field] : fallback;
  if (!node) return;
  const identity = DATA.identity || {};
  if (block.type === 'intro') {
    const small=node.querySelector('small'); const text=node.querySelector('#heroLine');
    if (small) small.textContent = explicit('eyebrow', 'O QUE FAZEMOS');
    if (text) text.textContent = explicit('title', 'Design, vídeo e direção criativa para marcas que precisam se destacar.');
  }
  if (block.type === 'lettering') {
    const cfg=builder.lettering||{}; const eyebrow=node.querySelector('#letteringEyebrow'); const primary=node.querySelector('#letteringText'); const clone=node.querySelector('#letteringClone');
    const value=explicit('title', cfg.text || identity.hero_line || '');
    if (eyebrow) eyebrow.textContent = explicit('eyebrow', cfg.eyebrow || identity.studio_name || 'MENSAGEM STUDIO');
    const resolvedStyle=explicit('style', cfg.style || 'split') === 'inherit' ? (cfg.style || 'split') : explicit('style', cfg.style || 'split');
    applyLetteringCopy(primary,clone,value,resolvedStyle);
    node.dataset.style = resolvedStyle;
    node.dataset.direction = explicit('direction', cfg.direction || 'left');
  }
  if (block.type === 'projects_header') {
    const cfg=builder.projects||{}; const e=node.querySelector('#projectsEyebrow'); const t=node.querySelector('#projectsTitle'); const p=node.querySelector('#projectsDescription');
    if(e)e.textContent=explicit('eyebrow',cfg.eyebrow||'Portfólio selecionado'); if(t)t.textContent=explicit('title',cfg.title||'Projetos'); if(p)p.textContent=explicit('body','');
    updateProjectsHeadingVisibility(block,builder);
  }
  if (block.type === 'projects') {
    node.querySelector('#projects')?.removeAttribute('hidden'); $('#menu')?.removeAttribute('hidden');
  }
  if (block.type === 'about') {
    const cfg=builder.about||{}; const e=node.querySelector('#aboutEyebrow'); const t=node.querySelector('#aboutTitle'); const p=node.querySelector('#aboutBody');
    if(e)e.textContent=explicit('eyebrow',cfg.eyebrow||'Mensagem Studio'); if(t)t.textContent=explicit('title',cfg.title||''); if(p)p.textContent=explicit('body',cfg.body||'');
  }
  if (block.type === 'contact') {
    const cfg=builder.contact||{}; const e=node.querySelector('#contactEyebrow'); const t=node.querySelector('#contactTitle'); const p=node.querySelector('#contactBody');
    if(e)e.textContent=explicit('eyebrow',cfg.eyebrow||'Contato'); if(t)t.textContent=explicit('title',cfg.title||''); if(p)p.textContent=explicit('body',cfg.body||'');
  }
}

const SHARED_PAGE_RENDERERS=new Set(['text','process','accordion','cta','spacer','full_media','editorial_gallery','related_projects','quote_cta']);
const LEGACY_SERVICE_RENDER_MAP={service_overview:'text',service_process:'process',service_faq:'accordion',service_cta:'cta',media:'full_media',service_gallery:'editorial_gallery'};
function normalizeMotionPublicFields(block={}){const engine=['auto','css_native','gsap','motion','threejs'].includes(String(block.motion_engine||''))?String(block.motion_engine):'auto',trigger=['viewport','scroll','interaction','state','continuous','static','load'].includes(String(block.motion_trigger||''))?String(block.motion_trigger):'viewport',intensity=['none','subtle','normal','strong','cinematic'].includes(String(block.motion_intensity||''))?String(block.motion_intensity):'normal',motion_preset=String(block.motion_preset||'inherit'),themeId=String(DATA.site_builder?.theme?.theme_id||document.body.dataset.sfTheme||'studioframe-default'),motion_theme_variant_id=motion_preset==='inherit'||motion_preset==='none'?motion_preset:`${themeId}--${motion_preset}`;return {motion_enabled:block.motion_enabled===true,motion_preset,motion_theme_variant_id,motion_engine:engine,motion_trigger:trigger,motion_duration:Math.max(0,Math.min(12,Number(block.motion_duration??.36))),motion_delay:Math.max(0,Math.min(12,Number(block.motion_delay??0))),motion_stagger:Math.max(0,Math.min(2,Number(block.motion_stagger??.06))),motion_ease:String(block.motion_ease||'premium'),motion_intensity:intensity,motion_scrub:Math.max(0,Math.min(2,Number(block.motion_scrub||0))),motion_direction:['auto','up','down','left','right'].includes(String(block.motion_direction||''))?String(block.motion_direction):'auto'};}
const PUBLIC_THEME_COMPONENT_STATE_PROFILES=Object.freeze({
  'studioframe-default':{hover:'lift',surface:'inherit',shadow:'soft'},discord:{hover:'lift',surface:'solid',shadow:'soft'},structured:{hover:'border',surface:'transparent',shadow:'none'},'oryzo-ai':{hover:'glow',surface:'solid',shadow:'glow'},mercury:{hover:'lift',surface:'solid',shadow:'deep'},mekaverse:{hover:'zoom',surface:'transparent',shadow:'none'},maca:{hover:'lift',surface:'solid',shadow:'soft'},'black-maca':{hover:'glow',surface:'solid',shadow:'deep'},'dope-segurity':{hover:'glow',surface:'glass',shadow:'glow'},'workplace-neura':{hover:'reveal',surface:'transparent',shadow:'none'},neuralink:{hover:'border',surface:'transparent',shadow:'none'},'studio-oker':{hover:'zoom',surface:'transparent',shadow:'soft'},branding:{hover:'reveal',surface:'solid',shadow:'deep'},
});
function currentPublicThemeComponentProfile(){const id=String(DATA.site_builder?.theme?.theme_id||document.body.dataset.sfTheme||'studioframe-default');return {id,...(PUBLIC_THEME_COMPONENT_STATE_PROFILES[id]||PUBLIC_THEME_COMPONENT_STATE_PROFILES['studioframe-default'])};}
function normalizeComponentStatePublicFields(block={}){const allowed=(value,values,fallback)=>values.includes(String(value||''))?String(value):fallback;return {component_state_enabled:block.component_state_enabled!==false,component_hover_preset:allowed(block.component_hover_preset,['inherit','none','lift','glow','zoom','tilt','border','reveal'],'inherit'),component_hover_scope:allowed(block.component_hover_scope,['auto','container','cards','buttons','media'],'auto'),component_hover_intensity:Math.max(0,Math.min(1,Number(block.component_hover_intensity??.58))),component_transition_ms:Math.max(0,Math.min(2000,Number(block.component_transition_ms??280))),component_radius:allowed(block.component_radius,['inherit','sharp','soft','round','pill'],'inherit'),component_surface:allowed(block.component_surface,['inherit','transparent','solid','glass','accent-soft'],'inherit'),component_border:allowed(block.component_border,['inherit','none','subtle','accent'],'inherit'),component_shadow:allowed(block.component_shadow,['inherit','none','soft','deep','glow'],'inherit'),component_focus:allowed(block.component_focus,['ring','underline','invert','none'],'ring'),component_active:allowed(block.component_active,['accent','press','scale','none'],'press'),component_cursor:allowed(block.component_cursor,['auto','pointer','default'],'auto'),component_mobile_behavior:allowed(block.component_mobile_behavior,['static','subtle','preserve'],'subtle')};}
function resolvedComponentStatePublicFields(block={}){const value=normalizeComponentStatePublicFields(block),profile=currentPublicThemeComponentProfile();return {...value,component_theme_profile:profile.id,component_hover_preset:value.component_hover_preset==='inherit'?profile.hover:value.component_hover_preset,component_surface:value.component_surface==='inherit'?profile.surface:value.component_surface,component_shadow:value.component_shadow==='inherit'?profile.shadow:value.component_shadow};}
function normalizeSharedPublicBlock(block={}){const type=LEGACY_SERVICE_RENDER_MAP[block.type]||block.type||'text',allowed=(value,values,fallback)=>values.includes(String(value||''))?String(value):fallback;return {...block,type,visible:block.visible!==false,desktop_visible:block.desktop_visible!==false,mobile_visible:block.mobile_visible!==false,section_width:block.section_width||'full',section_size:block.section_size||'normal',section_background:block.section_background||'none',mobile_section_width:block.mobile_section_width||'auto',mobile_section_size:block.mobile_section_size||'inherit',section_layout_preset:allowed(block.section_layout_preset,['default','editorial_split','feature_panel','media_grid','project_feature','full_bleed','stacked_editorial','navigated_section'],'default'),section_background_type:allowed(block.section_background_type,['theme','solid','gradient','image','texture','video','global_media_canvas'],'theme'),section_global_canvas_x:Number(block.section_global_canvas_x||0),section_global_canvas_y:Number(block.section_global_canvas_y||0),section_global_canvas_scale:Math.max(.2,Math.min(3,Number(block.section_global_canvas_scale||1))),section_global_canvas_rotation:Number(block.section_global_canvas_rotation||0),section_global_canvas_opacity:Math.max(0,Math.min(1,Number(block.section_global_canvas_opacity??1))),section_global_canvas_blur:Math.max(0,Math.min(40,Number(block.section_global_canvas_blur||0))),section_global_canvas_depth:Number(block.section_global_canvas_depth||0),section_global_canvas_mask:String(block.section_global_canvas_mask||'full'),section_global_canvas_mask_size:Number(block.section_global_canvas_mask_size||100),section_global_canvas_mask_radius:Number(block.section_global_canvas_mask_radius||24),section_global_canvas_mask_feather:Number(block.section_global_canvas_mask_feather||0),section_global_canvas_transition:String(block.section_global_canvas_transition||'fade'),section_global_canvas_keyframe_enabled:block.section_global_canvas_keyframe_enabled===true,section_background_media_id:String(block.section_background_media_id||''),section_background_color:/^#[0-9a-f]{6}$/i.test(String(block.section_background_color||''))?String(block.section_background_color):'#07090D',section_background_gradient:allowed(block.section_background_gradient,['editorial','accent','luminous','ink'],'editorial'),section_texture_mode:allowed(block.section_texture_mode,['off','theme','custom'],'off'),section_texture_media_id:String(block.section_texture_media_id||''),section_texture_opacity:Math.max(0,Math.min(1,Number(block.section_texture_opacity??.24))),section_texture_blend_mode:allowed(block.section_texture_blend_mode,['normal','multiply','screen','overlay','soft-light'],'soft-light'),section_texture_scale:Math.max(25,Math.min(400,Number(block.section_texture_scale||100))),section_texture_position:allowed(block.section_texture_position,['center','top','bottom','left','right'],'center'),section_texture_attachment:allowed(block.section_texture_attachment,['scroll','fixed','parallax'],'scroll'),section_overlay_color:/^#[0-9a-f]{6}$/i.test(String(block.section_overlay_color||''))?String(block.section_overlay_color):'#000000',section_overlay_opacity:Math.max(0,Math.min(1,Number(block.section_overlay_opacity??0))),section_content_alignment:allowed(block.section_content_alignment,['left','center','right'],'left'),section_min_height:Math.max(0,Math.min(2000,Number(block.section_min_height||0))),section_padding_top:Math.max(0,Math.min(400,Number(block.section_padding_top||0))),section_padding_bottom:Math.max(0,Math.min(400,Number(block.section_padding_bottom||0))),section_motion_preset:allowed(block.section_motion_preset,['inherit','fade-up','fade','slide-left','slide-right','scale-in','mask-reveal','cinematic','none'],'inherit'),section_reveal:block.section_reveal!==false,section_parallax:block.section_parallax===true?'soft':allowed(block.section_parallax,['off','soft','medium','strong'],'off'),section_sticky_behavior:allowed(block.section_sticky_behavior,['none','content','background'],'none'),section_navigation_label:String(block.section_navigation_label||block.label||block.title||''),section_navigation_visible:block.section_navigation_visible!==false,...normalizeComponentStatePublicFields(block),...normalizeMotionPublicFields(block)};}
function sectionMediaCandidates(media={}){return [media.media_url,...(media.media_candidates||[]),media.preview_url,...(media.preview_candidates||[]),media.thumbnail_url,...(media.thumbnail_candidates||[]),media.external_url].filter(Boolean);}
function createSectionLayerMedia(media,{video=false,texture=false}={}){if(!media)return null;const candidates=sectionMediaCandidates(media);if(video&&media.type==='video'){const node=createResilientVideo(media,{autoplay:true,muted:true,loop:true,controls:false,preload:'none',className:'sf-section-background-media',defer:true,metadataReady:false,timeoutMs:45000});bindDeferredAutoplay(node,node);return node;}const image=imageWithFallback(media,candidates,{lazy:true,upgradeUrls:candidates});image.classList?.add(texture?'sf-section-texture-media':'sf-section-background-media');image.alt='';return image;}
function ensureSectionVisualLayers(node,block={}){
  [...node.children].filter((child)=>child.classList?.contains('sf-section-visual-layer')).forEach((child)=>child.remove());
  const needsBackground=block.section_background_type!=='theme',needsTexture=block.section_texture_mode!=='off',needsOverlay=block.section_overlay_opacity>0;
  if(!needsBackground&&!needsTexture&&!needsOverlay)return;
  const background=document.createElement('div');background.className='sf-section-visual-layer sf-section-background-layer';background.setAttribute('aria-hidden','true');background.dataset.backgroundType=block.section_background_type;background.dataset.gradient=block.section_background_gradient;background.style.setProperty('--sf-section-background-color',block.section_background_color);
  const backgroundMedia=publicMediaById(block.section_background_media_id);if(['image','texture','video'].includes(block.section_background_type)&&backgroundMedia){const mediaNode=createSectionLayerMedia(backgroundMedia,{video:block.section_background_type==='video'});if(mediaNode)background.append(mediaNode);}
  const texture=document.createElement('div');texture.className='sf-section-visual-layer sf-section-texture-layer';texture.setAttribute('aria-hidden','true');texture.dataset.textureMode=block.section_texture_mode;texture.dataset.texturePosition=block.section_texture_position;texture.dataset.textureAttachment=block.section_texture_attachment;texture.style.setProperty('--sf-section-texture-opacity',String(block.section_texture_opacity));texture.style.setProperty('--sf-section-texture-blend',block.section_texture_blend_mode);texture.style.setProperty('--sf-section-texture-scale-factor',String(block.section_texture_scale/100));texture.style.setProperty('--sf-section-texture-pattern-a',`${7*block.section_texture_scale/100}px`);texture.style.setProperty('--sf-section-texture-pattern-b',`${12*block.section_texture_scale/100}px`);texture.style.setProperty('--sf-section-texture-grain-size',`${180*block.section_texture_scale/100}px`);
  if(block.section_texture_mode==='custom'){const textureMedia=publicMediaById(block.section_texture_media_id);const mediaNode=createSectionLayerMedia(textureMedia,{texture:true});if(mediaNode)texture.append(mediaNode);}
  const overlay=document.createElement('div');overlay.className='sf-section-visual-layer sf-section-overlay-layer';overlay.setAttribute('aria-hidden','true');overlay.style.setProperty('--sf-section-overlay-color',block.section_overlay_color);overlay.style.setProperty('--sf-section-overlay-opacity',String(block.section_overlay_opacity));
  node.prepend(background,texture,overlay);
}
const COMPONENT_STATE_TARGET_SELECTORS=Object.freeze({
  cards:'.card,.service-price-card,.related-project-card,.sf-cutout-card,.sf-grid-beam-cell,.highlight-feature,.highlight-card,.editorial-gallery-card,.section-experience-item,.project-commercial-service',
  buttons:'button,.sf-adv-button,.quote-cta-button,.service-item-cta,.project-commercial-action,.filter,.related-project-action,.related-project-quote,.sliced-hero-cta',
  media:'.media,.project-media-viewport,.project-video-wrap,.sf-cutout-media,.related-project-media,.editorial-gallery-direct-media',
});
function componentStateTargetSelector(scope='auto'){if(scope==='cards')return COMPONENT_STATE_TARGET_SELECTORS.cards;if(scope==='buttons')return COMPONENT_STATE_TARGET_SELECTORS.buttons;if(scope==='media')return COMPONENT_STATE_TARGET_SELECTORS.media;return `${COMPONENT_STATE_TARGET_SELECTORS.cards},${COMPONENT_STATE_TARGET_SELECTORS.buttons},${COMPONENT_STATE_TARGET_SELECTORS.media}`;}
function componentStateEventTarget(event,canvas){if(!canvas)return null;const scope=canvas.dataset.componentScope||'auto';if(scope==='container')return canvas;const target=event.target?.closest?.(componentStateTargetSelector(scope));return target&&canvas.contains(target)?target:null;}
function resetComponentTilt(target){if(!target)return;target.style.removeProperty('--sf-component-tilt-x');target.style.removeProperty('--sf-component-tilt-y');target.removeAttribute('data-component-tilting');}
let activeComponentTiltTarget=null;
function setupComponentStateInteractions(){if(document.documentElement.dataset.componentStateEngine==='wired')return;document.documentElement.dataset.componentStateEngine='wired';document.addEventListener('pointermove',(event)=>{if(reduced||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;const canvas=event.target?.closest?.('[data-component-states="on"][data-component-hover="tilt"]');const target=componentStateEventTarget(event,canvas);if(!target){resetComponentTilt(activeComponentTiltTarget);activeComponentTiltTarget=null;return;}if(activeComponentTiltTarget&&activeComponentTiltTarget!==target)resetComponentTilt(activeComponentTiltTarget);activeComponentTiltTarget=target;const rect=target.getBoundingClientRect(),nx=Math.max(-1,Math.min(1,((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*2)),ny=Math.max(-1,Math.min(1,((event.clientY-rect.top)/Math.max(1,rect.height)-.5)*2)),max=Math.max(.5,Number(canvas.style.getPropertyValue('--sf-component-tilt-max'))||4.5);target.dataset.componentTilting='true';target.style.setProperty('--sf-component-tilt-x',`${(-ny*max).toFixed(2)}deg`);target.style.setProperty('--sf-component-tilt-y',`${(nx*max).toFixed(2)}deg`);},{passive:true});document.addEventListener('pointerout',(event)=>{if(!activeComponentTiltTarget)return;if(event.relatedTarget&&activeComponentTiltTarget.contains(event.relatedTarget))return;resetComponentTilt(activeComponentTiltTarget);activeComponentTiltTarget=null;},{passive:true});}
function applyComponentStateFrame(node,block={}){if(!node)return node;node.querySelectorAll?.('[data-component-state-target]').forEach((target)=>target.removeAttribute('data-component-state-target'));node.removeAttribute('data-component-state-target');const state=resolvedComponentStatePublicFields(block),enabled=state.component_state_enabled!==false;node.dataset.componentStates=enabled?'on':'off';node.dataset.componentThemeProfile=state.component_theme_profile;node.dataset.componentHover=enabled?state.component_hover_preset:'none';node.dataset.componentScope=state.component_hover_scope;node.dataset.componentRadius=state.component_radius;node.dataset.componentSurface=state.component_surface;node.dataset.componentBorder=state.component_border;node.dataset.componentShadow=state.component_shadow;node.dataset.componentFocus=state.component_focus;node.dataset.componentActive=state.component_active;node.dataset.componentCursor=state.component_cursor;node.dataset.componentMobile=state.component_mobile_behavior;const intensity=state.component_hover_intensity;node.style.setProperty('--sf-component-intensity',String(intensity));node.style.setProperty('--sf-component-transition',`${state.component_transition_ms}ms`);node.style.setProperty('--sf-component-lift',`${(-2-intensity*8).toFixed(2)}px`);node.style.setProperty('--sf-component-scale',String((1+intensity*.055).toFixed(4)));node.style.setProperty('--sf-component-tilt-max',String((1.25+intensity*7).toFixed(2)));node.style.setProperty('--sf-component-glow-alpha',String((.08+intensity*.28).toFixed(3)));if(enabled){if(state.component_hover_scope==='container')node.setAttribute('data-component-state-target','');else{const selector=componentStateTargetSelector(state.component_hover_scope);if(node.matches?.(selector))node.setAttribute('data-component-state-target','');node.querySelectorAll?.(selector).forEach((target)=>target.setAttribute('data-component-state-target',''));}setupComponentStateInteractions();}return node;}
function applyMotionPublicFrame(node,block={}){if(!node)return node;const motion=normalizeMotionPublicFields(block);node.dataset.sfMotionEnabled=motion.motion_enabled===true?'true':'false';node.dataset.sfMotionPreset=motion.motion_preset;node.dataset.sfMotionThemeVariant=motion.motion_theme_variant_id;node.dataset.sfMotionEngine=motion.motion_engine;node.dataset.sfMotionTrigger=motion.motion_trigger;node.dataset.sfMotionDuration=String(motion.motion_duration);node.dataset.sfMotionDelay=String(motion.motion_delay);node.dataset.sfMotionStagger=String(motion.motion_stagger);node.dataset.sfMotionEase=motion.motion_ease;node.dataset.sfMotionIntensity=motion.motion_intensity;node.dataset.sfMotionScrub=String(motion.motion_scrub);node.dataset.sfMotionDirection=motion.motion_direction;queueMicrotask(()=>refreshStudioFrameMotionV77(node.parentElement||document));return node;}
function applySharedPageBlockFrame(node,block={}){
  if(!node)return node;block=normalizeSharedPublicBlock(block);[...node.classList].filter((name)=>name.startsWith('sf-section-')||name==='sf-hide-desktop'||name==='sf-hide-mobile'||name.startsWith('sf-mobile-')).forEach((name)=>node.classList.remove(name));node.classList.add('sf-section-canvas',`sf-section-width-${block.section_width}`,`sf-section-size-${block.section_size}`,`sf-section-bg-${block.section_background}`);if(block.desktop_visible===false)node.classList.add('sf-hide-desktop');if(block.mobile_visible===false)node.classList.add('sf-hide-mobile');if(block.mobile_section_width&&block.mobile_section_width!=='auto')node.classList.add(`sf-mobile-width-${block.mobile_section_width}`);if(block.mobile_section_size&&block.mobile_section_size!=='inherit')node.classList.add(`sf-mobile-size-${block.mobile_section_size}`);
  node.dataset.sectionLayout=block.section_layout_preset;node.dataset.sectionBackgroundType=block.section_background_type;node.dataset.sectionTextureMode=block.section_texture_mode;node.dataset.sectionMotion=block.section_reveal===false||block.section_motion_preset==='none'?'none':block.section_motion_preset;node.dataset.sectionContentAlignment=block.section_content_alignment;node.dataset.sectionSticky=block.section_sticky_behavior;node.dataset.sectionNavigationLabel=block.section_navigation_label;node.dataset.sectionNavigationVisible=block.section_navigation_visible===false?'false':'true';node.dataset.parallaxStrength=block.section_parallax;if(block.section_parallax!=='off')node.dataset.parallax='section';else delete node.dataset.parallax;
  const setLength=(name,value)=>value?node.style.setProperty(name,`${value}px`):node.style.removeProperty(name);setLength('--sf-section-min-height',block.section_min_height);setLength('--sf-section-padding-top',block.section_padding_top);setLength('--sf-section-padding-bottom',block.section_padding_bottom);applyComponentStateFrame(node,block);applyMotionPublicFrame(node,block);ensureSectionVisualLayers(node,block);if(block.section_reveal===false||block.section_motion_preset==='none')node.classList.add('is-visible');return node;
}
function relatedProjectsForBlock(block={}){
  const seen=new Set(),limit=Math.max(1,Math.min(24,Number(block.max_items||6)));
  const projects=(DATA.projects||[]).filter((project)=>project&&!project.hidden);
  return (Array.isArray(block.items)?block.items:[]).map((row)=>{const data=row&&typeof row==='object'?row:{project_id:String(row||'')};const ref=String(data.project_id||data.id||'').trim();if(!ref||seen.has(ref))return null;seen.add(ref);const project=projects.find((candidate)=>String(candidate.project_id||'')===ref||String(candidate.id||'')===ref);if(!project)return null;return {data,project};}).filter(Boolean).slice(0,limit);
}
function createRelatedProjectsBlock(block={},context={}){
  const records=relatedProjectsForBlock(block);if(!records.length)return null;
  const section=document.createElement('section');section.className='related-projects-block reveal';section.dataset.columns=String(['2','3','4'].includes(String(block.columns))?block.columns:'3');section.dataset.cardStyle=['editorial','cover','minimal'].includes(block.card_style)?block.card_style:'editorial';
  const heading=blockHeading(block,block.title||'Projetos relacionados');if(heading.children.length)section.append(heading);
  const grid=document.createElement('div');grid.className='related-projects-grid';
  records.forEach(({data,project})=>{const card=document.createElement('article');card.className='related-project-card';card.dataset.projectId=String(project.project_id||project.id||'');const visual=blockPoster(project,'related-project-media');card.append(visual);const copy=document.createElement('div');copy.className='related-project-copy';if(block.show_category!==false){const meta=document.createElement('small');meta.textContent=project.section_title||project.category||project.path?.[0]||'Projeto';copy.append(meta);}const title=document.createElement('h3');title.textContent=data.title||project.title||'Projeto';copy.append(title);const description=String(data.description||project.description||'').trim();if(description){const p=document.createElement('p');p.textContent=description;copy.append(p);}const action=document.createElement('button');action.type='button';action.className='related-project-action';action.textContent=data.action_label||'Ver projeto';const arrow=document.createElement('b');arrow.textContent='↗';action.append(arrow);action.addEventListener('click',(event)=>{event.stopPropagation();openProjectDetail(project);});copy.append(action);const quoteServiceId=String(context.quoteServiceId||block.service_id||''),quoteService=quoteServiceRecord(quoteServiceId);if(quoteEnabled()&&quoteService){const similar=document.createElement('button');similar.type='button';similar.className='related-project-quote';similar.dataset.quoteSimilar=String(quoteService.item.id||'');similar.dataset.quoteProjectId=String(project.project_id||project.id||'');similar.textContent=servicesConfig().quote_case_action_label||'Quero algo semelhante';copy.append(similar);}card.append(copy);bindBlockOpen(card,project);grid.append(card);});section.append(grid);return section;
}
function createQuoteCtaBlock(block={},context={}){const requestedServiceId=String(block.service_id||context.quoteServiceId||''),serviceRecord=quoteServiceRecord(requestedServiceId),serviceId=serviceRecord?String(serviceRecord.item.id||''):'';if(!quoteEnabled()){const fallbackUrl=serviceWhatsappHref(serviceRecord?.category||null,serviceRecord?.item||null),fallbackLabel=block.button_label||block.quote_action_label||servicesConfig().cta_label||'Solicitar orçamento';return createCtaBlock({...block,button_url:fallbackUrl,button_label:fallbackLabel},{...context,defaultButtonUrl:fallbackUrl,defaultButtonLabel:fallbackLabel});}const section=document.createElement('section');section.className='modular-block quote-cta-block reveal';const copy=document.createElement('div');copy.className='quote-cta-copy';const eyebrow=document.createElement('small');eyebrow.textContent=block.eyebrow||'Orçamento';const title=document.createElement('h2');title.textContent=block.title||'Vamos montar seu projeto?';const body=document.createElement('p');body.textContent=block.body||'Adicione serviços ao orçamento e continue navegando pelo site.';copy.append(eyebrow,title);if(body.textContent)copy.append(body);const button=document.createElement('button');button.type='button';button.className='quote-cta-button';if(serviceId)button.dataset.quoteAddService=serviceId;else button.dataset.quoteOpen='';button.textContent=block.quote_action_label||block.button_label||(serviceId?(servicesConfig().quote_item_action_label||'Adicionar ao orçamento'):(servicesConfig().quote_title||'Abrir orçamento'));section.append(copy,button);return section;}
function createSharedPageBlock(block,context={}){block=normalizeSharedPublicBlock(block);if(block.visible===false||!SHARED_PAGE_RENDERERS.has(block.type))return null;let node=null;if(block.type==='text')node=createTextBlock(block);if(block.type==='process')node=createStructuredContentBlock(block,'process');if(block.type==='accordion')node=createStructuredContentBlock(block,'accordion');if(block.type==='cta')node=createCtaBlock(block,context);if(block.type==='spacer')node=createSpacerBlock(block);if(block.type==='full_media')node=createFullMediaBlock(block,context);if(block.type==='editorial_gallery')node=createEditorialGalleryBlock(block,context);if(block.type==='related_projects')node=createRelatedProjectsBlock(block,context);if(block.type==='quote_cta')node=createQuoteCtaBlock(block,context);if(node)applySharedPageBlockFrame(node,block);return node;}

function safeExternalHttps(value='') {
  try { const parsed=new URL(String(value||'').trim()); return parsed.protocol==='https:'?parsed.href:''; }
  catch (_) { return ''; }
}
function createExternalEmbedBlock(block={}) {
  const url=safeExternalHttps(block.url);if(!url)return null;
  const section=document.createElement('section');section.className='modular-block block-external-embed reveal';
  const heading=blockHeading(block);if(heading.children.length)section.append(heading);
  const stage=document.createElement('div');stage.className=`external-embed-stage ratio-${String(block.ratio||'16:9').replace(':','x')} width-${['content','wide','full'].includes(block.width)?block.width:'wide'}`;
  if(block.ratio==='custom')stage.style.setProperty('--embed-height',`${Math.max(180,Math.min(1200,Number(block.height||560)))}px`);
  const frame=document.createElement('iframe');frame.src=url;frame.title=block.embed_name||block.title||'Conteúdo externo';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.sandbox='allow-forms allow-presentation allow-same-origin allow-scripts';frame.allow='fullscreen; autoplay; encrypted-media; picture-in-picture';
  const fallback=document.createElement('div');fallback.className='external-embed-fallback';const copy=document.createElement('span');copy.textContent='Se o conteúdo bloquear a incorporação, abra-o em uma nova aba.';const open=document.createElement('a');open.href=url;open.target='_blank';open.rel='noopener';open.textContent=block.cta_text||'Abrir conteúdo externamente ↗';fallback.append(copy,open);
  frame.addEventListener('load',()=>stage.classList.add('is-loaded'));frame.addEventListener('error',()=>stage.classList.add('is-blocked'));
  stage.append(frame,fallback);section.append(stage);return section;
}
function externalCarouselItems(value='') {
  return String(value||'').split(/\r?\n/).map((line)=>line.trim()).filter(Boolean).map((line,index)=>{const [url,thumbnail,title]=line.split('|').map((part)=>part.trim());return{id:`external-${index}`,url:safeExternalHttps(url),thumbnail:safeExternalHttps(thumbnail),title:title||`Conteúdo ${index+1}`};}).filter((item)=>item.url);
}
function createAutoplayCarouselBlock(block={}) {
  if((block.source||'projects')==='projects'){
    const speed=Number(block.speed_px||32)<24?'slow':(Number(block.speed_px||32)>42?'fast':'medium');
    return createAutoCarouselBlock({...block,motion_mode:block.autoplay===false?'manual':'auto',speed,card_gap:block.gap||block.card_gap,cards_desktop:block.items_visible_desktop||3,cards_mobile:block.items_visible_mobile||1,card_ratio:block.ratio||block.card_ratio});
  }
  const items=externalCarouselItems(block.external_urls);if(!items.length)return null;
  const section=document.createElement('section');section.className='modular-block block-autoplay-carousel block-auto-carousel reveal';section.dataset.direction=block.direction||'left';section.dataset.pauseHover=block.pause_on_hover===false?'false':'true';section.style.setProperty('--carousel-visible',String(Math.max(1,Math.min(8,Number(block.items_visible_desktop||3)))));section.style.setProperty('--carousel-visible-mobile',String(Math.max(1,Math.min(3,Number(block.items_visible_mobile||1)))));section.style.setProperty('--carousel-gap',`${Math.max(0,Math.min(80,Number(block.gap_px||20)))}px`);section.dataset.cardRatio=block.ratio||'16x9';
  const heading=blockHeading(block,'Em movimento');if(heading.children.length)section.append(heading);
  const viewport=document.createElement('div');viewport.className='auto-carousel-viewport';const strip=document.createElement('div');strip.className='auto-carousel-strip external-carousel-strip';
  const add=(clone=false)=>items.forEach((item)=>{const a=document.createElement('a');a.className='external-carousel-card';a.href=item.url;a.target='_blank';a.rel='noopener';if(clone){a.dataset.carouselClone='1';a.tabIndex=-1;a.setAttribute('aria-hidden','true');}const visual=document.createElement('span');visual.className='external-carousel-visual';if(item.thumbnail){const img=document.createElement('img');img.src=item.thumbnail;img.alt='';img.loading='lazy';visual.append(img);}else if(/\.(?:mp4|webm|m4v)(?:[?#]|$)/i.test(item.url)){const video=createResilientVideo({id:item.id,title:item.title,media_url:item.url,media_candidates:[item.url]},{autoplay:true,muted:true,loop:true,controls:false,preload:'none',defer:true,metadataReady:false});visual.append(video);bindDeferredAutoplay(video,visual);}const title=document.createElement('strong');title.textContent=item.title;a.append(visual,title);strip.append(a);});
  add(false);if(block.loop!==false)add(true);viewport.append(strip);section.append(viewport);if((reduced&&block.force_motion!==true)||block.autoplay===false){viewport.classList.add('is-manual');return section;}
  return startContinuousCarousel(section,viewport,strip,{speed:Number(block.speed_px||32),direction:block.direction||'left',loop:block.loop!==false,pauseOnHover:block.pause_on_hover!==false});
}
function createCinematicHeroBlock(block={}) {
  const media=publicMediaById(block.media_id||'');if(!media)return null;
  const section=document.createElement('section');section.className='modular-block block-cinematic-hero reveal';section.style.setProperty('--cinematic-height',`${Math.max(25,Math.min(100,Number(block.height_vh||50)))}vh`);section.style.setProperty('--cinematic-overlay',String(Math.max(0,Math.min(.9,Number(block.overlay??.36)))));section.style.setProperty('--cinematic-focus-x',`${Math.max(0,Math.min(100,Number(block.focal_x??50)))}%`);section.style.setProperty('--cinematic-focus-y',`${Math.max(0,Math.min(100,Number(block.focal_y??50)))}%`);section.dataset.mediaMovement=block.media_movement===false?'off':'on';
  const stage=document.createElement('div');stage.className='cinematic-hero-media';if(block.parallax!==false)stage.dataset.parallax='detail';
  if(media.type==='video')stage.append(projectVideoFallback(media,{autoplay:true}));else stage.append(imageWithFallback(media,[media.media_url,...(media.media_candidates||[]),media.thumbnail_url,...(media.thumbnail_candidates||[])],{lazy:true,upgradeUrls:[media.media_url,...(media.media_candidates||[])]}));
  const shade=document.createElement('div');shade.className='cinematic-hero-shade';const copy=blockHeading(block);copy.classList.add('cinematic-hero-copy');if(block.cta_text){const a=document.createElement('a');const externalHref=safeExternalHttps(block.cta_url),internalHref=String(block.cta_url||'').startsWith('/')?String(block.cta_url||''):'';const href=externalHref||internalHref;a.href=href||'#';a.textContent=block.cta_text;if(externalHref){a.target='_blank';a.rel='noopener';}copy.append(a);}section.append(stage,shade,copy);return section;
}

function normalizedSlicedHeroPublicLayers(block={}) {
  const defaults=[
    {id:'background-frame',role:'background',label:'BACKGROUND FRAME',media_type:'gradient',color:'#08111A',gradient_start:'#08111A',gradient_end:'#163E38',gradient_angle:135,opacity:1,scale:1.08,z_index:1,depth:.12,desktop_visible:true,tablet_visible:true,mobile_visible:true},
    {id:'middle-frame',role:'middle',label:'MIDDLE FRAME',media_type:'media',color:'#18231F',gradient_start:'#18231F',gradient_end:'#2FD59A',gradient_angle:115,opacity:.92,scale:1.04,z_index:2,depth:.42,desktop_visible:true,tablet_visible:true,mobile_visible:true},
    {id:'foreground-frame',role:'foreground',label:'FOREGROUND FRAME',media_type:'transparent',color:'#2FD59A',gradient_start:'#2FD59A',gradient_end:'#FFFFFF',gradient_angle:90,opacity:.35,scale:1,z_index:3,depth:.78,desktop_visible:true,tablet_visible:true,mobile_visible:false},
  ];
  const layers=Array.isArray(block.layers)?block.layers.filter((layer)=>layer&&typeof layer==='object').map((layer,index)=>({...layer,id:String(layer.id||`slice-layer-${index+1}`)})):[];
  defaults.forEach((fallback,index)=>{layers[index]={...fallback,...(layers[index]||{}),id:String(layers[index]?.id||fallback.id),role:String(layers[index]?.role||fallback.role)};});
  return layers.slice(0,9);
}
function slicedHeroLayerSource(layer={}) {
  const source=document.createElement('div');source.className='sliced-hero-layer-source';
  const mediaType=String(layer.media_type||'media');
  const media=publicMediaById(layer.media_id||'');
  if((mediaType==='media'||mediaType==='texture')&&media){
    source.dataset.sourceType=media.type==='video'?'video':'image';
    if(media.type==='video')source.append(projectVideoFallback(media,{autoplay:true}));
    else source.append(imageWithFallback(media,[media.media_url,...(media.media_candidates||[]),media.thumbnail_url,...(media.thumbnail_candidates||[]),media.preview_url,...(media.preview_candidates||[])].filter(Boolean),{lazy:false,upgradeUrls:[media.media_url,...(media.media_candidates||[])].filter(Boolean)}));
  }else if(mediaType==='gradient'){
    const start=/^#[0-9a-f]{6}$/i.test(String(layer.gradient_start||''))?layer.gradient_start:'#08111A',end=/^#[0-9a-f]{6}$/i.test(String(layer.gradient_end||''))?layer.gradient_end:'#2FD59A';
    source.dataset.sourceType='gradient';source.style.background=`linear-gradient(${Math.max(0,Math.min(360,Number(layer.gradient_angle||115)))}deg,${start},${end})`;
  }else if(mediaType==='transparent'){
    source.dataset.sourceType='transparent';source.style.background='transparent';
  }else{
    source.dataset.sourceType='color';source.style.background=/^#[0-9a-f]{6}$/i.test(String(layer.color||''))?layer.color:'#111111';
  }
  return source;
}
function createSlicedHeroDepthPlanes(source,sliceCount,orientation,block={},layer={},layerIndex=0){
  if(!source||source.dataset.sourceType==='video'||source.dataset.sourceType==='transparent')return null;
  const planes=document.createElement('div');planes.className='sliced-hero-depth-slices';planes.setAttribute('aria-hidden','true');
  const count=Math.max(2,Math.min(12,Number(sliceCount||7))),spread=Math.max(0,Math.min(2,Number(block.slice_depth_spread??.7))),xSpread=Math.max(-240,Math.min(240,Number(block.slice_x_spread||0))),ySpread=Math.max(-240,Math.min(240,Number(block.slice_y_spread||0))),rotationSpread=Math.max(-90,Math.min(90,Number(block.slice_rotation_spread||0)));
  const cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols);
  for(let index=0;index<count;index+=1){
    const plane=document.createElement('span');plane.className='sliced-hero-depth-plane';plane.dataset.slicePlane=String(index);plane.dataset.layerIndex=String(layerIndex);
    const normalized=count===1?0:(index/(count-1)-.5)*2,depth=normalized*spread*180;
    plane.style.setProperty('--slice-plane-z',`${depth}px`);plane.style.setProperty('--slice-plane-x',`${normalized*xSpread}px`);plane.style.setProperty('--slice-plane-y',`${normalized*ySpread}px`);plane.style.setProperty('--slice-plane-rotation',`${normalized*rotationSpread}deg`);plane.style.setProperty('--slice-plane-index',String(index));
    if(orientation==='horizontal'){
      const top=index/count*100,bottom=100-(index+1)/count*100;plane.style.clipPath=`inset(${top}% 0 ${Math.max(0,bottom)}% 0)`;
    }else if(orientation==='grid'){
      const row=Math.floor(index/cols),col=index%cols,left=col/cols*100,right=100-(col+1)/cols*100,top=row/rows*100,bottom=100-(row+1)/rows*100;plane.style.clipPath=`inset(${top}% ${Math.max(0,right)}% ${Math.max(0,bottom)}% ${left}%)`;
    }else{
      const left=index/count*100,right=100-(index+1)/count*100;plane.style.clipPath=`inset(0 ${Math.max(0,right)}% 0 ${left}%)`;
    }
    const clone=source.cloneNode(true);clone.classList.add('sliced-hero-depth-plane-source');clone.removeAttribute('id');plane.append(clone);planes.append(plane);
  }
  return planes;
}
function slicedHeroAction(label,url,secondary=false) {
  const text=String(label||'').trim(),href=safeLinkUrl(url||'');if(!text||!href)return null;
  const action=document.createElement('a');action.className=`sliced-hero-cta${secondary?' is-secondary':''}`;action.href=href;action.textContent=text;if(/^https?:/i.test(href)){action.target='_blank';action.rel='noopener';}return action;
}
function createSlicedHeroBlock(block={}) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const section=document.createElement('section');section.className='modular-block block-sliced-hero';section.dataset.slicedHero='';section.dataset.slicedPreset=block.sliced_preset||'sliced_parallax';section.dataset.sliceOrientation=['vertical','horizontal','grid'].includes(block.slice_orientation)?block.slice_orientation:'vertical';section.dataset.tabletOrientation=['vertical','horizontal','grid'].includes(block.tablet_orientation)?block.tablet_orientation:'inherit';section.dataset.mobileOrientation=['vertical','horizontal','grid'].includes(block.mobile_orientation)?block.mobile_orientation:'vertical';section.dataset.sliceMask=['hard','soft','diagonal','round'].includes(block.slice_mask)?block.slice_mask:'hard';section.dataset.sliceDirection=block.slice_direction||'alternating';section.dataset.mobileMotion=['full','reduced','static'].includes(block.mobile_motion)?block.mobile_motion:'reduced';
  const sliceCount=Math.max(2,Math.min(12,Number(block.slice_count||7))),tabletSliceCount=Math.max(2,Math.min(12,Number(block.tablet_slice_count||Math.min(5,sliceCount)))),mobileSliceCount=Math.max(1,Math.min(8,Number(block.mobile_slice_count||3))),mobileLayerLimit=Math.max(1,Math.min(9,Number(block.mobile_layer_limit||2))),gap=Math.max(0,Math.min(48,Number(block.slice_gap||6))),overlap=Math.max(0,Math.min(36,Number(block.slice_overlap||2)));
  section.style.setProperty('--sliced-height',`${Math.max(55,Math.min(120,Number(block.height_vh||92)))}svh`);section.style.setProperty('--sliced-tablet-height',`${Math.max(50,Math.min(120,Number(block.tablet_height_vh||82)))}svh`);section.style.setProperty('--sliced-mobile-height',`${Math.max(50,Math.min(120,Number(block.mobile_height_vh||78)))}svh`);section.style.setProperty('--slice-count',String(sliceCount));section.style.setProperty('--slice-grid-cols',String(Math.ceil(Math.sqrt(sliceCount))));section.style.setProperty('--tablet-slice-count',String(tabletSliceCount));section.style.setProperty('--mobile-slice-count',String(mobileSliceCount));section.style.setProperty('--slice-gap',`${Math.max(0,gap-overlap)}px`);section.style.setProperty('--slice-duration',`${Math.max(180,Math.min(4000,Number(block.slice_duration||1100)))}ms`);section.style.setProperty('--slice-stagger',`${Math.max(0,Math.min(500,Number(block.slice_stagger||70)))}ms`);section.style.setProperty('--slice-intensity',String(Math.max(0,Math.min(1,Number(block.slice_intensity??.72)))));section.style.setProperty('--sliced-overlay',String(Math.max(0,Math.min(.9,Number(block.overlay??.28)))));section.style.setProperty('--sliced-ease',({premium:'cubic-bezier(.22,1,.36,1)',smooth:'cubic-bezier(.4,0,.2,1)',snappy:'cubic-bezier(.2,.9,.25,1.18)',linear:'linear'})[block.slice_easing]||'cubic-bezier(.22,1,.36,1)');
  const depthPreset=String(block.sliced_preset||'')==='sliced_depth_parallax',depthSpread=Math.max(0,Math.min(2,Number(block.slice_depth_spread??.7))),perspective=Math.max(300,Math.min(3000,Number(block.slice_perspective||1200)));section.style.setProperty('--sliced-perspective',`${perspective}px`);section.style.setProperty('--slice-smoothing',String(Math.max(0,Math.min(1,Number(block.slice_smoothing??.12)))));section.dataset.depthSlices=depthPreset?'true':'false';const stage=document.createElement('div');stage.className='sliced-hero-stage';if(block.scroll_parallax!==false)stage.dataset.parallax='detail';
  const layers=normalizedSlicedHeroPublicLayers(block);
  layers.forEach((layer,layerIndex)=>{
    const frame=document.createElement('div');frame.className='sliced-hero-layer';frame.dataset.slicedLayer=String(layer.id||layerIndex);frame.dataset.layerRole=String(layer.role||'custom');if(layer.desktop_visible===false)frame.classList.add('is-desktop-hidden');if(layer.tablet_visible===false)frame.classList.add('is-tablet-hidden');if(layer.mobile_visible===false||layerIndex>=mobileLayerLimit)frame.classList.add('is-mobile-hidden');
    const opacity=Math.max(0,Math.min(1,Number(layer.opacity??1))),depth=Math.max(0,Math.min(1,Number(layer.depth??0))),scale=Math.max(.2,Math.min(3,Number(layer.scale??1))),rotation=Math.max(-180,Math.min(180,Number(layer.rotation??0))),x=Math.max(-100,Math.min(100,Number(layer.x??0))),y=Math.max(-100,Math.min(100,Number(layer.y??0))),blur=Math.max(0,Math.min(40,Number(layer.blur??0)));
    frame.dataset.sfSlicedLayerId=String(layer.id||layerIndex);frame.dataset.sfSlicedLayerIndex=String(layerIndex);frame.style.setProperty('--layer-opacity',String(opacity));frame.style.setProperty('--layer-depth',String(depth));frame.style.setProperty('--layer-depth-z',`${depthPreset?((depth-.5)*depthSpread*260):0}px`);frame.style.setProperty('--layer-scale',String(scale));frame.style.setProperty('--layer-rotation',`${rotation}deg`);frame.style.setProperty('--layer-x',`${x}%`);frame.style.setProperty('--layer-y',`${y}%`);frame.style.setProperty('--layer-blur',`${blur}px`);frame.style.setProperty('--layer-focal-x',`${Math.max(0,Math.min(100,Number(layer.focal_x??50)))}%`);frame.style.setProperty('--layer-focal-y',`${Math.max(0,Math.min(100,Number(layer.focal_y??50)))}%`);frame.style.zIndex=String(Math.max(0,Math.min(30,Number(layer.z_index??layerIndex+1))));frame.style.mixBlendMode=['normal','multiply','screen','overlay','soft-light','difference','luminosity'].includes(layer.blend_mode)?layer.blend_mode:'normal';
    const layerSource=slicedHeroLayerSource(layer);frame.append(layerSource);if(depthPreset){const depthPlanes=createSlicedHeroDepthPlanes(layerSource,sliceCount,section.dataset.sliceOrientation,block,layer,layerIndex);if(depthPlanes)frame.append(depthPlanes);}
    const shutters=document.createElement('div');shutters.className='sliced-hero-slices';shutters.setAttribute('aria-hidden','true');
    for(let index=0;index<sliceCount;index+=1){const slice=document.createElement('i');slice.className='sliced-hero-slice';if(index>=tabletSliceCount)slice.classList.add('is-tablet-extra');if(index>=mobileSliceCount)slice.classList.add('is-mobile-extra');slice.style.setProperty('--slice-index',String(index));slice.style.setProperty('--slice-reverse-index',String(sliceCount-index-1));shutters.append(slice);}
    frame.append(shutters);stage.append(frame);
  });
  const shade=document.createElement('div');shade.className='sliced-hero-overlay';
  const content=document.createElement('div');content.className='sliced-hero-content';content.dataset.align=['left','center','right'].includes(block.content_align)?block.content_align:'left';content.dataset.position=['top','center','bottom'].includes(block.content_position)?block.content_position:'bottom';
  if(block.badge){const badge=document.createElement('span');badge.className='sliced-hero-badge';badge.textContent=block.badge;content.append(badge);}if(block.eyebrow){const eyebrow=document.createElement('small');eyebrow.textContent=block.eyebrow;content.append(eyebrow);}const title=document.createElement('h2');title.textContent=block.title||'Ideias em camadas. Movimento com direção.';content.append(title);if(block.body){const body=document.createElement('p');body.textContent=block.body;content.append(body);}const actions=document.createElement('div');actions.className='sliced-hero-actions';const primary=slicedHeroAction(block.cta_text||'Explorar projetos',block.cta_url||'#projectsBlock'),secondary=slicedHeroAction(block.secondary_cta_text,block.secondary_cta_url,true);if(primary)actions.append(primary);if(secondary)actions.append(secondary);if(actions.children.length)content.append(actions);
  section.append(stage,shade,content);
  const activate=()=>{section.classList.add('is-sliced-ready');};
  if(block.slice_motion==='none'||reduced)activate();else if(block.slice_motion==='scroll'&&'IntersectionObserver' in window){const observer=new IntersectionObserver((entries)=>{if(entries.some((entry)=>entry.isIntersecting)){activate();observer.disconnect();}},{threshold:.18});observer.observe(section);}else requestAnimationFrame(()=>requestAnimationFrame(activate));
  const mouseEnabled=block.mouse_parallax!==false&&!reduced&&matchMedia('(hover:hover) and (pointer:fine)').matches;
  if(mouseEnabled){const sensitivity=Math.max(0,Math.min(2,Number(block.mouse_sensitivity??.65)));section.addEventListener('pointermove',(event)=>{const rect=section.getBoundingClientRect(),mx=((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*2,my=((event.clientY-rect.top)/Math.max(1,rect.height)-.5)*2;section.querySelectorAll('.sliced-hero-layer').forEach((frame)=>{const depth=Number(frame.style.getPropertyValue('--layer-depth')||0);frame.style.setProperty('--layer-mouse-x',`${mx*depth*sensitivity*34}px`);frame.style.setProperty('--layer-mouse-y',`${my*depth*sensitivity*24}px`);frame.querySelectorAll('.sliced-hero-depth-plane').forEach((plane)=>{const z=Number.parseFloat(plane.style.getPropertyValue('--slice-plane-z'))||0,ratio=z/Math.max(1,depthSpread*180);plane.style.setProperty('--slice-plane-mouse-x',`${mx*ratio*Number(block.slice_mouse_strength??.75)*28}px`);plane.style.setProperty('--slice-plane-mouse-y',`${my*ratio*Number(block.slice_mouse_strength??.75)*20}px`);});});},{passive:true});section.addEventListener('pointerleave',()=>section.querySelectorAll('.sliced-hero-layer').forEach((frame)=>{frame.style.setProperty('--layer-mouse-x','0px');frame.style.setProperty('--layer-mouse-y','0px');frame.querySelectorAll('.sliced-hero-depth-plane').forEach((plane)=>{plane.style.setProperty('--slice-plane-mouse-x','0px');plane.style.setProperty('--slice-plane-mouse-y','0px');});}),{passive:true});}
  if(block.scroll_parallax!==false&&!reduced){const controller=new AbortController(),strength=Math.max(0,Math.min(2,Number(block.slice_scroll_strength??.55)));let active=true,ticking=false;const update=()=>{ticking=false;if(!section.isConnected){controller.abort();return;}if(!active)return;const rect=section.getBoundingClientRect(),progress=Math.max(-1,Math.min(1,(rect.top+rect.height*.5-innerHeight*.5)/Math.max(innerHeight,rect.height)));section.querySelectorAll('.sliced-hero-layer').forEach((frame)=>{const depth=Number(frame.style.getPropertyValue('--layer-depth')||0);frame.style.setProperty('--layer-scroll-y',`${progress*depth*strength*-72}px`);frame.querySelectorAll('.sliced-hero-depth-plane').forEach((plane)=>{const z=Number.parseFloat(plane.style.getPropertyValue('--slice-plane-z'))||0,ratio=z/Math.max(1,depthSpread*180);plane.style.setProperty('--slice-plane-scroll-y',`${progress*ratio*strength*-56}px`);});});};window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true,signal:controller.signal});if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{active=entries.some(entry=>entry.isIntersecting);if(active)update();},{rootMargin:'30% 0px'});observer.observe(section);controller.signal.addEventListener('abort',()=>observer.disconnect(),{once:true});}update();}
  return section;
}

function texturedRevealLines(style='orbits') {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.classList.add('textured-reveal-lines');svg.setAttribute('viewBox','0 0 1600 900');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
  const paths={
    orbits:['M-160 90 C 250 -120, 710 360, 950 -120','M1410 -90 C 1540 270, 1250 610, 1090 980','M-100 540 C 240 650, 40 970, 470 1010'],
    contours:['M-120 170 C 210 30, 410 350, 760 210 S 1320 40, 1720 230','M-180 630 C 180 440, 520 760, 880 590 S 1390 390, 1760 650','M240 -90 C 320 170, 180 390, 370 620 S 580 880, 520 1040'],
    diagonal:['M-120 780 C 280 520, 520 500, 860 280 S 1280 60, 1730 -40','M-160 970 C 300 720, 600 690, 980 430 S 1360 180, 1740 60','M120 920 C 420 700, 700 520, 970 310 S 1320 80, 1600 -20']
  };
  (paths[style]||paths.orbits).forEach((d)=>{const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('pathLength','1');svg.append(path);});return svg;
}
function createTexturedRevealBlock(block={}) {
  const section=document.createElement('section');section.className='modular-block block-textured-reveal reveal';section.dataset.texturedReveal='';section.dataset.texturedSource=['theme_texture','custom_media','global_media_canvas'].includes(block.textured_source)?block.textured_source:'theme_texture';section.dataset.texturedMask=String(block.textured_mask||'full');section.dataset.texturedDirection=String(block.textured_direction||'up');section.style.setProperty('--textured-focal-x',`${Math.max(0,Math.min(100,Number(block.textured_focal_x??50)))}%`);section.style.setProperty('--textured-focal-y',`${Math.max(0,Math.min(100,Number(block.textured_focal_y??50)))}%`);section.style.setProperty('--textured-media-scale',String(Math.max(.2,Math.min(3,Number(block.textured_scale||1)))));section.style.setProperty('--textured-parallax',String(Math.max(0,Math.min(2,Number(block.textured_parallax??.3)))));section.dataset.texturedProgressMode=['trigger_once','tied_to_scroll','replay'].includes(block.textured_progress_mode)?block.textured_progress_mode:'tied_to_scroll';section.dataset.textureRevealMotion=['fade','float','scale','none'].includes(block.texture_reveal_motion)?block.texture_reveal_motion:'float';section.style.setProperty('--textured-height',`${Math.max(40,Math.min(120,Number(block.height_vh||70)))}svh`);section.style.setProperty('--textured-line-color',/^#[0-9a-f]{6}$/i.test(String(block.line_color||''))?block.line_color:'#FFFFFF');section.style.setProperty('--textured-line-opacity',String(Math.max(0,Math.min(1,Number(block.line_opacity??.72)))));section.dataset.texturedTextureOpacity=String(Math.max(0,Math.min(1,Number(block.section_texture_opacity??.34))));
  if(block.decorative_lines!==false)section.append(texturedRevealLines(['orbits','contours','diagonal'].includes(block.line_style)?block.line_style:'orbits'));
  const content=document.createElement('div');content.className='textured-reveal-content';
  if(block.eyebrow){const eyebrow=document.createElement('small');eyebrow.className='textured-reveal-eyebrow';eyebrow.textContent=block.eyebrow;content.append(eyebrow);}
  const title=document.createElement('h2');title.textContent=block.title||'Take a look on our reel';content.append(title);
  if(block.body){const body=document.createElement('p');body.textContent=block.body;content.append(body);}
  const href=safeLinkUrl(block.cta_url||'');if(block.cta_text&&href){const action=document.createElement('a');action.className='textured-reveal-cta';action.href=href;action.textContent=block.cta_text;if(/^https?:/i.test(href)){action.target='_blank';action.rel='noopener';}content.append(action);}
  section.append(content);
  if(block.scroll_indicator!==false){const indicator=document.createElement('div');indicator.className='textured-reveal-scroll';indicator.setAttribute('aria-hidden','true');const icon=document.createElement('i');const label=document.createElement('span');label.textContent=block.scroll_label||'Role para explorar';indicator.append(icon,label);section.append(indicator);}
  return section;
}

function sectionExperienceItemRecord(item={}) {
  const project=editorialProjectFromItem(item);
  const media=publicMediaById(item.media_id||'');
  const external=safeExternalHttps(item.external_media_url||'');
  const title=String(item.title||item.label||project?.title||'').trim();
  const label=String(item.label||title||'Item').trim();
  return {item,project,media,external,title,label,description:String(item.description||project?.description||'').trim()};
}
function sectionExperienceMediaNode(record={}) {
  const media=record.media || (record.project ? {...record.project,_project:record.project} : null);
  if(media){
    if(media.type==='video'){
      const video=createResilientVideo(media,{autoplay:true,muted:true,loop:true,controls:false,preload:'metadata',className:'section-experience-media-node',defer:false,metadataReady:false,timeoutMs:45000});
      video.playsInline=true; bindDeferredAutoplay(video,video); return video;
    }
    const urls=[media.media_url,...(media.media_candidates||[]),media.thumbnail_url,...(media.thumbnail_candidates||[]),media.preview_url,...(media.preview_candidates||[])].filter(Boolean);
    const image=imageWithFallback(media,urls,{lazy:false,upgradeUrls:urls}); image.classList.add('section-experience-media-node'); image.alt=''; return image;
  }
  if(record.external){
    if(/\.(?:mp4|webm|m4v|mov)(?:$|[?#])/i.test(record.external)){
      const externalVideo={id:`section-external-${Math.random().toString(36).slice(2,8)}`,type:'video',media_url:record.external,media_candidates:[record.external],preview_url:record.external,preview_candidates:[record.external],thumbnail_url:'',thumbnail_candidates:[]};
      const video=createResilientVideo(externalVideo,{autoplay:true,muted:true,loop:true,controls:false,preload:'metadata',className:'section-experience-media-node',defer:false,metadataReady:false,timeoutMs:45000});video.playsInline=true;bindDeferredAutoplay(video,video);return video;
    }
    const image=document.createElement('img');image.className='section-experience-media-node';image.src=record.external;image.alt='';image.loading='eager';image.decoding='async';return image;
  }
  return null;
}
function sectionExperienceAction(record={}) {
  const item=record.item||{}, label=String(item.action_label||'').trim();
  if(!label)return null;
  const explicit=safeEditorialActionUrl(item.action_url||'');
  if(explicit){const a=document.createElement('a');a.className='section-experience-cta';a.href=explicit;a.textContent=label;if(/^https?:/i.test(explicit)){a.target='_blank';a.rel='noopener';}return a;}
  const service=quoteServiceRecord(String(item.service_id||''));
  if(service){const a=document.createElement('a');a.className='section-experience-cta';a.href=serviceDetailHref(service.item);a.textContent=label;return a;}
  if(record.project){const button=document.createElement('button');button.type='button';button.className='section-experience-cta';button.textContent=label;button.addEventListener('click',()=>openProjectDetail(record.project));return button;}
  return null;
}
function createSectionExperienceBlock(block={}) {
  const records=(Array.isArray(block.items)?block.items:[]).map(sectionExperienceItemRecord).filter((record)=>record.label&&(record.media||record.project||record.external));
  if(!records.length)return null;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const section=document.createElement('section');section.className='modular-block block-section-experience reveal';section.tabIndex=0;section.dataset.navigationPosition=['left','right'].includes(block.navigation_position)?block.navigation_position:'left';section.dataset.experienceTransition=['cinematic','crossfade','scale','clean'].includes(block.experience_transition)?block.experience_transition:'cinematic';section.dataset.mobileMode=block.experience_mobile_mode==='compact'?'compact':'pills';section.style.setProperty('--experience-height',`${Math.max(55,Math.min(120,Number(block.height_vh||100)))}svh`);section.style.setProperty('--experience-active',/^#[0-9a-f]{6}$/i.test(String(block.active_color||''))?block.active_color:'var(--accent)');section.style.setProperty('--experience-inactive',/^#[0-9a-f]{6}$/i.test(String(block.inactive_color||''))?block.inactive_color:'#fff');section.style.setProperty('--experience-inactive-opacity',String(Math.max(.08,Math.min(.9,Number(block.inactive_opacity??.28)))));section.style.setProperty('--experience-duration',`${Math.max(180,Math.min(2200,Number(block.transition_duration||720)))}ms`);section.style.setProperty('--experience-overlay',String(Math.max(0,Math.min(.85,Number(block.experience_overlay??.32)))));section.style.setProperty('--experience-align',block.experience_alignment||'left');
  const stage=document.createElement('div');stage.className='section-experience-stage';stage.setAttribute('aria-hidden','true');
  const overlay=document.createElement('div');overlay.className='section-experience-overlay';
  const content=document.createElement('div');content.className='section-experience-content';
  const eyebrow=document.createElement('small');eyebrow.className='section-experience-eyebrow';eyebrow.textContent=block.eyebrow||'OUR EXPERTISES';
  const nav=document.createElement('nav');nav.className='section-experience-nav';nav.setAttribute('aria-label',block.eyebrow||'Navegação da experiência');
  const copy=document.createElement('div');copy.className='section-experience-copy';const title=document.createElement('h2');const description=document.createElement('p');const actions=document.createElement('div');actions.className='section-experience-actions';const itemAction=document.createElement('div');itemAction.className='section-experience-item-action';const globalActions=document.createElement('div');globalActions.className='section-experience-global-actions';
  const servicesAction=document.createElement('a');servicesAction.className='section-experience-global-cta is-services';servicesAction.href=safeEditorialActionUrl(block.services_cta_url||'')||servicesHref();servicesAction.textContent=String(block.services_cta_label||'Ver serviços');
  let quoteAction;if(quoteEnabled()){quoteAction=document.createElement('button');quoteAction.type='button';quoteAction.dataset.quoteOpen='';quoteAction.className='section-experience-global-cta is-quote';quoteAction.textContent=String(block.quote_cta_label||'Ver orçamento');}else{quoteAction=document.createElement('a');quoteAction.href=servicesHref();quoteAction.className='section-experience-global-cta is-quote';quoteAction.textContent=String(block.quote_cta_label||'Ver orçamento');}
  globalActions.append(servicesAction,quoteAction);actions.append(itemAction,globalActions);copy.append(title,description,actions);
  const shell=document.createElement('div');shell.className='section-experience-shell';shell.append(stage,overlay,content);section.append(shell);
  content.append(eyebrow,nav,copy);
  let active=0,locked=false,touchStartX=0,touchStartY=0;
  const buttons=records.map((record,index)=>{const button=document.createElement('button');button.type='button';button.className='section-experience-item';button.dataset.experienceIndex=String(index);button.innerHTML=`<i>${String(index+1).padStart(2,'0')}</i><span>${esc(record.label)}</span>`;button.addEventListener('click',()=>render(index));nav.append(button);return button;});
  function render(index,{focus=false}={}){
    const next=Math.max(0,Math.min(records.length-1,index)); if(next===active&&stage.childElementCount)return; active=next; const record=records[active];
    const mediaNode=sectionExperienceMediaNode(record); if(mediaNode){const layer=document.createElement('div');layer.className='section-experience-media-layer is-entering';layer.append(mediaNode);stage.append(layer);requestAnimationFrame(()=>layer.classList.remove('is-entering'));[...stage.children].slice(0,-1).forEach((old)=>{old.classList.add('is-leaving');setTimeout(()=>old.remove(),Math.max(240,Number(block.transition_duration||720)+80));});}
    buttons.forEach((button,i)=>{const on=i===active;button.classList.toggle('is-active',on);button.setAttribute('aria-current',on?'true':'false');});
    const accent=/^#[0-9a-f]{6}$/i.test(String(record.item.accent_color||''))?record.item.accent_color:(/^#[0-9a-f]{6}$/i.test(String(block.active_color||''))?block.active_color:'var(--accent)');section.style.setProperty('--experience-active',accent);
    title.textContent=record.title||record.label;description.textContent=record.description;description.hidden=!record.description;itemAction.replaceChildren();const action=sectionExperienceAction(record);if(action){action.classList.add('is-item-action');itemAction.append(action);}
    section.dataset.activeIndex=String(active); if(focus)buttons[active]?.focus({preventScroll:true});
  }
  function navigate(delta,{focus=false,allowLoop=true}={}){const candidate=active+delta;if(candidate<0||candidate>=records.length){if(allowLoop&&block.loop===true){render(candidate<0?records.length-1:0,{focus});return true;}return false;}render(candidate,{focus});return true;}
  if(block.wheel_navigation!==false&&!reduced&&records.length>1)section.addEventListener('wheel',(event)=>{if(matchMedia('(max-width:900px)').matches||locked||Math.abs(event.deltaY)<18)return;const delta=event.deltaY>0?1:-1;if(!navigate(delta,{allowLoop:false}))return;event.preventDefault();locked=true;setTimeout(()=>{locked=false;},Math.max(420,Number(block.transition_duration||720)));},{passive:false});
  section.addEventListener('keydown',(event)=>{if(['ArrowDown','ArrowRight','PageDown'].includes(event.key)){if(navigate(1,{focus:true,allowLoop:true}))event.preventDefault();}if(['ArrowUp','ArrowLeft','PageUp'].includes(event.key)){if(navigate(-1,{focus:true,allowLoop:true}))event.preventDefault();}});
  section.addEventListener('touchstart',(event)=>{const t=event.changedTouches?.[0];if(t){touchStartX=t.clientX;touchStartY=t.clientY;}},{passive:true});section.addEventListener('touchend',(event)=>{const t=event.changedTouches?.[0];if(!t)return;const dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;if(Math.abs(dx)<55||Math.abs(dx)<Math.abs(dy))return;navigate(dx<0?1:-1,{allowLoop:true});},{passive:true});
  render(0); return section;
}

function createRenaissanceChapterBlock(block={}) {
  const section=document.createElement('section');
  section.className=`modular-block block-renaissance-chapter layout-${block.layout==='stack'?'stack':'split'} tone-${['ink','accent'].includes(block.tone)?block.tone:'cream'} reveal`;
  const meta=document.createElement('div');meta.className='renaissance-chapter-meta';
  const number=document.createElement('span');number.textContent=String(block.number||'01').padStart(2,'0');
  const eyebrow=document.createElement('small');eyebrow.textContent=block.eyebrow||'Renaissance editorial';meta.append(number,eyebrow);
  const copy=document.createElement('div');copy.className='renaissance-chapter-copy';
  const title=document.createElement('h2');title.textContent=block.title||'Uma nova forma de apresentar ideias.';title.dataset.parallaxText='8';copy.append(title);
  if(block.body){const body=document.createElement('p');body.textContent=block.body;copy.append(body);}
  const href=safeLinkUrl(block.cta_url||'');
  if(block.cta_text&&href){const action=document.createElement('a');action.className='renaissance-section-button';action.href=href;action.textContent=block.cta_text;if(/^https?:/i.test(href)){action.target='_blank';action.rel='noopener';}copy.append(action);}
  section.append(meta,copy);
  return section;
}


function advLines(value=''){return String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);}
function advParts(line=''){return String(line).split('|').map(x=>x.trim());}
function advSection(block,cls){const n=document.createElement('section');n.className=`modular-block sf-advanced-block ${cls}`;return n;}
function createTextMotionBlock(block={}){const n=advSection(block,'sf-text-motion');n.dataset.sfTextMotion='1';n.dataset.motionType=block.animation_type||'fadeInUp';n.dataset.trigger=block.trigger||'viewport';n.dataset.once=block.once===false?'false':'true';n.style.setProperty('--stagger',`${Number(block.stagger||60)}ms`);n.style.setProperty('--delay',`${Number(block.delay||0)}ms`);const inner=document.createElement('div');inner.className='sf-adv-inner';if(block.eyebrow){const small=document.createElement('small');small.textContent=block.eyebrow;inner.append(small)}const h=document.createElement(block.heading_level==='h1'?'h1':'h2');h.className='sf-advanced-heading sf-text-motion-text';const text=String(block.title||'Texto em movimento');[...text].forEach((ch,i)=>{const span=document.createElement('span');span.style.setProperty('--i',i);span.textContent=ch===' '?'\u00a0':ch;h.append(span)});inner.append(h);if(block.body){const p=document.createElement('p');p.className='sf-advanced-copy';p.textContent=block.body;inner.append(p)}n.append(inner);return n;}
function createFractalGridBlock(block={}){const n=advSection(block,'sf-fractal-stage');const c=document.createElement('canvas');c.dataset.sfFractalGrid='1';c.dataset.config=JSON.stringify({dot_size:+block.dot_size||5,dot_spacing:+block.dot_spacing||25,dot_opacity:+block.dot_opacity||.8,wave_intensity:+block.wave_intensity||40,wave_radius:+block.wave_radius||250,dot_color:block.dot_color||'#64b5f6',glow_color:block.glow_color||'#1abc9c',mouse_glow:block.mouse_glow===true||block.mouse_glow==='true',performance:block.performance||'high'});c.setAttribute('aria-label','Canvas decorativo');n.append(c);return n;}
function createGridBeamBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';const grid=document.createElement('div');grid.className='sf-grid-beam';grid.dataset.sfGridBeam='1';grid.dataset.active=block.active===false||block.active==='false'?'false':'true';grid.dataset.palette=block.palette||'colorful';grid.style.setProperty('--cols',String(+block.cols||3));grid.style.setProperty('--duration',`${+block.duration||4.2}s`);grid.style.setProperty('--strength',String(+block.strength||.85));const palettes={colorful:'#ed42b5',mono:'#ffffff',ocean:'#37c8ff',sunset:'#ff7a45'};grid.style.setProperty('--beam',palettes[block.palette]||palettes.colorful);const cells=advLines(block.body||'Latency | 12ms\nThroughput | 2.4k\nUptime | 99.97%\nRequests | 847k\nErrors | 0.03%\nCache Hit | 94.2%');cells.forEach(line=>{const [label,value]=advParts(line),c=document.createElement('div');c.className='sf-grid-beam-cell';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value||'—';c.append(l,v);grid.append(c)});inner.append(grid);n.append(inner);return n;}
function createGradientButtonGroupBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';const group=document.createElement('div');group.className='sf-button-group';advLines(block.body||'Explorar | #projectsBlock\nOrçamento | #services').forEach(line=>{const [label,url]=advParts(line),a=document.createElement('a');a.className='sf-adv-button sf-gradient-button';a.textContent=label||'Botão';a.href=safeLinkUrl(url||'#')||'#';a.style.setProperty('--g1',block.color_a||'#5266eb');a.style.setProperty('--g2',block.color_b||'#ed42b5');a.style.setProperty('--g3',block.color_c||'#6ff7cc');a.style.setProperty('--gradient-angle',`${+block.gradient_angle||115}deg`);a.style.setProperty('--gradient-speed',`${+block.speed||5}s`);group.append(a)});inner.append(group);n.append(inner);return n;}
function createBorderBeamButtonBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';const a=document.createElement('a');a.className='sf-adv-button sf-border-beam-button';a.textContent=block.title||'Border Beam';a.href=safeLinkUrl(block.url||'#')||'#';const palettes={colorful:['#6ff7cc','#ed42b5'],ocean:['#37c8ff','#5266eb'],sunset:['#ffb347','#ff416c'],mono:['#fff','#777']},p=palettes[block.palette]||palettes.colorful;a.style.setProperty('--beam-a',p[0]);a.style.setProperty('--beam-b',p[1]);a.style.setProperty('--beam-speed',`${+block.duration||3.4}s`);if(block.active===false||block.active==='false')a.style.setProperty('--beam-speed','0s');inner.append(a);n.append(inner);return n;}
function createDynamicIslandBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';const island=document.createElement('div');island.className='sf-dynamic-island';island.tabIndex=0;island.role='button';island.dataset.sfDynamicIsland='1';island.dataset.size=block.island_size||'compact';island.dataset.sizes='compact,medium,long,tall,large';island.dataset.trigger=block.trigger||'click';island.dataset.interval=String(+block.interval||2200);const c=document.createElement('div');c.className='sf-dynamic-island-content';c.innerHTML=`<span aria-hidden="true">${esc(block.icon||'●')}</span><div><strong>${esc(block.title||'Dynamic Island')}</strong><small>${esc(block.body||'Clique para expandir')}</small></div>${block.cta_text?`<span>${esc(block.cta_text)} ↗</span>`:''}`;island.append(c);inner.append(island);n.append(inner);return n;}
function createExpandableWidgetBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner sf-expandable';inner.dataset.sfExpandable='1';inner.dataset.floating=block.floating===true||block.floating==='true'?'true':'false';const btn=document.createElement('button');btn.type='button';btn.className='sf-adv-button';btn.dataset.expandTrigger='1';btn.setAttribute('aria-expanded','false');btn.textContent=block.trigger_label||'Abrir widget';const overlay=document.createElement('div');overlay.className='sf-expandable-overlay';const card=document.createElement('div');card.className='sf-expandable-card';card.innerHTML=`<button type="button" data-expand-close aria-label="Fechar">×</button><h2>${esc(block.title||'Vamos conversar?')}</h2><p>${esc(block.body||'Conte o que você precisa.')}</p>${block.form_enabled===false||block.form_enabled==='false'?'':`<div class="sf-widget-form"><label>Nome<input type="text"></label><label>E-mail<input type="email"></label><label>Mensagem<textarea rows="4"></textarea></label></div>`}${block.cta_text?`<a class="sf-adv-button" href="${esc(safeLinkUrl(block.cta_url||'#')||'#')}">${esc(block.cta_text)}</a>`:''}`;inner.append(btn,overlay,card);n.append(inner);return n;}
function createCutoutCardBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';const card=document.createElement('article');card.className='sf-cutout-card';const media=document.createElement('div');media.className='sf-cutout-media';if(block.image_url)media.style.backgroundImage=`url("${String(block.image_url).replace(/["')]/g,'')}")`;const copy=document.createElement('div');copy.className='sf-cutout-copy';copy.innerHTML=`${block.label?`<span class="sf-cutout-label">${esc(block.label)}</span>`:''}<h2>${esc(block.title||'Cutout Card')}</h2><p>${esc(block.body||'Card de seção reutilizável.')}</p>${block.cta_text?`<a class="sf-adv-button" href="${esc(safeLinkUrl(block.cta_url||'#')||'#')}">${esc(block.cta_text)}</a>`:''}`;card.append(media,copy);inner.append(card);n.append(inner);return n;}
function createCarousel3DBlock(block={}){const n=advSection(block,'sf-carousel3d');n.dataset.sfCarousel3d='1';n.dataset.autoplay=block.autoplay===false||block.autoplay==='false'?'false':'true';n.dataset.interval=String(+block.interval||3200);const track=document.createElement('div');track.className='sf-carousel3d-track';const urls=advLines(block.body||'https://picsum.photos/seed/sf1/900/700\nhttps://picsum.photos/seed/sf2/900/700\nhttps://picsum.photos/seed/sf3/900/700');urls.forEach((line,i)=>{const [url,label]=advParts(line),item=document.createElement('figure');item.className='sf-carousel3d-item';item.dataset.carousel3dItem=String(i);const img=document.createElement('img');img.loading='lazy';img.src=safeLinkUrl(url)||url;img.alt=label||`Item ${i+1}`;item.append(img);track.append(item)});const ctr=document.createElement('div');ctr.className='sf-carousel-controls';ctr.innerHTML='<button type="button" data-prev aria-label="Anterior">←</button><button type="button" data-next aria-label="Próximo">→</button>';n.append(track,ctr);return n;}
function createLoadingCarouselBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner sf-loading-carousel';inner.dataset.sfLoadingCarousel='1';inner.dataset.interval=String(+block.interval||3000);advLines(block.body||'Preparando a experiência…\nSincronizando conteúdo…\nQuase pronto…').forEach((line,i)=>{const [title,desc]=advParts(line),slide=document.createElement('article');slide.dataset.loadingSlide=String(i);slide.innerHTML=`<small>${String(i+1).padStart(2,'0')}</small><h2>${esc(title)}</h2>${desc?`<p>${esc(desc)}</p>`:''}`;inner.append(slide)});const p=document.createElement('div');p.className='sf-loading-progress';p.dataset.loadingProgress='1';inner.append(p);n.append(inner);return n;}
function createLogoCarouselBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';if(block.title){const h=document.createElement('h2');h.textContent=block.title;inner.append(h)}const car=document.createElement('div');car.className='sf-logo-carousel';car.dataset.direction=block.direction||'left';car.style.setProperty('--logo-speed',`${+block.speed||24}s`);car.style.setProperty('--logo-opacity',String(+block.opacity||.8));car.style.setProperty('--logo-gray',block.grayscale===true||block.grayscale==='true'?'1':'0');const track=document.createElement('div');track.className='sf-logo-track';const items=advLines(block.body||'Mensagem Studio |  | #\nCliente 02 |  | #\nCliente 03 |  | #');[...items,...items].forEach(line=>{const [name,img,url]=advParts(line),a=document.createElement('a');a.className='sf-logo-item';a.href=safeLinkUrl(url||'#')||'#';if(img){const im=document.createElement('img');im.src=safeLinkUrl(img)||img;im.alt=name||'Logo';a.append(im)}else a.textContent=name||'Logo';track.append(a)});car.append(track);inner.append(car);n.append(inner);return n;}
function createTerminalBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';const t=document.createElement('div');t.className='sf-terminal';t.dataset.sfTerminal='1';const head=document.createElement('div');head.className='sf-terminal-head';head.innerHTML='<i class="sf-terminal-dot"></i><i class="sf-terminal-dot"></i><i class="sf-terminal-dot"></i><span>StudioFrame Terminal</span>';const body=document.createElement('div');body.className='sf-terminal-body';const cmd=document.createElement('strong');cmd.className='sf-terminal-command';cmd.textContent=`> ${block.command||'studioframe status'}`;body.append(cmd);advLines(block.body||'Theme Runtime ✓\nComponent Registry ✓\nMotion Runtime ✓').forEach((line,i)=>{const span=document.createElement('span');span.className='sf-terminal-line';span.dataset.terminalLine=String(i);span.dataset.delay=String(+block.line_delay||120);span.textContent=line;body.append(span)});t.append(head,body);inner.append(t);n.append(inner);return n;}
function youtubeVideoId(raw=''){const v=String(raw||'').trim();if(/^[\w-]{11}$/.test(v))return v;try{const u=new URL(v);if(u.hostname.includes('youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.searchParams.get('v'))return u.searchParams.get('v');const p=u.pathname.match(/\/(embed|shorts)\/([\w-]{11})/);return p?p[2]:'';}catch{return ''}}
function createEnhancedYouTubeBlock(block={}){const n=advSection(block,'');const inner=document.createElement('div');inner.className='sf-adv-inner';const id=youtubeVideoId(block.youtube_url||block.video_id||''),box=document.createElement('div');box.className='sf-youtube-enhanced';box.dataset.sfYoutube='1';box.dataset.videoId=id;box.dataset.title=block.title||'YouTube';box.style.setProperty('--yt-ratio',String(block.ratio||'16/9').replace(':','/'));const stage=document.createElement('div');stage.dataset.youtubeStage='1';const thumb=document.createElement('div');thumb.className='sf-youtube-thumb';const image=block.thumbnail_url||(id?`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`:'');if(image)thumb.style.backgroundImage=`linear-gradient(#0004,#0004),url("${String(image).replace(/["')]/g,'')}")`;const btn=document.createElement('button');btn.type='button';btn.className='sf-youtube-play';btn.dataset.youtubePlay='1';btn.setAttribute('aria-label','Reproduzir vídeo');btn.textContent='▶';thumb.append(btn);stage.append(thumb);box.append(stage);inner.append(box);n.append(inner);return n;}

function applyThemeSourceMaterialization(node,block={}){if(!node||!block.theme_source_port_id)return node;node.dataset.themeSourcePort='true';node.dataset.themeSourcePortId=String(block.theme_source_port_id);node.dataset.themeSourceTheme=String(block.theme_source_theme_id||'');node.dataset.themeSourceComponent=String(block.theme_source_component||'');node.dataset.themePortStatus=String(block.theme_port_status||'PORTED');node.dataset.themeFidelityStatus=String(block.theme_fidelity_status||'PORTED');node.dataset.themeAbStatus=String(block.theme_ab_status||'NOT_VALIDATED');node.dataset.themeSourceMotion=String(block.theme_source_motion||'');node.dataset.themeSourceInteraction=String(block.theme_source_interaction||'');const vars={source_style_bg:'--sf-source-bg',source_style_fg:'--sf-source-fg',source_style_border_color:'--sf-source-border-color',source_style_border_width:'--sf-source-border-width',source_style_radius:'--sf-source-radius',source_style_pad_x:'--sf-source-pad-x',source_style_pad_y:'--sf-source-pad-y',source_style_font_size:'--sf-source-font-size',source_style_font_weight:'--sf-source-font-weight',source_style_letter_spacing:'--sf-source-letter-spacing',source_style_hover_bg:'--sf-source-hover-bg',source_style_focus_color:'--sf-source-focus-color',source_style_focus_width:'--sf-source-focus-width',source_style_shadow:'--sf-source-shadow'};Object.entries(vars).forEach(([key,name])=>{if(block[key]!==undefined&&String(block[key]).trim()!=='')node.style.setProperty(name,String(block[key]));});if(block.source_interaction_underline_hover===true||block.source_interaction_underline_hover==='true')node.dataset.themeSourceUnderlineHover='true';return node;}
function createThemeActionSetBlock(block={}){const n=advSection(block,'sf-theme-action-set');const inner=document.createElement('div');inner.className='sf-adv-inner';if(block.title){const h=document.createElement('h2');h.textContent=block.title;inner.append(h)}const actions=document.createElement('div');actions.className=`sf-theme-actions layout-${block.layout||'row'} align-${block.align||'left'}`;advLines(block.body||'').forEach(line=>{const [label,url,style]=advParts(line),a=document.createElement('a');a.className=`sf-theme-action style-${style||'primary'}`;a.href=safeLinkUrl(url||'#')||'#';a.textContent=label||'Ação';actions.append(a)});inner.append(actions);n.append(inner);return applyThemeSourceMaterialization(n,block);}
function createThemeCardCollectionBlock(block={}){const n=advSection(block,'sf-theme-card-collection');const inner=document.createElement('div');inner.className='sf-adv-inner';if(block.title){const h=document.createElement('h2');h.textContent=block.title;inner.append(h)}const grid=document.createElement('div');grid.className=`sf-theme-card-grid style-${block.card_style||'surface'}`;grid.style.setProperty('--theme-card-columns',String(Math.max(1,Math.min(4,Number(block.columns||3)))));advLines(block.body||'').forEach((line,index)=>{const [title,desc,media,url]=advParts(line),card=document.createElement('article');card.className='sf-theme-card';if(media){const img=document.createElement('img');img.loading='lazy';img.src=safeLinkUrl(media)||media;img.alt=title||`Card ${index+1}`;card.append(img)}const copy=document.createElement('div');copy.className='sf-theme-card-copy';const h=document.createElement('h3');h.textContent=title||`Card ${index+1}`;copy.append(h);if(desc){const p=document.createElement('p');p.textContent=desc;copy.append(p)}if(url){const a=document.createElement('a');a.href=safeLinkUrl(url)||'#';a.textContent='Explorar ↗';copy.append(a)}card.append(copy);grid.append(card)});inner.append(grid);n.append(inner);return applyThemeSourceMaterialization(n,block);}
function createThemeBannerBlock(block={}){const n=advSection(block,'sf-theme-banner');const inner=document.createElement('div');inner.className='sf-theme-banner-inner';const copy=document.createElement('div');copy.className='sf-theme-banner-copy';if(block.eyebrow){const e=document.createElement('small');e.textContent=block.eyebrow;copy.append(e)}const h=document.createElement('h2');h.textContent=block.title||'Theme Banner';copy.append(h);if(block.body){const p=document.createElement('p');p.textContent=block.body;copy.append(p)}if(block.cta_text){const a=document.createElement('a');a.className='sf-theme-action style-primary';a.href=safeLinkUrl(block.cta_url||'#')||'#';a.textContent=block.cta_text;copy.append(a)}inner.append(copy);if(block.media_url){const media=document.createElement('div');media.className='sf-theme-banner-media';const img=document.createElement('img');img.loading='lazy';img.src=safeLinkUrl(block.media_url)||block.media_url;img.alt=block.title||'Banner';media.append(img);inner.append(media)}n.append(inner);return applyThemeSourceMaterialization(n,block);}
function createThemePanelBlock(block={}){const n=advSection(block,`sf-theme-panel tone-${block.tone||'surface'} layout-${block.layout||'stack'}`);const inner=document.createElement('div');inner.className='sf-adv-inner';const h=document.createElement('h2');h.textContent=block.title||'Theme Panel';inner.append(h);if(block.body){const p=document.createElement('p');p.textContent=block.body;inner.append(p)}n.append(inner);return applyThemeSourceMaterialization(n,block);}
function createThemeMetricSetBlock(block={}){const n=advSection(block,'sf-theme-metric-set');const inner=document.createElement('div');inner.className='sf-adv-inner';if(block.title){const h=document.createElement('h2');h.textContent=block.title;inner.append(h)}const grid=document.createElement('div');grid.className='sf-theme-metrics';grid.style.setProperty('--theme-metric-columns',String(Math.max(2,Math.min(4,Number(block.columns||3)))));advLines(block.body||'').forEach(line=>{const [label,value,detail]=advParts(line),item=document.createElement('article');item.innerHTML=`<small>${esc(label||'Métrica')}</small><strong>${esc(value||'—')}</strong>${detail?`<span>${esc(detail)}</span>`:''}`;grid.append(item)});inner.append(grid);n.append(inner);return applyThemeSourceMaterialization(n,block);}
function createThemeInputSetBlock(block={}){const n=advSection(block,'sf-theme-input-set');const inner=document.createElement('div');inner.className='sf-adv-inner';const h=document.createElement('h2');h.textContent=block.title||'Fique por dentro';inner.append(h);if(block.body){const p=document.createElement('p');p.textContent=block.body;inner.append(p)}const form=document.createElement('form');form.className='sf-theme-input-form';form.addEventListener('submit',e=>e.preventDefault());const label=document.createElement('label');label.textContent=block.input_label||'E-mail';const input=document.createElement('input');input.type='email';input.placeholder=block.placeholder||'voce@exemplo.com';label.append(input);const button=document.createElement('button');button.type='submit';button.textContent=block.button_label||'Enviar';form.append(label,button);inner.append(form);n.append(inner);return applyThemeSourceMaterialization(n,block);}
function createThemeMediaFrameBlock(block={}){const n=advSection(block,'sf-theme-media-frame');const inner=document.createElement('figure');inner.className=`sf-theme-media ratio-${block.ratio||'16x9'}`;if(block.media_type==='video'){const v=document.createElement('video');v.controls=true;v.playsInline=true;v.preload='metadata';v.src=safeLinkUrl(block.media_url)||block.media_url||'';inner.append(v)}else{const img=document.createElement('img');img.loading='lazy';img.src=safeLinkUrl(block.media_url)||block.media_url||'';img.alt=block.title||'Mídia';inner.append(img)}if(block.title||block.body){const cap=document.createElement('figcaption');if(block.title){const strong=document.createElement('strong');strong.textContent=block.title;cap.append(strong)}if(block.body){const span=document.createElement('span');span.textContent=block.body;cap.append(span)}inner.append(cap)}n.append(inner);return applyThemeSourceMaterialization(n,block);}


function createLoopCardsSourceAdapter(block={}){
  const n=advSection(block,'sf-loop-cards-source-adapter');const inner=document.createElement('div');inner.className='sf-adv-inner';
  if(block.eyebrow){const e=document.createElement('small');e.className='sf-source-eyebrow';e.textContent=block.eyebrow;inner.append(e)}
  if(block.title){const h=document.createElement('h2');h.textContent=block.title;inner.append(h)}
  const items=advLines(block.body||'').map(line=>{const [title,description,url,image]=advParts(line);return {title,description,url,image}}).filter(x=>x.title);
  const viewport=document.createElement('div');viewport.className='sf-loop-cards-viewport';const track=document.createElement('div');track.className='sf-loop-cards-track';track.dataset.direction=block.direction||'left';track.style.setProperty('--sf-loop-speed',`${Math.max(8,Number(block.speed||26))}s`);track.style.setProperty('--sf-loop-gap',`${Math.max(0,Number(block.gap_px||18))}px`);track.style.setProperty('--sf-loop-card-width',`${Math.max(180,Number(block.card_width||320))}px`);
  const rows=block.autoplay===false?items:[...items,...items];rows.forEach((item,index)=>{const card=document.createElement(item.url?'a':'article');card.className='sf-loop-card';if(item.url&&card.tagName==='A')card.href=safeLinkUrl(item.url)||'#';if(item.image){const img=document.createElement('img');img.loading='lazy';img.src=safeLinkUrl(item.image)||item.image;img.alt='';card.append(img)}const copy=document.createElement('span');const strong=document.createElement('strong');strong.textContent=item.title||`Card ${index+1}`;copy.append(strong);if(item.description){const p=document.createElement('p');p.textContent=item.description;copy.append(p)}card.append(copy);track.append(card)});
  if(block.autoplay===false)track.dataset.static='true';if(block.pause_on_hover!==false)viewport.dataset.pauseHover='true';viewport.append(track);inner.append(viewport);n.append(inner);return n;
}
function createInteractiveFoldersSourceAdapter(block={}){
  const n=advSection(block,`sf-interactive-folders-source-adapter layout-${block.folder_layout||'stack'}`);const inner=document.createElement('div');inner.className='sf-adv-inner';if(block.eyebrow){const e=document.createElement('small');e.className='sf-source-eyebrow';e.textContent=block.eyebrow;inner.append(e)}if(block.title){const h=document.createElement('h2');h.textContent=block.title;inner.append(h)}
  const list=document.createElement('div');list.className='sf-folder-list';const items=advLines(block.body||'').map(line=>{const [title,description,url]=advParts(line);return {title,description,url}}).filter(x=>x.title);items.forEach((item,index)=>{const d=document.createElement('details');d.className='sf-folder-item';if(index===Number(block.initial_open||0))d.open=true;const sum=document.createElement('summary');sum.innerHTML=`<span>${String(index+1).padStart(2,'0')}</span><strong>${esc(item.title)}</strong><i>+</i>`;const body=document.createElement('div');body.className='sf-folder-body';if(item.description){const p=document.createElement('p');p.textContent=item.description;body.append(p)}if(item.url){const a=document.createElement('a');a.href=safeLinkUrl(item.url)||'#';a.textContent='Abrir';body.append(a)}d.append(sum,body);if((block.open_mode||'single')==='single')d.addEventListener('toggle',()=>{if(d.open)list.querySelectorAll('details[open]').forEach(other=>{if(other!==d)other.open=false})});list.append(d)});inner.append(list);n.append(inner);return n;
}

function createShowcase3DBlock(block={}){
  const n=advSection(block,'sf-showcase3d');n.dataset.sfBlock='showcase-3d';n.dataset.sfShowcase3dId=String(block.id||'');n.style.setProperty('--sf-showcase3d-height',`${Math.max(40,Math.min(160,Number(block.height_vh||90)))}vh`);
  const inner=document.createElement('div');inner.className='sf-showcase3d-inner';const copy=document.createElement('div');copy.className='sf-showcase3d-copy';if(block.eyebrow){const small=document.createElement('small');small.textContent=block.eyebrow;copy.append(small)}if(block.title){const h=document.createElement('h2');h.textContent=block.title;copy.append(h)}if(block.body){const p=document.createElement('p');p.textContent=block.body;copy.append(p)}if(block.cta_text){const a=document.createElement('a');a.className='sf-adv-button';a.href=safeLinkUrl(block.cta_url||'#')||'#';a.textContent=block.cta_text;copy.append(a)}
  const stage=document.createElement('div');stage.className='sf-showcase3d-stage';stage.dataset.owner='site_builder.three_d_scene';stage.dataset.assetId=String(block.asset_id||'studio-orbit-dish');const controller=new AbortController();const c=normalizeThreeDScenePublic({enabled:true,engine:'glb',source:'bundled_asset',asset_id:block.asset_id||'studio-orbit-dish',fallback_url:block.fallback_url||'',scale:Number(block.model_scale||1),rotation_x:Number(block.rotation_x||0),rotation_y:Number(block.rotation_y||0),rotation_z:Number(block.rotation_z||0),interaction:{pointer_mode:block.parallax===false?'none':(block.orbit===false?'tilt':'orbit'),pointer_strength:.35,scroll_mode:block.scroll_enabled?'rotate':'none',scroll_strength:1,auto_rotate:block.auto_rotate===true,pointer_events:block.orbit!==false},performance:{max_pixel_ratio:Number(block.max_pixel_ratio||1.5),transparent:true,desktop_enabled:true,tablet_enabled:true,mobile_enabled:true,reduced_motion_fallback:block.reduced_motion_fallback!==false}});
  stage.style.setProperty('--sf-3d-scale',String(c.scale));stage.style.setProperty('--sf-3d-rot-x',`${c.rotation_x}deg`);stage.style.setProperty('--sf-3d-rot-y',`${c.rotation_y}deg`);stage.style.setProperty('--sf-3d-rot-z',`${c.rotation_z}deg`);
  if(reduced&&c.performance.reduced_motion_fallback)sfThreeFallback(stage,c,'Reduced motion');else sfMountGlbViewer(stage,c,controller);
  if(block.scroll_enabled===true||block.scroll_enabled==='true'){n.dataset.sfScrollControlled='true';const update=()=>{const r=n.getBoundingClientRect(),range=Math.max(1,innerHeight+r.height),progress=Math.max(0,Math.min(1,(innerHeight-r.top)/range));stage.dataset.scrollProgress=progress.toFixed(4);const view=stage.querySelector('model-viewer');if(view)view.setAttribute('orientation',`${Number(block.rotation_x||0)}deg ${Number(block.rotation_y||0)+progress*180}deg ${Number(block.rotation_z||0)}deg`);};window.addEventListener('scroll',update,{passive:true,signal:controller.signal});update();}
  n.addEventListener('DOMNodeRemoved',()=>controller.abort(),{once:true});inner.append(copy,stage);n.append(inner);return n;
}
function createHtml5PdfShowBlock(block={}){
  const n=advSection(block,'sf-html5-pdf-show');n.dataset.sfBlock='html5-pdf-show';n.dataset.sourceType=String(block.source_type||'pdf');n.style.setProperty('--sf-doc-height',`${Math.max(40,Math.min(140,Number(block.height_vh||90)))}vh`);n.style.setProperty('--sf-doc-radius',`${Math.max(0,Math.min(64,Number(block.radius??16)))}px`);const inner=document.createElement('div');inner.className='sf-html5-pdf-inner';const title=document.createElement('h2');title.textContent=block.title||'Documento interativo';inner.append(title);const raw=String(block.url||'').trim(),isHttps=/^https:\/\//i.test(raw);if(!isHttps){const note=document.createElement('div');note.className='sf-doc-fallback';note.textContent='Informe uma URL HTTPS válida para PDF ou HTML5.';inner.append(note);n.append(inner);return n;}
  const frame=document.createElement('iframe');frame.className='sf-html5-pdf-frame';frame.src=raw;frame.loading='lazy';frame.title=block.title||((block.source_type||'pdf')==='pdf'?'PDF':'Experiência HTML5');frame.referrerPolicy='strict-origin-when-cross-origin';if(block.fullscreen!==false)frame.allow='fullscreen';if((block.source_type||'pdf')!=='pdf'){const sandbox=['allow-forms','allow-popups'];if(block.allow_scripts===true||block.allow_scripts==='true')sandbox.push('allow-scripts');if(block.allow_same_origin===true||block.allow_same_origin==='true')sandbox.push('allow-same-origin');frame.setAttribute('sandbox',sandbox.join(' '));}inner.append(frame);if(block.open_external!==false){const a=document.createElement('a');a.className='sf-doc-open';a.href=raw;a.target='_blank';a.rel='noopener';a.textContent=(block.source_type||'pdf')==='pdf'?'Abrir PDF ↗':'Abrir conteúdo ↗';inner.append(a)}n.append(inner);return n;
}
const PUBLIC_HOME_BLOCK_REGISTRY=Object.freeze({
  loop_cards:(block)=>createLoopCardsSourceAdapter(block),
  interactive_folders:(block)=>createInteractiveFoldersSourceAdapter(block),
  text_motion:(block)=>createTextMotionBlock(block),
  canvas_fractal_grid:(block)=>createFractalGridBlock(block),
  grid_beam:(block)=>createGridBeamBlock(block),
  gradient_button_group:(block)=>createGradientButtonGroupBlock(block),
  border_beam_button:(block)=>createBorderBeamButtonBlock(block),
  dynamic_island:(block)=>createDynamicIslandBlock(block),
  expandable_widget:(block)=>createExpandableWidgetBlock(block),
  cutout_card:(block)=>createCutoutCardBlock(block),
  carousel_3d:(block)=>createCarousel3DBlock(block),
  loading_carousel:(block)=>createLoadingCarouselBlock(block),
  logo_carousel:(block)=>createLogoCarouselBlock(block),
  terminal:(block)=>createTerminalBlock(block),
  youtube_player_enhanced:(block)=>createEnhancedYouTubeBlock(block),
  theme_action_set:(block)=>createThemeActionSetBlock(block),
  theme_card_collection:(block)=>createThemeCardCollectionBlock(block),
  theme_banner:(block)=>createThemeBannerBlock(block),
  theme_panel:(block)=>createThemePanelBlock(block),
  theme_metric_set:(block)=>createThemeMetricSetBlock(block),
  theme_input_set:(block)=>createThemeInputSetBlock(block),
  theme_media_frame:(block)=>createThemeMediaFrameBlock(block),
  editorial_carousel:(block)=>createEditorialCarouselBlock(block),
  editorial_blocks:(block)=>createEditorialBlocksBlock(block),
  home_video:(block)=>createHomeVideoBlock(block),
  youtube_showcase:(block)=>createYouTubeShowcaseBlock(block),
  highlights:(block)=>createHighlightsBlock(block),
  showcase:(block)=>createShowcaseBlock(block),
  showcase_3d:(block)=>createShowcase3DBlock(block),
  html5_pdf_show:(block)=>createHtml5PdfShowBlock(block),
  split:(block)=>createSplitBlock(block),
  horizontal_projects:(block)=>createHorizontalProjectsBlock(block),
  auto_carousel:(block)=>createAutoCarouselBlock(block),
  spotlight:(block)=>createSpotlightBlock(block),
  marquee:(block)=>createMarqueeBlock(block),
  lettering_custom:(block)=>createCustomLetteringBlock(block),
  video_feature:(block)=>createVideoFeatureBlock(block),
  metrics:(block)=>createStructuredContentBlock(block,'metrics'),
  testimonials:(block)=>createStructuredContentBlock(block,'testimonials'),
  external_embed:(block)=>createExternalEmbedBlock(block),
  autoplay_carousel:(block)=>createAutoplayCarouselBlock(block),
  cinematic_hero:(block)=>createCinematicHeroBlock(block),
  sliced_hero:(block)=>createSlicedHeroBlock(block),
  section_experience:(block)=>createSectionExperienceBlock(block),
  textured_reveal:(block)=>createTexturedRevealBlock(block),
  renaissance_chapter:(block)=>createRenaissanceChapterBlock(block),
});
function effectiveVisualBlockV789(block={}){
  if(block.type!=='textured_reveal')return block;
  if(block.textured_source==='global_media_canvas')return {...block,section_background_type:'global_media_canvas'};
  if(block.textured_source==='custom_media'&&block.textured_media_id)return {...block,section_texture_mode:'custom',section_texture_media_id:block.textured_media_id,section_texture_position:'center'};
  return block;
}
function createCustomHomeBlock(block) {
  if (block.visible === false) return null;
  try {
    let rendererName='shared-page';
    let node = createSharedPageBlock(block);
    if (!node) {
      const renderer=PUBLIC_HOME_BLOCK_REGISTRY[block.type];
      rendererName='public-home-registry';
      if(renderer) node=renderer(block);
      else {sfRecordBlock(block,'unknown','renderer-not-registered');console.error('[StudioFrame][PUBLICATION_PARITY] UNKNOWN BLOCK TYPE:',block.type,block.id||'');return sfBlockFallback(block,'unknown','renderer-not-registered');}
    }
    if (node) {
      sfMarkBlockNode(node,block,rendererName);node.dataset.homeBlockId = block.id || ''; node.dataset.homeBlockLabel = block.label || block.title || block.type || 'Seção'; node.classList.add('home-modular-instance','reveal'); applyHomeSectionFrame(node, effectiveVisualBlockV789(block)); requestAnimationFrame(()=>ensureStudioFrameAdvancedComponents());sfRecordBlock(block,'rendered',rendererName);
    }
    return node;
  } catch (error) {
    sfRecordBlock(block,'failed',error?.message||error);console.error('[StudioFrame][PUBLICATION_PARITY] BLOCK RENDER ERROR',block?.type,block?.id,error);return sfBlockFallback(block,'failed',error);
  }
}

function normalizeSectionNavigator(raw={}){return {...raw,enabled:raw.enabled===true,position:['left','right'].includes(raw.position)?raw.position:'right',mode:['overlay','sticky','inline'].includes(raw.mode)?raw.mode:'overlay',eyebrow:String(raw.eyebrow||'SEÇÕES'),show_eyebrow:raw.show_eyebrow!==false,inactive_opacity:Math.max(.1,Math.min(.9,Number(raw.inactive_opacity??.34))),active_style:['accent','underline','solid'].includes(raw.active_style)?raw.active_style:'accent',animation:['slide','fade','none'].includes(raw.animation)?raw.animation:'slide',desktop_only:raw.desktop_only===true,mobile_mode:['select','pills','hidden'].includes(raw.mobile_mode)?raw.mobile_mode:'select'};}
function sectionNavigatorTargets(){
  const selector='[data-home-block-id],[data-section-block-id],[data-service-block-id],[data-custom-page-section-id]';const seen=new Set();
  return [...document.querySelectorAll(selector)].filter((node)=>{if(node.closest('#sectionNavigator')||node.hidden||node.dataset.sectionNavigationVisible==='false')return false;if(node.dataset.homeBlockId&&node.querySelector('[data-section-block-id]'))return false;const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return false;if(seen.has(node))return false;seen.add(node);return true;});
}
function sectionNavigatorLabel(node,index){const explicit=String(node.dataset.sectionNavigationLabel||node.dataset.homeBlockLabel||'').trim();if(explicit)return explicit;const heading=node.querySelector('h1,h2,h3,.modular-heading strong,.section-page-meta small');const text=String(heading?.textContent||'').trim();return text||`Seção ${String(index+1).padStart(2,'0')}`;}
function setSectionNavigatorActive(nav,targetId){if(!nav||!targetId)return;nav.dataset.activeTarget=targetId;nav.querySelectorAll('[data-section-nav-target]').forEach((control)=>{const active=control.dataset.sectionNavTarget===targetId;control.classList.toggle('is-active',active);if(control.tagName==='BUTTON')control.setAttribute('aria-current',active?'true':'false');});const select=nav.querySelector('select');if(select&&select.value!==targetId)select.value=targetId;}
function setupSectionNavigator(raw={}){
  sectionNavigatorObserver?.disconnect();sectionNavigatorObserver=null;document.querySelector('#sectionNavigator')?.remove();const config=normalizeSectionNavigator(raw);if(!config.enabled)return null;
  const targets=sectionNavigatorTargets();if(targets.length<2)return null;targets.forEach((node,index)=>{if(!node.id)node.id=`sf-section-${String(index+1).padStart(2,'0')}`;});
  const nav=document.createElement('nav');nav.id='sectionNavigator';nav.className='section-navigator';nav.setAttribute('aria-label','Navegação por seções');nav.dataset.position=config.position;nav.dataset.mode=config.mode;nav.dataset.activeStyle=config.active_style;nav.dataset.animation=config.animation;nav.dataset.desktopOnly=config.desktop_only?'true':'false';nav.dataset.mobileMode=config.mobile_mode;nav.style.setProperty('--section-nav-inactive-opacity',String(config.inactive_opacity));
  if(config.show_eyebrow){const eyebrow=document.createElement('span');eyebrow.className='section-navigator-eyebrow';eyebrow.textContent=config.eyebrow;nav.append(eyebrow);}
  const list=document.createElement('div');list.className='section-navigator-list';const select=document.createElement('select');select.className='section-navigator-select';select.setAttribute('aria-label','Ir para seção');
  const scrollToTarget=(id)=>{const target=document.getElementById(id);target?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'});setSectionNavigatorActive(nav,id);};
  targets.forEach((target,index)=>{const label=sectionNavigatorLabel(target,index),button=document.createElement('button');button.type='button';button.dataset.sectionNavTarget=target.id;button.innerHTML=`<i>${String(index+1).padStart(2,'0')}</i><span>${esc(label)}</span>`;button.addEventListener('click',()=>scrollToTarget(target.id));list.append(button);const option=document.createElement('option');option.value=target.id;option.textContent=`${String(index+1).padStart(2,'0')} · ${label}`;select.append(option);});select.addEventListener('change',()=>scrollToTarget(select.value));nav.append(list,select);
  if(config.mode==='overlay')document.body.append(nav);else{const parent=targets[0].parentElement||$('#top')||document.body;parent.insertBefore(nav,targets[0]);}
  setSectionNavigatorActive(nav,targets[0].id);
  if('IntersectionObserver' in window){const visibility=new Map();sectionNavigatorObserver=new IntersectionObserver((entries)=>{entries.forEach((entry)=>visibility.set(entry.target.id,entry.isIntersecting?entry.intersectionRatio:0));const activeTarget=targets.slice().sort((a,b)=>(visibility.get(b.id)||0)-(visibility.get(a.id)||0))[0];if(activeTarget&&(visibility.get(activeTarget.id)||0)>0)setSectionNavigatorActive(nav,activeTarget.id);},{threshold:[.08,.2,.4,.65],rootMargin:'-18% 0px -52% 0px'});targets.forEach((target)=>sectionNavigatorObserver.observe(target));}
  requestAnimationFrame(()=>{if(typeof layoutFloatingControls==='function')layoutFloatingControls();});
  return nav;
}

function placeHomeHorizontalNavigation() {
  const main=$('#top'), hero=$('#hero'), filters=$('#filters');
  if(!main||!hero||!filters)return;
  const projects=DATA.site_builder?.projects||{};
  const mode=['menu','inline'].includes(projects.filters?.display_mode)?projects.filters.display_mode:'inline';
  filters.toggleAttribute('hidden', projects.visible===false||mode==='menu');
  if(filters.hidden)return;
  hero.insertAdjacentElement('afterend',filters);
  filters.dataset.homePlacement='after-hero';
}

function coreHomeBlockHasVisibleContent(node, block = {}) {
  if (!node || block.visible === false) return false;
  if (block.type === 'intro') return Boolean(node.querySelector('#heroLine')?.textContent?.trim());
  if (block.type === 'lettering') return Boolean(node.querySelector('#letteringText')?.textContent?.trim());
  if (block.type === 'projects') return true; // grid may exist without its optional heading
  if (block.type === 'projects_header') return Boolean(String(block.eyebrow||'').trim()||String(block.title||'').trim()||String(block.body||'').trim());
  return true;
}
function updateProjectsHeadingVisibility(block={},builder={}){
  const heading=$('#portfolioHeading');if(!heading)return;
  const projects=builder.projects||{};
  const explicitHeaderVisible=block.visible!==false&&(Object.prototype.hasOwnProperty.call(block,'header_visible')?block.header_visible!==false:projects.header_visible!==false);
  const eyebrow=String(Object.prototype.hasOwnProperty.call(block,'eyebrow')?block.eyebrow:(projects.eyebrow??'')).trim();
  const title=String(Object.prototype.hasOwnProperty.call(block,'title')?block.title:(projects.title??'')).trim();
  const body=String(Object.prototype.hasOwnProperty.call(block,'body')?block.body:'').trim();
  const visible=explicitHeaderVisible&&Boolean(eyebrow||title||body);
  heading.dataset.align=block.text_align||'left';
  heading.hidden=!visible;
  heading.classList.toggle('is-empty-heading',!visible);
  const eyebrowNode=heading.querySelector('#projectsEyebrow');if(eyebrowNode){eyebrowNode.textContent=eyebrow;eyebrowNode.hidden=!eyebrow;}
  const titleNode=heading.querySelector('#projectsTitle');if(titleNode){titleNode.textContent=title;titleNode.hidden=!title;}
  const bodyNode=heading.querySelector('#projectsDescription');if(bodyNode){bodyNode.textContent=body;bodyNode.hidden=!body;}
}

function renderHomeComposition() {
  const main = $('#top');
  if (!main) return;
  const compositionBlocks=publicHomeBlocks();sfResetBlockDiagnostics(compositionBlocks);
  main.querySelectorAll('.home-modular-instance').forEach((node) => node.remove());
  Object.values(CORE_HOME_BLOCK_IDS).forEach((id)=>{const node=document.getElementById(id);if(node)node.hidden=true;});
  const builder = DATA.site_builder || {};
  const projectsCfg = builder.projects || {};
  const aboutCfg = builder.about || {};
  const contactCfg = builder.contact || {};
  const letteringCfg = builder.lettering || {};
  compositionBlocks.forEach((block) => {
    const coreId = CORE_HOME_BLOCK_IDS[block.type];
    if (coreId) {
      const node = document.getElementById(coreId);
      if (!node) return;
      main.append(node);
      sfMarkBlockNode(node,block,'core-home');node.dataset.homeBlockId=block.id||'';node.dataset.homeBlockLabel=block.label||block.title||block.type||'Seção';
      try{applyHomeSectionFrame(node, block);applyCoreBlockOverrides(node, block, builder);node.hidden = !coreHomeBlockHasVisibleContent(node, block);sfRecordBlock(block,'rendered','core-home');}
      catch(error){sfRecordBlock(block,'failed',error?.message||error);console.error('[StudioFrame][PUBLICATION_PARITY] CORE BLOCK RENDER ERROR',block?.type,block?.id,error);node.hidden=true;main.append(sfBlockFallback(block,'failed',error));}
      return;
    }
    const custom = createCustomHomeBlock(block);
    if (custom) {
      const safeId = String(block.id || block.type || 'section').replace(/[^a-zA-Z0-9_-]+/g,'-');
      custom.id = custom.id || `home-${safeId}`;
      main.append(custom);
    }
  });
  renderStructuredAboutContact(builder,DATA.identity||{});
  placeHomeHorizontalNavigation();
  setupSectionNavigator(builder.section_navigator||{});
  bindReveal();
  tick();
}

function seoRouteRecords(){return Array.isArray(DATA.seo?.routes)?DATA.seo.routes:[];}
function currentSeoRoute(){const path=requestedRoutePath();return seoRouteRecords().find((row)=>String(row?.path||'').replace(/^\/+|\/+$/g,'')===path)||seoRouteRecords().find((row)=>row?.kind==='home'&&!path)||null;}
function applyRuntimeSeo(){
  const identity=DATA.identity||{},route=currentSeoRoute()||DATA.seo?.home||null;
  document.title=route?.title||`${identity.portfolio_title||'Portfólio'} | ${identity.studio_name||'Mensagem Studio'}`;
  const setMeta=(selector,attr,value)=>{let node=document.head.querySelector(selector);if(!node&&value){node=document.createElement('meta');const match=selector.match(/meta\[(name|property)=\"([^\"]+)\"\]/);if(match)node.setAttribute(match[1],match[2]);document.head.append(node);}if(node&&value!=null)node.setAttribute(attr,String(value));};
  if(route){
    setMeta('meta[name="description"]','content',route.description||'');
    setMeta('meta[name="robots"]','content',route.robots||'index,follow');
    setMeta('meta[property="og:title"]','content',route.title||'');
    setMeta('meta[property="og:description"]','content',route.description||'');
    setMeta('meta[property="og:url"]','content',route.canonical||'');
    if(route.image)setMeta('meta[property="og:image"]','content',route.image);
  }
}

const BRIEFING_RUNTIME={config:null,id:'',token:'',draft:{answers:{},references:{},uploads:[],signature:''},step:0,saving:false,saveTimer:0,idempotency:''};
function briefingConfig(){return DATA.site_builder?.briefing||{};}
function briefingPath(){const b=briefingConfig();return normalizePath(b.full_path||b.slug||'briefing');}
function isBriefingPage(){const b=briefingConfig();return b.enabled!==false&&requestedRoutePath()===briefingPath();}
function briefingApiBase(){return String(briefingConfig()?.delivery?.api_base_url||'').trim().replace(/\/+$/,'')||location.origin;}
function briefingApi(path,options={}){return fetch(`${briefingApiBase()}${path}`,{...options,cache:'no-store',headers:{'Content-Type':'application/json',...(options.headers||{})}}).then(async response=>{let payload={};try{payload=await response.json();}catch(_){}if(!response.ok){const error=new Error(payload.message||`Briefing HTTP ${response.status}`);error.payload=payload;throw error;}return payload;});}
function briefingStorageKey(){return `${IS_EDITOR_PREVIEW?'studioframe.briefing.preview':'studioframe.briefing'}:${briefingPath()}:v1`;}
function saveBriefingLocal(){try{localStorage.setItem(briefingStorageKey(),JSON.stringify({id:BRIEFING_RUNTIME.id,token:BRIEFING_RUNTIME.token,draft:BRIEFING_RUNTIME.draft,step:BRIEFING_RUNTIME.step,idempotency:BRIEFING_RUNTIME.idempotency}));}catch(_){} }
function loadBriefingLocal(){try{return JSON.parse(localStorage.getItem(briefingStorageKey())||'{}')||{};}catch(_){return {};}}
function briefingVisible(field,answers){const c=field?.condition;return !c||answers?.[c.field]===c.equals;}
function briefingFieldValue(field){return BRIEFING_RUNTIME.draft.answers?.[field.id];}
function briefingSetValue(field,value){BRIEFING_RUNTIME.draft.answers ||= {};BRIEFING_RUNTIME.draft.answers[field.id]=value;if(field.type==='signature')BRIEFING_RUNTIME.draft.signature=value;saveBriefingLocal();queueBriefingSave();}
function queueBriefingSave(){if(!briefingConfig().autosave||!BRIEFING_RUNTIME.id||!BRIEFING_RUNTIME.token)return;clearTimeout(BRIEFING_RUNTIME.saveTimer);BRIEFING_RUNTIME.saveTimer=setTimeout(()=>saveBriefingServer().catch(()=>{}),500);}
async function saveBriefingServer(){if(BRIEFING_RUNTIME.saving||!BRIEFING_RUNTIME.id)return;BRIEFING_RUNTIME.saving=true;try{await briefingApi(`/api/briefings/${encodeURIComponent(BRIEFING_RUNTIME.id)}/draft`,{method:'POST',body:JSON.stringify({token:BRIEFING_RUNTIME.token,draft:BRIEFING_RUNTIME.draft})});const note=$('#briefingSaveState');if(note)note.textContent='Rascunho salvo';}finally{BRIEFING_RUNTIME.saving=false;}}
function briefingInputMarkup(field){const value=briefingFieldValue(field);const id=`briefing-${field.id}`;const req=field.required?' required aria-required="true"':'';const common=`id="${id}" data-briefing-field="${esc(field.id)}"${req}`;if(field.type==='textarea')return `<textarea ${common} rows="4" placeholder="${esc(field.placeholder||'')}">${esc(value||'')}</textarea>`;if(field.type==='select')return `<select ${common}><option value="">Selecione</option>${(field.options||[]).map(o=>`<option ${String(value)===String(o)?'selected':''}>${esc(o)}</option>`).join('')}</select>`;if(field.type==='radio')return `<div class="sf-briefing-options" data-briefing-field="${esc(field.id)}">${(field.options||[]).map(o=>`<label><input type="radio" name="${id}" value="${esc(o)}" ${String(value)===String(o)?'checked':''}${req}> ${esc(o)}</label>`).join('')}</div>`;if(field.type==='checkbox')return `<label class="sf-briefing-check"><input ${common} type="checkbox" ${value?'checked':''}> <span>${esc(field.label)}</span></label>`;if(field.type==='multi-select')return `<div class="sf-briefing-options sf-briefing-multi" data-briefing-field="${esc(field.id)}">${(field.options||[]).map(o=>`<label><input type="checkbox" value="${esc(o)}" ${(Array.isArray(value)?value:[]).includes(o)?'checked':''}> ${esc(o)}</label>`).join('')}</div>`;if(field.type==='upload')return `<input ${common} type="file" ${field.multiple?'multiple':''} accept="image/*,.pdf,.zip"><div class="sf-briefing-upload-state" data-upload-state="${esc(field.id)}"></div>`;if(field.type==='reference-list')return `<div class="sf-briefing-reference-list" data-briefing-field="${esc(field.id)}"><textarea rows="4" placeholder="Cole links e descreva o que deve ser observado">${esc(Array.isArray(value)?value.join('\n'):value||'')}</textarea></div>`;if(field.type==='signature')return `<div class="sf-briefing-signature-wrap"><canvas ${common} width="720" height="220" aria-label="Área para assinatura"></canvas><button type="button" class="sf-briefing-tertiary" data-signature-clear>Limpar assinatura</button></div>`;return `<input ${common} type="${['email','number','date','url'].includes(field.type)?field.type:'text'}" value="${esc(value??'')}" placeholder="${esc(field.placeholder||'')}">`;}
function briefingRenderStep(){const root=$('#briefingWizardBody');if(!root)return;const cfg=BRIEFING_RUNTIME.config||briefingConfig(),steps=(cfg.steps||[]).filter(s=>s&&s.active!==false);BRIEFING_RUNTIME.step=Math.max(0,Math.min(BRIEFING_RUNTIME.step,Math.max(0,steps.length-1)));const step=steps[BRIEFING_RUNTIME.step];if(!step)return;const answers=BRIEFING_RUNTIME.draft.answers||{};const fields=(step.fields||[]).filter(f=>f&&f.active!==false&&briefingVisible(f,answers));root.innerHTML=`<div class="sf-briefing-step-copy"><small>ETAPA ${BRIEFING_RUNTIME.step+1} DE ${steps.length}</small><h2>${esc(step.title||'Etapa')}</h2>${step.subtitle?`<strong>${esc(step.subtitle)}</strong>`:''}${step.description?`<p>${esc(step.description)}</p>`:''}</div><div class="sf-briefing-fields">${fields.map(field=>field.type==='checkbox'?`<div class="sf-briefing-field">${briefingInputMarkup(field)}</div>`:`<label class="sf-briefing-field"><span>${esc(field.label||field.id)}${field.required?' *':''}</span>${field.helper?`<small>${esc(field.helper)}</small>`:''}${briefingInputMarkup(field)}</label>`).join('')}</div>`;const pct=Math.round(((BRIEFING_RUNTIME.step+1)/steps.length)*100);$('#briefingProgressBar')?.style.setProperty('--progress',`${pct}%`);const txt=$('#briefingProgressText');if(txt)txt.textContent=`${pct}%`;const back=$('#briefingBack');if(back)back.disabled=BRIEFING_RUNTIME.step===0;const next=$('#briefingNext');if(next)next.textContent=BRIEFING_RUNTIME.step===steps.length-1?'Revisar e enviar':'Próxima etapa';bindBriefingFields(root);}
function bindSignature(canvas){if(!(canvas instanceof HTMLCanvasElement))return;const ctx=canvas.getContext('2d');ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#111';let drawing=false;const point=e=>{const r=canvas.getBoundingClientRect(),p=e.touches?.[0]||e;return [(p.clientX-r.left)*(canvas.width/r.width),(p.clientY-r.top)*(canvas.height/r.height)]};const start=e=>{drawing=true;ctx.beginPath();ctx.moveTo(...point(e));e.preventDefault();};const move=e=>{if(!drawing)return;ctx.lineTo(...point(e));ctx.stroke();e.preventDefault();};const end=()=>{if(!drawing)return;drawing=false;briefingSetValue({id:'signature',type:'signature'},canvas.toDataURL('image/png'));};canvas.addEventListener('pointerdown',start);canvas.addEventListener('pointermove',move);addEventListener('pointerup',end);if(briefingFieldValue({id:'signature'})){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=briefingFieldValue({id:'signature'});}}
function bindBriefingFields(root){root.querySelectorAll('input[data-briefing-field],textarea[data-briefing-field],select[data-briefing-field]').forEach(input=>{if(input.type==='file')input.addEventListener('change',()=>briefingUploadFiles(input));else if(input instanceof HTMLCanvasElement){}else input.addEventListener('input',()=>briefingSetValue({id:input.dataset.briefingField,type:input.type==='checkbox'?'checkbox':''},input.type==='checkbox'?input.checked:input.value));});root.querySelectorAll('.sf-briefing-options[data-briefing-field]').forEach(group=>group.addEventListener('change',()=>{const checks=[...group.querySelectorAll('input')];const radios=checks.some(i=>i.type==='radio');briefingSetValue({id:group.dataset.briefingField},radios?(checks.find(i=>i.checked)?.value||''):checks.filter(i=>i.checked).map(i=>i.value));briefingRenderStep();}));root.querySelectorAll('.sf-briefing-reference-list[data-briefing-field] textarea').forEach(input=>input.addEventListener('input',()=>briefingSetValue({id:input.closest('[data-briefing-field]').dataset.briefingField},input.value.split(/\n+/).map(v=>v.trim()).filter(Boolean))));root.querySelectorAll('canvas[data-briefing-field]').forEach(bindSignature);root.querySelector('[data-signature-clear]')?.addEventListener('click',()=>{briefingSetValue({id:'signature',type:'signature'},'');briefingRenderStep();});}
async function briefingUploadFiles(input){const state=$(`[data-upload-state="${CSS.escape(input.dataset.briefingField||'')}"]`);for(const file of [...(input.files||[])]){if(state)state.textContent=`Enviando ${file.name}…`;const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||'').split(',')[1]||'');r.onerror=reject;r.readAsDataURL(file);});try{const payload=await briefingApi(`/api/briefings/${encodeURIComponent(BRIEFING_RUNTIME.id)}/upload`,{method:'POST',body:JSON.stringify({token:BRIEFING_RUNTIME.token,filename:file.name,mime:file.type,data_base64:base64,field_id:input.dataset.briefingField})});BRIEFING_RUNTIME.draft.uploads ||= [];BRIEFING_RUNTIME.draft.uploads.push(payload.upload);if(state)state.textContent=`${file.name} anexado.`;}catch(error){if(state)state.textContent=error.message||'Falha no upload.';}}saveBriefingLocal();}
function briefingValidateCurrent(){const cfg=BRIEFING_RUNTIME.config||briefingConfig(),steps=(cfg.steps||[]).filter(s=>s&&s.active!==false),step=steps[BRIEFING_RUNTIME.step],answers=BRIEFING_RUNTIME.draft.answers||{};const missing=(step?.fields||[]).filter(f=>f.active!==false&&f.required&&briefingVisible(f,answers)).filter(f=>{const v=answers[f.id];return v===undefined||v===null||v===''||v===false||(Array.isArray(v)&&!v.length);});if(missing.length){const first=$(`[data-briefing-field="${CSS.escape(missing[0].id)}"]`);first?.focus?.();const note=$('#briefingSaveState');if(note)note.textContent=`Preencha: ${missing[0].label}`;return false;}return true;}
async function briefingFinish(){if(!briefingValidateCurrent())return;await saveBriefingServer();BRIEFING_RUNTIME.idempotency ||= (crypto.randomUUID?.()||`idem-${Date.now()}-${Math.random()}`);saveBriefingLocal();const button=$('#briefingNext');if(button){button.disabled=true;button.textContent='Enviando…';}try{const payload=await briefingApi(`/api/briefings/${encodeURIComponent(BRIEFING_RUNTIME.id)}/submit`,{method:'POST',body:JSON.stringify({token:BRIEFING_RUNTIME.token,idempotency_key:BRIEFING_RUNTIME.idempotency,draft:BRIEFING_RUNTIME.draft})});renderBriefingReceipt(payload);pollBriefingStatus();}catch(error){if(button){button.disabled=false;button.textContent='Revisar e enviar';}const note=$('#briefingSaveState');if(note)note.textContent=error.message||'Não foi possível enviar.';}}
function renderBriefingReceipt(status){const root=$('#briefingWizardBody');if(!root)return;root.innerHTML=`<div class="sf-briefing-receipt"><small>RECIBO ${esc(BRIEFING_RUNTIME.id)}</small><h2>${esc(status.status||'Recebido')}</h2><p>Seu briefing foi salvo antes do processamento do PDF. Acompanhe abaixo a confirmação das duas entregas.</p><div class="sf-briefing-status-grid"><span>Snapshot <b>${status.snapshot_saved?'OK':'…'}</b></span><span>PDF <b>${status.pdf_valid?'OK':'…'}</b></span><span>Cliente <b>${status.deliveries?.client?.status||'…'}</b></span><span>Studio <b>${status.deliveries?.studio?.status||'…'}</b></span><span>Confirmação <b>${status.deliveries?.verification?.status||status.verification_status||'…'}</b></span></div>${status.pdf_generated?`<a class="sf-briefing-download" href="${briefingApiBase()}/api/briefings/${encodeURIComponent(BRIEFING_RUNTIME.id)}/pdf?token=${encodeURIComponent(BRIEFING_RUNTIME.token)}">Baixar PDF</a>`:''}</div>`;$('#briefingBack')?.setAttribute('hidden','');$('#briefingNext')?.setAttribute('hidden','');}
async function pollBriefingStatus(){for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,1000));try{const status=await briefingApi(`/api/briefings/${encodeURIComponent(BRIEFING_RUNTIME.id)}/status?token=${encodeURIComponent(BRIEFING_RUNTIME.token)}`);renderBriefingReceipt(status);if(Number(status.receipt?.level||0)>=4||['ATENÇÃO','CONFIRMADO'].includes(status.status))break;}catch(_){}}}
async function renderBriefingPage(){document.body.classList.add('briefing-page');$('#filters')?.setAttribute('hidden','');['hero','introBlock','lettering','projectsBlock','about','contact'].forEach(id=>{const node=$('#'+id);if(node)node.hidden=true;});const root=$('#customPageRoot');if(!root)return;root.hidden=false;root.replaceChildren();const b=briefingConfig();BRIEFING_RUNTIME.config=b;const stored=loadBriefingLocal();if(stored.id&&stored.token){Object.assign(BRIEFING_RUNTIME,{id:stored.id,token:stored.token,draft:stored.draft||BRIEFING_RUNTIME.draft,step:Number(stored.step||0),idempotency:stored.idempotency||''});try{const remote=await briefingApi(`/api/briefings/${encodeURIComponent(stored.id)}/draft?token=${encodeURIComponent(stored.token)}`);if(remote?.draft)BRIEFING_RUNTIME.draft=remote.draft;}catch(_){}}if(!BRIEFING_RUNTIME.id){try{const started=await briefingApi('/api/briefings/start',{method:'POST',body:JSON.stringify({environment:b.test_mode?'test':'production'})});BRIEFING_RUNTIME.id=started.briefing_id;BRIEFING_RUNTIME.token=started.receipt_token;BRIEFING_RUNTIME.config=started.config||b;saveBriefingLocal();}catch(error){console.warn('[StudioFrame][Briefing] backend indisponível',error);}}
root.innerHTML=`<section class="sf-briefing-shell"><header class="sf-briefing-head"><div><small>${b.test_mode?'TEST MODE · ':''}BRIEFING ENGINE</small><h1>${esc(b.title||'Briefing do projeto')}</h1><p>${esc(b.intro||b.description||'')}</p></div><div class="sf-briefing-receipt-id">${esc(BRIEFING_RUNTIME.id||'Rascunho local')}</div></header><div class="sf-briefing-progress"><span id="briefingProgressBar"></span><b id="briefingProgressText">0%</b></div><main id="briefingWizardBody"></main><footer class="sf-briefing-actions"><button type="button" id="briefingBack">Voltar</button><span id="briefingSaveState">${BRIEFING_RUNTIME.id?'Autosave ativo':'Backend não configurado'}</span><button type="button" id="briefingSaveLater">Salvar e continuar depois</button><button type="button" id="briefingNext">Próxima etapa</button></footer></section>`;briefingRenderStep();$('#briefingBack')?.addEventListener('click',()=>{BRIEFING_RUNTIME.step=Math.max(0,BRIEFING_RUNTIME.step-1);saveBriefingLocal();briefingRenderStep();scrollTo({top:root.offsetTop-20,behavior:'smooth'});});$('#briefingNext')?.addEventListener('click',()=>{if(!briefingValidateCurrent())return;const steps=(BRIEFING_RUNTIME.config.steps||[]).filter(s=>s.active!==false);if(BRIEFING_RUNTIME.step>=steps.length-1){briefingFinish();return;}BRIEFING_RUNTIME.step+=1;saveBriefingLocal();briefingRenderStep();scrollTo({top:root.offsetTop-20,behavior:'smooth'});});$('#briefingSaveLater')?.addEventListener('click',async()=>{saveBriefingLocal();try{await saveBriefingServer();}catch(_){}const note=$('#briefingSaveState');if(note)note.textContent=`Salvo. Guarde o ID ${BRIEFING_RUNTIME.id||'local'}.`;});}

function servicesConfig(){return DATA.site_builder?.services||{};}
function canonicalRouteSlug(value='servicos'){return String(value||'servicos').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'servicos';}
function servicesSlug(){return canonicalRouteSlug(servicesConfig().slug||'servicos');}
function publicRouteHref(value='#'){const target=String(value||'#');if(location.protocol!=='file:'||!target.startsWith('/'))return target;return `.${target}`;}
function requestedRoutePath(){const query=new URLSearchParams(location.search);return normalizePath(query.get('sf_route')||location.pathname);}
function servicesHref(hash=''){const slug=servicesSlug();const base=location.protocol==='file:'?`./${slug}/index.html`:`/${slug}/`;return `${base}${hash||''}`;}
function isServicesPage(){const query=new URLSearchParams(location.search);return servicesConfig().visible!==false&&(requestedRoutePath()===servicesSlug()||query.get('page')==='services');}
function visibleServiceCategories(){return (Array.isArray(servicesConfig().categories)?servicesConfig().categories:[]).filter((category)=>category&&category.visible!==false).slice().sort((a,b)=>Number(a.order||0)-Number(b.order||0));}
function visibleServiceItems(category){return (Array.isArray(category?.services)?category.services:[]).filter((item)=>item&&item.visible!==false).slice().sort((a,b)=>Number(a.order||0)-Number(b.order||0));}
function visibleServiceRecords(){const rows=[];visibleServiceCategories().forEach((category)=>visibleServiceItems(category).forEach((item)=>rows.push({category,item})));return rows;}
function serviceDetailHref(item,hash=''){const route=normalizePath(item?.full_path||`${servicesSlug()}/${canonicalRouteSlug(item?.slug||item?.title||item?.id||'servico')}`);const base=location.protocol==='file:'?`./${route}/index.html`:`/${route}/`;return `${base}${hash||''}`;}
function currentServiceDetail(){const path=requestedRoutePath();if(!path||path===servicesSlug())return null;return visibleServiceRecords().find(({item})=>item.page_enabled!==false&&normalizePath(item.full_path||`${servicesSlug()}/${item.slug}`)===path)||null;}
function servicePrice(item={}){if(servicesConfig().show_prices===false||item.price_type==='quote')return 'Sob consulta';const value=Number(item.price||0);if(!value)return 'Sob consulta';const formatted=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:Number.isInteger(value)?0:2}).format(value);return `${item.price_type==='fixed'?'':'A partir de '}${formatted}`;}
function serviceWhatsappHref(category,item=null,extra='',options={}){const config=servicesConfig(),number=String(config.whatsapp_number||'').replace(/\D/g,''),subject=item?.title||category?.title||'',message=String(config.whatsapp_message||'Olá! Gostaria de solicitar um orçamento.').trim(),detail=String(extra||'').trim(),includeBase=options.includeBase!==false,parts=[includeBase?message:'',subject?`Serviço: ${subject}`:'',detail].filter(Boolean);return number?`https://wa.me/${number}?text=${encodeURIComponent(parts.join('\n\n'))}`:'#';}
function quoteWhatsappHref(){return serviceWhatsappHref(null,null,serviceQuoteMessage(),{includeBase:false});}
const QUOTE_RUNTIME={step:0,submitting:false,receipt:null,error:'',idempotency:''};
function quoteApiBase(){return String(servicesConfig().quote_api_base_url||'').trim().replace(/\/+$/,'')||location.origin;}
async function quoteApi(path,options={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);try{const response=await fetch(`${quoteApiBase()}${path}`,{...options,cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',...(options.headers||{})}});let payload={};try{payload=await response.json();}catch(_){}if(!response.ok||payload.ok===false){const error=new Error(payload.message||`Orçamento HTTP ${response.status}`);error.payload=payload;error.status=response.status;throw error;}return payload;}catch(error){if(error?.name==='AbortError')throw new Error('Tempo limite ao enviar a solicitação. Tente novamente.');throw error;}finally{clearTimeout(timer);}}
function quoteReceiptStorageKey(){return `${IS_EDITOR_PREVIEW?'studioframe.quote.receipt.preview':'studioframe.quote.receipt'}:v1`;}
function loadQuoteReceipt(){try{const row=JSON.parse(localStorage.getItem(quoteReceiptStorageKey())||'{}')||{};if(row.quote_id&&row.receipt_token)QUOTE_RUNTIME.receipt=row;}catch(_){}return QUOTE_RUNTIME.receipt;}
function saveQuoteReceipt(receipt){QUOTE_RUNTIME.receipt=receipt||null;try{if(receipt)localStorage.setItem(quoteReceiptStorageKey(),JSON.stringify(receipt));else localStorage.removeItem(quoteReceiptStorageKey());}catch(_){} }
function quoteProposalPayload(){quoteLeadFromDom();if(!QUOTE_RUNTIME.idempotency)QUOTE_RUNTIME.idempotency=(crypto?.randomUUID?.()||`SF-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);return {schema:'studioframe.quote-request.v2',request_id:QUOTE_RUNTIME.idempotency,idempotency_key:QUOTE_RUNTIME.idempotency,created_at:new Date().toISOString(),site:location.origin,environment:IS_EDITOR_PREVIEW?'preview':'production',lead:{...QUOTE_STATE.lead},summary:quoteSummary(),services:quoteResolvedItems().map(({category,item,line,package:pkg,reference,source})=>({category_id:String(category.id||''),category:String(category.title||''),service_id:String(item.id||''),service:String(item.title||''),package_id:String(pkg?.id||''),package:String(pkg?.label||''),quantity:Math.max(1,Number(line.quantity)||1),note:String(line.note||''),reference_project_id:String(reference?.project_id||reference?.id||''),reference_project:String(reference?.title||''),source_type:String(source?.type||''),source_url:String(source?.url||''),source_project_id:String(source?.project_id||''),source_project_title:String(source?.project_title||''),source_service_id:String(source?.service_id||item.id||''),source_service_title:String(source?.service_title||item.title||''),estimate:quoteLinePriceLabel(item,pkg,line.quantity)}))};}
function validateQuoteContact(){quoteLeadFromDom();const lead=QUOTE_STATE.lead||{};if(!QUOTE_STATE.items.length)return 'Adicione pelo menos um serviço.';if(!String(lead.name_company||'').trim())return 'Informe seu nome, marca ou empresa.';if(!String(lead.email||'').trim()&&!String(lead.whatsapp||'').trim())return 'Informe e-mail ou WhatsApp para retorno.';if(lead.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(lead.email)))return 'Informe um e-mail válido.';return '';}
function renderQuoteSubmitState(){const config=servicesConfig(),receipt=QUOTE_RUNTIME.receipt,error=QUOTE_RUNTIME.error;document.querySelectorAll('[data-quote-submit-state]').forEach(node=>{if(receipt?.ok){const wa=config.quote_fallback_whatsapp!==false?`<a class="sf-quote-whatsapp-followup" href="${esc(quoteWhatsappHref())}" target="_blank" rel="noopener">Continuar no WhatsApp</a>`:'';node.innerHTML=`<div class="sf-quote-receipt" data-state="success"><strong>Solicitação recebida</strong><span>Protocolo ${esc(receipt.protocol||receipt.quote_id||'')}</span><p>${esc(receipt.message||config.quote_success_message||'Solicitação recebida.')}</p>${wa}</div>`;}else if(error){const wa=config.quote_fallback_whatsapp!==false?`<a class="sf-quote-whatsapp-followup" href="${esc(quoteWhatsappHref())}" target="_blank" rel="noopener">Usar WhatsApp como alternativa</a>`:'';node.innerHTML=`<div class="sf-quote-receipt" data-state="error"><strong>Não foi possível confirmar o envio</strong><p>${esc(error)}</p>${wa}</div>`;}else if(QUOTE_RUNTIME.submitting){node.innerHTML='<div class="sf-quote-receipt" data-state="loading"><strong>Enviando solicitação…</strong><p>Aguardando confirmação do servidor.</p></div>';}else node.replaceChildren();});}
async function finishQuoteRequest(){const validation=validateQuoteContact();if(validation){QUOTE_RUNTIME.error=validation;QUOTE_RUNTIME.receipt=null;renderQuoteSubmitState();renderQuoteHome();return {ok:false,validation:true,message:validation};}quoteLeadFromDom();saveQuoteState();const config=servicesConfig(),endpoint=String(config.quote_endpoint||'/api/quote');if(config.quote_endpoint_enabled===false){QUOTE_RUNTIME.error='O endpoint de orçamento está desativado. Nenhum sucesso foi registrado.';renderQuoteSubmitState();renderQuoteHome();return {ok:false,disabled:true};}const payload=quoteProposalPayload();window.STUDIOFRAME_LAST_PROPOSAL_PAYLOAD=payload;QUOTE_RUNTIME.submitting=true;QUOTE_RUNTIME.error='';QUOTE_RUNTIME.receipt=null;renderQuoteSubmitState();renderQuoteHome();try{const result=await quoteApi(endpoint,{method:'POST',body:JSON.stringify(payload)});if(!result?.ok||!result?.quote_id)throw new Error('O servidor respondeu sem protocolo de recebimento.');QUOTE_RUNTIME.idempotency='';saveQuoteReceipt(result);document.dispatchEvent(new CustomEvent('studioframe:quote-received',{detail:result}));renderGlobalQuotePanel();renderQuoteHome();return result;}catch(error){QUOTE_RUNTIME.error=String(error?.message||'Falha ao enviar a solicitação.');QUOTE_RUNTIME.receipt=null;renderGlobalQuotePanel();renderQuoteHome();return {ok:false,message:QUOTE_RUNTIME.error};}finally{QUOTE_RUNTIME.submitting=false;renderQuoteSubmitState();renderQuoteHome();}}

const QUOTE_STORAGE_KEY=IS_EDITOR_PREVIEW?'studioframe.quote.preview.v1':'studioframe.quote.v1';
const SERVICE_OFFER_STORAGE_PREFIX='studioframe.service-offer.v1';
let SERVICE_OFFER_TIMER=0,SERVICE_OFFER_LAYOUT_BOUND=false,SERVICE_OFFER_LAYOUT_RAF=0;
function serviceOfferConfig(){const raw=servicesConfig().offer_notification||{},pages=Array.isArray(raw.pages)?raw.pages:['home','project','services','service','category','custom'];return {enabled:raw.enabled===true,delay_seconds:Math.max(0,Math.min(300,Number(raw.delay_seconds??8)||0)),title:String(raw.title||'Gostou deste projeto?'),message:String(raw.message||'Podemos criar algo semelhante para sua marca.'),cta_label:String(raw.cta_label||'Solicitar orçamento'),cta_target:['quote','services','related_service'].includes(String(raw.cta_target||''))?String(raw.cta_target):'quote',position:['bottom_left','bottom_right','top_left','top_right'].includes(String(raw.position||''))?String(raw.position):'bottom_right',dismissible:raw.dismissible!==false,frequency:['once_per_session','once_per_page','every_hours','every_days'].includes(String(raw.frequency||''))?String(raw.frequency):'once_per_session',frequency_value:Math.max(1,Math.min(365,Number(raw.frequency_value||24)||24)),pages,related_service_id:String(raw.related_service_id||''),use_theme_colors:raw.use_theme_colors!==false,background_color:String(raw.background_color||''),text_color:String(raw.text_color||''),accent_color:String(raw.accent_color||'')};}
function serviceOfferCurrentProject(){const id=String($('#projectDetail')?.dataset.projectId||'');if(!id)return null;return (DATA.projects||[]).find((row)=>String(row.project_id||row.id||row.gallery_id||'')===id)||null;}
function serviceOfferContext(){const project=serviceOfferCurrentProject();if(project)return {pageType:'project',project};const service=currentServiceDetail();if(service)return {pageType:'service',service:service.item,category:service.category};if(isServicesPage())return {pageType:'services'};const custom=currentCustomPage();if(custom)return {pageType:'custom',custom};const seo=currentSeoRoute();if(seo?.kind==='category')return {pageType:'category',categoryId:String(seo.entity_id||'')};return {pageType:'home'};}
function serviceOfferRelatedRecord(config,context){const explicit=config.related_service_id?quoteServiceRecord(config.related_service_id):null;if(explicit)return explicit;if(context.service)return quoteServiceRecord(context.service.id);if(context.project){const records=projectCommercialServiceRecords(context.project);if(records.length)return records[0];}return null;}
function serviceOfferTemplate(value,context,record){return String(value||'').replace(/\{project\}/gi,String(context.project?.title||'este projeto')).replace(/\{service\}/gi,String(record?.item?.title||'este serviço'));}
function serviceOfferStorageKey(config,context){const base=`${SERVICE_OFFER_STORAGE_PREFIX}:${config.frequency}`;if(config.frequency==='once_per_page')return `${base}:${location.pathname}${location.search}:${context.pageType}`;return base;}
function serviceOfferCanShow(config,context){if(!config.enabled||!config.pages.includes(context.pageType))return false;const key=serviceOfferStorageKey(config,context);try{if(config.frequency==='once_per_session')return !sessionStorage.getItem(key);if(config.frequency==='once_per_page')return !sessionStorage.getItem(key);const previous=Number(localStorage.getItem(key)||0);if(!previous)return true;const unit=config.frequency==='every_days'?86400000:3600000;return Date.now()-previous>=config.frequency_value*unit;}catch(_){return true;}}
function serviceOfferMarkShown(config,context){const key=serviceOfferStorageKey(config,context);try{if(config.frequency==='once_per_session'||config.frequency==='once_per_page')sessionStorage.setItem(key,'1');else localStorage.setItem(key,String(Date.now()));}catch(_){}}
function serviceOfferClose({mark=false}={}){const node=$('#serviceOfferNotification');if(!node)return;if(mark){const config=serviceOfferConfig(),context=serviceOfferContext();serviceOfferMarkShown(config,context);}node.classList.remove('is-visible');node.setAttribute('aria-hidden','true');setTimeout(()=>{node.remove();requestAnimationFrame(layoutFloatingControls);},360);}
function serviceOfferObstacles(){return [...document.querySelectorAll('#header,.filters,.services-jump-nav,[data-context-bar],.section-navigator,.project-back,.hero-open,.hero-sound-toggle,.quote-cta-button,.site-floating-control:not(#serviceOfferNotification)')].filter((node)=>{if(node.hidden||node.closest('[hidden]'))return false;const style=getComputedStyle(node);return style.display!=='none'&&style.visibility!=='hidden';});}
function layoutServiceOfferNotification(){SERVICE_OFFER_LAYOUT_RAF=0;const node=$('#serviceOfferNotification');if(!node||!node.classList.contains('is-visible'))return;node.style.setProperty('--service-offer-shift-y','0px');const bottom=node.dataset.position?.startsWith('bottom');let rect=node.getBoundingClientRect(),shift=0;for(const obstacle of serviceOfferObstacles()){const other=obstacle.getBoundingClientRect();const overlapX=rect.left<other.right+10&&rect.right>other.left-10,overlapY=rect.top<other.bottom+10&&rect.bottom>other.top-10;if(!overlapX||!overlapY)continue;if(bottom){const delta=other.top-rect.bottom-12;if(delta<0){shift+=delta;rect={...rect,top:rect.top+delta,bottom:rect.bottom+delta};}}else{const delta=other.bottom-rect.top+12;if(delta>0){shift+=delta;rect={...rect,top:rect.top+delta,bottom:rect.bottom+delta};}}}node.style.setProperty('--service-offer-shift-y',`${Math.round(shift)}px`);}
function queueServiceOfferLayout(){if(SERVICE_OFFER_LAYOUT_RAF)return;SERVICE_OFFER_LAYOUT_RAF=requestAnimationFrame(layoutServiceOfferNotification);}
function bindServiceOfferLayout(){if(SERVICE_OFFER_LAYOUT_BOUND)return;SERVICE_OFFER_LAYOUT_BOUND=true;addEventListener('resize',queueServiceOfferLayout,{passive:true});addEventListener('scroll',queueServiceOfferLayout,{passive:true});window.visualViewport?.addEventListener('resize',queueServiceOfferLayout,{passive:true});window.visualViewport?.addEventListener('scroll',queueServiceOfferLayout,{passive:true});}
function serviceOfferMarkup(config,context,record){const style=config.use_theme_colors?'':`--service-offer-bg:${esc(config.background_color||'#FFFFFF')};--service-offer-text:${esc(config.text_color||'#172033')};--service-offer-accent:${esc(config.accent_color||'#007A68')};`;const close=config.dismissible?'<button type="button" class="service-offer-close" data-service-offer-close aria-label="Fechar oferta">×</button>':'';return `<aside class="service-offer-notification" id="serviceOfferNotification" data-position="${esc(config.position)}" data-floating-obstacle style="${style}" aria-hidden="true" aria-label="Oferta de serviços"><div class="service-offer-kicker">MENSAGEM STUDIO</div>${close}<strong>${esc(serviceOfferTemplate(config.title,context,record))}</strong><p>${esc(serviceOfferTemplate(config.message,context,record))}</p><button type="button" class="service-offer-cta" data-service-offer-cta>${esc(config.cta_label)}</button></aside>`;}
function serviceOfferAction(config,context,record){if(config.cta_target==='services'){location.href=servicesHref();return;}if(config.cta_target==='related_service'){location.href=record?serviceDetailHref(record.item):servicesHref();return;}if(!quoteEnabled()){location.href=servicesHref();return;}const projectId=String(context.project?.project_id||context.project?.id||''),sourceContext=commercialSourceContext({serviceId:String(record?.item?.id||''),referenceProjectId:projectId,sourceType:'service_offer',sourceUrl:location.href});if(record){addQuoteItem(record.item.id,{referenceProjectId:projectId,open:true,sourceContext});return;}openQuotePanel({sourceContext});}
function showServiceOfferNotification(){const config=serviceOfferConfig(),context=serviceOfferContext();if(!serviceOfferCanShow(config,context))return;document.querySelector('#serviceOfferNotification')?.remove();const record=serviceOfferRelatedRecord(config,context),shell=document.createElement('div');shell.innerHTML=serviceOfferMarkup(config,context,record);const node=shell.firstElementChild;if(!node)return;document.body.append(node);bindServiceOfferLayout();node.querySelector('[data-service-offer-close]')?.addEventListener('click',()=>serviceOfferClose({mark:true}));node.querySelector('[data-service-offer-cta]')?.addEventListener('click',()=>{serviceOfferMarkShown(config,context);serviceOfferAction(config,context,record);serviceOfferClose();});serviceOfferMarkShown(config,context);requestAnimationFrame(()=>{node.classList.add('is-visible');node.setAttribute('aria-hidden','false');layoutFloatingControls();queueServiceOfferLayout();});}
function setupServiceOfferNotification(){clearTimeout(SERVICE_OFFER_TIMER);document.querySelector('#serviceOfferNotification')?.remove();const config=serviceOfferConfig(),context=serviceOfferContext();if(!serviceOfferCanShow(config,context))return;SERVICE_OFFER_TIMER=setTimeout(showServiceOfferNotification,config.delay_seconds*1000);}
let QUOTE_STATE={version:1,updated_at:'',items:[],lead:{name_company:'',name:'',company:'',email:'',whatsapp:'',timeline:'',details:''}};
let QUOTE_EVENTS_BOUND=false,QUOTE_PENDING_SOURCE=null;
function serviceSelectionKey(category,item){return `${category.id}:${item.id}`;}
function serviceSelectionRecord(key){for(const category of visibleServiceCategories()){for(const item of visibleServiceItems(category)){if(serviceSelectionKey(category,item)===key)return {category,item,key};}}return null;}
function quoteEnabled(){return servicesConfig().quote_enabled!==false;}
function quoteStateVersion(){return Math.max(1,Number(servicesConfig().quote_state_version||1));}
function quoteServiceRecord(serviceId=''){return visibleServiceRecords().find(({item})=>String(item.id||'')===String(serviceId||''))||null;}
function quoteProjectRecord(projectId=''){const id=String(projectId||'').trim();if(!id)return null;return (DATA.projects||[]).find((project)=>project&&!project.hidden&&[project.project_id,project.id,project.gallery_id].some((value)=>value!=null&&String(value).trim()!==''&&String(value).trim()===id))||null;}
const COMMERCIAL_SOURCE_TYPES=new Set(['home','project','project_cta','service','services','services_catalog','service_offer','category','custom','quote_suggestion','manual']);
function normalizeCommercialSourceUrl(value=''){const raw=String(value||'').trim().slice(0,1400);if(!raw)return '';if(raw.startsWith('/')&&!raw.startsWith('//'))return raw;try{const url=new URL(raw,location.href);return ['http:','https:','file:'].includes(url.protocol)?url.href.slice(0,1400):'';}catch(_){return '';}}
function commercialSourceContext({serviceId='',referenceProjectId='',sourceType='',sourceUrl=''}={}){const project=quoteProjectRecord(referenceProjectId),service=quoteServiceRecord(serviceId),page=serviceOfferContext();let type=COMMERCIAL_SOURCE_TYPES.has(String(sourceType||''))?String(sourceType):'';if(!type){if(project)type='project';else if(page.pageType==='service')type='service';else if(page.pageType==='services')type='services';else if(page.pageType==='category')type='category';else if(page.pageType==='custom')type='custom';else type='home';}const projectId=project?String(project.project_id||project.id||project.gallery_id||'').trim():'';const serviceRecord=service||(page.service?quoteServiceRecord(page.service.id):null);return {type,url:normalizeCommercialSourceUrl(sourceUrl||location.href),project_id:projectId,service_id:String(serviceRecord?.item?.id||serviceId||'').trim()};}
function resolveCommercialSource(line={},record=null){const project=quoteProjectRecord(line.source_project_id||line.reference_project_id),service=quoteServiceRecord(line.source_service_id||line.service_id)||record;return {type:COMMERCIAL_SOURCE_TYPES.has(String(line.source_type||''))?String(line.source_type):'',url:normalizeCommercialSourceUrl(line.source_url||''),project_id:String(project?.project_id||project?.id||project?.gallery_id||''),project_title:String(project?.title||project?.gallery_title||''),service_id:String(service?.item?.id||line.service_id||''),service_title:String(service?.item?.title||'')};}
function quotePackageRecord(item={},packageId=''){return (Array.isArray(item.packages)?item.packages:[]).find((row)=>String(row.id||'')===String(packageId||''))||null;}
function newQuoteLineId(){return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;}
function normalizeQuoteState(raw={}){const state={version:quoteStateVersion(),updated_at:String(raw?.updated_at||''),items:[],lead:{name_company:'',name:'',company:'',email:'',whatsapp:'',timeline:'',details:''}};const lead=raw?.lead&&typeof raw.lead==='object'?raw.lead:{};Object.keys(state.lead).forEach((field)=>state.lead[field]=String(lead[field]||'').slice(0,2000));if(!state.lead.name_company)state.lead.name_company=[state.lead.name,state.lead.company].filter(Boolean).join(' / ');const merged=new Map();(Array.isArray(raw?.items)?raw.items:[]).forEach((source)=>{if(!source||typeof source!=='object')return;const record=quoteServiceRecord(source.service_id);if(!record)return;let packageId=String(source.package_id||'');if(packageId&&!quotePackageRecord(record.item,packageId))packageId='';const referenceRecord=quoteProjectRecord(source.reference_project_id);const reference=referenceRecord?String(referenceRecord.project_id||referenceRecord.id||'').trim():'';const sourceProject=quoteProjectRecord(source.source_project_id||reference),sourceService=quoteServiceRecord(source.source_service_id||record.item.id),sourceType=COMMERCIAL_SOURCE_TYPES.has(String(source.source_type||''))?String(source.source_type):(reference?'project':''),sourceUrl=normalizeCommercialSourceUrl(source.source_url||'');const mergeKey=`${record.item.id}|${packageId}|${reference}`;const quantity=Math.max(1,Math.min(99,Number(source.quantity)||1));if(merged.has(mergeKey)){const current=merged.get(mergeKey);current.quantity=Math.min(99,current.quantity+quantity);if(!current.source_type&&sourceType)current.source_type=sourceType;if(!current.source_url&&sourceUrl)current.source_url=sourceUrl;return;}const row={id:String(source.id||newQuoteLineId()),service_id:String(record.item.id),package_id:packageId,quantity,note:String(source.note||'').slice(0,1200),reference_project_id:reference,source_type:sourceType,source_url:sourceUrl,source_project_id:String(sourceProject?.project_id||sourceProject?.id||sourceProject?.gallery_id||reference||''),source_service_id:String(sourceService?.item?.id||record.item.id||'')};merged.set(mergeKey,row);state.items.push(row);});return state;}
function loadQuoteState(){let raw={};try{raw=JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)||'{}')||{};}catch(_){raw={};}QUOTE_STATE=normalizeQuoteState(raw);return QUOTE_STATE;}
function saveQuoteState(){QUOTE_STATE.version=quoteStateVersion();QUOTE_STATE.updated_at=new Date().toISOString();if(QUOTE_RUNTIME.receipt)saveQuoteReceipt(null);QUOTE_RUNTIME.error='';try{localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify(QUOTE_STATE));}catch(_){}updateServiceQuoteUI();renderQuoteHome();return QUOTE_STATE;}
function persistQuoteStateQuiet(){QUOTE_STATE.version=quoteStateVersion();QUOTE_STATE.updated_at=new Date().toISOString();try{localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify(QUOTE_STATE));}catch(_){}return QUOTE_STATE;}
function quoteResolvedItems(){return QUOTE_STATE.items.map((line)=>{const record=quoteServiceRecord(line.service_id);if(!record)return null;return {...record,line,package:quotePackageRecord(record.item,line.package_id),reference:quoteProjectRecord(line.reference_project_id),source:resolveCommercialSource(line,record)};}).filter(Boolean);}
function quoteSuggestedServices(limit=3){const selected=new Set(QUOTE_STATE.items.map((line)=>String(line.service_id||''))),records=visibleServiceRecords(),byId=new Map(records.map((record)=>[String(record.item.id||''),record])),out=[],used=new Set(selected);const add=(record)=>{const id=String(record?.item?.id||'');if(!id||used.has(id)||out.length>=limit)return;used.add(id);out.push(record);};quoteResolvedItems().forEach(({item})=>(Array.isArray(item.recommended_service_ids)?item.recommended_service_ids:[]).forEach((id)=>add(byId.get(String(id)))));quoteResolvedItems().forEach(({category})=>records.filter((record)=>String(record.category.id)===String(category.id)&&record.item.featured).forEach(add));quoteResolvedItems().forEach(({category})=>records.filter((record)=>String(record.category.id)===String(category.id)).forEach(add));records.filter((record)=>record.item.featured).forEach(add);return out.slice(0,limit);}
function renderQuoteSuggestions(){const root=$('#globalQuoteSuggestions');if(!root)return;const rows=quoteSuggestedServices();root.hidden=!rows.length||!QUOTE_STATE.items.length;root.innerHTML=root.hidden?'':`<div class="quote-suggestions-head"><small>COMBINA BEM COM O SEU PEDIDO</small><strong>Complete o projeto, se fizer sentido</strong><span>Nada é adicionado automaticamente.</span></div><div class="quote-suggestion-list">${rows.map(({category,item})=>`<article><div><small>${esc(category.short_title||category.title||'Serviço')}</small><strong>${esc(item.title||'Serviço')}</strong><span>${esc(servicePrice(item))}</span></div><button type="button" data-quote-suggestion-add="${esc(item.id)}">+ Adicionar</button></article>`).join('')}</div>`;}
function addQuoteItem(serviceId,{packageId='',referenceProjectId='',open=true,sourceContext=null}={}){if(!quoteEnabled())return false;const record=quoteServiceRecord(serviceId);if(!record)return false;const pending=sourceContext&&typeof sourceContext==='object'?sourceContext:(QUOTE_PENDING_SOURCE||{}),requestedProject=String(referenceProjectId||pending.project_id||''),safePackage=packageId&&quotePackageRecord(record.item,packageId)?String(packageId):'';const referenceRecord=quoteProjectRecord(requestedProject),safeReference=referenceRecord?String(referenceRecord.project_id||referenceRecord.id||'').trim():'';const source=commercialSourceContext({serviceId:String(pending.service_id||record.item.id),referenceProjectId:String(pending.project_id||safeReference),sourceType:String(pending.type||''),sourceUrl:String(pending.url||'')});const existing=QUOTE_STATE.items.find((line)=>String(line.service_id)===String(record.item.id)&&String(line.package_id||'')===safePackage&&String(line.reference_project_id||'')===safeReference);if(existing){existing.quantity=Math.min(99,Number(existing.quantity||1)+1);if(!existing.source_type)existing.source_type=source.type;if(!existing.source_url)existing.source_url=source.url;if(!existing.source_project_id)existing.source_project_id=source.project_id;if(!existing.source_service_id)existing.source_service_id=source.service_id;}else QUOTE_STATE.items.push({id:newQuoteLineId(),service_id:String(record.item.id),package_id:safePackage,quantity:1,note:'',reference_project_id:safeReference,source_type:source.type,source_url:source.url,source_project_id:source.project_id,source_service_id:source.service_id||String(record.item.id)});saveQuoteState();if(open)openQuotePanel({sourceContext:source});return true;}
function removeQuoteItem(id){QUOTE_STATE.items=QUOTE_STATE.items.filter((line)=>String(line.id)!==String(id));saveQuoteState();}
function clearQuote(){QUOTE_PENDING_SOURCE=null;QUOTE_STATE={version:quoteStateVersion(),updated_at:'',items:[],lead:{name_company:'',name:'',company:'',email:'',whatsapp:'',timeline:'',details:''}};saveQuoteState();}
function quoteMoney(value){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:Number.isInteger(Number(value))?0:2}).format(Number(value||0));}
function quotePriceSource(item={},packageRow=null){const source=packageRow||item;const type=['from','fixed','quote'].includes(source?.price_type)?source.price_type:'from';const value=Number(source?.price||0);return {type,value,known:type!=='quote'&&value>0,unit:String(source?.unit||item.unit||'')};}
function quoteLinePriceLabel(item={},packageRow=null,quantity=1){const price=quotePriceSource(item,packageRow);if(!price.known)return 'Sob consulta';const total=price.value*Math.max(1,Number(quantity)||1);return `${price.type==='from'?'A partir de ':''}${quoteMoney(total)}`;}
function quoteSummary(){let total=0,known=0,unknown=0,hasFrom=false;quoteResolvedItems().forEach(({item,package:pkg,line})=>{const price=quotePriceSource(item,pkg);if(!price.known){unknown++;return;}known++;if(price.type==='from')hasFrom=true;total+=price.value*Math.max(1,Number(line.quantity)||1);});if(!known&&unknown)return {label:'Sob consulta',total:0,unknown,hasFrom:false};if(!known)return {label:'Sem itens com valor calculável',total:0,unknown,hasFrom:false};let label=`${hasFrom?'A partir de ':'Estimativa: '}${quoteMoney(total)}`;if(unknown)label=`Estimativa parcial: ${hasFrom?'a partir de ':''}${quoteMoney(total)} + ${unknown} ${unknown===1?'item sob consulta':'itens sob consulta'}`;return {label,total,unknown,hasFrom};}
function servicePublicMedia(mediaId){
  if(!mediaId)return null;const target=String(mediaId);let found=null;
  const visit=(value)=>{if(found||!value)return;if(Array.isArray(value)){value.forEach(visit);return;}if(typeof value!=='object')return;if(String(value.id||'')===target&&['image','video'].includes(String(value.type||''))){found=value;return;}Object.values(value).forEach(visit);};
  visit(DATA.hero_assets||{});visit(DATA.projects||[]);visit(DATA.galleries||{});return found;
}
function resolvedServiceCategoryMedia(category={}){return servicePublicMedia(category.cover_media_id);}
function serviceCategoryVisualSettings(category={},node=null){const fit=['cover','contain'].includes(category.cover_fit)?category.cover_fit:'cover',x=Math.max(0,Math.min(100,Number(category.cover_position_x??50))),y=Math.max(0,Math.min(100,Number(category.cover_position_y??50))),overlay=Math.max(0,Math.min(.85,Number(category.overlay_strength??.38))),align=['left','center','right'].includes(category.text_alignment)?category.text_alignment:'left',height=['compact','medium','large'].includes(category.visual_height)?category.visual_height:'large';if(node){node.style.setProperty('--service-cover-fit',fit);node.style.setProperty('--service-cover-x',`${x}%`);node.style.setProperty('--service-cover-y',`${y}%`);node.style.setProperty('--service-cover-overlay',String(overlay));node.dataset.visualHeight=height;node.dataset.textAlign=align;}return {fit,x,y,overlay,align,height,show:category.show_cover!==false};}
function serviceCategoryVisual(category){const visual=document.createElement('div');visual.className='service-category-visual';visual.style.setProperty('--service-accent',category.accent||'var(--accent)');const settings=serviceCategoryVisualSettings(category,visual),media=settings.show?resolvedServiceCategoryMedia(category):null;if(!media){visual.classList.add('is-abstract');visual.innerHTML=`<span>${esc(category.number||'')}</span><i></i>`;return visual;}if(media.type==='video'){const posterNode=imageWithFallback(media,[media.thumbnail_url,...(media.thumbnail_candidates||[]),media.preview_url,...(media.preview_candidates||[])],{lazy:true,upgradeUrls:[media.preview_url,...(media.preview_candidates||[])]});posterNode.classList?.add('service-video-poster');visual.append(posterNode);const video=createResilientVideo(media,{autoplay:true,muted:true,loop:true,controls:false,preload:'none',className:'service-category-preview-video',defer:true,metadataReady:false,timeoutMs:45000,exhausted:()=>{video.remove();}});visual.append(video);bindDeferredAutoplay(video,visual);}else visual.append(imageWithFallback(media,[media.thumbnail_url,...(media.thumbnail_candidates||[]),media.preview_url,...(media.preview_candidates||[]),media.media_url,...(media.media_candidates||[])],{lazy:true,upgradeUrls:[media.preview_url,...(media.preview_candidates||[]),media.media_url,...(media.media_candidates||[])]}));return visual;}
function serviceCategoryCard(category,index){
  const config=servicesConfig(),article=document.createElement('article');article.className='service-area-card reveal';article.style.setProperty('--service-accent',category.accent||'var(--accent)');article.id=`service-${category.id}`;serviceCategoryVisualSettings(category,article);
  const visual=serviceCategoryVisual(category),copy=document.createElement('div');copy.className='service-area-copy';const meta=document.createElement('div');meta.className='service-area-meta';meta.innerHTML=`<span>${esc(category.number||String(index+1).padStart(2,'0'))}</span><small>${visibleServiceItems(category).length} opções</small>`;
  const title=document.createElement('h2');title.textContent=category.title||'Serviço';const description=document.createElement('p');description.textContent=category.description||'';const list=document.createElement('div');list.className='service-price-list';
  visibleServiceItems(category).forEach((item)=>{const key=serviceSelectionKey(category,item),row=document.createElement('article');row.className=`service-price-card${item.featured?' featured':''}`;row.dataset.serviceKey=key;row.dataset.serviceFeatured=item.featured?'1':'0';row.dataset.serviceSearch=[category.title,category.short_title,item.title,item.description,item.unit,...(item.deliverables||[])].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(item.page_enabled!==false){row.dataset.serviceDetailHref=serviceDetailHref(item);row.tabIndex=0;row.setAttribute('role','link');}const head=document.createElement('div'),itemTitle=document.createElement('h3');itemTitle.textContent=item.title||'Serviço';const price=document.createElement('strong');price.textContent=servicePrice(item);head.append(itemTitle,price);const body=document.createElement('p');body.textContent=item.description||'';const facts=document.createElement('div');facts.className='service-facts';if(item.unit){const unit=document.createElement('span');unit.textContent=item.unit;facts.append(unit);}if(config.show_deadlines!==false&&item.deadline){const deadline=document.createElement('span');deadline.textContent=item.deadline;facts.append(deadline);}if(config.show_revisions!==false){const revisions=document.createElement('span');revisions.textContent=`${Number(item.revisions||0)} ${Number(item.revisions||0)===1?'revisão':'revisões'}`;facts.append(revisions);}const deliverables=document.createElement('ul');if(config.show_deliverables!==false)(item.deliverables||[]).forEach((value)=>{const li=document.createElement('li');li.textContent=value;deliverables.append(li);});
    const actions=document.createElement('div');actions.className='service-item-actions-public';if(item.page_enabled!==false){const details=document.createElement('a');details.className='service-item-details';details.href=serviceDetailHref(item);details.textContent='Ver detalhes ↗';actions.append(details);if(quoteEnabled()){const select=document.createElement('button');select.type='button';select.className='service-item-select';select.dataset.serviceSelect=key;select.textContent=config.quote_item_action_label||'Adicionar ao orçamento';actions.append(select);}}else if(quoteEnabled()){const select=document.createElement('button');select.type='button';select.className='service-item-select';select.dataset.serviceSelect=key;select.textContent=config.quote_item_action_label||'Adicionar ao orçamento';actions.append(select);}else{const direct=document.createElement('a');direct.className='service-item-direct service-item-primary-whatsapp';direct.href=serviceWhatsappHref(category,item);direct.target='_blank';direct.rel='noopener';direct.textContent=item.cta_label||config.cta_label||'Solicitar orçamento';actions.append(direct);}row.append(head,body,facts);if(deliverables.children.length)row.append(deliverables);row.append(actions);list.append(row);
  });
  copy.append(meta,title,description,list);article.append(visual,copy);return article;
}
function serviceProcessSection(){const config=servicesConfig(),steps=(Array.isArray(config.process_steps)?config.process_steps:[]).filter(Boolean);if(config.process_visible===false||!steps.length)return null;const section=document.createElement('section');section.className='services-process reveal';const copy=document.createElement('div');copy.innerHTML=`<small>PROCESSO</small><h2>${esc(config.process_title||'Um processo claro do briefing à entrega')}</h2><p>${esc(config.process_body||'')}</p>`;const list=document.createElement('ol');steps.forEach((step,index)=>{const item=document.createElement('li');item.innerHTML=`<span>${String(index+1).padStart(2,'0')}</span><strong>${esc(step)}</strong>`;list.append(item);});section.append(copy,list);return section;}
function quoteLeadFromDom(){const map={name_company:['homeQuoteNameCompany','quoteLeadNameCompany'],email:['homeQuoteEmail','quoteLeadEmail'],whatsapp:['homeQuoteWhatsapp','quoteLeadWhatsapp'],timeline:['homeQuoteTimeline','quoteLeadTimeline'],details:['homeQuoteDetails','quoteLeadDetails']};Object.entries(map).forEach(([field,ids])=>{const nodes=ids.map(id=>document.getElementById(id)).filter(Boolean);const active=nodes.find(node=>document.activeElement===node)||nodes.find(node=>String(node.value||'').trim())||nodes[0];if(active)QUOTE_STATE.lead[field]=String(active.value||'').slice(0,4000);});QUOTE_STATE.lead.name=QUOTE_STATE.lead.name_company;QUOTE_STATE.lead.company='';}
function serviceQuoteMessage(){quoteLeadFromDom();const config=servicesConfig(),summary=quoteSummary(),records=quoteResolvedItems();const lines=[];records.forEach(({category,item,line,package:pkg,reference,source},index)=>{const price=quoteLinePriceLabel(item,pkg,line.quantity),deadline=String(pkg?.deadline||item.deadline||''),revisions=pkg?.revisions==null?Number(item.revisions||0):Number(pkg.revisions||0);lines.push(`${index+1}. ${category.title} — ${item.title}`);if(pkg)lines.push(`Pacote: ${pkg.label}`);lines.push(`Quantidade: ${Math.max(1,Number(line.quantity)||1)}`);if(config.quote_show_estimate!==false)lines.push(`Investimento: ${price}`);if(config.quote_show_deadline!==false&&deadline)lines.push(`Prazo indicado: ${deadline}`);if(config.quote_show_revisions!==false)lines.push(`Revisões: ${revisions}`);if(reference)lines.push(`Referência: ${reference.title||'Projeto do portfólio'}`);if(source?.url&&/^https?:/i.test(source.url))lines.push(`Link de origem: ${source.url}`);if(line.note)lines.push(`Observação: ${line.note}`);lines.push('');});const lead=QUOTE_STATE.lead||{};return [config.quote_whatsapp_intro||config.whatsapp_message||'Olá! Gostaria de solicitar um orçamento.',records.length?`SERVIÇOS\n\n${lines.join('\n').trim()}`:'SERVIÇOS\n\nPreciso de orientação para escolher os serviços.',config.quote_show_estimate!==false&&records.length?`RESUMO\n${summary.label}`:'',lead.name_company?`Nome ou marca / empresa: ${lead.name_company}`:'',lead.email?`E-mail: ${lead.email}`:'',lead.whatsapp?`WhatsApp para retorno: ${lead.whatsapp}`:'',lead.timeline?`Prazo desejado: ${lead.timeline}`:'',lead.details?`Meu projeto:\n${lead.details}`:''].filter(Boolean).join('\n\n');}
function quotePanelMarkup(){const config=servicesConfig(),control=floatingControlsFor(DATA.site_builder||{},DATA.site_builder?.navigation||{}).quote;return `<div class="global-quote-backdrop" id="globalQuoteBackdrop" hidden data-quote-close></div><aside class="global-quote-panel" id="globalQuotePanel" aria-hidden="true" aria-label="${esc(config.quote_title||'Seu orçamento')}"><header><div><small>ORÇAMENTO</small><h2>${esc(config.quote_title||'Seu orçamento')}</h2><p>${esc(config.quote_intro||'')}</p></div><button type="button" data-quote-close aria-label="Fechar">×</button></header><div class="global-quote-scroll"><div id="globalQuoteItems" class="global-quote-items"></div><div id="globalQuoteSummary" class="global-quote-summary"></div><section id="globalQuoteSuggestions" class="global-quote-suggestions" hidden></section><div class="global-quote-lead"><label class="wide">Nome ou marca / empresa<input id="quoteLeadNameCompany" autocomplete="name" placeholder="Seu nome, marca ou empresa"></label><label>E-mail<input id="quoteLeadEmail" type="email" autocomplete="email" placeholder="voce@empresa.com"></label><label>WhatsApp para retorno<input id="quoteLeadWhatsapp" type="tel" autocomplete="tel" placeholder="(00) 00000-0000"></label><label>Prazo desejado<input id="quoteLeadTimeline" placeholder="Ex.: ainda este mês"></label><label class="wide">Conte um pouco sobre o projeto<textarea id="quoteLeadDetails" rows="4" placeholder="Objetivo, formatos, quantidade, referências e o que já está pronto"></textarea></label></div><div id="globalQuoteSubmitState" data-quote-submit-state></div></div><footer><button type="button" class="quote-clear" data-quote-clear>Limpar</button><button type="button" class="quote-send" data-quote-send>${esc(config.quote_finish_label||'Enviar solicitação')}</button></footer></aside><button type="button" class="global-quote-dock site-floating-control" id="globalQuoteDock" data-floating-control="quote" data-quote-open aria-label="${esc(control.label||'Orçamento')}"><i class="quote-dock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M3.5 4.5h2l1.8 9.1h9.9l2-6.4H7.1M9.2 18.5a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Zm7 0a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></i><span data-quote-label>${esc(control.label||'Orçamento')}</span><strong data-quote-count>0</strong></button>`;}
function ensureGlobalQuoteUI(){document.body.classList.remove('quote-panel-open');document.querySelectorAll('#globalQuotePanel,#globalQuoteBackdrop,#globalQuoteDock').forEach((node)=>node.remove());if(!quoteEnabled())return;const shell=document.createElement('div');shell.id='studioframeQuoteUi';shell.innerHTML=quotePanelMarkup();while(shell.firstChild)document.body.append(shell.firstChild);applyFloatingControls(DATA.site_builder||{},DATA.site_builder?.navigation||{});renderGlobalQuotePanel();renderQuoteSuggestions();bindQuoteEvents();}
function hydrateQuoteContactFields(){const lead=QUOTE_STATE.lead||{};[['quoteLeadEmail','email'],['quoteLeadWhatsapp','whatsapp']].forEach(([id,field])=>{const node=document.getElementById(id);if(node&&document.activeElement!==node)node.value=lead[field]||'';});}
function openQuotePanel({sourceContext=null}={}){if(!quoteEnabled())return;if(sourceContext&&typeof sourceContext==='object')QUOTE_PENDING_SOURCE=commercialSourceContext({serviceId:sourceContext.service_id||'',referenceProjectId:sourceContext.project_id||'',sourceType:sourceContext.type||'',sourceUrl:sourceContext.url||''});ensureQuoteUiIfMissing();const panel=$('#globalQuotePanel'),backdrop=$('#globalQuoteBackdrop');if(!panel)return;renderGlobalQuotePanel();renderQuoteSuggestions();hydrateQuoteContactFields();panel.classList.add('is-open');panel.setAttribute('aria-hidden','false');if(backdrop)backdrop.hidden=false;document.body.classList.add('quote-panel-open');}
function closeQuotePanel(){const panel=$('#globalQuotePanel'),backdrop=$('#globalQuoteBackdrop');panel?.classList.remove('is-open');panel?.setAttribute('aria-hidden','true');if(backdrop)backdrop.hidden=true;document.body.classList.remove('quote-panel-open');QUOTE_PENDING_SOURCE=null;}
function ensureQuoteUiIfMissing(){if(quoteEnabled()&&!$('#globalQuotePanel'))ensureGlobalQuoteUI();}
function renderGlobalQuotePanel(){const list=$('#globalQuoteItems'),summaryNode=$('#globalQuoteSummary');const config=servicesConfig(),records=quoteResolvedItems();if(list){if(!records.length)list.innerHTML='<div class="global-quote-empty"><strong>Seu orçamento está vazio.</strong><span>Adicione serviços e continue navegando pelo site.</span></div>';else list.innerHTML=records.map(({category,item,line,package:pkg,reference})=>{const packages=Array.isArray(item.packages)?item.packages:[];const packageSelect=packages.length?`<label>Pacote/opção<select data-quote-package="${esc(line.id)}"><option value="">Padrão do serviço</option>${packages.map((row)=>`<option value="${esc(row.id)}" ${String(row.id)===String(line.package_id)?'selected':''}>${esc(row.label)} · ${esc(quoteLinePriceLabel(row,null,1))}</option>`).join('')}</select></label>`:'';const ref=reference?`<span class="quote-reference">Referência: ${esc(reference.title||'Projeto do portfólio')}</span>`:'';const price=config.quote_show_estimate!==false?`<strong data-quote-line-price="${esc(line.id)}">${esc(quoteLinePriceLabel(item,pkg,line.quantity))}</strong>`:'';const deadline=String(pkg?.deadline||item.deadline||''),revisions=pkg?.revisions==null?Number(item.revisions||0):Number(pkg.revisions||0),meta=[config.quote_show_deadline!==false&&deadline?deadline:'',config.quote_show_revisions!==false?`${revisions} ${revisions===1?'revisão':'revisões'}`:''].filter(Boolean).join(' · ');return `<article class="global-quote-item" data-quote-line="${esc(line.id)}"><div class="quote-item-head"><div class="quote-item-copy"><small>${esc(category.short_title||category.title)}</small><h3>${esc(item.title)}</h3>${ref}</div><div class="quote-item-actions">${price}<button type="button" data-quote-remove="${esc(line.id)}" aria-label="Remover">×</button></div></div>${meta?`<p class="quote-item-meta">${esc(meta)}</p>`:''}<div class="quote-item-controls">${packageSelect}<label>Quantidade<input type="number" min="1" max="99" value="${Math.max(1,Number(line.quantity)||1)}" data-quote-quantity="${esc(line.id)}"></label><label class="wide">Observação<textarea rows="2" data-quote-note="${esc(line.id)}" placeholder="Detalhes específicos deste item">${esc(line.note||'')}</textarea></label></div></article>`;}).join('');}if(summaryNode){const summary=quoteSummary();summaryNode.hidden=config.quote_show_estimate===false||!records.length;summaryNode.innerHTML=summaryNode.hidden?'':`<small>ESTIMATIVA</small><strong>${esc(summary.label)}</strong><span>Valor final depende da confirmação do escopo.</span>`;}const lead=QUOTE_STATE.lead||{};[['quoteLeadNameCompany','name_company'],['quoteLeadTimeline','timeline'],['quoteLeadDetails','details']].forEach(([id,field])=>{const node=document.getElementById(id);if(node&&document.activeElement!==node)node.value=lead[field]||'';});const dock=$('#globalQuoteDock');if(dock){const control=floatingControlsFor(DATA.site_builder||{},DATA.site_builder?.navigation||{}).quote;dock.hidden=!quoteEnabled()||control.visible===false;const label=dock.querySelector('[data-quote-label]');if(label)label.textContent=control.label||'Orçamento';const icon=dock.querySelector('.quote-dock-icon');if(icon)icon.hidden=control.show_icon===false;const count=QUOTE_STATE.items.reduce((total,line)=>total+Math.max(1,Number(line.quantity)||1),0);dock.querySelector('[data-quote-count]').textContent=String(count);dock.classList.toggle('has-items',count>0);requestAnimationFrame(layoutFloatingControls);}document.querySelectorAll('[data-service-select]').forEach((button)=>{const record=serviceSelectionRecord(button.dataset.serviceSelect);const selected=record&&QUOTE_STATE.items.some((line)=>String(line.service_id)===String(record.item.id));button.classList.toggle('selected',Boolean(selected));button.textContent=selected?'Adicionado ✓':(config.quote_item_action_label||'Adicionar ao orçamento');});document.querySelectorAll('[data-quote-inline-count]').forEach((node)=>{const count=QUOTE_STATE.items.length;node.textContent=`${count} ${count===1?'serviço no orçamento':'serviços no orçamento'}`;});renderQuoteSubmitState();}
function refreshQuoteComputedUi(lineId=''){const config=servicesConfig(),records=quoteResolvedItems();if(lineId&&config.quote_show_estimate!==false){const resolved=records.find(({line})=>String(line.id)===String(lineId)),priceNode=document.querySelector(`[data-quote-line-price="${CSS.escape(String(lineId))}"]`);if(resolved&&priceNode)priceNode.textContent=quoteLinePriceLabel(resolved.item,resolved.package,resolved.line.quantity);}const summaryNode=$('#globalQuoteSummary');if(summaryNode){const summary=quoteSummary();summaryNode.hidden=config.quote_show_estimate===false||!records.length;summaryNode.innerHTML=summaryNode.hidden?'':`<small>ESTIMATIVA</small><strong>${esc(summary.label)}</strong><span>Valor final depende da confirmação do escopo.</span>`;}const dock=$('#globalQuoteDock');if(dock){const count=QUOTE_STATE.items.reduce((total,line)=>total+Math.max(1,Number(line.quantity)||1),0);dock.querySelector('[data-quote-count]').textContent=String(count);dock.classList.toggle('has-items',count>0);}document.querySelectorAll('[data-quote-inline-count]').forEach((node)=>{const count=QUOTE_STATE.items.length;node.textContent=`${count} ${count===1?'serviço no orçamento':'serviços no orçamento'}`;});}
function quoteHomeStepValidation(step=QUOTE_RUNTIME.step){if(step===0&&!QUOTE_STATE.items.length)return 'Escolha pelo menos um serviço.';if(step===2&&!String(QUOTE_STATE.lead?.timeline||'').trim())return 'Informe o prazo desejado ou indique que ainda não há prazo definido.';if(step===3)return validateQuoteContact();return '';}
function renderQuoteHome(){const section=$('#quoteHomeSection'),root=$('#quoteWizardHome'),config=servicesConfig();if(!section||!root)return;const isHome=!isBriefingPage()&&!isServicesPage()&&!currentServiceDetail()&&!currentCustomPage()&&!['project','category'].includes(String(currentSeoRoute()?.kind||''));section.hidden=!isHome||config.quote_enabled===false||config.quote_home_visible===false;if(section.hidden)return;$('#quoteHomeTitle').textContent=config.quote_home_title||config.brief_title||'Monte seu orçamento';$('#quoteHomeIntro').textContent=config.quote_home_intro||config.brief_body||config.quote_intro||'';const steps=['Serviços','Escopo','Prazo','Contato'],step=Math.max(0,Math.min(3,Number(QUOTE_RUNTIME.step)||0));QUOTE_RUNTIME.step=step;const records=quoteResolvedItems(),lead=QUOTE_STATE.lead||{};let body='';if(step===0){const suggestions=visibleServiceRecords().slice(0,10);body=`<div class="sf-quote-home-services"><div class="sf-quote-selected"><strong>${records.length} ${records.length===1?'serviço selecionado':'serviços selecionados'}</strong>${records.length?records.map(({item,line})=>`<span>${esc(item.title)} × ${Math.max(1,Number(line.quantity)||1)}</span>`).join(''):'<p>Escolha um serviço para começar.</p>'}</div><div class="sf-quote-service-picks">${suggestions.map(({category,item})=>`<button type="button" data-service-select="${esc(serviceSelectionKey(category,item))}"><small>${esc(category.short_title||category.title)}</small><strong>${esc(item.title)}</strong></button>`).join('')}</div></div>`;}else if(step===1){body=records.length?`<div class="sf-quote-home-lines">${records.map(({item,line,package:pkg})=>`<article><div><strong>${esc(item.title)}</strong><span>${esc(quoteLinePriceLabel(item,pkg,line.quantity))}</span></div><label>Quantidade<input type="number" min="1" max="99" value="${Math.max(1,Number(line.quantity)||1)}" data-quote-quantity="${esc(line.id)}"></label><label>Observação<textarea rows="2" data-quote-note="${esc(line.id)}">${esc(line.note||'')}</textarea></label></article>`).join('')}</div>`:'<p class="sf-quote-empty-step">Volte e adicione pelo menos um serviço.</p>';}else if(step===2){body=`<div class="sf-quote-home-fields"><label>Prazo desejado<input id="homeQuoteTimeline" value="${esc(lead.timeline||'')}" placeholder="Ex.: até o fim do mês"></label><p>O prazo é uma referência inicial e será confirmado após análise do escopo.</p></div>`;}else{const summary=quoteSummary();body=`<div class="sf-quote-home-review"><div class="sf-quote-review-summary"><small>ESTIMATIVA</small><strong>${esc(summary.label)}</strong><span>Solicitação de estimativa — não é proposta formal, contrato ou cobrança.</span></div><div class="sf-quote-home-fields"><label>Nome ou marca / empresa<input id="homeQuoteNameCompany" autocomplete="name" value="${esc(lead.name_company||'')}"></label><label>E-mail<input id="homeQuoteEmail" type="email" autocomplete="email" value="${esc(lead.email||'')}"></label><label>WhatsApp<input id="homeQuoteWhatsapp" type="tel" autocomplete="tel" value="${esc(lead.whatsapp||'')}"></label><label class="wide">Detalhes do projeto<textarea id="homeQuoteDetails" rows="4">${esc(lead.details||'')}</textarea></label></div></div>`;}const error=QUOTE_RUNTIME.error&&!QUOTE_RUNTIME.receipt?`<div class="sf-quote-step-error" role="alert">${esc(QUOTE_RUNTIME.error)}</div>`:'';root.innerHTML=`<nav class="sf-quote-steps" aria-label="Etapas do orçamento">${steps.map((label,index)=>`<button type="button" data-quote-home-step="${index}" class="${index===step?'is-active':''} ${index<step?'is-complete':''}" aria-current="${index===step?'step':'false'}"><span>${index+1}</span>${esc(label)}</button>`).join('')}</nav><div class="sf-quote-step-body">${body}${error}<div data-quote-submit-state></div></div><footer class="sf-quote-home-footer"><button type="button" data-quote-home-back ${step===0?'disabled':''}>Voltar</button>${step<3?`<button type="button" class="primary" data-quote-home-next>Continuar</button>`:`<button type="button" class="primary" data-quote-home-submit ${QUOTE_RUNTIME.submitting?'disabled':''}>${QUOTE_RUNTIME.submitting?'Enviando…':'Enviar solicitação'}</button>`}</footer>`;renderQuoteSubmitState();}
function renderBriefingHomeEntry(){const section=$('#briefingHomeSection'),cfg=briefingConfig();if(!section)return;const isHome=!isBriefingPage()&&!isServicesPage()&&!currentServiceDetail()&&!currentCustomPage()&&!['project','category'].includes(String(currentSeoRoute()?.kind||''));section.hidden=!isHome||cfg.enabled===false;if(section.hidden)return;const stored=loadBriefingLocal(),action=$('#briefingHomeAction'),status=$('#briefingHomeStatus');if(action){action.href=location.protocol==='file:'?`./${briefingPath()}/index.html`:`/${briefingPath()}/`;action.textContent=stored.id?'Continuar briefing':'Começar briefing';}if(status)status.textContent=stored.id?`Rascunho ${stored.id}`:'Briefing independente do orçamento';}
function updateServiceQuoteUI(){ensureQuoteUiIfMissing();renderGlobalQuotePanel();renderQuoteSuggestions();}
function serviceQuoteBuilder(){const config=servicesConfig();if(config.brief_visible===false||config.quote_enabled===false)return null;const section=document.createElement('section');section.className='services-quote-builder reveal';section.id='service-brief';section.dataset.budgetLayout='split';section.setAttribute('aria-labelledby','serviceBriefTitle');section.innerHTML=`<div class="services-quote-intro"><small>ORÇAMENTO</small><h2 id="serviceBriefTitle">${esc(config.brief_title||'Monte sua solicitação de orçamento')}</h2><p>${esc(config.brief_body||'')}</p><span>${esc(config.response_note||'')}</span></div><div class="services-quote-form services-quote-integrated"><strong data-quote-inline-count>0 serviços no orçamento</strong><p>As escolhas ficam salvas neste navegador. O envio só é confirmado após resposta positiva do endpoint de orçamento.</p><button class="service-quote-send" type="button" data-quote-open>${esc(config.brief_button||config.quote_title||'Abrir orçamento')}</button><small>Estimativa não é proposta formal, contrato ou cobrança.</small></div>`;return section;}
function bindQuoteEvents(){if(QUOTE_EVENTS_BOUND)return;QUOTE_EVENTS_BOUND=true;document.addEventListener('click',(event)=>{const suggestion=event.target.closest('[data-quote-suggestion-add]');if(suggestion){addQuoteItem(suggestion.dataset.quoteSuggestionAdd,{open:false,sourceContext:{type:'quote_suggestion',url:location.href}});return;}const select=event.target.closest('[data-service-select]');if(select){const record=serviceSelectionRecord(select.dataset.serviceSelect);if(record)addQuoteItem(record.item.id,{open:false,sourceContext:{type:isServicesPage()?'services_catalog':'service',service_id:record.item.id,url:location.href}});return;}const add=event.target.closest('[data-quote-add-service]');if(add){addQuoteItem(add.dataset.quoteAddService,{packageId:add.dataset.quotePackageId||'',open:true,sourceContext:{type:currentServiceDetail()?'service':'services',service_id:add.dataset.quoteAddService,url:location.href}});return;}const similar=event.target.closest('[data-quote-similar]');if(similar){addQuoteItem(similar.dataset.quoteSimilar,{referenceProjectId:similar.dataset.quoteProjectId||'',open:true,sourceContext:{type:'project_cta',project_id:similar.dataset.quoteProjectId||'',service_id:similar.dataset.quoteSimilar||'',url:location.href}});return;}const openTrigger=event.target.closest('[data-quote-open],[data-service-open-brief]');if(openTrigger){const projectId=openTrigger.dataset.quoteProjectContext||'';openQuotePanel(projectId?{sourceContext:{type:'project_cta',project_id:projectId,url:location.href}}:{});return;}if(event.target.closest('[data-quote-close]')){closeQuotePanel();return;}const remove=event.target.closest('[data-quote-remove]');if(remove){removeQuoteItem(remove.dataset.quoteRemove);return;}if(event.target.closest('[data-quote-clear]')){clearQuote();return;}if(event.target.closest('[data-quote-send]')){if(!QUOTE_STATE.items.length){openQuotePanel();return;}finishQuoteRequest();return;}const stepButton=event.target.closest('[data-quote-home-step]');if(stepButton){const target=Number(stepButton.dataset.quoteHomeStep||0);if(target<=QUOTE_RUNTIME.step){QUOTE_RUNTIME.error='';QUOTE_RUNTIME.step=target;renderQuoteHome();}return;}if(event.target.closest('[data-quote-home-back]')){QUOTE_RUNTIME.error='';QUOTE_RUNTIME.step=Math.max(0,QUOTE_RUNTIME.step-1);renderQuoteHome();return;}if(event.target.closest('[data-quote-home-next]')){quoteLeadFromDom();const error=quoteHomeStepValidation();if(error){QUOTE_RUNTIME.error=error;renderQuoteHome();return;}QUOTE_RUNTIME.error='';QUOTE_RUNTIME.step=Math.min(3,QUOTE_RUNTIME.step+1);renderQuoteHome();return;}if(event.target.closest('[data-quote-home-submit]')){finishQuoteRequest();return;}});document.addEventListener('input',(event)=>{const lineId=event.target.dataset?.quoteQuantity||event.target.dataset?.quoteNote||'';if(lineId){const line=QUOTE_STATE.items.find((row)=>String(row.id)===String(lineId));if(!line)return;if(event.target.dataset.quoteQuantity){line.quantity=Math.max(1,Math.min(99,Number(event.target.value)||1));persistQuoteStateQuiet();refreshQuoteComputedUi(line.id);return;}if(event.target.dataset.quoteNote!==undefined){line.note=String(event.target.value||'').slice(0,1200);persistQuoteStateQuiet();return;}}const leadMap={quoteLeadNameCompany:'name_company',quoteLeadEmail:'email',quoteLeadWhatsapp:'whatsapp',quoteLeadTimeline:'timeline',quoteLeadDetails:'details',homeQuoteNameCompany:'name_company',homeQuoteEmail:'email',homeQuoteWhatsapp:'whatsapp',homeQuoteTimeline:'timeline',homeQuoteDetails:'details'};const field=leadMap[event.target.id];if(field){QUOTE_STATE.lead[field]=String(event.target.value||'').slice(0,2000);if(field==='name_company'){QUOTE_STATE.lead.name=QUOTE_STATE.lead.name_company;QUOTE_STATE.lead.company='';}try{localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify({...QUOTE_STATE,updated_at:new Date().toISOString()}));}catch(_){}}});document.addEventListener('change',(event)=>{const packageId=event.target.dataset?.quotePackage;const quantityId=event.target.dataset?.quoteQuantity;if(quantityId){const line=QUOTE_STATE.items.find((row)=>String(row.id)===String(quantityId));if(line){line.quantity=Math.max(1,Math.min(99,Number(event.target.value)||1));saveQuoteState();}return;}if(!packageId)return;const line=QUOTE_STATE.items.find((row)=>String(row.id)===String(packageId));if(!line)return;const record=quoteServiceRecord(line.service_id);line.package_id=record&&quotePackageRecord(record.item,event.target.value)?event.target.value:'';saveQuoteState();});addEventListener('keydown',(event)=>{if(event.key==='Escape'&&$('#globalQuotePanel')?.classList.contains('is-open'))closeQuotePanel();});}
let SERVICE_CATALOG_NAV_BOUND=false;
function bindServiceCatalogNavigation(){if(SERVICE_CATALOG_NAV_BOUND)return;SERVICE_CATALOG_NAV_BOUND=true;const go=(event)=>{const card=event.target.closest?.('.service-price-card[data-service-detail-href]');if(!card)return;if(event.target.closest('a,button,input,select,textarea,label'))return;if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;if(event.type==='keydown')event.preventDefault();location.href=card.dataset.serviceDetailHref;};document.addEventListener('click',go);document.addEventListener('keydown',go);}
function bindServiceCommerce(){bindQuoteEvents();bindServiceCatalogNavigation();updateServiceQuoteUI();}
function servicePageBlocks(category,item){
  const config=servicesConfig(),slug=canonicalRouteSlug(item?.id||item?.title||'servico');const source=Array.isArray(item?.blocks)?item.blocks:[{id:`${slug}-hero`,type:'service_hero',visible:true},{id:`${slug}-overview`,type:'text',visible:true,eyebrow:'Sobre o serviço'},{id:`${slug}-benefits`,type:'service_benefits',visible:true,eyebrow:'Benefícios',title:'Por que este serviço',items:[]},{id:`${slug}-deliverables`,type:'service_deliverables',visible:true,eyebrow:'Entregáveis',title:'O que está incluído',items:[]},{id:`${slug}-pricing`,type:'service_pricing',visible:true,eyebrow:'Investimento',title:'Escopo comercial'},{id:`${slug}-process`,type:'process',visible:true,eyebrow:'Processo',title:'Como o projeto acontece'},{id:`${slug}-cases`,type:'related_projects',visible:Array.isArray(item.related_projects)&&item.related_projects.length>0,eyebrow:'Cases',title:'Projetos relacionados',items:item.related_projects||[],columns:'3',max_items:6,card_style:'editorial',show_category:true},{id:`${slug}-cta`,type:'cta',visible:true,eyebrow:'Vamos conversar',title:'Pronto para começar?',body:'Conte o que você precisa e receba uma proposta adequada ao projeto.'}];
  return source.filter(Boolean).map((raw)=>{const block=normalizeSharedPublicBlock(raw);if(block.type==='text'){block.title=block.title||item.title||'Serviço';block.body=block.body||item.description||item.page_intro||'';}if(block.type==='process'&&!String(block.body||'').trim()){block.body=(Array.isArray(raw.items)&&raw.items.length?raw.items:(item.process_steps?.length?item.process_steps:config.process_steps||[])).filter(Boolean).map((value)=>`${value} |`).join('\n');}if(block.type==='accordion'&&!String(block.body||'').trim()){block.body=(raw.items||item.faq||[]).map((row)=>typeof row==='object'?`${row.question||''} | ${row.answer||''}`:String(row||'')).join('\n');}return block;}).sort((a,b)=>Number(a.order||0)-Number(b.order||0));
}
function serviceBlockFrame(node,block){applySharedPageBlockFrame(node,block);node.classList.add('service-commercial-section','reveal');node.dataset.serviceBlockId=block.id||'';node.dataset.serviceBlockType=block.type||'';return node;}
function serviceBlockHeading(block,defaults={}){const wrap=document.createElement('div');wrap.className='service-commercial-heading';const eyebrow=document.createElement('small');eyebrow.textContent=block.eyebrow||defaults.eyebrow||'';const title=document.createElement('h2');title.textContent=block.title||defaults.title||'';const body=document.createElement('p');body.textContent=block.body||defaults.body||'';if(eyebrow.textContent)wrap.append(eyebrow);if(title.textContent)wrap.append(title);if(body.textContent)wrap.append(body);return wrap;}
function serviceMediaNode(media,{hero=false}={}){if(!media)return null;if(media.type==='video'){const wrap=document.createElement('div');wrap.className='service-commercial-media-wrap';const poster=imageWithFallback(media,[media.thumbnail_url,...(media.thumbnail_candidates||[])],{lazy:!hero,priority:hero?'high':'auto'});poster.classList?.add('service-video-poster');wrap.append(poster);const video=createResilientVideo(media,{autoplay:true,muted:true,loop:true,controls:false,preload:hero?'metadata':'none',className:'service-commercial-video',defer:!hero,metadataReady:false,timeoutMs:45000,exhausted:()=>{video.remove();}});wrap.append(video);if(!hero)bindDeferredAutoplay(video,wrap);return wrap;}return imageWithFallback(media,[media.thumbnail_url,...(media.thumbnail_candidates||[]),media.media_url,...(media.media_candidates||[])],{lazy:!hero,priority:hero?'high':'auto',upgradeUrls:[media.media_url,...(media.media_candidates||[])]});}
const PUBLIC_SERVICE_BLOCK_REGISTRY=Object.freeze({service_hero:true,service_benefits:true,service_deliverables:true,service_pricing:true});
function createServiceCommercialBlock(category,item,block){
  if(!block||block.visible===false)return null;block=normalizeSharedPublicBlock(block);const config=servicesConfig();
  const shared=createSharedPageBlock(block,{defaultTitle:'Pronto para começar?',defaultButtonUrl:serviceWhatsappHref(category,item),defaultButtonLabel:block.button_label||item.cta_label||config.cta_label||'Solicitar orçamento',quoteServiceId:String(item.id||''),mediaResolver:servicePublicMedia,mediaNode:(media)=>serviceMediaNode(media)});
  if(shared){serviceBlockFrame(shared,block);shared.classList.add('service-commercial-shared');return shared;}
  if(!PUBLIC_SERVICE_BLOCK_REGISTRY[block.type])return null;
  let node=document.createElement('section');serviceBlockFrame(node,block);
  if(block.type==='service_hero'){node.classList.add('service-detail-hero');const visual=document.createElement('div');visual.className='service-detail-visual';serviceCategoryVisualSettings(category,visual);const media=servicePublicMedia(block.media_id||item.cover_media_id||category.cover_media_id),mediaNode=serviceMediaNode(media,{hero:true});if(mediaNode)visual.append(mediaNode);else visual.innerHTML=`<span>${esc(category.number||'')}</span><i></i>`;const copy=document.createElement('div');copy.className='service-detail-copy';const back=document.createElement('a');back.className='service-detail-back';back.href=servicesHref(`#service-${category.id}`);back.textContent='← Voltar para serviços';const eyebrow=document.createElement('small');eyebrow.textContent=block.eyebrow||item.page_eyebrow||category.short_title||category.title||'Serviço';const title=document.createElement('h1');title.textContent=block.title||item.page_title||item.title||'Serviço';const intro=document.createElement('p');intro.textContent=block.body||item.page_intro||item.description||'';const price=document.createElement('strong');price.className='service-detail-price';price.textContent=servicePrice(item);copy.append(back,eyebrow,title,intro,price);const facts=document.createElement('div');facts.className='service-detail-facts';if(item.unit)facts.innerHTML+=`<div><small>UNIDADE</small><strong>${esc(item.unit)}</strong></div>`;if(config.show_deadlines!==false&&item.deadline)facts.innerHTML+=`<div><small>PRAZO</small><strong>${esc(item.deadline)}</strong></div>`;if(config.show_revisions!==false)facts.innerHTML+=`<div><small>REVISÕES</small><strong>${Number(item.revisions||0)}</strong></div>`;copy.append(facts);const actions=document.createElement('div');actions.className='service-detail-actions';let primary;if(quoteEnabled()){primary=document.createElement('button');primary.type='button';primary.dataset.quoteAddService=String(item.id||'');primary.textContent=item.cta_label||config.quote_item_action_label||'Adicionar ao orçamento';}else{primary=document.createElement('a');primary.href=serviceWhatsappHref(category,item);primary.target='_blank';primary.rel='noopener';primary.textContent=item.cta_label||config.cta_label||'Solicitar orçamento';}const catalog=document.createElement('a');catalog.href=servicesHref(`#service-${category.id}`);catalog.textContent='Ver catálogo completo';actions.append(primary,catalog);copy.append(actions);node.append(visual,copy);return node;}
  if(block.type==='service_benefits'||block.type==='service_deliverables'){const source=Array.isArray(block.items)&&block.items.length?block.items:(block.type==='service_benefits'?(item.benefits?.length?item.benefits:item.deliverables||[]):item.deliverables||[]);node.classList.add('service-commercial-list');node.append(serviceBlockHeading(block,{eyebrow:block.type==='service_benefits'?'Benefícios':'Entregáveis',title:block.type==='service_benefits'?'Por que este serviço':'O que está incluído'}));const list=document.createElement('ul');source.filter(Boolean).forEach((value)=>{const li=document.createElement('li');li.textContent=value;list.append(li);});if(list.children.length)node.append(list);return node;}
  if(block.type==='service_pricing'){node.classList.add('service-commercial-pricing');node.append(serviceBlockHeading(block,{eyebrow:'Investimento',title:'Escopo comercial'}));const packages=Array.isArray(item.packages)?item.packages.filter(Boolean):[];if(packages.length){const packageGrid=document.createElement('div');packageGrid.className='service-package-grid';packages.forEach((pkg,index)=>{const card=document.createElement('article');card.className='service-package-card';const price=quoteLinePriceLabel(item,pkg,1),deadline=String(pkg.deadline||item.deadline||''),revisions=pkg.revisions==null?Number(item.revisions||0):Number(pkg.revisions||0);card.innerHTML=`<small>${String(index+1).padStart(2,'0')}</small><h3>${esc(pkg.label||'Pacote')}</h3><strong>${esc(price)}</strong>${pkg.description?`<p>${esc(pkg.description)}</p>`:''}<div class="service-package-meta">${pkg.unit||item.unit?`<span>${esc(pkg.unit||item.unit)}</span>`:''}${config.show_deadlines!==false&&deadline?`<span>${esc(deadline)}</span>`:''}${config.show_revisions!==false?`<span>${revisions} ${revisions===1?'revisão':'revisões'}</span>`:''}</div>`;const deliverables=document.createElement('ul');(pkg.deliverables||[]).forEach((value)=>{const li=document.createElement('li');li.textContent=value;deliverables.append(li);});if(deliverables.children.length)card.append(deliverables);let action;if(quoteEnabled()){action=document.createElement('button');action.type='button';action.dataset.quoteAddService=String(item.id||'');action.dataset.quotePackageId=String(pkg.id||'');action.textContent=config.quote_item_action_label||'Adicionar ao orçamento';}else{action=document.createElement('a');action.href=serviceWhatsappHref(category,item,`Pacote: ${pkg.label||''}`);action.target='_blank';action.rel='noopener';action.textContent=item.cta_label||config.cta_label||'Solicitar orçamento';}action.className='service-package-action';card.append(action);packageGrid.append(card);});node.append(packageGrid);return node;}const grid=document.createElement('div');grid.className='service-commercial-facts';grid.innerHTML=`<article><small>INVESTIMENTO</small><strong>${esc(servicePrice(item))}</strong></article>${item.unit?`<article><small>UNIDADE</small><strong>${esc(item.unit)}</strong></article>`:''}${config.show_deadlines!==false&&item.deadline?`<article><small>PRAZO</small><strong>${esc(item.deadline)}</strong></article>`:''}${config.show_revisions!==false?`<article><small>REVISÕES</small><strong>${Number(item.revisions||0)}</strong></article>`:''}`;node.append(grid);return node;}
  return null;
}
function renderServiceDetailPage(category,item){$('#filters')?.setAttribute('hidden','');
  const root=$('#customPageRoot'),main=$('#top');if(!root||!main)return;['hero','introBlock','lettering','projectsBlock','about','contact'].forEach((id)=>{const node=$('#'+id);if(node)node.hidden=true;});root.hidden=false;root.replaceChildren();root.className='service-detail-page service-commercial-page';root.style.setProperty('--service-accent',category?.accent||'var(--accent)');document.body.dataset.page='service-detail';document.title=`${item.page_title||item.title||'Serviço'} | ${DATA.identity?.studio_name||'Mensagem Studio'}`;
  const blocks=servicePageBlocks(category,item);blocks.forEach((block)=>{const node=createServiceCommercialBlock(category,item,block);if(node)root.append(node);});
  const next=visibleServiceRecords().filter(({item:other})=>other.page_enabled!==false&&String(other.id)!==String(item.id)).slice(0,3);if(next.length){const related=document.createElement('section');related.className='service-detail-related reveal';related.innerHTML='<small>OUTRAS SOLUÇÕES</small><h2>Serviços que podem complementar o projeto</h2>';const grid=document.createElement('div');next.forEach(({category:cat,item:other})=>{const a=document.createElement('a');a.href=serviceDetailHref(other);a.innerHTML=`<span>${esc(cat.short_title||cat.title||'Serviço')}</span><strong>${esc(other.title||'Serviço')}</strong><i>↗</i>`;grid.append(a);});related.append(grid);root.append(related);}bindReveal();tick();
}

function serviceCatalogTools(){const tools=document.createElement('section');tools.className='services-catalog-tools';tools.setAttribute('aria-label','Busca e filtros do catálogo de serviços');tools.innerHTML=`<label class="services-catalog-search"><span>BUSCAR SERVIÇOS</span><span class="services-catalog-search-field"><i aria-hidden="true">⌕</i><input type="search" data-service-catalog-search placeholder="Pesquise vídeo, branding, campanha…" autocomplete="off"></span></label><div class="services-catalog-modes" role="group" aria-label="Filtro do catálogo"><button type="button" class="is-active" aria-pressed="true" data-service-catalog-mode="all">Todos</button><button type="button" aria-pressed="false" data-service-catalog-mode="featured">Mais procurados</button></div><strong class="services-catalog-result" data-service-catalog-result aria-live="polite"></strong>`;return tools;}
function bindServiceCatalogFilters(root){const search=root.querySelector('[data-service-catalog-search]'),buttons=[...root.querySelectorAll('[data-service-catalog-mode]')],result=root.querySelector('[data-service-catalog-result]');if(!search)return;let mode='all';const apply=()=>{const rawQuery=String(search.value||'').trim(),query=rawQuery.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();let visible=0;root.querySelectorAll('.service-area-card').forEach((category)=>{let categoryVisible=0;category.querySelectorAll('.service-price-card').forEach((card)=>{const matchText=!query||String(card.dataset.serviceSearch||'').includes(query),matchMode=mode!=='featured'||card.dataset.serviceFeatured==='1',show=matchText&&matchMode;card.hidden=!show;if(show){visible+=1;categoryVisible+=1;}});category.hidden=categoryVisible===0;});if(result)result.textContent=rawQuery?`${visible} ${visible===1?'serviço encontrado':'serviços encontrados'} para “${rawQuery}”`:`${visible} ${visible===1?'serviço encontrado':'serviços encontrados'}`;};search.addEventListener('input',apply);buttons.forEach((button)=>button.addEventListener('click',()=>{mode=button.dataset.serviceCatalogMode||'all';buttons.forEach((candidate)=>{const active=candidate===button;candidate.classList.toggle('is-active',active);candidate.setAttribute('aria-pressed',active?'true':'false');});apply();}));apply();}

function renderServicesPage(){$('#filters')?.setAttribute('hidden','');
  const config=servicesConfig(),root=$('#customPageRoot'),main=$('#top');if(!root||!main)return;['hero','introBlock','lettering','projectsBlock','about','contact'].forEach((id)=>{const node=$('#'+id);if(node)node.hidden=true;});root.hidden=false;root.replaceChildren();root.className='services-public-page';root.dataset.serviceLayout=config.layout_style||'editorial';root.dataset.catalogDensity=config.catalog_density||'comfortable';root.dataset.coverRatio=config.cover_ratio||'portrait';document.body.dataset.page='services';document.title=`${config.title||'Serviços'} | ${DATA.identity?.studio_name||'Mensagem Studio'}`;
  const categories=visibleServiceCategories(),options=categories.reduce((total,category)=>total+visibleServiceItems(category).length,0),head=document.createElement('section');head.className='services-public-head reveal';const headCopy=document.createElement('div');const eyebrow=document.createElement('small');eyebrow.textContent=config.eyebrow||'Soluções criativas';const title=document.createElement('h1');title.textContent=config.title||'Serviços profissionais';const intro=document.createElement('p');intro.textContent=config.intro||'';const actions=document.createElement('div');actions.className='services-head-actions';const useQuote=quoteEnabled()&&config.brief_visible!==false,primary=document.createElement(useQuote?'button':'a');if(useQuote){primary.type='button';primary.dataset.serviceOpenBrief='';primary.textContent=config.brief_button||'Abrir orçamento';}else{primary.href=serviceWhatsappHref(null,null);primary.target='_blank';primary.rel='noopener';primary.textContent=config.cta_label||'Solicitar orçamento';}const note=document.createElement('span');note.textContent=config.response_note||'';actions.append(primary,note);headCopy.append(eyebrow,title,intro,actions);const stats=document.createElement('dl');stats.className='services-head-stats';stats.innerHTML=`<div><dt>${categories.length}</dt><dd>áreas criativas</dd></div><div><dt>${options}</dt><dd>soluções comerciais</dd></div><div><dt>BR</dt><dd>atendimento remoto</dd></div>`;head.append(headCopy,stats);root.append(head);
  const nav=document.createElement('nav');nav.className='services-jump-nav horizontal-context-nav';nav.setAttribute('aria-label','Áreas de serviços');visibleServiceCategories().forEach((category)=>{const a=document.createElement('a');a.href=`#service-${category.id}`;a.textContent=category.short_title||category.title;nav.append(a);});root.append(nav,serviceCatalogTools());
  const grid=document.createElement('div');grid.className='services-category-stack';visibleServiceCategories().forEach((category,index)=>grid.append(serviceCategoryCard(category,index)));root.append(grid);
  const process=serviceProcessSection();if(process)root.append(process);
  if(config.price_note){const note=document.createElement('p');note.className='services-price-note';note.textContent=config.price_note;root.append(note);}
  const quote=serviceQuoteBuilder();if(quote)root.append(quote);
  const cta=document.createElement('section');cta.className='services-final-cta reveal';const ctaCopy=document.createElement('div');const ctaTitle=document.createElement('h2');ctaTitle.textContent=config.cta_title||'Vamos construir algo relevante?';const ctaBody=document.createElement('p');ctaBody.textContent=config.cta_body||'';ctaCopy.append(ctaTitle,ctaBody);const link=document.createElement('a');link.href=serviceWhatsappHref(null,null);link.target='_blank';link.rel='noopener';link.textContent=config.cta_label||'Solicitar orçamento';cta.append(ctaCopy,link);root.append(cta);bindServiceCatalogFilters(root);bindReveal();tick();
  bindServiceCommerce(root);updateServiceQuoteUI();
}
function renderServicesHome(){
  const config=servicesConfig(),section=$('#servicesOverview'),mount=$('#servicesHomeMount');
  if(section)section.hidden=true;
  if(config.visible===false||config.show_on_home===false)return;
  const categories=visibleServiceCategories();if(!categories.length)return;
  let target=mount,host=section;
  if(!target){host=document.createElement('section');host.id='servicesOverview';host.className='services-home-section reveal';host.dataset.owner='site_builder.services';target=document.createElement('div');target.id='servicesHomeMount';target.className='services-home-mount';host.append(target);const before=[$('#about'),$('#contact')].find(node=>node&&!node.hidden&&String(node.dataset.homeBlockId||''))||null;(before?.parentNode||$('#top'))?.insertBefore(host,before);}
  host.hidden=false;target.replaceChildren();
  const head=document.createElement('div');head.className='services-home-head';const copy=document.createElement('div');const eyebrow=document.createElement('small');eyebrow.textContent=config.eyebrow||'Serviços';const title=document.createElement('h2');title.textContent=config.home_title||config.title||'Serviços profissionais';const intro=document.createElement('p');intro.textContent=config.home_intro||config.intro||'';copy.append(eyebrow,title,intro);const link=document.createElement('a');link.href=servicesHref();link.textContent='Ver serviços e valores';head.append(copy,link);target.append(head);
  const grid=document.createElement('div');grid.className='services-home-grid';categories.forEach((category,index)=>{const card=document.createElement('article');card.className='service-home-card';card.style.setProperty('--service-accent',category.accent||'var(--accent)');const visualSettings=serviceCategoryVisualSettings(category,card),media=visualSettings.show?resolvedServiceCategoryMedia(category):null;if(media){card.classList.add('has-cover');const visual=document.createElement('span');visual.className='service-home-card-visual';serviceCategoryVisualSettings(category,visual);visual.style.setProperty('--service-cover-overlay',String(Math.max(.52,visualSettings.overlay)));if(media.type==='video'){const posterNode=imageWithFallback(media,[media.thumbnail_url,...(media.thumbnail_candidates||[]),media.preview_url,...(media.preview_candidates||[])],{lazy:true,upgradeUrls:[media.preview_url,...(media.preview_candidates||[])]});posterNode.classList?.add('service-video-poster');visual.append(posterNode);const video=createResilientVideo(media,{autoplay:true,muted:true,loop:true,controls:false,preload:'none',className:'service-home-preview-video',defer:true,metadataReady:false,timeoutMs:45000,exhausted:()=>{video.remove();}});visual.append(video);bindDeferredAutoplay(video,card);}else visual.append(imageWithFallback(media,[media.thumbnail_url,...(media.thumbnail_candidates||[]),media.media_url,...(media.media_candidates||[])],{lazy:true,upgradeUrls:[media.media_url,...(media.media_candidates||[])]}));card.append(visual);}const main=document.createElement('a');main.className='service-home-card-main';main.href=servicesHref(`#service-${category.id}`);const number=document.createElement('span');number.textContent=category.number||String(index+1).padStart(2,'0');const name=document.createElement('strong');name.textContent=category.title||'Serviço';const body=document.createElement('p');body.textContent=category.description||'';const arrow=document.createElement('i');arrow.textContent='↗';main.append(number,name,body,arrow);card.append(main);if(quoteEnabled()){const first=visibleServiceItems(category)[0];if(first){const add=document.createElement('button');add.type='button';add.className='service-home-quote-add';add.dataset.serviceSelect=serviceSelectionKey(category,first);add.textContent=config.quote_item_action_label||'Adicionar ao orçamento';card.append(add);}}grid.append(card);});target.append(grid);bindReveal();placeHomeHorizontalNavigation();
}
function publicCustomPages(){const pages=DATA.site_builder?.custom_pages||{};return Object.values(pages).filter((page)=>page&&page.visible!==false);}
function normalizePath(value=''){return String(value||'').replace(/^https?:\/\/[^/]+/i,'').replace(/^\/+|\/+$/g,'').toLowerCase();}
function currentCustomPage(){const path=requestedRoutePath();if(!path)return null;return publicCustomPages().find((page)=>normalizePath(page.full_path||page.slug)===path)||null;}
function renderCustomPage(page){$('#filters')?.setAttribute('hidden','');
  const root=$('#customPageRoot'),main=$('#top');if(!root||!main)return;['hero','introBlock','lettering','projectsBlock','about','contact'].forEach((id)=>{const node=$('#'+id);if(node)node.hidden=true;});root.hidden=false;root.replaceChildren();root.dataset.pageId=page.id||'';
  const head=document.createElement('header');head.className='custom-public-page-head reveal';if(page.eyebrow){const e=document.createElement('small');e.textContent=page.eyebrow;head.append(e);}const h=document.createElement('h1');h.textContent=page.title||'Página';head.append(h);if(page.intro){const p=document.createElement('p');p.textContent=page.intro;head.append(p);}root.append(head);
  (Array.isArray(page.sections)?page.sections:[]).forEach((block)=>{const node=createCustomHomeBlock(block);if(node){node.classList.remove('home-modular-instance');node.classList.add('custom-public-page-section');root.append(node);}});bindReveal();tick();
}

function closeSideMenu() {
  const menu=$('#sideMenu');if(!menu)return;menu.classList.remove('is-open');menu.setAttribute('aria-hidden','true');$('#siteMenuTrigger')?.setAttribute('aria-expanded','false');document.body.classList.remove('menu-open');
}
function openSideMenu() {
  const menu=$('#sideMenu');if(!menu||!document.body.classList.contains('side-menu-enabled'))return;menu.classList.add('is-open');menu.setAttribute('aria-hidden','false');$('#siteMenuTrigger')?.setAttribute('aria-expanded','true');document.body.classList.add('menu-open');
}
function renderSideNavigation() {
  const root=$('#sideMenuLinks');if(!root)return;
  const navigation=DATA.site_builder?.navigation||{};
  const mobileDrawer = DATA.site_builder?.global?.header?.mobile_mode === 'drawer';
  $('#siteMenuTrigger')?.toggleAttribute('hidden', navigation.side_menu_enabled===false && !mobileDrawer);
  root.replaceChildren();
  const menuItems=publicMenuItems('side');
  const depthFor=(item)=>{let depth=0,parent=item.parent_id,seen=new Set();while(parent&&!seen.has(parent)){seen.add(parent);const p=menuItems.find((x)=>x.id===parent);if(!p)break;depth+=1;parent=p.parent_id;}return depth;};
  menuItems.forEach((item)=>{
    const button=document.createElement('button');button.type='button';button.className='side-menu-link';button.style.setProperty('--menu-depth',String(depthFor(item)));button.innerHTML=`<span>${esc(item.label||'Página')}</span><b>↗</b>`;button.dataset.target=publicRouteHref(item.target||'#');if(item.filter_id)button.dataset.filterId=String(item.filter_id);button.dataset.menuItemId=String(item.id||'');root.append(button);
  });
}

function sectionForId(sectionId) {
  return (DATA.sections || []).find((item) => String(item.id || '') === String(sectionId)) || null;
}

function projectsForSection(sectionId) {
  return (DATA.projects || []).filter((project) => {
    if (project.hidden) return false;
    return String(project.section_id || project.physical_category_id || project.category_id || '') === String(sectionId);
  });
}

function sectionPageConfig(sectionId) {
  const section = sectionForId(sectionId);
  if (!section) return null;
  const source = DATA.site_builder?.section_pages?.[sectionId] || {};
  const headerId = `section-${sectionId}-header`;
  const projectsId = `section-${sectionId}-projects`;
  const blocks = Array.isArray(source.blocks) ? source.blocks.filter((block) => block && block.type).map((block) => ({ ...block })) : [];
  if (!blocks.some((block) => String(block.id || '') === headerId)) blocks.unshift({ id:headerId, type:'section_header', visible:true, core:true });
  if (!blocks.some((block) => String(block.id || '') === projectsId)) blocks.push({ id:projectsId, type:'section_projects', visible:true, core:true, grid_columns:'2', card_ratio:'16x9' });
  return {
    ...source,
    enabled: source.enabled !== false,
    header_visible: source.header_visible !== false,
    eyebrow: Object.prototype.hasOwnProperty.call(source,'eyebrow') ? String(source.eyebrow??'') : 'Categoria',
    title: Object.prototype.hasOwnProperty.call(source,'title') ? String(source.title??'') : String(section.title||'Categoria'),
    body: source.body || '',
    blocks,
  };
}

function createSectionHeaderBlock(sectionId, page, block = {}) {
  const section = sectionForId(sectionId);
  if (!section) return null;
  const node = document.createElement('section');
  node.className = 'section-page-header reveal';
  applyHomeSectionFrame(node, block);
  const meta = document.createElement('div'); meta.className = 'section-page-meta';
  if(page.header_visible===false || (!String(page.eyebrow||'').trim() && !String(page.title||'').trim() && !String(page.body||'').trim())) return null;
  const eyebrow = document.createElement('small'); eyebrow.textContent = String(page.eyebrow||''); eyebrow.hidden=!eyebrow.textContent.trim();
  const count = document.createElement('span'); const total = projectsForSection(sectionId).length; count.textContent = `${total} ${total === 1 ? 'projeto' : 'projetos'}`;
  meta.append(eyebrow, count);
  const title = document.createElement('h2'); title.textContent = String(page.title||''); title.hidden=!title.textContent.trim(); title.dataset.parallaxText='14';
  node.append(meta, title);
  if (page.body) { const body=document.createElement('p'); body.textContent=page.body; node.append(body); }
  return node;
}

function createSectionProjectsBlock(sectionId, block = {}) {
  const node = document.createElement('section');
  node.className = `section-page-projects reveal sf-grid-cols-${block.grid_columns || '3'} sf-card-ratio-${block.card_ratio || '4x3'} sf-grid-gap-${block.grid_gap || 'normal'}`;
  const list = projectsForSection(sectionId);
  const grid = document.createElement('div'); grid.className = 'grid section-page-grid';
  list.forEach((project, index) => grid.append(card(project, index)));
  if (!list.length) { const empty=document.createElement('div'); empty.className='empty'; empty.textContent='Nenhum projeto publicável nesta categoria.'; node.append(empty); }
  else node.append(grid);
  applyHomeSectionFrame(node,block);
  return node;
}

function createSectionCustomBlock(sectionId, block) {
  const local = projectsForSection(sectionId);
  const prepared = { ...block };
  if (!prepared.project_id && ['showcase','full_media','split','video_feature','spotlight'].includes(prepared.type)) {
    const project = local.find((item) => item.featured) || local.find((item) => item.hero) || local[0];
    if (project) prepared.project_id = project.project_id || project.id;
  }
  if (['horizontal_projects','auto_carousel'].includes(prepared.type) && (!prepared.category_id || prepared.category_id === 'all')) prepared.category_id = sectionId;
  const node = createCustomHomeBlock(prepared);
  if (node) { node.classList.remove('home-modular-instance'); node.classList.add('section-page-custom'); node.dataset.sectionPageBlockId = block.id || ''; }
  return node;
}

function renderSectionPage(sectionId) {
  const root = $('#sectionPage');
  if (!root) return false;
  const page = sectionPageConfig(sectionId);
  if (!page || page.enabled === false) { root.hidden=true; root.replaceChildren(); return false; }
  root.replaceChildren();
  page.blocks.forEach((block) => {
    if (block.visible === false) return;
    let node = null;
    if (block.type === 'section_header') node = createSectionHeaderBlock(sectionId, page, block);
    else if (block.type === 'section_projects') node = createSectionProjectsBlock(sectionId, block);
    else node = createSectionCustomBlock(sectionId, block);
    if (node) { node.dataset.sectionBlockId = block.id || ''; root.append(node); }
  });
  root.hidden = false;
  $('#grid').hidden = true;
  $('#empty').hidden = true;
  setupSectionNavigator((DATA.site_builder||{}).section_navigator||{});
  bindReveal();
  tick();
  return true;
}

function clearSectionPage() {
  const root = $('#sectionPage');
  if (!root) return;
  root.hidden = true;
  root.replaceChildren();
}

function sectionFromLocation() {
  const match = String(location.hash || '').match(/^#section=(.+)$/);
  if (!match) return '';
  try { return decodeURIComponent(match[1]); } catch (_error) { return match[1]; }
}

function updateSectionLocation(id, push = false) {
  const next = id === 'all' ? `${location.pathname}${location.search}` : `#section=${encodeURIComponent(id)}`;
  const current = id === 'all' ? `${location.pathname}${location.search}${location.hash}` : location.hash;
  if ((id === 'all' && !location.hash) || (id !== 'all' && location.hash === next)) return;
  const method = push ? 'pushState' : 'replaceState';
  history[method]({ section:id }, '', next);
}

function appendServicesNavigationLink(filters) {
  const config = servicesConfig();
  if (!filters || config.visible === false) return;
  const link = document.createElement('a');
  link.className = 'filter filter-services-link';
  link.href = servicesHref();
  link.textContent = config.menu_label || 'Serviços';
  link.dataset.kind = 'services';
  link.setAttribute('aria-label', `${link.textContent} · área comercial`);
  filters.append(link);
}

function canonicalPortfolioCategories() {
  const sectionRows = Array.isArray(DATA.sections) ? DATA.sections.filter((item) => item && item.kind !== 'collection') : [];
  const depthOneRows = Array.isArray(DATA.navigation_nodes)
    ? DATA.navigation_nodes.filter((item) => item && Number(item.depth || 0) === 1 && !item.hidden)
    : [];
  const structural = [...sectionRows, ...depthOneRows];
  const configured = Array.isArray(DATA.filters) ? DATA.filters : [];
  const filterMeta = new Map(configured.filter((item) => String(item?.id || '') !== 'all').map((item, index) => [String(item.id), {...item, _filter_index:index}]));
  const editorOrder = Array.isArray(DATA.site_builder?.projects?.filters?.order) ? DATA.site_builder.projects.filters.order.map(String) : [];
  const editorRank = new Map(editorOrder.map((id,index)=>[String(id),index]));
  const seen = new Set();
  const categories = [];
  structural.forEach((section, structuralIndex) => {
    const id = String(section?.id || '');
    if (!id || id === 'all' || seen.has(id)) return;
    seen.add(id);
    const meta = filterMeta.get(id) || {};
    if (section.navigation_visible === false || meta.navigation_visible === false) return;
    const explicitRank = editorRank.has(id) ? Number(editorRank.get(id)) : 999999;
    const filterRank = Number.isFinite(Number(meta._filter_index)) ? Number(meta._filter_index) : 999999;
    categories.push({
      id,
      title: meta.title || section.title || section.name || 'Categoria',
      kind: 'section',
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : structuralIndex,
      _editor_rank: explicitRank,
      _filter_index: filterRank,
    });
  });
  categories.sort((a,b) => (a._editor_rank-b._editor_rank) || (a._filter_index-b._filter_index) || (a.order-b.order) || String(a.title).localeCompare(String(b.title),'pt-BR'));
  return categories.map(({_editor_rank,_filter_index,...item}) => item);
}

function publicPortfolioFilterItems() {
  const filterCfg = DATA.site_builder?.projects?.filters || {};
  const configured = Array.isArray(DATA.filters) ? DATA.filters : [];
  const configuredAll = configured.find((item) => String(item?.id || '') === 'all');
  const items = [];
  if (filterCfg.all_visible !== false) items.push({id:'all', title:configuredAll?.title || filterCfg.all_label || 'Todos', kind:'all'});
  items.push(...canonicalPortfolioCategories());
  return items;
}

function renderFilters() {
  const filters = $('#filters');
  if (!filters) return;
  filters.replaceChildren();
  publicPortfolioFilterItems().forEach((item) => filters.append(filterButton(item.title || (item.id === 'all' ? 'Todos' : 'Categoria'), item.id)));
  appendServicesNavigationLink(filters);
  placeHomeHorizontalNavigation();
}

function filterButton(label, id) {
  const button = document.createElement('button');
  button.className = 'filter';
  button.textContent = label;
  button.dataset.id = id;
  button.addEventListener('click', () => select(id, true));
  return button;
}

function navigationMap() {
  return new Map((DATA.navigation_nodes || []).map((node) => [String(node.id || ''), node]));
}

function navigationAncestors(node) {
  const map = navigationMap();
  const chain = [];
  let current = node;
  const seen = new Set();
  while (current && current.id && !seen.has(String(current.id))) {
    seen.add(String(current.id));
    chain.unshift(current);
    current = current.parent_id ? map.get(String(current.parent_id)) : null;
  }
  return chain;
}

function setDriveBreadcrumb(nodes = []) {
  const root = $('#driveBreadcrumb');
  if (!root) return;
  root.replaceChildren();
  const all = document.createElement('button');
  all.type = 'button'; all.textContent = 'TODOS'; all.className = 'drive-breadcrumb-item';
  all.addEventListener('click', () => select('all', true));
  root.append(all);
  nodes.forEach((node) => {
    const sep = document.createElement('span'); sep.textContent = '/'; sep.setAttribute('aria-hidden', 'true'); root.append(sep);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'drive-breadcrumb-item'; button.textContent = node.title || 'Pasta';
    button.addEventListener('click', () => node.depth === 1 ? select(node.id, true) : openNavigationNode(node));
    root.append(button);
  });
}

function navigationNodeAsProject(node) {
  return {
    ...node,
    id: node.id,
    project_id: node.project_id || `nav:${node.id}`,
    gallery_id: node.gallery_id || `nav:${node.id}`,
    gallery_title: node.title || 'Pasta',
    section_title: (node.path || [])[0] || 'Portfólio',
    category: (node.path || [])[0] || 'Portfólio',
    gallery_items: Array.isArray(node.gallery_items) ? node.gallery_items : [],
    cover_media_id: node.cover_media_id || (node.gallery_items || [])[0]?.id || '',
    description: node.description || '',
  };
}

function openNavigationNode(node) {
  if (!node) return;
  if (Number(node.depth || 0) === 1) { select(node.id, true); return; }
  setDriveBreadcrumb(navigationAncestors(node));
  openProjectDetail(navigationNodeAsProject(node));
}

function navigationCard(node, index) {
  const project = navigationNodeAsProject(node);
  const button = card(project, index, () => Number(node.depth || 0) === 1 ? select(node.id, true) : openNavigationNode(node));
  button.classList.add('folder-card');
  button.setAttribute('aria-label', `Abrir pasta ${node.title || ''}`.trim());
  const badge = button.querySelector('.type');
  if (badge) {
    const childCount = Number(node.child_folder_count || 0);
    const mediaCount = Number(node.gallery_count || 0);
    badge.textContent = Number(node.depth || 0) === 1 ? 'Seção' : (childCount ? `${childCount} subpastas` : `${mediaCount} ${mediaCount === 1 ? 'mídia' : 'mídias'}`);
  }
  const copy = button.querySelector('.copy p');
  if (copy && !node.description) copy.textContent = (node.path || []).join(' / ');
  return button;
}

function select(id, pushHistory = false) {
  active = id;
  closeProjectDetail(false);
  [...$('#filters').children].forEach((button) => button.classList.toggle('is-active', button.dataset.id === id));
  const isAll = id === 'all';
  document.body.dataset.portfolioScope = isAll ? 'overview' : 'collection';
  const navigation = isAll ? (DATA.navigation_nodes || []).filter((node) => !node.hidden && Number(node.depth || 0) === 1) : [];
  const list = isAll ? [] : (DATA.projects || []).filter((project) => {
    if (project.hidden) return false;
    const sectionId = project.section_id || project.physical_category_id || project.category_id;
    return String(sectionId) === String(id);
  });
  const grid = $('#grid');
  const empty = $('#empty');
  const heading = $('#portfolioHeading');
  const headingBlock = publicHomeBlocks().find((block)=>block.type==='projects_header');
  if (heading) heading.hidden = !isAll || DATA.site_builder?.projects?.visible === false || headingBlock?.visible === false || !String(headingBlock?.eyebrow||headingBlock?.title||headingBlock?.body||'').trim();
  grid.replaceChildren();
  clearSectionPage();
  const activeSectionNode = (DATA.navigation_nodes || []).find((node) => Number(node.depth || 0) === 1 && String(node.id) === String(id));
  setDriveBreadcrumb(isAll ? [] : (activeSectionNode ? [activeSectionNode] : []));
  const pageRendered = !isAll && renderSectionPage(id);
  if (!pageRendered) {
    grid.hidden = false;
    const total = isAll ? navigation.length : list.length;
    empty.hidden = Boolean(total);
    if (!total && !isAll) empty.textContent = 'Nenhuma pasta ou mídia publicável nesta seção.';
    else if (!total) empty.textContent = 'Nenhuma pasta disponível.';
    if (isAll) navigation.forEach((node, index) => grid.append(navigationCard(node, index)));
    else list.forEach((project, index) => grid.append(card(project, index)));
    bindReveal();
  }
  updateSectionLocation(id, pushHistory);
  setupSectionNavigator((DATA.site_builder||{}).section_navigator||{});
}
function uniqueUrls(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function mediaPlaceholder(project, { unavailable = false } = {}) {
  const placeholder = document.createElement('span');
  const folder = project?.type === 'folder';
  placeholder.className = `media-placeholder ${unavailable ? 'is-unavailable' : 'is-loading'}`;
  if (folder) { placeholder.classList.add('is-folder'); placeholder.textContent = 'PASTA'; }
  else if (unavailable) { placeholder.innerHTML = '<i aria-hidden="true">↗</i><small>Sem prévia</small>'; }
  else { placeholder.setAttribute('aria-hidden', 'true'); placeholder.innerHTML = '<i></i>'; }
  return placeholder;
}

function armImageTimeout(image, next, timeoutMs) {
  let timer = 0;
  const arm = () => { clearTimeout(timer); if (!image.complete) timer = setTimeout(next, timeoutMs); };
  const clear = () => clearTimeout(timer);
  if (image.loading === 'lazy' && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, io) => {
      if (entries.some((entry) => entry.isIntersecting)) { arm(); io.disconnect(); }
    }, { rootMargin: MEDIA_NEAR_VIEWPORT_MARGIN, threshold: 0 });
    observer.observe(image);
  } else arm();
  image.addEventListener('load', clear);
  image.addEventListener('error', clear);
  return { arm, clear };
}

function queueImageUpgrade(image, urls = []) {
  const candidates = uniqueUrls(urls).filter((url) => url && url !== image.currentSrc && url !== image.src && !mediaUrlRecentlyFailed(url));
  if (!candidates.length) return;
  const upgrade = () => {
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length || !image.isConnected) return;
      const url = candidates[index++];
      const probe = new Image();
      probe.decoding = 'async';
      probe.alt = image.alt || '';
      probe.className = image.className;
      probe.loading = 'eager';
      if ('fetchPriority' in probe) probe.fetchPriority = 'low';
      probe.onload = async () => {
        try { if (probe.decode) await probe.decode(); } catch (_) {}
        if (!image.isConnected) return;
        probe.dataset.quality = 'full';
        probe.style.cssText = image.style.cssText;
        image.replaceWith(probe);
      };
      probe.onerror = () => { markMediaUrlFailed(url); tryNext(); };
      probe.src = url;
    };
    tryNext();
  };
  if (image.loading === 'eager') setTimeout(upgrade, 80);
  else if ('requestIdleCallback' in window) requestIdleCallback(upgrade, { timeout: 1200 });
  else setTimeout(upgrade, 180);
}

function imageWithFallback(project, urls, { lazy = true, priority = 'auto', timeoutMs = MEDIA_LOAD_TIMEOUT_MS, upgradeUrls = [] } = {}) {
  const allCandidates = uniqueUrls(urls);
  const candidates = [
    ...allCandidates.filter((url) => !mediaUrlRecentlyFailed(url)),
    ...allCandidates.filter((url) => mediaUrlRecentlyFailed(url)),
  ];
  if (!candidates.length) return mediaPlaceholder(project, { unavailable: true });
  const image = document.createElement('img');
  if (project?.hosted_poster) image.dataset.stablePoster = '1';
  image.className = 'media-progressive-image is-loading';
  image.loading = lazy ? 'lazy' : 'eager';
  image.decoding = 'async';
  if ('fetchPriority' in image) image.fetchPriority = priority;
  image.alt = project?.title || '';
  let index = 0;
  let timeoutHandle = null;
  const clearTimer = () => { if (timeoutHandle?.clear) timeoutHandle.clear(); timeoutHandle = null; };
  const next = (reason = 'error') => {
    clearTimer();
    const failed = image.currentSrc || image.src;
    if (failed) { markMediaUrlFailed(failed); mediaDiagnostic(project,'failed',failed,reason); }
    if (index >= candidates.length) { image.replaceWith(mediaPlaceholder(project, { unavailable: true })); return; }
    const url=candidates[index++];
    if(index>1) mediaDiagnostic(project,'fallback',url,`candidate-${index}`);
    image.src = url;
    timeoutHandle = armImageTimeout(image, () => next('timeout'), timeoutMs);
  };
  image.addEventListener('load', () => {
    clearTimer(); image.classList.remove('is-loading'); image.classList.add('is-loaded');
    mediaDiagnostic(project,'loaded',image.currentSrc||image.src,`candidate-${Math.max(1,index)}`);
    queueMicrotask(() => image.parentElement?.classList.add('media-loaded'));
    if (upgradeUrls.length) queueImageUpgrade(image, upgradeUrls);
  });
  image.addEventListener('error', () => next('browser-error'));
  next('initial');
  return image;
}

function projectCoverRecord(project = {}) {
  const items = Array.isArray(project.gallery_items) ? project.gallery_items.filter(Boolean) : [];
  const direct = uniqueUrls([project.thumbnail_url, ...(project.thumbnail_candidates || []), project.media_url, ...(project.media_candidates || []), project.preview_url, ...(project.preview_candidates || [])]);
  if (direct.length) return project;
  const wanted = String(project.cover_media_id || '');
  const cover = items.find((item) => String(item?.id || '') === wanted)
    || items.find((item) => uniqueUrls([item?.thumbnail_url, ...(item?.thumbnail_candidates || []), item?.media_url, ...(item?.media_candidates || [])]).length)
    || items[0];
  return cover ? { ...project, ...cover, title: project.title || cover.title || '', project_id: project.project_id || project.id, cover_media_id: cover.id || wanted } : project;
}

function poster(project, { eager = false } = {}) {
  const cover = projectCoverRecord(project);
  const thumbnails = uniqueUrls([cover.thumbnail_url, ...(cover.thumbnail_candidates || [])]);
  const imageUpgrades = cover.type === 'image'
    ? uniqueUrls([cover.preview_url, ...(cover.preview_candidates || []), cover.media_url, ...(cover.media_candidates || [])])
    : uniqueUrls([...(cover.thumbnail_candidates || [])]);
  const primary = thumbnails.length ? thumbnails : (cover.type === 'image' ? imageUpgrades : []);
  return imageWithFallback(cover, primary, {
    lazy: !eager, priority: eager ? 'high' : 'auto', timeoutMs: eager ? 6500 : MEDIA_LOAD_TIMEOUT_MS,
    upgradeUrls: imageUpgrades,
  });
}

function heroAsset(project) {
  return project?.hero_asset && project.hero_asset.type ? { ...project, ...project.hero_asset, title: project.title } : project;
}

function heroCandidates(project) {
  if (project.type === 'image') {
    return uniqueUrls([project.thumbnail_url, ...(project.thumbnail_candidates || []), project.media_url, ...(project.media_candidates || [])]);
  }
  return uniqueUrls([project.thumbnail_url, ...(project.thumbnail_candidates || [])]);
}
function heroUpgradeCandidates(project) {
  return project.type === 'image' ? uniqueUrls([project.media_url, ...(project.media_candidates || [])]) : [];
}

function configuredHeroSlides(heroConfig, visible) {
  const configured = Array.isArray(heroConfig.slides) ? heroConfig.slides : [];
  const assets = DATA.hero_assets || {};
  const output = [];
  const resolve = (mediaId) => {
    const id = String(mediaId || '');
    if (!id) return { owner:null, media:null };
    for (const project of visible) {
      const found = (project.gallery_items || []).find((item) => String(item.id || '') === id);
      if (found) return { owner:project, media:found };
    }
    return { owner:null, media:assets[id] || null };
  };
  configured.forEach((slideConfig) => {
    const mediaId = String(slideConfig?.media_id || '');
    const mobileMediaId = String(slideConfig?.mobile_media_id || '');
    if (!mediaId && !mobileMediaId) return;
    const webResolved = resolve(mediaId || mobileMediaId);
    const mobileResolved = resolve(mobileMediaId);
    const media = webResolved.media;
    if (!media) return;
    const owner = webResolved.owner || mobileResolved.owner;
    const standalone = !owner;
    output.push({
      ...(owner || { id: `hero:${mediaId || mobileMediaId}`, project_id: '', title: media.title || 'Banner', description: media.description || '' }),
      hero_asset: { ...media },
      _hero_mobile_asset: mobileResolved.media ? { ...mobileResolved.media } : null,
      _hero_duration: Math.max(2, Math.min(30, Number(slideConfig.duration || heroConfig.rotation_seconds || 6))),
      _hero_transition_in: (() => { const value = String(slideConfig.transition_in || slideConfig.transition || 'fade'); const migrated = value === 'zoom' ? 'slow_zoom' : value; return ['fade','crossfade','slow_zoom','parallax','slide','reveal'].includes(migrated) ? migrated : 'fade'; })(),
      _hero_transition_out: (() => { const value = String(slideConfig.transition_out || 'crossfade'); const migrated = value === 'zoom' ? 'slow_zoom' : value; return ['fade','crossfade','slow_zoom','parallax','slide','reveal'].includes(migrated) ? migrated : 'crossfade'; })(),
      _hero_intensity: Math.max(0, Math.min(100, Number(slideConfig.intensity ?? 60))),
      _hero_slide_id: String(slideConfig.id || mediaId || mobileMediaId),
      _hero_standalone: standalone,
      _hero_action_type: ['project','section','internal_url','external_url','none'].includes(String(slideConfig.action_type||'project')) ? String(slideConfig.action_type||'project') : 'project',
      _hero_action_project_id: String(slideConfig.project_id || ''),
      _hero_action_url: String(slideConfig.action_url || ''),
      _hero_cta_label: String(slideConfig.cta_label || heroConfig.cta_label || 'Explorar projeto'),
      _hero_focus_x: Math.max(0,Math.min(100,Number(slideConfig.focus_x ?? 50))),
      _hero_focus_y: Math.max(0,Math.min(100,Number(slideConfig.focus_y ?? 50))),
      _hero_zoom: Math.max(1,Math.min(2.2,Number(slideConfig.zoom ?? 1))),
      hero_autoplay: media.type === 'video' && slideConfig.autoplay !== false,
    });
  });
  return output;
}

let HERO_STORY_TIMERS=[];
let HERO_STORY_ACTIVE_SCENE='';
let HERO_STORY_ACTIVE_SLIDE='';
let HERO_STORY_ACTIVE_EXIT='none';
let HERO_STORY_TRANSITION_TOKEN=0;
function normalizedHeroStoryPublic(heroConfig={}){
  const raw=heroConfig.story&&typeof heroConfig.story==='object'?heroConfig.story:{};
  const mode=['slides','timeline','scroll'].includes(String(raw.mode||'slides'))?String(raw.mode||'slides'):'slides';
  const scenes=(Array.isArray(raw.scenes)?raw.scenes:[]).filter((scene)=>scene&&typeof scene==='object'&&scene.enabled!==false).map((scene,index)=>({
    id:String(scene.id||`hero-story-${index}`),slide_id:String(scene.slide_id||''),kicker:String(scene.kicker||''),title:String(scene.title||''),subtitle:String(scene.subtitle||''),cta_label:String(scene.cta_label||''),start_seconds:Math.max(0,Math.min(30,Number(scene.start_seconds??0)||0)),duration_seconds:Math.max(.2,Math.min(30,Number(scene.duration_seconds??2.4)||2.4)),scroll_start:Math.max(0,Math.min(100,Number(scene.scroll_start??0)||0)),enter:['fade','slide_up','slide_left','blur','scale'].includes(String(scene.enter||'fade'))?String(scene.enter||'fade'):'fade',exit:['fade','blur','none'].includes(String(scene.exit||'fade'))?String(scene.exit||'fade'):'fade',text_position:['inherit','bottom-left','center-left','center'].includes(String(scene.text_position||'inherit'))?String(scene.text_position||'inherit'):'inherit',depth:Math.max(0,Math.min(1,Number(scene.depth??0)||0)),desktop_visible:scene.desktop_visible!==false,tablet_visible:scene.tablet_visible!==false,mobile_visible:scene.mobile_visible!==false,
  }));
  return {enabled:raw.enabled===true&&scenes.length>0,mode,scenes};
}
function heroStoryViewportAllows(scene){const w=innerWidth;if(w<=700)return scene.mobile_visible!==false;if(w<=1024)return scene.tablet_visible!==false;return scene.desktop_visible!==false;}
function heroStoryScenesForSlide(slideId=''){
  const hero=(DATA.site_builder||{}).hero||{},story=normalizedHeroStoryPublic(hero);if(!story.enabled)return {story,scenes:[]};
  const matching=story.scenes.filter((scene)=>heroStoryViewportAllows(scene)&&(!scene.slide_id||scene.slide_id===String(slideId||'')));
  return {story,scenes:matching};
}
function resetHeroStoryCopy(){
  const hero=(DATA.site_builder||{}).hero||{},identity=DATA.identity||{},root=$('#hero');if(root){root.dataset.storyActive='false';root.dataset.storyEnter='';root.dataset.storyExit='';root.style.removeProperty('--hero-story-depth');root.dataset.textPosition=hero.text_position||'bottom-left';}
  if($('#heroTitle'))$('#heroTitle').textContent=hero.title||identity.portfolio_title||'Portfólio';
  if($('#heroDescription'))$('#heroDescription').textContent=hero.subtitle||identity.description||'';
  if($('#heroKicker'))$('#heroKicker').textContent=hero.kicker||'Portfólio · Direção criativa';
  const active=heroProjects[heroIndex]||{};const label=$('#heroCtaLabel');if(label)label.textContent=active._hero_cta_label||hero.cta_label||'Explorar projeto';
  HERO_STORY_ACTIVE_SCENE='';HERO_STORY_ACTIVE_EXIT='none';
}
function applyHeroStoryScene(scene){
  if(!scene)return resetHeroStoryCopy();const root=$('#hero');if(!root)return;
  const token=++HERO_STORY_TRANSITION_TOKEN,previousExit=HERO_STORY_ACTIVE_EXIT||'none';
  const commit=()=>{if(token!==HERO_STORY_TRANSITION_TOKEN)return;HERO_STORY_ACTIVE_SCENE=scene.id;HERO_STORY_ACTIVE_EXIT=scene.exit||'fade';root.dataset.storyActive='true';root.dataset.storyEnter=scene.enter||'fade';root.dataset.storyExit=scene.exit||'fade';root.style.setProperty('--hero-story-depth',String(scene.depth||0));root.style.setProperty('--hero-story-duration',`${Math.max(.2,Number(scene.duration_seconds||.5))}s`);if(scene.text_position&&scene.text_position!=='inherit')root.dataset.textPosition=scene.text_position;else root.dataset.textPosition=((DATA.site_builder||{}).hero||{}).text_position||'bottom-left';
    const hero=(DATA.site_builder||{}).hero||{},identity=DATA.identity||{};$('#heroKicker').textContent=scene.kicker||hero.kicker||'Portfólio · Direção criativa';$('#heroTitle').textContent=scene.title||hero.title||identity.portfolio_title||'Portfólio';$('#heroDescription').textContent=scene.subtitle||hero.subtitle||identity.description||'';const label=$('#heroCtaLabel');if(label)label.textContent=scene.cta_label||(heroProjects[heroIndex]?._hero_cta_label)||hero.cta_label||'Explorar projeto';root.classList.remove('hero-story-exiting','hero-story-pulse');void root.offsetWidth;root.classList.add('hero-story-pulse');};
  if(HERO_STORY_ACTIVE_SCENE&&previousExit!=='none'&&!reduced){root.dataset.storyLeaving=previousExit;root.classList.add('hero-story-exiting');setTimeout(commit,previousExit==='blur'?180:120);}else commit();
}
function clearHeroStoryTimers(){HERO_STORY_TIMERS.forEach(clearTimeout);HERO_STORY_TIMERS=[];}
function activateHeroStoryForSlide(slideId=''){
  clearHeroStoryTimers();HERO_STORY_ACTIVE_SLIDE=String(slideId||'');const {story,scenes}=heroStoryScenesForSlide(HERO_STORY_ACTIVE_SLIDE);if(!story.enabled||!scenes.length){resetHeroStoryCopy();return;}
  const sorted=scenes.slice().sort((a,b)=>story.mode==='scroll'?a.scroll_start-b.scroll_start:a.start_seconds-b.start_seconds);
  if(story.mode==='timeline'&&!reduced){applyHeroStoryScene(sorted[0]);sorted.slice(1).forEach((scene)=>HERO_STORY_TIMERS.push(setTimeout(()=>{if(HERO_STORY_ACTIVE_SLIDE===String(slideId||''))applyHeroStoryScene(scene);},Math.max(0,scene.start_seconds)*1000)));return;}
  applyHeroStoryScene(sorted[0]);
}
function updateHeroStoryScroll(progress){
  const hero=(DATA.site_builder||{}).hero||{},story=normalizedHeroStoryPublic(hero);if(!story.enabled||story.mode!=='scroll')return;
  const {scenes}=heroStoryScenesForSlide(HERO_STORY_ACTIVE_SLIDE);if(!scenes.length)return resetHeroStoryCopy();const pct=Math.max(0,Math.min(100,Number(progress||0)*100));const sorted=scenes.slice().sort((a,b)=>a.scroll_start-b.scroll_start);let scene=sorted[0];for(const candidate of sorted){if(candidate.scroll_start<=pct)scene=candidate;else break;}if(scene&&scene.id!==HERO_STORY_ACTIVE_SCENE)applyHeroStoryScene(scene);
}

function renderHero() {
  clearHeroStoryTimers(); HERO_STORY_ACTIVE_SLIDE=''; HERO_STORY_ACTIVE_SCENE='';
  const visible = (DATA.projects || []).filter((project) => !project.hidden && ['image', 'video'].includes(project.type));
  const heroConfig = (DATA.site_builder || {}).hero || {};
  let configuredSlides = configuredHeroSlides(heroConfig, visible);
  if (!configuredSlides.length && (String(heroConfig.media_id || '').trim() || String(heroConfig.mobile_media_id || '').trim())) {
    configuredSlides = configuredHeroSlides({ ...heroConfig, slides:[{ id:'hero-fallback', media_id:heroConfig.media_id || heroConfig.mobile_media_id || '', mobile_media_id:heroConfig.mobile_media_id || '', duration:heroConfig.rotation_seconds || 6.2 }] }, visible);
  }
  const explicit = String(heroConfig.media_id || '').trim() ? visible.filter((project) => project.hero_selected) : [];
  const selected = visible.filter((project) => project.hero);
  const featured = visible.filter((project) => project.featured);
  heroProjects = configuredSlides.length ? configuredSlides : (explicit.length ? explicit : (selected.length ? selected : (featured.length ? featured : visible.slice(0, 4))));
  const root = $('#heroMedia');
  const pagination = $('#heroPagination');
  heroSoundEnabled = false;
  root.replaceChildren();
  pagination.replaceChildren();
  if (!heroProjects.length) { if ($('#heroOpen')) $('#heroOpen').hidden = true; return; }

  heroProjects.forEach((project, index) => {
    const slide = document.createElement('div');
    slide.className = 'hero-slide';
    slide.dataset.index = String(index);
    slide.dataset.transition = project._hero_transition_in || 'fade';
    slide.style.setProperty('--hero-slide-intensity', String(Math.max(0, Math.min(100, Number(project._hero_intensity ?? 60)))));
    slide.style.setProperty('--hero-position-x', `${Math.max(0,Math.min(100,Number(project._hero_focus_x ?? 50)))}%`);
    slide.style.setProperty('--hero-position-y', `${Math.max(0,Math.min(100,Number(project._hero_focus_y ?? 50)))}%`);
    slide.style.setProperty('--hero-media-zoom', String(Math.max(1,Math.min(2.2,Number(project._hero_zoom ?? 1)))));
    root.append(slide);
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-dot';
    dot.setAttribute('aria-label', `Banner ${index + 1}: ${project.title}`);
    dot.addEventListener('click', () => activateHero(index, true));
    pagination.append(dot);
  });
  ensureHeroSoundControl(heroConfig);
  activateHero(0, false);
  if (!reduced && heroProjects.length > 1) scheduleHero();
}

const HERO_MOBILE_QUERY = matchMedia('(max-width:700px)');
const HERO_LOCAL_CLIPS = Object.freeze({
  '1IhoKnfLR9pOTQn-GtIupUCUEttX3y8ej':'/assets/hero/dermacast-laila.mp4',
  '1PBHrpBqzc1FLXhZ9Hox1NRO9SIPYkndr':'/assets/hero/corte-03.mp4',
});
function updateHeroSoundControl() {
  const button=$('#heroSoundToggle');if(!button)return;
  const activeAsset=heroProjects[heroIndex]?heroAssetForViewport(heroProjects[heroIndex]):null;
  button.hidden=button.dataset.soundAllowed==='false'||activeAsset?.type!=='video';
  button.dataset.soundEnabled=heroSoundEnabled?'true':'false';
  button.dataset.mediaMuted=heroSoundEnabled?'false':'true';
  button.setAttribute('aria-pressed',heroSoundEnabled?'true':'false');
  button.setAttribute('aria-label',heroSoundEnabled?'Desativar áudio do banner':'Ativar áudio do banner');
  const label=button.querySelector('span');if(label)label.textContent=heroSoundEnabled?'Som ligado':'Ativar som';
  requestAnimationFrame(positionHeroSoundControl);
}
async function setHeroSoundEnabled(next,{resumeAmbient=true}={}) {
  const slide=document.querySelector('.hero-slide.is-active'),video=slide?.querySelector('video');
  if(!slide||!video){heroSoundEnabled=false;updateHeroSoundControl();return false;}
  ensureVideoSource(video);
  if(!next){video.muted=true;video.defaultMuted=true;video.setAttribute('muted','');heroSoundEnabled=false;if(resumeAmbient)siteAudioHandleMediaStop(video);updateHeroSoundControl();return true;}
  if(SITE_AUDIO.playing){SITE_AUDIO.resumeAfterMedia=SITE_AUDIO.userWantsPlaying;SITE_AUDIO.policyPause=true;pauseAmbientAudio(false);}
  video.defaultMuted=false;video.removeAttribute('muted');video.muted=false;video.volume=1;
  try{await video.play();heroSoundEnabled=video.muted===false;if(heroSoundEnabled)siteAudioHandleMediaStart(video);}
  catch(_error){heroSoundEnabled=false;video.muted=true;video.defaultMuted=true;video.setAttribute('muted','');}
  updateHeroSoundControl();return heroSoundEnabled;
}
function positionHeroSoundControl() {
  const hero=$('#hero'),button=$('#heroSoundToggle');if(!hero||!button||button.hidden)return;
  const heroRect=hero.getBoundingClientRect(),buttonRect=button.getBoundingClientRect();
  let right=Math.max(16,innerWidth*.04),bottom=Math.max(18,Math.min(44,innerHeight*.04));
  const obstacles=['#heroOpen','.hero-pagination','.scroll-cue','.hero-copy','.section-navigator'].map((selector)=>document.querySelector(selector)).filter((node)=>node&&node!==button&&!node.hidden&&getComputedStyle(node).display!=='none');
  const candidate=()=>({left:heroRect.right-right-buttonRect.width,right:heroRect.right-right,top:heroRect.bottom-bottom-buttonRect.height,bottom:heroRect.bottom-bottom});
  obstacles.forEach((node)=>{const a=candidate(),b=node.getBoundingClientRect(),overlap=a.left<b.right+12&&a.right>b.left-12&&a.top<b.bottom+12&&a.bottom>b.top-12;if(overlap)bottom=Math.max(bottom,heroRect.bottom-b.top+12);});
  const safeTop=Math.max(heroRect.top+12,Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-header-height'))+12||84);
  if(candidate().top<safeTop){bottom=Math.max(18,Math.min(44,innerHeight*.04));right=Math.max(right,heroRect.right-Math.max(heroRect.left+16,(obstacles.find((node)=>node.matches?.('#heroOpen'))?.getBoundingClientRect().left||heroRect.right))+16);}
  button.style.setProperty('--hero-sound-right',`${Math.round(right)}px`);button.style.setProperty('--hero-sound-bottom',`${Math.round(bottom)}px`);
}
function ensureHeroSoundControl(heroConfig={}) {
  const hero=$('#hero');if(!hero)return null;
  let button=$('#heroSoundToggle');
  if(!button){button=document.createElement('button');button.id='heroSoundToggle';button.type='button';button.className='hero-sound-toggle';button.innerHTML='<b aria-hidden="true"></b><span>Ativar som</span>';hero.append(button);button.addEventListener('click',()=>setHeroSoundEnabled(!heroSoundEnabled));}
  if(!window.__studioframeHeroSoundLayoutBound){window.__studioframeHeroSoundLayoutBound=1;addEventListener('resize',()=>requestAnimationFrame(positionHeroSoundControl),{passive:true});window.visualViewport?.addEventListener?.('resize',()=>requestAnimationFrame(positionHeroSoundControl),{passive:true});}
  button.dataset.soundAllowed=heroConfig.sound_control_visible===false?'false':'true';
  updateHeroSoundControl();return button;
}
function heroAssetForViewport(project) {
  const asset = HERO_MOBILE_QUERY.matches && project?._hero_mobile_asset ? project._hero_mobile_asset : project?.hero_asset;
  const resolved=asset && asset.type ? { ...project, ...asset, title: project.title } : heroAsset(project);
  const localClip=resolved?.type==='video'?HERO_LOCAL_CLIPS[String(resolved.id||'')]:'';
  if(!localClip)return resolved;
  return {...resolved,media_url:localClip,media_candidates:[localClip,...(resolved.media_candidates||[]).filter((url)=>url!==localClip)],preview_url:localClip,preview_candidates:[localClip,...(resolved.preview_candidates||[]).filter((url)=>url!==localClip)]};
}
function ensureHeroMedia(slide, project) {
  const variant = HERO_MOBILE_QUERY.matches && project?._hero_mobile_asset ? 'mobile' : 'web';
  if (slide.dataset.loadedVariant === variant && slide.childElementCount) return;
  slide.dataset.loadedVariant = variant;
  slide.replaceChildren();
  project = heroAssetForViewport(project);
  if (project.type === 'video' && project.hero_autoplay && (project.media_url || (project.media_candidates || []).length)) {
    const video=createResilientVideo(project,{autoplay:true,muted:true,loop:true,controls:false,preload:'auto',className:'hero-native-video',timeoutMs:30000,metadataReady:false,exhausted:()=>{
      if(!video.isConnected)return;
      const fallback=imageWithFallback(project,heroCandidates(project),{lazy:false,priority:'high',upgradeUrls:heroUpgradeCandidates(project)});
      fallback.classList?.add('hero-video-poster-fallback');video.replaceWith(fallback);slide.dataset.heroVideoFallback='poster-muted';
    }});
    video.defaultMuted=true;video.muted=true;video.setAttribute('muted','');video.setAttribute('aria-label',project.title?`Vídeo do banner: ${project.title}`:'Vídeo do banner');
    slide.append(video);
  } else {
    slide.append(imageWithFallback(project, heroCandidates(project), { lazy: false, priority: 'high', upgradeUrls: heroUpgradeCandidates(project) }));
  }
}
HERO_MOBILE_QUERY.addEventListener?.('change', () => {
  document.querySelectorAll('.hero-slide').forEach((slide) => { slide.dataset.loadedVariant = ''; });
  activateHero(heroIndex, false);
});

function activateHero(index, manual = false) {
  if (!heroProjects.length) return;
  const previousIndex = heroIndex;
  heroIndex = (index + heroProjects.length) % heroProjects.length;
  const slides = [...document.querySelectorAll('.hero-slide')];
  const dots = [...document.querySelectorAll('.hero-dot')];
  slides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === heroIndex;
    const wasActive = slideIndex === previousIndex && previousIndex !== heroIndex;
    const project = heroProjects[slideIndex] || {};
    if (isActive) {
      ensureHeroMedia(slide, project);
      slide.dataset.transition = project._hero_transition_in || 'fade';
      slide.dataset.phase = 'enter';
      slide.style.setProperty('--hero-slide-intensity', String(Math.max(0, Math.min(100, Number(project._hero_intensity ?? 60)))));
    } else if (wasActive) {
      slide.dataset.transition = project._hero_transition_out || 'crossfade';
      slide.dataset.phase = 'exit';
      slide.classList.add('is-leaving');
      setTimeout(() => slide.classList.remove('is-leaving'), reduced ? 0 : 1450);
    }
    slide.classList.toggle('is-active', isActive);
    const video = slide.querySelector('video');
    if (video) {
      if (isActive) {video.muted=!heroSoundEnabled;if(heroSoundEnabled){video.defaultMuted=false;video.removeAttribute('muted');}video.play().catch(() => {if(heroSoundEnabled)setHeroSoundEnabled(false);});}
      else {video.pause();video.muted=true;}
    }
  });
  dots.forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === heroIndex));
  const activeProject = heroProjects[heroIndex];
  const heroRoot = $('#hero');
  if (heroRoot) heroRoot.dataset.slideTransition = activeProject?._hero_transition_in || 'fade';
  const heroOpen = $('#heroOpen');
  if (heroOpen && activeProject) {
    const action=heroActionForProject(activeProject);
    heroOpen.hidden = visualLayout.hero_expand === false || !action.enabled;
    heroOpen.setAttribute('aria-label', action.label || `Abrir ${activeProject.title || 'destino do banner'}`);
    const label=$('#heroCtaLabel');if(label)label.textContent=activeProject._hero_cta_label || (DATA.site_builder||{}).hero?.cta_label || 'Explorar projeto';
  }
  sfRenderHeroAdvancedForActive();
  sfEmitHeroBackgroundSync();
  activateHeroStoryForSlide(activeProject?._hero_slide_id || '');
  updateHeroSoundControl();
  if (manual && !reduced && heroProjects.length > 1) scheduleHero();
}

function scheduleHero() {
  clearTimeout(heroTimer);
  const active = heroProjects[heroIndex] || {};
  const fallback = Number((DATA.site_builder || {}).hero?.rotation_seconds || 6.2);
  const seconds = Math.max(2, Math.min(30, Number(active._hero_duration || fallback)));
  heroTimer = setTimeout(() => {
    activateHero(heroIndex + 1, false);
    scheduleHero();
  }, seconds * 1000);
}

function bindCardInteraction(button, media, mediaInner) {
  const mode = visualLayout.card_interaction || 'responsive';
  if (mode === 'off' || reduced || !matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  let raf = 0;
  let pending = null;
  const apply = () => {
    raf = 0;
    if (!pending) return;
    const rect = media.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = clamp((pending.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((pending.clientY - rect.top) / rect.height, 0, 1);
    const nx = (x - .5) * 2;
    const ny = (y - .5) * 2;
    const travel = mode === 'subtle' ? 2.4 : 5.5;
    media.style.setProperty('--pointer-x', `${(x * 100).toFixed(1)}%`);
    media.style.setProperty('--pointer-y', `${(y * 100).toFixed(1)}%`);
    mediaInner.style.setProperty('--hover-x', `${(-nx * travel).toFixed(2)}px`);
    mediaInner.style.setProperty('--hover-y', `${(-ny * travel).toFixed(2)}px`);
    button.style.setProperty('--card-pointer-x', nx.toFixed(3));
    button.style.setProperty('--card-pointer-y', ny.toFixed(3));
  };
  media.addEventListener('pointermove', (event) => {
    pending = event;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  media.addEventListener('pointerleave', () => {
    pending = null;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    media.style.removeProperty('--pointer-x');
    media.style.removeProperty('--pointer-y');
    mediaInner.style.setProperty('--hover-x', '0px');
    mediaInner.style.setProperty('--hover-y', '0px');
    button.style.removeProperty('--card-pointer-x');
    button.style.removeProperty('--card-pointer-y');
  });
}

function bindCardVideoPreview(button, video, item = {}) {
  if (!video || visualLayout.card_video_preview === false || reduced) return;
  const mode = visualLayout.card_video_preview_mode || 'hover';
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)').matches;
  let requested = false;
  const revealWhenReady = () => {
    if (!requested || video.dataset.failed === '1' || video.dataset.ready !== '1') return;
    video.classList.add('is-previewing');
    video.play().catch(() => {});
  };
  const start = () => {
    requested = true;
    if (mountCardDrivePreview(button,item)) return;
    if (video.dataset.failed === '1') { mountCardDrivePreview(button,item); return; }
    ensureVideoSource(video);
    revealWhenReady();
  };
  const stop = () => {
    requested = false;
    video.classList.remove('is-previewing');
    video.pause();
    try { video.currentTime = 0; } catch (_) {}
    unmountCardDrivePreview(button);
  };
  video.addEventListener('loadeddata', revealWhenReady);
  video.addEventListener('canplay', revealWhenReady);
  video.addEventListener('playing', revealWhenReady);
  video.addEventListener('error', () => video.classList.remove('is-previewing'));
  video.addEventListener('studioframe:video-exhausted', () => { if (requested) mountCardDrivePreview(button,item); });
  if (mode === 'always') {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.intersectionRatio >= .45 ? start() : stop());
    }, { threshold: [0, .45, .75] });
    observer.observe(button);
    return;
  }
  if (finePointer) {
    button.addEventListener('pointerenter', start);
    button.addEventListener('pointerleave', stop);
    button.addEventListener('focusin', start);
    button.addEventListener('focusout', stop);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.isIntersecting && entry.intersectionRatio >= .62 ? start() : stop());
  }, { threshold:[0,.62,.85] });
  observer.observe(button);
}

const COVER_RATIOS = { '4x3':'4 / 3', '16x9':'16 / 9', '21x9':'21 / 9', '1x1':'1 / 1', '4x5':'4 / 5' };
function applyProjectCoverGeometry(project, media, image) {
  const ratio = COVER_RATIOS[String(project?.cover_ratio || '')];
  const intrinsicWidth = Number(project?.width || 0);
  const intrinsicHeight = Number(project?.height || 0);
  const isExtremePortrait = !ratio && intrinsicWidth > 0 && intrinsicHeight > 0 && intrinsicWidth / intrinsicHeight < .7;
  if (ratio && media) media.style.aspectRatio = ratio;
  else if (isExtremePortrait && media) {
    media.style.aspectRatio = '3 / 4';
    media.dataset.coverGeometry = 'portrait-contained';
  }
  if (media) media.style.background = project?.cover_bg || '#121212';
  if (image?.style) {
    image.style.objectFit = project?.cover_fit === 'contain' || isExtremePortrait ? 'contain' : 'cover';
    image.style.objectPosition = `${Math.max(0,Math.min(100,Number(project?.cover_position_x ?? 50)))}% ${Math.max(0,Math.min(100,Number(project?.cover_position_y ?? 50)))}%`;
    const coverZoom=Math.max(1,Math.min(2.2,Number(project?.cover_zoom ?? 1)));
    image.style.setProperty('--cover-zoom',String(coverZoom));
    image.style.setProperty('--cover-zoom-hover',String(Math.min(2.35,coverZoom*1.035)));
    image.style.background = project?.cover_bg || '#121212';
  }
}

function card(project, index) {
  const onOpen = arguments.length > 2 ? arguments[2] : null;
  const button = document.createElement('button');
  button.className = 'card reveal';
  const projectCardId=String(project.project_id||project.id||project.gallery_id||'').trim();
  if(projectCardId){button.dataset.projectId=projectCardId;button.id=`project-card-${projectCardId.replace(/[^a-zA-Z0-9_-]+/g,'-')}`;}
  button.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 55}ms`);
  button.setAttribute('aria-label', `Abrir projeto ${project.title || ''}`.trim());
  const media = document.createElement('span');
  media.className = 'media';
  const mediaInner = document.createElement('span');
  mediaInner.className = 'media-inner';
  if (visualLayout.card_parallax !== false) mediaInner.dataset.parallax = 'card';
  const cardPoster = poster(project, { eager: index < 6 });
  cardPoster.classList?.add('card-poster');
  applyProjectCoverGeometry(project, media, cardPoster);
  mediaInner.append(cardPoster);
  let previewVideo = null;
  const previewSources = videoSourceCandidates(project);
  if (project.type === 'video' && !project.hosted_video_chunked && previewSources.length && visualLayout.card_video_preview !== false) {
    previewVideo = createResilientVideo(project, { autoplay:false, muted:true, loop:true, controls:false, preload:'none', className:'card-preview-video', defer:true, metadataReady:false, timeoutMs:8000 });
    previewVideo.setAttribute('aria-hidden', 'true');
    mediaInner.append(previewVideo);
  }
  media.append(mediaInner);

  const copy = document.createElement('span');
  copy.className = 'copy';
  if (Number(project.title_size || 0) > 0) copy.style.setProperty('--project-card-title-size', `${Math.max(14,Math.min(48,Number(project.title_size)))}px`);
  if (Number(project.description_size || 0) > 0) copy.style.setProperty('--project-card-description-size', `${Math.max(9,Math.min(24,Number(project.description_size)))}px`);
  copy.innerHTML = `<span><h3>${esc(project.title)}</h3><p>${esc(project.description || project.path?.join(' · ') || '')}</p></span><em>${String(index + 1).padStart(2, '0')}</em>`;
  button.append(media, copy);
  bindCardInteraction(button, media, mediaInner);
  bindCardVideoPreview(button, previewVideo, project);
  button.addEventListener('click', () => {
    const actionUrl=safeEditorialActionUrl(project.editorial_action_url);
    if(actionUrl){
      if(/^https?:/i.test(actionUrl)){window.open(actionUrl,'_blank','noopener,noreferrer');return;}
      window.location.href=actionUrl;return;
    }
    if(onOpen)onOpen(project);else openProjectDetail(project);
  });
  return button;
}

function projectMediaUrls(item) {
  const cover = projectCoverRecord(item);
  return uniqueUrls([
    cover.media_url,
    ...(cover.media_candidates || []),
    cover.preview_url,
    ...(cover.preview_candidates || []),
    cover.thumbnail_url,
    ...(cover.thumbnail_candidates || []),
  ]);
}

function unavailableMedia(item) {
  if (item?.type === 'video') return projectVideoFallback(item);
  const box = document.createElement('div');
  box.className = 'project-media-unavailable';
  const label = document.createElement('strong');
  label.textContent = item.title || 'Mídia indisponível';
  const note = document.createElement('span');
  note.textContent = 'Esta mídia não pôde ser exibida diretamente no navegador.';
  box.append(label, note);
  const target = item.external_url || item.preview_url || (item.preview_candidates || [])[0];
  if (target) {
    const link = document.createElement('a');
    link.href = target;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Abrir no Google Drive ↗';
    box.append(link);
  }
  return box;
}

function projectImage(item) {
  const urls = projectMediaUrls(item);
  if (!urls.length) return unavailableMedia(item);
  const image = document.createElement('img');
  image.className = 'media-progressive-image is-loading';
  image.alt = item.title || '';
  image.loading = 'lazy';
  image.decoding = 'async';
  let index = 0;
  let timeoutHandle = null;
  const clearTimer = () => { if (timeoutHandle?.clear) timeoutHandle.clear(); timeoutHandle = null; };
  const next = () => {
    clearTimer(); const failed = image.currentSrc || image.src; if (failed) markMediaUrlFailed(failed);
    if (index >= urls.length) { image.replaceWith(unavailableMedia(item)); return; }
    image.src = urls[index++]; timeoutHandle = armImageTimeout(image, next, 12000);
  };
  image.addEventListener('load', () => { clearTimer(); image.classList.remove('is-loading'); image.classList.add('is-loaded'); queueMicrotask(() => image.parentElement?.classList.add('media-loaded')); });
  image.addEventListener('error', next);
  next();
  return image;
}

function mediaGeometry(item = {}, video = null) {
  const configured = String(item.viewer_orientation || item.orientation || 'auto').toLowerCase();
  const metadata = item.metadata || item.media_metadata || item.dimensions || {};
  const width = Number(video?.videoWidth || item.width || item.video_width || item.media_width || metadata.width || 0);
  const height = Number(video?.videoHeight || item.height || item.video_height || item.media_height || metadata.height || 0);
  let orientation = ['portrait', 'landscape', 'square'].includes(configured) ? configured : 'landscape';
  if (width > 0 && height > 0 && configured === 'auto') {
    if (height > width * 1.08) orientation = 'portrait';
    else if (width > height * 1.08) orientation = 'landscape';
    else orientation = 'square';
  }
  const fallback = orientation === 'portrait' ? [9, 16] : orientation === 'square' ? [1, 1] : [16, 9];
  const resolvedWidth = width > 0 ? width : fallback[0];
  const resolvedHeight = height > 0 ? height : fallback[1];
  return { orientation, width: resolvedWidth, height: resolvedHeight, ratio: resolvedWidth / resolvedHeight };
}

function mediaOrientation(item = {}, video = null) {
  return mediaGeometry(item, video).orientation;
}

function applyMediaGeometry(target, item = {}, video = null) {
  if (!target) return mediaGeometry(item, video);
  const geometry = mediaGeometry(item, video);
  target.dataset.mediaOrientation = geometry.orientation;
  target.classList.remove('is-portrait', 'is-landscape', 'is-square');
  target.classList.add(`is-${geometry.orientation}`);
  target.style.setProperty('--media-aspect-ratio', `${geometry.width} / ${geometry.height}`);
  target.style.setProperty('--media-project-max-width', `${Math.max(32, Math.min(100, 88 * geometry.ratio)).toFixed(2)}vh`);
  target.style.setProperty('--media-viewer-max-width', `${Math.max(28, Math.min(100, 72 * geometry.ratio)).toFixed(2)}vh`);
  return geometry;
}

function bindVideoOrientation(video, item = {}) {
  if (!video || video.dataset.orientationBound === '1') return video;
  video.dataset.orientationBound = '1';
  const sync = () => {
    applyMediaGeometry(video, item, video);
    applyMediaGeometry(video.closest('.project-video-wrap'), item, video);
    applyMediaGeometry(video.closest('.project-media-viewport'), item, video);
    applyMediaGeometry(video.closest('.stage'), item, video);
  };
  video.addEventListener('loadedmetadata', sync);
  if (video.readyState >= 1) sync();
  else applyMediaGeometry(video, item);
  return video;
}

function projectVideo(item) {
  const wrap = document.createElement('div');
  wrap.className = 'project-video-wrap';
  wrap.dataset.playbackContract = 'studioframe-native-zero-drive-ui';
  applyMediaGeometry(wrap, item);
  const sources = videoSourceCandidates(item);
  if (sources.length || videoChunkCandidates(item).length) {
    const video = createResilientVideo(item, { autoplay:false, muted:false, loop:false, controls:true, preload:'metadata', className:'project-inline-video', exhausted:() => {
      video.replaceWith(projectVideoFallback(item));
    }, timeoutMs:45000, metadataReady:false });
    wrap.append(video);
    return wrap;
  }
  wrap.append(projectVideoFallback(item));
  return wrap;
}

function projectVideoFallback(item, { autoplay = false } = {}) {
  void autoplay;
  const fallback = document.createElement('div');
  fallback.className = 'project-video-fallback';
  fallback.dataset.playbackFallback = 'studioframe-unavailable-zero-drive-ui';
  applyMediaGeometry(fallback, item);
  const posterNode = imageWithFallback(item, [item.thumbnail_url, ...(item.thumbnail_candidates || [])], { lazy:false, priority:'high', upgradeUrls:[...(item.thumbnail_candidates || [])] });
  posterNode.classList?.add('project-video-fallback-poster');
  const note = document.createElement('span');
  note.className = 'project-video-fallback-note';
  note.textContent = 'Vídeo temporariamente indisponível para reprodução.';
  fallback.append(posterNode, note);
  return fallback;
}

function projectPdf(item) {
  const wrap = document.createElement('div');
  wrap.className = 'project-pdf';
  const preview = item.preview_url || (item.preview_candidates || [])[0];
  if (preview) {
    const frame = document.createElement('iframe');
    frame.src = preview;
    frame.title = item.title || 'PDF';
    frame.loading = 'lazy';
    frame.allow = 'fullscreen';
    wrap.append(frame);
  } else {
    wrap.append(projectImage(item));
  }
  const target = item.external_url || preview;
  if (target) {
    const link = document.createElement('a');
    link.href = target;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Abrir PDF ↗';
    wrap.append(link);
  }
  return wrap;
}

function projectMediaNode(item) {
  if (item.type === 'image') return projectImage(item);
  if (item.type === 'video') return projectVideo(item);
  if (item.type === 'pdf') return projectPdf(item);
  return unavailableMedia(item);
}

const PUBLIC_CASE_CORE = [
  { id:'case-core-header', type:'case_header', visible:true, core:true },
  { id:'case-core-stream', type:'media_stream', visible:true, core:true, captions:true },
  { id:'case-core-related', type:'related_projects', visible:true, core:true, mode:'auto_category', eyebrow:'CONTINUE EXPLORANDO', title:'Projetos semelhantes', max_items:3, columns:'3', show_category:true, items:[] },
  { id:'case-core-next', type:'next_project', visible:true, core:true, scope:'category', cta:'Próximo projeto' },
];

function publicCaseBlocks(project) {
  const configured = Array.isArray(project?.case_builder?.blocks) ? project.case_builder.blocks.filter((block)=>block && block.type).map((block)=>({...block})) : [];
  const output=[]; const seen=new Set();
  configured.forEach((block,index)=>{let id=String(block.id||'').trim() || `case-public-${index}`;if(seen.has(id))id=`${id}-${index}`;seen.add(id);output.push({...block,id});});
  PUBLIC_CASE_CORE.forEach((block)=>{if(output.some((item)=>item.id===block.id||item.type===block.type&&block.core))return;output.push({...block});});
  const takeFirst=(type,id)=>{const index=output.findIndex((item)=>item.id===id||item.type===type);return index>=0?output.splice(index,1)[0]:null;};
  const header={...(takeFirst('case_header','case-core-header')||PUBLIC_CASE_CORE[0]),visible:true};
  const related=takeFirst('related_projects','case-core-related')||{...PUBLIC_CASE_CORE[2]};
  const stream=takeFirst('media_stream','case-core-stream')||{...PUBLIC_CASE_CORE[1]};
  const next=takeFirst('next_project','case-core-next')||{...PUBLIC_CASE_CORE[3]};
  // Project-detail contract: identity/header first, authored content in configured
  // order, then the canonical media stream, recommendations, and next-project.
  // Related projects must never precede the project's own content.
  return [header,...output,stream,related,next].map((block)=>({...block,...normalizeComponentStatePublicFields(block),...normalizeMotionPublicFields(block)}));
}

function caseItemById(items, id, type='all') {
  const list=items||[];
  if(String(id||'').trim()) return list.find((item)=>String(item.id)===String(id) && (type==='all'||item.type===type)) || null;
  return list.find((item)=>type==='all'||item.type===type) || null;
}

function caseMediaViewport(project, item, items, {caption=true, className=''}={}) {
  if (!item) return null;
  const figure=document.createElement('figure'); figure.className=`case-media-figure ${className}`.trim();
  if(item.type==='video')figure.classList.add('is-video');
  const orientation=mediaOrientation(item);figure.dataset.mediaOrientation=orientation;
  const viewport=document.createElement('div'); viewport.className=`project-media-viewport case-media-viewport type-${item.type||'media'}`;viewport.dataset.mediaOrientation=orientation;
  const inner=document.createElement('div'); inner.className='project-media-inner';
  if (item.type==='image' && visualLayout.card_parallax!==false) inner.dataset.parallax='detail';
  inner.append(projectMediaNode(item)); viewport.append(inner);
  if(item.type==='image'){
    const index=(items||[]).findIndex((entry)=>entry.id===item.id);
    viewport.classList.add('is-expandable'); viewport.setAttribute('role','button'); viewport.setAttribute('aria-label',`Expandir ${item.title||'imagem'}`);
    viewport.addEventListener('click',(event)=>{if(event.target.closest('a,button,iframe,video'))return;openMediaAt(project,index>=0?index:null);});
  }
  if(item.type==='video'){
    const index=(items||[]).findIndex((entry)=>entry.id===item.id);const open=document.createElement('button');open.type='button';open.className='project-video-open';open.setAttribute('aria-label',`Abrir ${item.title||'vídeo'} no visualizador`);open.innerHTML='<span aria-hidden="true">↗</span><b>Abrir vídeo</b>';open.addEventListener('click',(event)=>{event.preventDefault();event.stopPropagation();openMediaAt(project,index>=0?index:null);});viewport.append(open);
  }
  figure.append(viewport);
  if(caption){const fig=document.createElement('figcaption');const strong=document.createElement('strong');strong.textContent=item.title||'';fig.append(strong);if(item.description){const span=document.createElement('span');span.textContent=item.description;fig.append(span);}figure.append(fig);}
  return figure;
}

function caseCopy(block, fallbackTitle='') {
  const copy=document.createElement('div'); copy.className='case-copy';
  if(block.eyebrow){const e=document.createElement('span');e.className='case-eyebrow';e.textContent=block.eyebrow;copy.append(e);}
  const title=String(block.title||fallbackTitle||'').trim(); if(title){const h=document.createElement('h3');h.textContent=title;copy.append(h);}
  if(block.body){const p=document.createElement('p');p.textContent=block.body;copy.append(p);}
  return copy;
}

function createCaseTextBlock(block){const section=document.createElement('section');section.className=`case-block case-text reveal width-${block.width||'medium'}`;section.append(caseCopy(block));return section;}
function createCaseLetteringBlock(block){
  const text=String(block.title||'').trim(); if(!text)return null; const section=document.createElement('section');section.className='case-block case-lettering reveal';section.dataset.style=block.style||'split';section.dataset.direction=block.direction||'left';section.dataset.speed='medium';
  if(block.eyebrow){const e=document.createElement('div');e.className='lettering-eyebrow';e.textContent=block.eyebrow;section.append(e);} const mask=document.createElement('div');mask.className='lettering-mask';const track=document.createElement('div');track.className='lettering-track case-lettering-track';track.dataset.caseLettering='1';const a=document.createElement('span');a.className='lettering-primary';a.textContent=text;const b=document.createElement('span');b.className='lettering-outline';b.textContent=text;b.setAttribute('aria-hidden','true');track.append(a,b);mask.append(track);section.append(mask);return section;
}
function createCaseFullMediaBlock(project,block,items){const item=caseItemById(items,block.media_id);if(!item)return null;const section=document.createElement('section');section.className='case-block case-full-media reveal';section.dataset.mediaOrientation=mediaOrientation(item);if(block.title){const copy=caseCopy({title:block.title});copy.classList.add('case-full-title');section.append(copy);}const media=caseMediaViewport(project,item,items,{caption:block.caption!==false,className:'case-full-figure'});if(media)section.append(media);return section;}
function createCaseVideoBlock(project,block,items){const item=caseItemById(items,block.media_id,'video');if(!item)return null;const section=document.createElement('section');section.className='case-block case-video reveal';section.dataset.mediaOrientation=mediaOrientation(item);const copy=caseCopy(block,item.title);if(copy.children.length)section.append(copy);const media=caseMediaViewport(project,item,items,{caption:false,className:'case-video-figure'});if(media)section.append(media);return section;}
function createCaseSplitBlock(project,block,items){const item=caseItemById(items,block.media_id);if(!item)return null;const section=document.createElement('section');section.className=`case-block case-split reveal media-${block.media_side==='right'?'right':'left'}`;const media=caseMediaViewport(project,item,items,{caption:false,className:'case-split-figure'});const copy=caseCopy(block,project.title);if(media)section.append(media,copy);return section;}
function createCaseDuoBlock(project,block,items){const first=caseItemById(items,block.media_id);const second=caseItemById(items,block.media_id_2);if(!first&&!second)return null;const section=document.createElement('section');section.className=`case-block case-duo reveal gap-${block.gap||'normal'}`;if(first)section.append(caseMediaViewport(project,first,items,{caption:false,className:'case-duo-figure'}));if(second&&(!first||second.id!==first.id))section.append(caseMediaViewport(project,second,items,{caption:false,className:'case-duo-figure'}));return section;}

function nextProjectFor(project, scope='category') {
  let list=(DATA.projects||[]).filter((item)=>!item.hidden);
  if(scope==='category'){const section=project.section_id||project.physical_category_id||project.category_id;const local=list.filter((item)=>(item.section_id||item.physical_category_id||item.category_id)===section);if(local.length>1)list=local;}
  if(list.length<=1)return null; const index=list.findIndex((item)=>item.project_id===project.project_id || item.id===project.id); return list[(index>=0?index+1:0)%list.length] || null;
}
function createNextProjectBlock(project,block){const next=nextProjectFor(project,block.scope||'category');if(!next)return null;const section=document.createElement('button');section.type='button';section.className='case-block case-next reveal';const label=document.createElement('span');label.textContent=block.cta||'Próximo projeto';const title=document.createElement('strong');title.textContent=next.title||'Projeto';const arrow=document.createElement('b');arrow.textContent='↗';section.append(label,title,arrow);const poster=document.createElement('div');poster.className='case-next-media';const inner=document.createElement('div');inner.className='project-media-inner';inner.append(imageWithFallback(next,[next.thumbnail_url,...(next.thumbnail_candidates||[]),next.media_url,...(next.media_candidates||[])]));poster.prepend(inner);section.prepend(poster);section.addEventListener('click',()=>openProjectDetail(next));return section;}

function normalizedProjectCommercial(project={}){const source=project?.commercial&&typeof project.commercial==='object'?project.commercial:{};const modes=new Set(['cta','services','full']),ids=[],seen=new Set();(Array.isArray(source.related_service_ids)?source.related_service_ids:[]).forEach((value)=>{const id=String(value||'').trim();if(id&&!seen.has(id)){seen.add(id);ids.push(id);}});return {enabled:source.enabled!==false,intro:String(source.intro||''),related_service_ids:ids,cta_label:String(source.cta_label||'Quero algo assim'),display_mode:modes.has(String(source.display_mode||'full'))?String(source.display_mode||'full'):'full',position:'after_media'};}
function projectCommercialServiceRecords(project={}){const config=normalizedProjectCommercial(project);return config.related_service_ids.map((id)=>quoteServiceRecord(id)).filter(Boolean);}
function createProjectCommercialBlock(project={}){const config=normalizedProjectCommercial(project);if(!config.enabled)return null;const records=projectCommercialServiceRecords(project),mode=config.display_mode,section=document.createElement('section');section.className=`case-block project-commercial-bridge reveal mode-${mode}`;section.dataset.projectCommercial='';const projectId=String(project.project_id||project.id||project.gallery_id||'');const copy=document.createElement('div');copy.className='project-commercial-copy';if(mode==='full'){const eyebrow=document.createElement('small');eyebrow.textContent='CONTRATE ESTE TIPO DE PROJETO';const title=document.createElement('h2');title.textContent=records.length?'Serviços relacionados a este trabalho':'Quer construir algo assim?';copy.append(eyebrow,title);const intro=document.createElement('p');intro.textContent=config.intro||'Transforme esta referência em um briefing para a sua marca. Escolha um serviço relacionado ou abra o orçamento com este projeto como referência.';copy.append(intro);}else if(mode==='services'){const eyebrow=document.createElement('small');eyebrow.textContent='SERVIÇOS RELACIONADOS';const title=document.createElement('h2');title.textContent='Soluções usadas neste tipo de projeto';copy.append(eyebrow,title);if(config.intro){const intro=document.createElement('p');intro.textContent=config.intro;copy.append(intro);}}else if(config.intro){const intro=document.createElement('p');intro.textContent=config.intro;copy.append(intro);}if(copy.children.length)section.append(copy);
  if(mode!=='cta'&&records.length){const grid=document.createElement('div');grid.className='project-commercial-services';records.forEach(({category,item},index)=>{const card=document.createElement('article');card.className='project-commercial-service-card';const meta=document.createElement('small');meta.textContent=category.short_title||category.title||'Serviço';const title=document.createElement('a');title.href=serviceDetailHref(item);title.textContent=item.title||'Serviço';const description=document.createElement('p');description.textContent=item.description||'';const actions=document.createElement('div');actions.className='project-commercial-service-actions';const details=document.createElement('a');details.href=serviceDetailHref(item);details.textContent='Ver serviço ↗';actions.append(details);if(quoteEnabled()){const add=document.createElement('button');add.type='button';add.dataset.quoteSimilar=String(item.id||'');add.dataset.quoteProjectId=projectId;add.textContent=index===0?'Adicionar ao orçamento':(servicesConfig().quote_item_action_label||'Adicionar');actions.append(add);}card.append(meta,title);if(description.textContent)card.append(description);card.append(actions);grid.append(card);});section.append(grid);}
  const actions=document.createElement('div');actions.className='project-commercial-actions';const primary=records[0];let cta;if(quoteEnabled()){cta=document.createElement('button');cta.type='button';if(primary){cta.dataset.quoteSimilar=String(primary.item.id||'');cta.dataset.quoteProjectId=projectId;}else{cta.dataset.quoteOpen='';cta.dataset.quoteProjectContext=projectId;}}else{cta=document.createElement('a');cta.href=primary?serviceDetailHref(primary.item):servicesHref();}cta.className='project-commercial-primary';cta.textContent=config.cta_label||'Quero algo assim';actions.append(cta);const catalog=document.createElement('a');catalog.className='project-commercial-catalog';catalog.href=servicesHref();catalog.textContent='Ver todos os serviços';actions.append(catalog);section.append(actions);return section;}

function renderLegacyMediaStream(project,items,captions=true,listNode=null){
  const list=listNode || $('#projectMediaList'); if(!list)return; list.replaceChildren();
  items.forEach((item,index)=>{const figure=caseMediaViewport(project,item,items,{caption:captions,className:'project-media-item reveal'});if(!figure)return;figure.style.setProperty('--reveal-delay',`${Math.min(index,5)*45}ms`);list.append(figure);});
}

function applyCaseHeaderPresentation(project, block = {}, headNode = null) {
  const head=headNode || $('#projectDetailHead');
  if(!head)return;
  // renderProjectCase temporarily detaches the header while rebuilding the
  // canonical block order. Query inside that retained node so title,
  // description and cover remain writable even while it is off-document.
  const eyebrow=head.querySelector('#projectEyebrow') || $('#projectEyebrow');
  const title=head.querySelector('#projectDetailTitle') || $('#projectDetailTitle');
  const description=head.querySelector('#projectDetailDescription') || $('#projectDetailDescription');
  const introMedia=head.querySelector('#projectDetailIntroMedia') || $('#projectDetailIntroMedia');
  const fallbackEyebrow=project.section_title || project.category || 'Projeto';
  const fallbackTitle=project.title || project.gallery_title || 'Projeto';
  const fallbackDescription=project.description || '';
  if(eyebrow) eyebrow.textContent=Object.prototype.hasOwnProperty.call(block,'eyebrow') ? (block.eyebrow||'') : fallbackEyebrow;
  if(title) title.textContent=Object.prototype.hasOwnProperty.call(block,'title') ? (block.title||fallbackTitle) : fallbackTitle;
  if(description){
    const customBody=String(block.body||'').trim();
    const value=customBody||fallbackDescription;
    description.textContent=value;
    description.hidden=!value;
  }
  const headerLayout=block.header_layout || 'copy-only';
  if(introMedia) introMedia.hidden = block.show_cover===false || headerLayout==='copy-only' || !introMedia.children.length;
  head.dataset.headerLayout=headerLayout;
  head.dataset.bodyWidth=block.body_width || 'medium';
  const fontMap={display:'var(--display)',body:'var(--body)',system:'Arial, Helvetica, sans-serif',serif:'Georgia, Times New Roman, serif',mono:'ui-monospace, SFMono-Regular, Consolas, monospace'};
  const colorMap={text:'var(--text)',accent:'var(--accent)',muted:'var(--muted)'};
  const set=(name,value)=>{if(value===undefined||value===null||value===''||value==='auto')head.style.removeProperty(name);else head.style.setProperty(name,value);};
  head.style.setProperty('--case-heading-font',fontMap[block.font_family||'display']||fontMap.display);
  head.style.setProperty('--case-heading-weight',String(block.title_weight||'400'));
  head.style.setProperty('--case-text-align',block.text_align||'left');
  head.style.setProperty('--case-title-color',colorMap[block.title_color||'text']||colorMap.text);
  head.style.setProperty('--case-eyebrow-color',colorMap[block.eyebrow_color||'accent']||colorMap.accent);
  const safeTitleSize = Number(block.title_size || project.title_size || 0);
  const safeBodySize = Number(block.body_size || project.description_size || 0);
  set('--case-title-size',safeTitleSize?`clamp(26px,${Math.max(18,Math.min(120,safeTitleSize))}px,80px)`:'');
  set('--case-body-size',safeBodySize?`clamp(11px,${Math.max(9,Math.min(32,safeBodySize))}px,22px)`:'');
  set('--case-eyebrow-size',block.eyebrow_size?`${block.eyebrow_size}px`:'');
  set('--case-title-line-height',block.title_line_height||'');
  set('--case-title-letter-spacing',block.title_letter_spacing||'');
}

function projectIdentity(project={}){return String(project.project_id||project.id||project.gallery_id||'');}
function projectCategoryIdentity(project={}){return String(project.section_id||project.physical_category_id||project.category_id||project.section_title||project.category||project.path?.[0]||'');}
function projectServiceIdentitySet(project={}){return new Set((normalizedProjectCommercial(project).related_service_ids||[]).map(String));}
function projectRelatedBlock(project={},block={}){
  const currentId=projectIdentity(project),visible=(DATA.projects||[]).filter((candidate)=>candidate&&!candidate.hidden&&projectIdentity(candidate)!==currentId),mode=String(block.mode||'auto_category');let selected=[];
  if(mode==='selected') selected=relatedProjectsForBlock(block).map(({data,project:candidate})=>({data,project:candidate})).filter(({project:candidate})=>projectIdentity(candidate)!==currentId);
  else if(mode==='auto_services'){
    const currentServices=projectServiceIdentitySet(project);selected=visible.map((candidate)=>{const candidateServices=projectServiceIdentitySet(candidate);let score=0;currentServices.forEach((id)=>{if(candidateServices.has(id))score+=1;});return {candidate,score};}).filter((row)=>row.score>0).sort((a,b)=>b.score-a.score).map(({candidate})=>({data:{project_id:projectIdentity(candidate)},project:candidate}));
  }
  if(!selected.length&&mode!=='selected'){
    const category=projectCategoryIdentity(project);selected=visible.filter((candidate)=>projectCategoryIdentity(candidate)===category).map((candidate)=>({data:{project_id:projectIdentity(candidate)},project:candidate}));
  }
  if(!selected.length&&mode!=='selected') selected=visible.map((candidate)=>({data:{project_id:projectIdentity(candidate)},project:candidate}));
  const max=Math.max(1,Math.min(6,Number(block.max_items||3))),effective={...block,items:selected.slice(0,max).map(({data,project:candidate},index)=>({id:data.id||`project-related-${index+1}`,project_id:projectIdentity(candidate),title:data.title||'',description:data.description||'',action_label:data.action_label||''}))};
  const node=createRelatedProjectsBlock(effective);if(node)node.classList.add('case-block','case-related-projects');return node;
}
const PUBLIC_CASE_BLOCK_REGISTRY=Object.freeze({
  media_full:(project,block,items)=>createCaseFullMediaBlock(project,block,items),
  split:(project,block,items)=>createCaseSplitBlock(project,block,items),
  duo:(project,block,items)=>createCaseDuoBlock(project,block,items),
  video:(project,block,items)=>createCaseVideoBlock(project,block,items),
  text:(_project,block)=>createCaseTextBlock(block),
  lettering:(_project,block)=>createCaseLetteringBlock(block),
  related_projects:(project,block)=>projectRelatedBlock(project,block),
  next_project:(project,block)=>createNextProjectBlock(project,block),
});

function renderProjectCase(project,items){
  const root=$('#projectCaseBlocks'); const head=$('#projectDetailHead'); const stream=$('#projectMediaList'); if(!root||!head||!stream)return;
  root.replaceChildren(); head.hidden=false; stream.hidden=false; stream.replaceChildren();
  const commercialConfig=normalizedProjectCommercial(project),commercial=createProjectCommercialBlock(project);if(commercial){applyComponentStateFrame(commercial,{});applyMotionPublicFrame(commercial,{});}let commercialInserted=false;
  const insertCommercial=(position)=>{if(!commercial||commercialInserted||commercialConfig.position!==position)return;root.append(commercial);commercialInserted=true;};
  publicCaseBlocks(project).forEach((block)=>{
    if(block.type==='case_header'){head.hidden=false;applyCaseHeaderPresentation(project,block,head);applyComponentStateFrame(head,block);applyMotionPublicFrame(head,block);root.append(head);insertCommercial('after_header');return;}
    if(block.type==='media_stream'){
      stream.hidden=block.visible===false;
      if(block.visible===false) stream.replaceChildren();
      else renderLegacyMediaStream(project,items,block.captions!==false,stream);
      applyComponentStateFrame(stream,block);applyMotionPublicFrame(stream,block);
      root.append(stream);insertCommercial('after_media');return;
    }
    if(block.visible===false)return;
    if(block.type==='next_project')insertCommercial('before_next');
    const renderer=PUBLIC_CASE_BLOCK_REGISTRY[block.type];
    const node=renderer?renderer(project,block,items):null;
    if(node){node.dataset.caseBlockId=block.id||'';applyComponentStateFrame(node,block);applyMotionPublicFrame(node,block);root.append(node);}

  });
  if(commercial&&!commercialInserted)root.append(commercial);
}

function openProjectDetail(project) {
  const gallery = galleryFor(project);
  const items = Array.isArray(gallery.items) && gallery.items.length ? gallery.items : [project];
  if ((!project.case_builder || !Array.isArray(project.case_builder.blocks)) && gallery.case_builder) project.case_builder = gallery.case_builder;
  const detail = $('#projectDetail');
  const grid = $('#grid');
  const empty = $('#empty');
  const fullscreen = (visualLayout.project_viewer || 'fullscreen') === 'fullscreen';
  detail.dataset.projectId = String(project.project_id || project.id || project.gallery_id || '');
  projectScrollY = scrollY;
  detail.classList.toggle('is-fullscreen', fullscreen);
  document.body.classList.toggle('project-viewer-open', fullscreen);
  if (!fullscreen) { grid.hidden = true; empty.hidden = true; $('#sectionPage')?.toggleAttribute('hidden', true); }
  detail.hidden = false;
  $('#projectEyebrow').textContent = project.section_title || project.category || 'Projeto';
  $('#projectDetailTitle').textContent = project.title || gallery.title || 'Projeto';
  $('#projectDetailDescription').textContent = project.description || '';
  $('#projectDetailDescription').hidden = !project.description;
  $('#projectDetailCount').textContent = `${items.length} ${items.length === 1 ? 'mídia' : 'mídias'}`;
  const introMedia = $('#projectDetailIntroMedia');
  if (introMedia) {
    introMedia.replaceChildren();
    const cover = items.find((item) => String(item.id) === String(project.cover_media_id || '')) || items[0] || project;
    if (cover) {
      const intro = poster(cover, { eager:true });
      introMedia.append(intro);
    }
    introMedia.hidden = !cover;
  }
  renderProjectCase(project, items);
  startManualProjectDrivePlaybackWatch();
  bindReveal();
  if (fullscreen) detail.scrollTop = 0;
  else detail.scrollIntoView({ behavior: 'auto', block: 'start' });
  tick();
  setupServiceOfferNotification();
}
function closeProjectDetail(scroll = true) {
  const detail = $('#projectDetail');
  const grid = $('#grid');
  if (!detail || !grid) return;
  if (detail.hidden) return;
  const fullscreen = detail.classList.contains('is-fullscreen');
  detail.hidden = true;
  delete detail.dataset.projectId;
  detail.classList.remove('is-fullscreen');
  document.body.classList.remove('project-viewer-open');
  stopManualProjectDrivePlaybackWatch();
  $('#projectMediaList')?.replaceChildren();
  if (active !== 'all' && sectionPageConfig(active)?.enabled !== false) { renderSectionPage(active); } else { grid.hidden = false; }
  if (!fullscreen && scroll) $('#projects').scrollIntoView({ behavior: 'auto', block: 'start' });
  if (fullscreen && Math.abs(scrollY - projectScrollY) > 2) scrollTo({ top: projectScrollY, behavior: 'auto' });
  setupServiceOfferNotification();
}

function galleryFor(project) {
  const embedded = Array.isArray(project.gallery_items)
    ? project.gallery_items.filter((item) => item && item.id)
    : [];
  if (embedded.length) {
    return {
      id: project.gallery_id || project.id,
      title: project.gallery_title || project.title,
      case_builder: project.case_builder || {},
      items: embedded,
    };
  }
  const gallery = DATA.galleries?.[project.gallery_id];
  if (gallery?.items?.length) return gallery;
  return { id: project.gallery_id || project.id, title: project.gallery_title || project.title, case_builder: project.case_builder || {}, items: [project] };
}

function openMedia(project) {
  return openMediaAt(project, null);
}

function openMediaAt(project, requestedIndex = null) {
  const gallery = galleryFor(project);
  activeGallery = Array.isArray(gallery.items) && gallery.items.length ? gallery.items : [project];
  activeGalleryTitle = gallery.title || project.title;
  const coverId = project.cover_media_id || project.id;
  const coverIndex = activeGallery.findIndex((item) => item.id === coverId);
  activeGalleryIndex = Number.isInteger(requestedIndex) && requestedIndex >= 0 && requestedIndex < activeGallery.length
    ? requestedIndex
    : (coverIndex >= 0 ? coverIndex : 0);

  document.body.classList.add('lightbox-open');
  $('#lightbox').classList.add('open');
  $('#lightbox').setAttribute('aria-hidden', 'false');
  renderGalleryStrip();
  renderGalleryItem();
}

function viewerUnavailable(project, reason = 'A mídia não pôde ser aberta.') {
  const box = document.createElement('div');
  box.className = 'viewer-unavailable';
  const title = document.createElement('strong'); title.textContent = project.title || 'Mídia indisponível';
  const copy = document.createElement('span'); copy.textContent = reason;
  box.append(title, copy);
  return box;
}
function viewerLoading() { const node=document.createElement('div'); node.className='viewer-loading'; node.innerHTML='<i></i><span>Carregando mídia…</span>'; return node; }
function renderGalleryItem() {
  const project = activeGallery[activeGalleryIndex];
  if (!project) return;
  const stage = $('#stage');
  applyMediaGeometry(stage, project);
  stage.replaceChildren();
  const loading = viewerLoading(); stage.append(loading);
  $('#lightboxTitle').textContent = project.title || activeGalleryTitle || 'Projeto';
  const lightboxDescription = $('#lightboxDescription');
  if (lightboxDescription) { lightboxDescription.textContent = project.description || ''; lightboxDescription.hidden = !project.description; }
  const counter = $('#lightboxCounter');
  if (counter) counter.textContent = `${activeGalleryIndex + 1} / ${Math.max(activeGallery.length, 1)}`;

  const finish = (node) => { if (loading.isConnected) loading.remove(); if (node && !node.isConnected) stage.append(node); };
  let media = null;
  if (project.type === 'image') {
    const sources = uniqueUrls([project.media_url, ...(project.media_candidates || []), project.thumbnail_url, ...(project.thumbnail_candidates || [])]);
    if (!sources.length) { finish(viewerUnavailable(project)); }
    else {
      media = document.createElement('img'); media.alt = project.title || ''; media.decoding='async'; media.className='viewer-media';
      let sourceIndex=0; let imageTimer=null;
      const next=()=>{ clearTimeout(imageTimer); if(sourceIndex>=sources.length){ media.remove(); finish(viewerUnavailable(project,'Nenhuma das URLs públicas da imagem respondeu.')); return; } media.src=sources[sourceIndex++]; imageTimer=setTimeout(next,9000); };
      media.addEventListener('load',()=>{clearTimeout(imageTimer);finish(media);},{once:true}); media.addEventListener('error',next); stage.append(media); next();
    }
  } else if (project.type === 'video') {
    const sources = videoSourceCandidates(project);
    if (sources.length || videoChunkCandidates(project).length) {
      media = createResilientVideo(project, { autoplay:true, muted:false, loop:false, controls:true, preload:'metadata', className:'viewer-media', exhausted:() => {
        media.remove();
        const fallback = projectVideoFallback(project,{autoplay:true});
        fallback.classList.add('viewer-media');
        finish(fallback);
      }, timeoutMs:45000, metadataReady:false });
      stage.append(media);
      const ready=()=>finish(media);
      media.addEventListener('loadeddata',ready,{once:true});
      media.addEventListener('canplay',ready,{once:true});
    } else { const fallback=projectVideoFallback(project,{autoplay:true}); fallback.classList.add('viewer-media'); finish(fallback); }
  } else {
    const frame=driveFrame(project);
    if(frame && frame.tagName==='IFRAME'){frame.classList.add('viewer-media');frame.addEventListener('load',()=>finish(frame),{once:true});stage.append(frame);setTimeout(()=>finish(frame),2200);} else finish(viewerUnavailable(project));
  }

  const hasMultiple = activeGallery.length > 1;
  $('#prevMedia')?.toggleAttribute('hidden', !hasMultiple);
  $('#nextMedia')?.toggleAttribute('hidden', !hasMultiple);
  [...document.querySelectorAll('[data-gallery-index]')].forEach((node) => node.classList.toggle('is-active', Number(node.dataset.galleryIndex) === activeGalleryIndex));
}

function renderGalleryStrip() {
  const strip = $('#galleryStrip');
  if (!strip) return;
  strip.replaceChildren();
  strip.hidden = activeGallery.length <= 1;
  activeGallery.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-thumb';
    button.dataset.galleryIndex = String(index);
    button.setAttribute('aria-label', `Abrir ${item.title}`);
    if (item.type === 'image' || item.thumbnail_url || (item.thumbnail_candidates || []).length) {
      button.append(imageWithFallback(item, [item.thumbnail_url, ...(item.thumbnail_candidates || [])]));
    } else {
      const label = document.createElement('span');
      label.textContent = item.type === 'video' ? 'PLAY' : 'PDF';
      button.append(label);
    }
    button.addEventListener('click', () => {
      activeGalleryIndex = index;
      renderGalleryItem();
    });
    strip.append(button);
  });
}

function changeGallery(direction) {
  if (activeGallery.length <= 1) return;
  activeGalleryIndex = (activeGalleryIndex + direction + activeGallery.length) % activeGallery.length;
  renderGalleryItem();
}

function driveFrame(project) {
  if (project?.type === 'video') return projectVideoFallback(project);
  const source = project.preview_url || (project.preview_candidates || [])[0] || project.external_url;
  if (!source) return poster(project);
  const frame = document.createElement('iframe');
  frame.src = source;
  frame.title = project.title;
  frame.allow = 'autoplay; fullscreen; encrypted-media';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.loading = 'eager';
  return frame;
}

function fallbackFrame(project, node) {
  node.replaceWith(driveFrame(project));
}

function closeMedia() {
  $('#lightbox').classList.remove('open');
  $('#lightbox').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('lightbox-open');
  $('#stage').replaceChildren();
  $('#galleryStrip')?.replaceChildren();
  activeGallery = [];
  activeGalleryIndex = 0;
}

$('#projectBack')?.addEventListener('click', () => closeProjectDetail(true));
addEventListener('popstate', () => { const section=sectionFromLocation(); const ids=new Set(publicPortfolioFilterItems().map((item)=>String(item.id))); select(section && ids.has(String(section)) ? section : 'all', false); });
$('#close').addEventListener('click', closeMedia);
$('#prevMedia')?.addEventListener('click', () => changeGallery(-1));
$('#nextMedia')?.addEventListener('click', () => changeGallery(1));
$('#lightbox').addEventListener('click', (event) => { if (event.target === $('#lightbox')) closeMedia(); });
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && $('#lightbox').classList.contains('open')) {
    closeMedia();
    return;
  }
  if (event.key === 'Escape' && !$('#projectDetail')?.hidden) {
    closeProjectDetail(true);
    return;
  }
  if (!$('#lightbox').classList.contains('open')) return;
  if (event.key === 'ArrowLeft') changeGallery(-1);
  if (event.key === 'ArrowRight') changeGallery(1);
});
$('#menu')?.addEventListener('click', () => { if(currentCustomPage()){location.href='/#projectsBlock';return;} ($('#projectsBlock') || $('#portfolioHeading'))?.scrollIntoView({ behavior: 'auto' }); });

let texturedRevealObserver=null;
let texturedRevealRaf=0;
let texturedRevealScrollBound=false;
function setTexturedRevealProgress(section,progress,channel='scroll'){
  const value=clamp(Number(progress)||0,0,1),baseTexture=Math.max(0,Math.min(1,Number(section.dataset.texturedTextureOpacity||.34)));
  section.style.setProperty(channel==='replay'?'--sf-textured-replay-progress':'--sf-textured-scroll-progress',value.toFixed(3));
  section.style.setProperty('--sf-textured-content-offset',`${((1-value)*28).toFixed(2)}px`);
  section.style.setProperty('--sf-textured-texture-offset',`${((1-value)*32).toFixed(2)}px`);
  section.style.setProperty('--sf-textured-texture-scale',(.96+value*.04).toFixed(4));
  section.style.setProperty('--sf-textured-texture-opacity',(baseTexture*value).toFixed(3));
}
function updateTexturedRevealScrollProgress(){
  texturedRevealRaf=0;const viewport=Math.max(innerHeight||0,document.documentElement.clientHeight||0,1);
  document.querySelectorAll('[data-textured-reveal][data-textured-progress-mode="tied_to_scroll"]').forEach((section)=>{const rect=section.getBoundingClientRect();if(rect.bottom<0||rect.top>viewport)return;setTexturedRevealProgress(section,(viewport*.9-rect.top)/(viewport*.76),'scroll');});
}
function queueTexturedRevealProgress(){if(!texturedRevealRaf)texturedRevealRaf=requestAnimationFrame(updateTexturedRevealScrollProgress);}
function setupTexturedRevealBlocks(){
  texturedRevealObserver?.disconnect();texturedRevealObserver=null;const nodes=[...document.querySelectorAll('[data-textured-reveal]')];if(!nodes.length)return;
  if(reduced||document.body.dataset.motion==='off'){nodes.forEach((section)=>{setTexturedRevealProgress(section,1,'scroll');setTexturedRevealProgress(section,1,'replay');section.classList.add('is-visible');});return;}
  const replay=nodes.filter((section)=>section.dataset.texturedProgressMode==='replay');if(replay.length&&'IntersectionObserver' in window){texturedRevealObserver=new IntersectionObserver((entries)=>{entries.forEach((entry)=>setTexturedRevealProgress(entry.target,entry.isIntersecting&&entry.intersectionRatio>.12?1:0,'replay'));},{threshold:[0,.12,.3,.6]});replay.forEach((section)=>texturedRevealObserver.observe(section));}
  if(!texturedRevealScrollBound){addEventListener('scroll',queueTexturedRevealProgress,{passive:true});addEventListener('resize',queueTexturedRevealProgress,{passive:true});texturedRevealScrollBound=true;}queueTexturedRevealProgress();
}

function bindReveal() {
  setupTexturedRevealBlocks();
  if (revealObserver) revealObserver.disconnect();
  document.querySelectorAll('[data-section-motion]').forEach((section)=>{const content=[...section.children].filter((child)=>!child.classList?.contains('sf-section-visual-layer')).slice(0,12);content.forEach((child,index)=>{child.classList.add('sf-motion-child');child.style.setProperty('--sf-stagger-index',String(index));});content[0]?.classList.toggle('sf-sticky-content',section.dataset.sectionSticky==='content');if(section.dataset.sectionMotion==='none')section.classList.add('is-visible');else section.classList.add('reveal');});
  const nodes = [...document.querySelectorAll('.reveal:not(.is-visible)')];
  const revealOff = document.body.dataset.reveal === 'off' || document.body.dataset.motion === 'off';
  if (reduced || revealOff || !('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return;
  }
  revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -7% 0px' });
  nodes.forEach((node) => revealObserver.observe(node));
}

let queued = false;
let ambientPointerX = .72;
let ambientPointerY = .28;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
function parallaxScale() {
  if (reduced || document.body.dataset.motion === 'off') return 0;
  const strength = visualLayout.parallax_strength || 'medium';
  return ({ off: 0, soft: .55, medium: 1, strong: 1.55 })[strength] ?? 1;
}
function motionScale() {
  if (reduced || document.body.dataset.motion === 'off') return 0;
  return document.body.dataset.motion === 'subtle' ? .55 : 1;
}
function updateParallax() {
  const scale = parallaxScale();
  document.querySelectorAll('[data-parallax]').forEach((node) => {
    if (!scale) {
      node.style.setProperty('--parallax-y', '0px');
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.bottom < -100 || rect.top > innerHeight + 100) return;
    const normalized = clamp((rect.top + rect.height / 2 - innerHeight / 2) / innerHeight, -1.2, 1.2);
    const range = node.dataset.parallax === 'detail' ? 28 : (({soft:12,medium:24,strong:38})[node.dataset.parallaxStrength]||18);
    node.style.setProperty('--parallax-y', `${(-normalized * range * scale).toFixed(2)}px`);
    const texture=node.querySelector(':scope > .sf-section-texture-layer[data-texture-attachment="parallax"]');if(texture)texture.style.setProperty('--sf-texture-y',`${(-normalized*range*.65*scale).toFixed(2)}px`);
  });
  document.querySelectorAll('[data-parallax-text]').forEach((node) => {
    if (!scale) {
      node.style.transform = '';
      return;
    }
    const rect = node.getBoundingClientRect();
    if (rect.bottom < -100 || rect.top > innerHeight + 100) return;
    const normalized = clamp((rect.top + rect.height / 2 - innerHeight / 2) / innerHeight, -1, 1);
    const range = Number(node.dataset.parallaxText || 10);
    node.style.transform = `translate3d(0,${(-normalized * range * scale).toFixed(2)}px,0)`;
  });
}
function updateLetteringAndAmbient() {
  const lettering = $('#lettering');
  const track = $('#letteringTrack');
  if (lettering && track && !lettering.hidden) {
    const rect = lettering.getBoundingClientRect();
    const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1);
    const speed = ({ soft: .45, medium: .8, strong: 1.2 })[lettering.dataset.speed || 'medium'] || .8;
    const direction = lettering.dataset.direction === 'right' ? 1 : -1;
    const travel = (progress - .5) * Math.min(innerWidth * .28, 360) * speed * direction;
    track.style.setProperty('--lettering-x', reduced || document.body.dataset.motion === 'off' ? '0px' : `${travel.toFixed(2)}px`);
    lettering.style.setProperty('--lettering-progress', progress.toFixed(3));
  }

  document.querySelectorAll('[data-modular-lettering]').forEach((customTrack) => {
    const section = customTrack.closest('.block-lettering');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1);
    const direction = section.dataset.direction === 'right' ? 1 : -1;
    const travel = (progress - .5) * Math.min(innerWidth * .24, 320) * direction;
    customTrack.style.setProperty('--lettering-x', reduced || document.body.dataset.motion === 'off' ? '0px' : `${travel.toFixed(2)}px`);
  });

  document.querySelectorAll('[data-case-lettering]').forEach((customTrack) => {
    const section = customTrack.closest('.case-lettering');
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const progress = clamp((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1);
    const direction = section.dataset.direction === 'right' ? 1 : -1;
    const travel = (progress - .5) * Math.min(innerWidth * .24, 320) * direction;
    customTrack.style.setProperty('--lettering-x', reduced || document.body.dataset.motion === 'off' ? '0px' : `${travel.toFixed(2)}px`);
  });

  const ambient = $('#ambientLayer');
  const ambientMode = document.body.dataset.backgroundMotion || document.body.dataset.ambient || 'medium';
  if (ambient) {
    const power = ({ off: 0, soft: .45, medium: .72, strong: 1 })[ambientMode] ?? .72;
    const pageProgress = clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
    ambient.style.setProperty('--ambient-x', `${(ambientPointerX * 100).toFixed(1)}%`);
    ambient.style.setProperty('--ambient-y', `${(ambientPointerY * 100).toFixed(1)}%`);
    ambient.style.setProperty('--ambient-shift', `${((pageProgress - .5) * 18).toFixed(2)}vh`);
    ambient.style.setProperty('--ambient-power', String(reduced ? 0 : power));
  }
  const atmosphere=$('#editorialAtmosphere');
  const pageProgress=clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));
  if(atmosphere){
    atmosphere.style.setProperty('--atmosphere-progress',pageProgress.toFixed(4));
    atmosphere.style.setProperty('--atmosphere-y',`${((pageProgress-.5)*26).toFixed(2)}vh`);
    atmosphere.style.setProperty('--atmosphere-x',`${((ambientPointerX-.5)*8).toFixed(2)}vw`);
  }
  if(document.body.dataset.backgroundStyle==='luminous'){
    const motionOff=reduced||document.body.dataset.backgroundMotion==='off';
    const finePointer=!motionOff&&matchMedia('(hover:hover) and (pointer:fine)').matches;
    const lx=motionOff ? .72 :(finePointer?ambientPointerX:(.5+Math.sin(pageProgress*Math.PI*2)*.18));
    const ly=motionOff ? .28 :(finePointer?ambientPointerY:(.18+pageProgress*.64));
    const sx=motionOff ? .18 :(.82-(pageProgress*.22));
    const sy=motionOff ? .78 :(.78-(pageProgress*.48));
    document.documentElement.style.setProperty('--luminous-x',`${(clamp(lx)*100).toFixed(1)}%`);
    document.documentElement.style.setProperty('--luminous-y',`${(clamp(ly)*100).toFixed(1)}%`);
    document.documentElement.style.setProperty('--luminous-secondary-x',`${(clamp(sx)*100).toFixed(1)}%`);
    document.documentElement.style.setProperty('--luminous-secondary-y',`${(clamp(sy)*100).toFixed(1)}%`);
    document.documentElement.style.setProperty('--luminous-opacity',String(motionOff ? .52 :(.68+Math.sin(pageProgress*Math.PI)*.18).toFixed(3)));
  }
}

function motion() {
  queued = false;
  const detail = $('#projectDetail');
  const viewerOpen = Boolean(detail && !detail.hidden && detail.classList.contains('is-fullscreen'));
  const height = innerHeight;
  const y = viewerOpen ? detail.scrollTop : scrollY;
  const max = viewerOpen
    ? Math.max(1, detail.scrollHeight - detail.clientHeight)
    : Math.max(1, document.documentElement.scrollHeight - height);
  $('#progress').style.transform = `scaleX(${clamp(y / max)})`;
  $('#header').classList.toggle('is-scrolled', !viewerOpen && y > 18);
  const m = motionScale();
  const heroNode = $('#hero');
  const heroRect = heroNode?.getBoundingClientRect();
  const heroLocalY = heroRect ? clamp(-heroRect.top, 0, Math.max(heroRect.height, height) * 1.2) : 0;
  const heroInRange = Boolean(heroRect && heroRect.bottom > -height * .15 && heroRect.top < height);
  if (m && !viewerOpen && heroInRange && (heroNode?.dataset.effect || 'cinematic') !== 'static') {
    const heroProgress = clamp(heroLocalY / (Math.max(heroRect?.height || height, height * .7) * .92));
    updateHeroStoryScroll(heroProgress);
    $('#heroTitle').style.transform = `translate3d(0,${-heroLocalY * .14 * m}px,0) scale(${1 - heroProgress * .025 * m})`;
    $('#heroTitle').style.opacity = String(1 - heroProgress * .86);
    document.querySelector('.hero-copy').style.transform = `translate3d(0,${-heroLocalY * .07 * m}px,0)`;
    document.querySelector('.hero-copy').style.opacity = String(1 - heroProgress * .7);
    const heroMedia = $('#heroMedia');
    const heroEffect = heroNode?.dataset.effect || 'cinematic';
    if (heroMedia) {
      const translateFactor = heroEffect === 'zoom' ? 0 : (heroEffect === 'parallax' ? .085 : .055);
      const zoomFactor = heroEffect === 'zoom' ? .055 : 0;
      const zoomTransform = zoomFactor > 0 ? ` scale(${1 + heroProgress * zoomFactor * m})` : '';
      heroMedia.style.transform = `translate3d(0,${heroLocalY * translateFactor * m}px,0)${zoomTransform}`;
      heroMedia.style.setProperty('--sf-hero-product-y',`${heroLocalY * translateFactor * m}px`);
      heroMedia.style.setProperty('--sf-hero-product-scale',String(1 + heroProgress * zoomFactor * m));
      heroMedia.dataset.scrollRuntime = heroEffect === 'zoom' ? 'product-zoom' : heroEffect;
      heroMedia.dataset.scrollProgress = heroProgress.toFixed(4);
    }
  } else if (!viewerOpen) {
    $('#heroTitle').style.transform = '';
    $('#heroTitle').style.opacity = '';
    document.querySelector('.hero-copy').style.transform = '';
    document.querySelector('.hero-copy').style.opacity = '';
    const heroMedia=$('#heroMedia'),heroEffect=heroNode?.dataset.effect||'cinematic';
    // Keep the final product-zoom frame after the Hero leaves the viewport so
    // it does not snap back while the user continues down the page. Explicit
    // motion-off, reduced-motion and static Hero remain authoritative.
    if(heroMedia&&(!m||heroEffect==='static'||!heroRect||heroRect.top>=height)){
      heroMedia.style.transform='';
      heroMedia.style.removeProperty('--sf-hero-product-y');
      heroMedia.style.removeProperty('--sf-hero-product-scale');
      heroMedia.dataset.scrollRuntime=!m?'disabled':'static';
      heroMedia.dataset.scrollProgress='0.0000';
    }
  }
  updateParallax();
  updateLetteringAndAmbient();
}
function tick() { if (!queued) { queued = true; requestAnimationFrame(motion); } }
function bindMotion() {
  if (!reduced && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    addEventListener('pointermove', (event) => {
      ambientPointerX = clamp(event.clientX / Math.max(innerWidth, 1));
      ambientPointerY = clamp(event.clientY / Math.max(innerHeight, 1));
      tick();
    }, { passive: true });
  }
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick, { passive: true });
  $('#projectDetail')?.addEventListener('scroll', tick, { passive: true });
  bindReveal();
  tick();
}

$('#siteMenuTrigger')?.addEventListener('click',()=>$('#sideMenu')?.classList.contains('is-open')?closeSideMenu():openSideMenu());
$('#sideMenuClose')?.addEventListener('click',closeSideMenu);
$('#sideMenu')?.addEventListener('click',(event)=>{if(event.target.closest('[data-side-menu-close]'))closeSideMenu();});
$('#sideMenuLinks')?.addEventListener('click',(event)=>{
  const button=event.target.closest('.side-menu-link');if(!button)return;
  const filterId=button.dataset.filterId||'';
  const targetValue=button.dataset.target||'';closeSideMenu();
  if(filterId && !currentCustomPage() && (location.pathname==='/' || /\/index\.html$/.test(location.pathname))){select(filterId,true);return;}
  if(/^\//.test(targetValue)){ location.href=targetValue; return; }
  if(/^https?:\/\//i.test(targetValue)){ location.href=targetValue; return; }
  if(targetValue.startsWith('#')){ const target=document.querySelector(targetValue);target?.scrollIntoView({behavior:'auto',block:'start'}); }
});
addEventListener('keydown',(event)=>{if(event.key==='Escape')closeSideMenu()});

function heroActionForProject(project={}) {
  const type=['project','section','internal_url','external_url','none'].includes(String(project._hero_action_type||'project'))?String(project._hero_action_type||'project'):'project';
  const raw=String(project._hero_action_url||'').trim();
  if(type==='none')return {enabled:false,type,label:'Banner sem ação'};
  if(type==='project'){
    const explicit=String(project._hero_action_project_id||'').trim();
    const target=explicit?projectForBlock(explicit):(!project._hero_standalone?project:null);
    return target?{enabled:true,type,target,label:`Abrir projeto ${target.title||project.title||''}`.trim()}:{enabled:false,type,label:'Projeto não encontrado'};
  }
  if(type==='section'){
    const target=raw.startsWith('#')?raw:(raw.startsWith('/#')?raw:`#${raw.replace(/^#+/,'')}`);
    return raw?{enabled:true,type,url:target,label:'Ir para seção do site'}:{enabled:false,type,label:'Seção não configurada'};
  }
  if(type==='internal_url')return (raw.startsWith('/')||raw.startsWith('#'))?{enabled:true,type,url:raw,label:'Abrir link interno'}:{enabled:false,type,label:'Link interno inválido'};
  if(type==='external_url'){
    try{const parsed=new URL(raw);if(['https:','http:'].includes(parsed.protocol))return {enabled:true,type,url:parsed.href,label:'Abrir link externo'};}catch(_error){}
  }
  return {enabled:false,type,label:'Destino do banner inválido'};
}
function navigateHeroProjectTarget(project={}) {
  const projectId=String(project.project_id||project.id||project.gallery_id||'').trim();
  if(!projectId)return false;
  const homePath=location.pathname==='/'||/\/index\.html$/.test(location.pathname);
  if(!homePath){location.href=`/?sf_project=${encodeURIComponent(projectId)}#projectsBlock`;return true;}
  const sectionId=String(project.section_id||project.physical_category_id||project.category_id||'').trim();
  const availableFilters=new Set(publicPortfolioFilterItems().map((item)=>String(item.id)));
  if(sectionId&&availableFilters.has(sectionId))select(sectionId,false);
  else if(active!=='all')select('all',false);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const selector=`[data-project-id="${CSS.escape(projectId)}"]`;
    const cardNode=document.querySelector(`#grid ${selector}, #sectionPage ${selector}, .section-page-projects ${selector}`);
    const target=cardNode||$('#projectsBlock')||$('#portfolioHeading');
    target?.scrollIntoView({behavior:'auto',block:cardNode?'center':'start'});
    if(cardNode){cardNode.classList.add('hero-target-project');setTimeout(()=>cardNode.classList.remove('hero-target-project'),1600);try{cardNode.focus({preventScroll:true});}catch(_error){}}
  }));
  return true;
}
function focusRequestedHeroProject(){const id=new URLSearchParams(location.search).get('sf_project');if(!id)return;const project=(DATA.projects||[]).find((item)=>String(item.project_id||item.id||item.gallery_id||'')===String(id));if(project)navigateHeroProjectTarget(project);}
function openActiveHeroProject() {
  if (visualLayout.hero_expand === false) return;
  const project = heroProjects[heroIndex];
  if (!project) return;
  const action=heroActionForProject(project);if(!action.enabled)return;
  if(action.type==='project'){navigateHeroProjectTarget(action.target);return;}
  if(action.type==='section'){
    if(action.url.startsWith('/#')){location.href=action.url;return;}
    const target=document.querySelector(action.url);if(target){target.scrollIntoView({behavior:'auto',block:'start'});history.replaceState(null,'',action.url);return;}
    location.href=action.url;return;
  }
  if(action.type==='internal_url'){location.href=action.url;return;}
  if(action.type==='external_url'){window.open(action.url,'_blank','noopener');}
}

$('#heroOpen')?.addEventListener('click', (event) => {
  event.stopPropagation();
  openActiveHeroProject();
});
$('#hero')?.addEventListener('click', (event) => {
  if (visualLayout.hero_expand === false) return;
  if (event.target.closest('button,a,video,iframe')) return;
  openActiveHeroProject();
});

addEventListener('load',()=>{if(new URLSearchParams(location.search).has('sf_project'))setTimeout(focusRequestedHeroProject,60);},{once:true});

const EDITOR_PREVIEW_METRICS={patches:0,failed:0,targetedRenders:0,lastRevision:''};
if(IS_EDITOR_PREVIEW) window.__STUDIOFRAME_PREVIEW_METRICS__=EDITOR_PREVIEW_METRICS;
function previewJson(value){try{return JSON.stringify(value??null);}catch(_){return '';}}
function previewHomeBlocksFor(builder={}){
  const defaults=[
    {id:'core-hero',type:'hero',visible:true,core:true,section_size:'viewport',section_width:'full'},
    {id:'core-intro',type:'intro',visible:true,core:true,section_size:'normal',section_width:'full'},
    {id:'core-lettering',type:'lettering',visible:true,core:true,section_size:'normal',section_width:'full'},
    {id:'core-projects',type:'projects',visible:true,core:true,section_size:'normal',section_width:'full',grid_columns:'3'},
    {id:'youtube-showcase-main',type:'youtube_showcase',label:'YouTube Showcase',visible:true,youtube_url:'https://www.youtube.com/watch?v=G_2jdXfXxiI',title:'',body:'',primary_cta_label:'Assistir',youtube_cta_label:'Ver no YouTube',channel_url:'',channel_cta_label:'Conheça o canal',show_external_link:true,show_channel_link:false,ratio:'16:9',width:'wide',section_size:'normal',section_width:'wide',section_background:'none'},
    {id:'core-about',type:'about',visible:true,core:true,section_size:'normal',section_width:'full'},
    {id:'core-contact',type:'contact',visible:true,core:true,section_size:'normal',section_width:'full'},
  ];
  const blocks=builder?.home?.blocks;
  return Array.isArray(blocks)?blocks.filter((b)=>b&&b.type).map((b)=>({section_size:'normal',section_width:'full',section_background:'none',...b})):defaults;
}
function previewHomeStructure(builder={}){return previewHomeBlocksFor(builder).map((b)=>[b.id||'',b.type||'',b.visible!==false]);}
function patchHomeCompositionInPlace(previousBuilder={},nextBuilder={}){
  const before=previewHomeBlocksFor(previousBuilder),after=previewHomeBlocksFor(nextBuilder);
  if(previewJson(previewHomeStructure(previousBuilder))!==previewJson(previewHomeStructure(nextBuilder)))return false;
  const beforeById=new Map(before.map((b)=>[String(b.id||''),b]));
  for(const block of after){
    const coreId=CORE_HOME_BLOCK_IDS[block.type];
    if(coreId){const node=document.getElementById(coreId);if(!node)continue;applyHomeSectionFrame(node,block);applyCoreBlockOverrides(node,block,nextBuilder);node.hidden=!coreHomeBlockHasVisibleContent(node,block);continue;}
    const id=String(block.id||''), previous=beforeById.get(id); if(previewJson(previous)===previewJson(block))continue;
    const current=document.querySelector(`[data-home-block-id="${CSS.escape(id)}"]`), replacement=createCustomHomeBlock(block);
    if(current&&replacement){replacement.id=current.id;current.replaceWith(replacement);EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
    else if(current&&!replacement){current.remove();EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
    else if(!current&&replacement){$('#top')?.append(replacement);EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
  }
  bindReveal();tick();return true;
}
function heroSourceSignature(builder={}){const h=builder.hero||{};return previewJson({media_id:h.media_id||'',mobile_media_id:h.mobile_media_id||'',slides:h.slides||[],story:h.story||{},autoplay:h.autoplay,rotation_seconds:h.rotation_seconds});}
function applyEditorPreviewPatch(payload={}){
  if(!IS_EDITOR_PREVIEW)return;
  const previousBuilder=DATA.site_builder||{},previousIdentity=DATA.identity||{};
  const nextBuilder=payload.site_builder&&typeof payload.site_builder==='object'?payload.site_builder:previousBuilder;
  const nextIdentity=payload.identity&&typeof payload.identity==='object'?payload.identity:previousIdentity;
  const homeStructureChanged=previewJson(previewHomeStructure(previousBuilder))!==previewJson(previewHomeStructure(nextBuilder));
  DATA.site_builder=nextBuilder;DATA.identity=nextIdentity;renderSiteBuilder();
  if(previewJson(previousBuilder.hero?.gsap_scroll)!==previewJson(nextBuilder.hero?.gsap_scroll)){if(sfImmersiveV31Enabled())setupImmersiveV31();else setupHeroGsapScroll();}
  if(previewJson(previousBuilder.three_d_scene)!==previewJson(nextBuilder.three_d_scene)){if(sfImmersiveV31Enabled())setupImmersiveV31();else setupThreeDSceneV91();}
  if(previewJson(previousBuilder.phaser_scene)!==previewJson(nextBuilder.phaser_scene))setupPhaserSceneV91();
  const serviceDetail=currentServiceDetail(),servicesPage=isServicesPage(),customPage=currentCustomPage();
  if(serviceDetail){if(previewJson(previousBuilder.services)!==previewJson(nextBuilder.services)){renderServiceDetailPage(serviceDetail.category,serviceDetail.item);EDITOR_PREVIEW_METRICS.targetedRenders+=1;}}
  else if(servicesPage){if(previewJson(previousBuilder.services)!==previewJson(nextBuilder.services)){renderServicesPage();EDITOR_PREVIEW_METRICS.targetedRenders+=1;}}
  else if(customPage){const id=String(customPage.id||''),beforePage=previousBuilder.custom_pages?.[id],nextPage=nextBuilder.custom_pages?.[id];if(previewJson(beforePage)!==previewJson(nextPage)){const current=currentCustomPage();if(current){renderCustomPage(current);EDITOR_PREVIEW_METRICS.targetedRenders+=1;}}}
  else if(sectionFromLocation() && sectionFromLocation()!=='all'){
    const active=sectionFromLocation(),beforePage=previousBuilder.section_pages?.[active],nextPage=nextBuilder.section_pages?.[active];
    if(previewJson(beforePage)!==previewJson(nextPage)){renderSectionPage(active);EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
    if(previewJson(previousBuilder.projects?.filters)!==previewJson(nextBuilder.projects?.filters))renderFilters();
  }
  else{
    if(homeStructureChanged){renderHomeComposition();EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
    else patchHomeCompositionInPlace(previousBuilder,nextBuilder);
    if(previewJson(previousBuilder.projects?.filters)!==previewJson(nextBuilder.projects?.filters))renderFilters();
    if(heroSourceSignature(previousBuilder)!==heroSourceSignature(nextBuilder)){renderHero();EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
    if(previewJson(previousBuilder.audio)!==previewJson(nextBuilder.audio)){setupSiteAudio(nextBuilder.audio||{});EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
  if(previewJson(previousBuilder.showcases)!==previewJson(nextBuilder.showcases)){setupR22ShowcaseHub();EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
    if(previewJson(previousBuilder.services)!==previewJson(nextBuilder.services)){renderServicesHome();EDITOR_PREVIEW_METRICS.targetedRenders+=1;}
    placeHomeHorizontalNavigation();
  }
  if(previewJson(previousBuilder.services)!==previewJson(nextBuilder.services)){loadQuoteState();ensureGlobalQuoteUI();setupServiceOfferNotification();}
  renderSideNavigation();setupSectionNavigator(nextBuilder.section_navigator||{});EDITOR_PREVIEW_METRICS.patches+=1;EDITOR_PREVIEW_METRICS.lastRevision=String(payload.revision||'');
  window.parent?.postMessage({type:'studioframe-preview-applied',revision:payload.revision||'',patches:EDITOR_PREVIEW_METRICS.patches,targeted_renders:EDITOR_PREVIEW_METRICS.targetedRenders},location.origin);
}
function restoreEditorPreviewState(state = {}) {
  const apply = () => {
    const projectId = String(state.project_id || '');
    if (projectId) {
      const project = (DATA.projects || []).find((item) => [item.project_id,item.id,item.gallery_id].some((value) => String(value || '') === projectId));
      const navigation = !project ? (DATA.navigation_nodes || []).find((item) => [item.project_id,item.id,item.gallery_id].some((value) => String(value || '') === projectId)) : null;
      if (project) openProjectDetail(project);
      else if (navigation) openProjectDetail(navigationNodeAsProject(navigation));
      const detail = $('#projectDetail');
      if (detail && !detail.hidden) detail.scrollTop = Math.max(0, Number(state.project_scroll_top || 0));
    }
    scrollTo({ top:Math.max(0,Number(state.top || 0)), left:Math.max(0,Number(state.left || 0)), behavior:'auto' });
  };
  requestAnimationFrame(apply);
  setTimeout(apply, 80);
  setTimeout(apply, 320);
}
addEventListener('message', (event) => {
  if (event.origin !== location.origin) return;
  if (event.data?.type === 'studioframe-restore-preview') { restoreEditorPreviewState(event.data.state || {}); return; }
  if (event.data?.type === 'studioframe-preview-patch') {
    try { applyEditorPreviewPatch(event.data || {}); }
    catch (error) { EDITOR_PREVIEW_METRICS.failed += 1; console.error('Preview patch falhou:',error); window.parent?.postMessage({type:'studioframe-preview-reload-required',reason:`patch-error:${error?.message||error}`},location.origin); }
  }
});


// ============================================================================
// V9.1 PHASE 15B — CANONICAL V9 GAP CLOSURE · PUBLIC RUNTIME
// ============================================================================
const V9_HERO_ADVANCED_MODES=Object.freeze(['standard','sliced_parallax','split_image','clip_reveal','kinetic_collage','grid_tiles']);
let SF_HERO_ADVANCED_CONTROLLER=null,SF_PERFORMANCE_FPS_RAF=0;
function normalizeHeroAdvancedPublic(raw={}){const sync=raw.sync_background&&typeof raw.sync_background==='object'?raw.sync_background:{};return {...raw,enabled:raw.enabled===true,mode:V9_HERO_ADVANCED_MODES.includes(String(raw.mode||''))?String(raw.mode):'standard',slice_count:Math.max(2,Math.min(24,Number(raw.slice_count||7))),axis:raw.axis==='horizontal'?'horizontal':'vertical',gap:Math.max(0,Math.min(30,Number(raw.gap??4))),depth:Math.max(0,Math.min(2,Number(raw.depth??.7))),pointer_strength:Math.max(0,Math.min(2,Number(raw.pointer_strength??.4))),scroll_strength:Math.max(0,Math.min(2,Number(raw.scroll_strength??.35))),clip_preset:['inset','diagonal','circle','polygon'].includes(String(raw.clip_preset||''))?String(raw.clip_preset):'inset',duration:Math.max(.2,Math.min(20,Number(raw.duration??1.4))),sync_background:{enabled:sync.enabled===true,mode:['slide','progress','story'].includes(String(sync.mode||''))?String(sync.mode):'slide',offset:Math.max(-1,Math.min(1,Number(sync.offset||0)))}};}
function sfHeroAdvancedPoster(project={}){const asset=heroAssetForViewport(project)||{};return String((asset.thumbnail_candidates||[])[0]||asset.thumbnail_url||(asset.media_candidates||[])[0]||asset.media_url||'');}
function sfHeroClipPreset(value){if(value==='diagonal')return 'polygon(0 0,92% 0,100% 100%,8% 100%)';if(value==='circle')return 'circle(72% at 50% 50%)';if(value==='polygon')return 'polygon(8% 0,100% 6%,92% 100%,0 92%)';return 'inset(3% 3% 3% 3% round 1.2rem)';}
function sfBuildAdvancedSlices(slide,project,c){slide.querySelector('.sf-hero-advanced-layer')?.remove();if(!c.enabled||c.mode==='standard')return;const layer=document.createElement('div');layer.className=`sf-hero-advanced-layer sf-hero-mode-${c.mode}`;layer.dataset.mode=c.mode;layer.setAttribute('aria-hidden','true');layer.style.setProperty('--sf-hero-advanced-gap',`${c.gap}px`);layer.style.setProperty('--sf-hero-advanced-depth',String(c.depth));layer.style.setProperty('--sf-hero-advanced-duration',`${c.duration}s`);const poster=sfHeroAdvancedPoster(project);if(['sliced_parallax','split_image','grid_tiles'].includes(c.mode)&&poster){const count=c.mode==='split_image'?2:c.slice_count;for(let i=0;i<count;i+=1){const piece=document.createElement('i');piece.className='sf-hero-advanced-piece';piece.style.setProperty('--sf-piece-index',String(i));piece.style.setProperty('--sf-piece-count',String(count));piece.style.backgroundImage=`url("${String(poster).replace(/"/g,'%22')}")`;piece.dataset.axis=c.axis;layer.append(piece);}}else if(c.mode==='kinetic_collage'&&poster){for(let i=0;i<3;i+=1){const piece=document.createElement('i');piece.className='sf-hero-advanced-collage';piece.style.setProperty('--sf-piece-index',String(i));piece.style.backgroundImage=`url("${String(poster).replace(/"/g,'%22')}")`;layer.append(piece);}}else if(c.mode==='clip_reveal'){layer.style.clipPath=sfHeroClipPreset(c.clip_preset);}slide.append(layer);}
function sfRenderHeroAdvancedForActive(){const c=normalizeHeroAdvancedPublic(DATA.site_builder?.hero?.advanced||{}),hero=$('#hero'),slides=[...document.querySelectorAll('.hero-slide')];if(!hero)return;hero.dataset.advancedHero=c.enabled?'true':'false';hero.dataset.advancedMode=c.mode;hero.style.setProperty('--sf-hero-advanced-pointer-x','0px');hero.style.setProperty('--sf-hero-advanced-pointer-y','0px');slides.forEach((slide,index)=>sfBuildAdvancedSlices(slide,heroProjects[index]||{},c));}
function sfEmitHeroBackgroundSync(progress=null){const c=normalizeHeroAdvancedPublic(DATA.site_builder?.hero?.advanced||{});if(!c.enabled||!c.sync_background.enabled)return;const denom=Math.max(1,heroProjects.length-1),base=progress==null?(heroIndex/denom):Number(progress),value=Math.max(0,Math.min(1,base+c.sync_background.offset));window.dispatchEvent(new CustomEvent('studioframe:hero-background-sync',{detail:{index:heroIndex,progress:value,mode:c.sync_background.mode,slide_id:heroProjects[heroIndex]?._hero_slide_id||''}}));}
function setupHeroAdvancedV91(){SF_HERO_ADVANCED_CONTROLLER?.abort?.();const c=normalizeHeroAdvancedPublic(DATA.site_builder?.hero?.advanced||{});const hero=$('#hero');if(!hero)return null;const controller=new AbortController();SF_HERO_ADVANCED_CONTROLLER=controller;sfRenderHeroAdvancedForActive();if(c.enabled&&!sfReducedMotionEffective()){hero.addEventListener('pointermove',event=>{const rect=hero.getBoundingClientRect(),x=((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*2,y=((event.clientY-rect.top)/Math.max(1,rect.height)-.5)*2;hero.style.setProperty('--sf-hero-advanced-pointer-x',`${x*c.pointer_strength*22}px`);hero.style.setProperty('--sf-hero-advanced-pointer-y',`${y*c.pointer_strength*18}px`);},{passive:true,signal:controller.signal});window.addEventListener('scroll',()=>{const rect=hero.getBoundingClientRect(),progress=Math.max(0,Math.min(1,-rect.top/Math.max(1,rect.height)));hero.style.setProperty('--sf-hero-advanced-scroll',String(progress*c.scroll_strength));if(c.sync_background.enabled&&c.sync_background.mode==='progress')sfEmitHeroBackgroundSync(progress);},{passive:true,signal:controller.signal});}window.addEventListener('studioframe:hero-background-sync',event=>{const root=$('#sfGlobalMediaCanvas');if(!root)return;root.style.setProperty('--sf-hero-sync-progress',String(event.detail?.progress||0));root.dataset.heroSyncMode=String(event.detail?.mode||'slide');root.querySelectorAll('[data-background-layer-id]').forEach(node=>{const depth=Number(node.style.getPropertyValue('--sf-bg-depth').replace('px','')||0);node.style.setProperty('--sf-bg-hero-sync-y',`${(Number(event.detail?.progress||0)-.5)*depth*.16}px`);});},{signal:controller.signal});return controller;}

// EDITOR ENGINE 12 — one additive renderer inside the canonical Hero owner.
// Preview and Build resolve the same bundled paths; no second Hero is created.
const HERO_GSAP_SCROLL_ASSETS=Object.freeze({
  'hero-spacecraft-user':Object.freeze({id:'hero-spacecraft-user',path:'hero-gsap/models/hero-spacecraft-user.glb',poster_path:'hero-gsap/posters/hero-spacecraft-user.png',title:'Nave Espacial',author:'ImLuisC',license:'CC BY 4.0',license_url:'https://creativecommons.org/licenses/by/4.0/',source_url:'https://sketchfab.com/3d-models/nave-espacial-1c4ed0287d4b4579b5ec1a26de0d66a6',release_eligible:true}),
  'hero-cat-user':Object.freeze({id:'hero-cat-user',path:'hero-gsap/models/hero-cat-user.glb',poster_path:'hero-gsap/posters/hero-cat-user.png',title:'Cat in Motion 3D Model Free',author:'iRahulRajput',license:'CC BY 4.0',license_url:'https://creativecommons.org/licenses/by/4.0/',source_url:'https://sketchfab.com/3d-models/cat-in-motion-3d-model-free-baa1120483c844e6bce9744f3f868c63',release_eligible:true})
});
let SF_HERO_GSAP_CONTROLLER=null,SF_HERO_GSAP_RUNTIME_PROMISE=null,SF_HERO_GSAP_PROGRESS_APPLIER=null;
function normalizeHeroGsapScrollPublic(raw={}){const number=(value,fallback,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback)),starts=['top top','top 10%','top 20%','top center'];return {...raw,version:1,enabled:raw.enabled===true,mode:['video_scrub','glb_orbit'].includes(String(raw.mode||''))?String(raw.mode):'video_scrub',media_id:String(raw.media_id||''),mobile_media_id:String(raw.mobile_media_id||''),asset_id:HERO_GSAP_SCROLL_ASSETS[String(raw.asset_id||'')]?String(raw.asset_id):'hero-spacecraft-user',pin:raw.pin!==false,start:starts.includes(String(raw.start||''))?String(raw.start):'top top',end_percent:number(raw.end_percent,180,80,600),scrub:number(raw.scrub,.7,.05,4),smoothing:number(raw.smoothing,.18,0,1),speed:number(raw.speed,1,.1,4),rotation_x_from:number(raw.rotation_x_from,8,-720,720),rotation_x_to:number(raw.rotation_x_to,-6,-720,720),rotation_y_from:number(raw.rotation_y_from,-48,-720,720),rotation_y_to:number(raw.rotation_y_to,54,-720,720),rotation_z_from:number(raw.rotation_z_from,-4,-720,720),rotation_z_to:number(raw.rotation_z_to,5,-720,720),scale_from:number(raw.scale_from,.82,.1,4),scale_to:number(raw.scale_to,1.08,.1,4),position_x_from:number(raw.position_x_from,-10,-100,100),position_x_to:number(raw.position_x_to,10,-100,100),position_y_from:number(raw.position_y_from,8,-100,100),position_y_to:number(raw.position_y_to,-8,-100,100),poster_url:String(raw.poster_url||'').trim(),mobile_fallback:['poster','same','hide'].includes(String(raw.mobile_fallback||''))?String(raw.mobile_fallback):'poster',reduced_motion:['poster','first_frame','hide'].includes(String(raw.reduced_motion||''))?String(raw.reduced_motion):'poster',attribution_visible:true};}
function sfHeroGsapLoadScript(id,relative,ready){if(ready())return Promise.resolve();return new Promise((resolve,reject)=>{let script=document.getElementById(id),settled=false;const finish=(error=null)=>{if(settled)return;settled=true;clearTimeout(timer);if(error)reject(error);else if(ready())resolve();else reject(new Error(`${id} carregou sem expor o runtime`));};const timer=setTimeout(()=>finish(new Error(`${id} excedeu o tempo de carga`)),8000);if(script){script.addEventListener('load',()=>finish(),{once:true});script.addEventListener('error',()=>finish(new Error(`${id} indisponível`)),{once:true});return;}script=document.createElement('script');script.id=id;script.src=studioFrameRuntimeAssetUrl(relative);script.async=false;script.dataset.sfLocalRuntime='true';script.addEventListener('load',()=>finish(),{once:true});script.addEventListener('error',()=>finish(new Error(`${id} indisponível`)),{once:true});document.head.append(script);});}
function sfHeroGsapRuntime(){if(window.gsap&&window.ScrollTrigger){window.gsap.registerPlugin(window.ScrollTrigger);return Promise.resolve({gsap:window.gsap,ScrollTrigger:window.ScrollTrigger});}if(SF_HERO_GSAP_RUNTIME_PROMISE)return SF_HERO_GSAP_RUNTIME_PROMISE;SF_HERO_GSAP_RUNTIME_PROMISE=sfHeroGsapLoadScript('studioframe-gsap-local','motion/vendor/gsap/gsap.min.js',()=>Boolean(window.gsap)).then(()=>sfHeroGsapLoadScript('studioframe-scrolltrigger-local','motion/vendor/gsap/ScrollTrigger.min.js',()=>Boolean(window.ScrollTrigger))).then(()=>{window.gsap.registerPlugin(window.ScrollTrigger);return {gsap:window.gsap,ScrollTrigger:window.ScrollTrigger};}).catch(error=>{SF_HERO_GSAP_RUNTIME_PROMISE=null;throw error;});return SF_HERO_GSAP_RUNTIME_PROMISE;}
function sfHeroGsapCanonicalPlayback(enabled){clearTimeout(heroTimer);const videos=[...document.querySelectorAll('#heroMedia .hero-slide video')];if(enabled){videos.forEach(video=>{try{video.pause();}catch(_){}});return;}if(heroProjects.length){activateHero(heroIndex,false);if(!reduced&&heroProjects.length>1)scheduleHero();}}
function sfHeroGsapPosterUrl(c,asset,media){const configured=safeExternalHttps(c.poster_url||'');if(configured)return configured;if(asset?.poster_path)return studioFrameRuntimeAssetUrl(asset.poster_path);const candidates=media?sectionMediaCandidates(media):[];return String(media?.thumbnail_url||(media?.thumbnail_candidates||[])[0]||media?.preview_url||(media?.preview_candidates||[])[0]||candidates[0]||'');}
function sfHeroGsapPosterNode(url,label='Poster do Hero'){const wrap=document.createElement('div');wrap.className='sf-hero-gsap-poster';if(url){const image=document.createElement('img');image.src=url;image.alt='';image.decoding='async';image.loading='eager';wrap.append(image);}else{const note=document.createElement('span');note.textContent=label;wrap.append(note);}return wrap;}
function sfHeroGsapAttribution(asset){const credit=document.createElement('small');credit.className='sf-hero-gsap-attribution';credit.innerHTML=`<span>${esc(asset.title)} · ${esc(asset.author)}</span><a href="${esc(asset.source_url)}" target="_blank" rel="noopener noreferrer">Fonte</a><a href="${esc(asset.license_url)}" target="_blank" rel="license noopener noreferrer">${esc(asset.license)}</a>`;return credit;}
function setupHeroGsapScroll(){if(sfImmersiveV31Enabled()){SF_HERO_GSAP_CONTROLLER?.abort?.();SF_HERO_GSAP_CONTROLLER=null;SF_HERO_GSAP_PROGRESS_APPLIER=null;return null;}SF_HERO_GSAP_CONTROLLER?.abort?.();SF_HERO_GSAP_CONTROLLER=null;SF_HERO_GSAP_PROGRESS_APPLIER=null;document.querySelectorAll('[data-sf-hero-gsap]').forEach(node=>node.remove());const hero=$('#hero'),c=normalizeHeroGsapScrollPublic(DATA.site_builder?.hero?.gsap_scroll||{});if(!hero)return null;hero.classList.remove('sf-hero-gsap-active');delete hero.dataset.heroGsap;delete hero.dataset.heroGsapMode;if(!c.enabled){sfHeroGsapCanonicalPlayback(false);return null;}const mobile=matchMedia('(max-width:700px)').matches,reducedNow=sfReducedMotionEffective(),fallbackMode=reducedNow?c.reduced_motion:(mobile?c.mobile_fallback:'same');if(fallbackMode==='hide'){hero.dataset.heroGsap='hidden-fallback';sfHeroGsapCanonicalPlayback(false);return null;}const asset=c.mode==='glb_orbit'?HERO_GSAP_SCROLL_ASSETS[c.asset_id]:null,mediaId=(mobile&&c.mobile_media_id?c.mobile_media_id:c.media_id)||c.media_id,media=c.mode==='video_scrub'?publicMediaById(mediaId):null,posterUrl=sfHeroGsapPosterUrl(c,asset,media);const root=document.createElement('div');root.className='sf-hero-gsap-stage';root.dataset.sfHeroGsap='true';root.dataset.owner='site_builder.hero.gsap_scroll';root.dataset.mode=c.mode;root.dataset.runtime='preparing';root.dataset.progress='0';root.dataset.fallbackMode=fallbackMode;const visual=document.createElement('div');visual.className='sf-hero-gsap-visual';root.append(visual);hero.insertBefore(root,hero.querySelector('.hero-shade')||hero.firstChild);hero.classList.add('sf-hero-gsap-active');hero.dataset.heroGsap='active';hero.dataset.heroGsapMode=c.mode;sfHeroGsapCanonicalPlayback(true);const controller=new AbortController();SF_HERO_GSAP_CONTROLLER=controller;let trigger=null,raf=0,currentRaw=0,targetRaw=0,content=null,lastViewport=mobile?'mobile':'desktop';const lerp=(a,b,t)=>a+(b-a)*t,clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));const apply=raw=>{currentRaw=clamp01(raw);const progress=Math.pow(currentRaw,1/c.speed);root.dataset.progress=progress.toFixed(4);const rx=lerp(c.rotation_x_from,c.rotation_x_to,progress),ry=lerp(c.rotation_y_from,c.rotation_y_to,progress),rz=lerp(c.rotation_z_from,c.rotation_z_to,progress),scale=lerp(c.scale_from,c.scale_to,progress),x=lerp(c.position_x_from,c.position_x_to,progress),y=lerp(c.position_y_from,c.position_y_to,progress);visual.style.setProperty('--sf-hero-gsap-x',`${x}%`);visual.style.setProperty('--sf-hero-gsap-y',`${y}%`);visual.style.setProperty('--sf-hero-gsap-scale',String(scale));visual.style.setProperty('--sf-hero-gsap-rotate-z',`${rz}deg`);if(c.mode==='video_scrub'&&content?.tagName==='VIDEO'&&Number.isFinite(content.duration)&&content.duration>0){const next=Math.max(0,Math.min(content.duration-.025,content.duration*progress));if(Math.abs(Number(content.currentTime||0)-next)>.012)try{content.currentTime=next;}catch(_){}}else if(c.mode==='glb_orbit'&&content?.tagName==='MODEL-VIEWER'){content.setAttribute('orientation',`${rx}deg ${ry}deg ${rz}deg`);content.dataset.orbitProgress=progress.toFixed(4);}updateHeroStoryScroll(progress);sfEmitHeroBackgroundSync(progress);};const queue=raw=>{targetRaw=clamp01(raw);if(c.smoothing<=0){apply(targetRaw);return;}if(raf)return;const tick=()=>{if(controller.signal.aborted)return;const alpha=Math.max(.08,1-c.smoothing*.88),next=currentRaw+(targetRaw-currentRaw)*alpha;apply(Math.abs(targetRaw-next)<.0005?targetRaw:next);if(Math.abs(targetRaw-currentRaw)>=.0005)raf=requestAnimationFrame(tick);else raf=0;};raf=requestAnimationFrame(tick);};SF_HERO_GSAP_PROGRESS_APPLIER=queue;const mountFallback=(reason,firstFrame=false)=>{root.dataset.runtime=reason;root.dataset.static='true';visual.replaceChildren();content=null;if(firstFrame&&c.mode==='video_scrub'&&media){content=createResilientVideo(media,{autoplay:false,muted:true,loop:false,controls:false,preload:'metadata',className:'sf-hero-gsap-video',defer:false,metadataReady:true,timeoutMs:45000});content.autoplay=false;content.pause?.();visual.append(content);content.addEventListener('loadedmetadata',()=>{try{content.pause();content.currentTime=0;}catch(_){}root.dataset.mediaOrientation=mediaOrientation(media,content);},{once:true,signal:controller.signal});}else visual.append(sfHeroGsapPosterNode(posterUrl,reason));apply(0);};if(asset)root.append(sfHeroGsapAttribution(asset));if(fallbackMode==='poster'){mountFallback(reducedNow?'reduced-motion-poster':'mobile-poster');}else if(fallbackMode==='first_frame'){mountFallback('reduced-motion-first-frame',true);}else if(c.mode==='video_scrub'){if(media?.type==='video'){content=createResilientVideo(media,{autoplay:false,muted:true,loop:false,controls:false,preload:'auto',className:'sf-hero-gsap-video',defer:false,metadataReady:true,timeoutMs:45000,exhausted:()=>mountFallback('video-source-fallback')});content.autoplay=false;content.defaultMuted=true;content.muted=true;content.controls=false;content.setAttribute('playsinline','');content.setAttribute('controlslist','nodownload noplaybackrate noremoteplayback');content.disablePictureInPicture=true;visual.append(content);content.addEventListener('loadedmetadata',()=>{try{content.pause();}catch(_){}root.dataset.mediaOrientation=mediaOrientation(media,content);apply(currentRaw);},{signal:controller.signal});content.addEventListener('play',()=>{try{content.pause();}catch(_){}},{signal:controller.signal});}else mountFallback('video-not-selected');}else if(asset?.release_eligible){const view=document.createElement('model-viewer');content=view;view.className='sf-hero-gsap-model';view.src=studioFrameRuntimeAssetUrl(asset.path);view.setAttribute('loading','eager');view.setAttribute('reveal','auto');view.setAttribute('interaction-prompt','none');view.setAttribute('shadow-intensity','1');view.setAttribute('shadow-softness','.8');view.setAttribute('exposure','1.08');view.setAttribute('camera-orbit','0deg 75deg auto');view.setAttribute('camera-target','auto auto auto');view.setAttribute('poster',posterUrl);visual.append(view);sfLoadExternalModuleOnce('model-viewer-4.3.1','https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js').then(()=>{if(controller.signal.aborted)return;root.dataset.modelViewer='ready';apply(currentRaw);}).catch(error=>{console.warn('[StudioFrame][HERO_GSAP] model-viewer fallback',error);mountFallback('model-viewer-fallback');});view.addEventListener('error',()=>mountFallback('glb-load-fallback'),{once:true,signal:controller.signal});}else mountFallback('asset-not-eligible');const bindNative=reason=>{root.dataset.runtime=reason;const update=()=>{const rect=hero.getBoundingClientRect(),distance=Math.max(1,innerHeight*c.end_percent/100),startOffset=c.start==='top 10%'?innerHeight*.1:c.start==='top 20%'?innerHeight*.2:c.start==='top center'?innerHeight*.5:0;queue((-rect.top+startOffset)/distance);};window.addEventListener('scroll',update,{passive:true,signal:controller.signal});update();};if(fallbackMode==='same'){sfHeroGsapRuntime().then(({ScrollTrigger})=>{if(controller.signal.aborted)return;trigger=ScrollTrigger.create({trigger:hero,start:c.start,end:()=>`+=${Math.max(1,innerHeight*c.end_percent/100)}`,pin:c.pin,scrub:c.scrub,invalidateOnRefresh:true,anticipatePin:1,onUpdate:self=>queue(self.progress)});root.dataset.runtime='gsap-scrolltrigger';root.dataset.pinned=c.pin?'true':'false';queue(trigger.progress||0);}).catch(error=>{console.warn('[StudioFrame][HERO_GSAP] GSAP local fallback',error);bindNative('native-scroll-fallback');});}const onResize=()=>{const next=matchMedia('(max-width:700px)').matches?'mobile':'desktop';if(next!==lastViewport){setupHeroGsapScroll();return;}trigger?.refresh?.();};window.addEventListener('resize',onResize,{passive:true,signal:controller.signal});controller.signal.addEventListener('abort',()=>{cancelAnimationFrame(raf);try{trigger?.kill?.(true);}catch(_){}if(SF_HERO_GSAP_PROGRESS_APPLIER===queue)SF_HERO_GSAP_PROGRESS_APPLIER=null;root.remove();hero.classList.remove('sf-hero-gsap-active');delete hero.dataset.heroGsap;delete hero.dataset.heroGsapMode;},{once:true});return root;}

function normalizePerformancePublic(raw={}){return {...raw,profile:['auto','low','full'].includes(String(raw.profile||''))?String(raw.profile):'auto',layer_budget:Math.max(3,Math.min(40,Number(raw.layer_budget||12))),memory_budget_mb:Math.max(64,Math.min(4096,Number(raw.memory_budget_mb||256))),fps_floor:Math.max(12,Math.min(60,Number(raw.fps_floor||24))),weak_device_fallback:raw.weak_device_fallback!==false,pause_offscreen:raw.pause_offscreen!==false};}
function sfResolvedPerformanceProfile(c=normalizePerformancePublic(DATA.site_builder?.performance||{})){if(c.profile!=='auto')return c.profile;const mem=Number(navigator.deviceMemory||8),cores=Number(navigator.hardwareConcurrency||8);return c.weak_device_fallback&&(mem<=4||cores<=4)?'low':'full';}
function sfReducedMotionEffective(){return reduced||document.documentElement.dataset.sfForceReducedMotion==='true';}
function sfBudgetBackgroundLayers(layers=[]){const c=normalizePerformancePublic(DATA.site_builder?.performance||{}),profile=document.documentElement.dataset.sfPerformanceResolved||sfResolvedPerformanceProfile(c),budget=profile==='low'?Math.min(6,c.layer_budget):c.layer_budget;return (Array.isArray(layers)?layers:[]).slice(0,Math.max(3,budget));}
function sfApplyPerformanceProfile(profile){const c=normalizePerformancePublic(DATA.site_builder?.performance||{}),resolved=['low','full'].includes(profile)?profile:sfResolvedPerformanceProfile({...c,profile});document.documentElement.dataset.sfPerformanceProfile=profile||c.profile;document.documentElement.dataset.sfPerformanceResolved=resolved;document.documentElement.style.setProperty('--sf-layer-budget',String(c.layer_budget));document.documentElement.style.setProperty('--sf-memory-budget-mb',String(c.memory_budget_mb));window.dispatchEvent(new CustomEvent('studioframe:performance-profile',{detail:{profile:profile||c.profile,resolved}}));return resolved;}
function setupV9PerformanceRuntime(){cancelAnimationFrame(SF_PERFORMANCE_FPS_RAF);const c=normalizePerformancePublic(DATA.site_builder?.performance||{}),resolved=sfApplyPerformanceProfile(c.profile);if(c.profile!=='auto'||resolved==='low')return resolved;let frames=0,start=performance.now();const sample=now=>{frames+=1;if(now-start>=1400){const fps=frames*1000/Math.max(1,now-start);document.documentElement.dataset.sfMeasuredFps=String(Math.round(fps));if(fps<c.fps_floor&&c.weak_device_fallback)sfApplyPerformanceProfile('low');return;}SF_PERFORMANCE_FPS_RAF=requestAnimationFrame(sample);};SF_PERFORMANCE_FPS_RAF=requestAnimationFrame(sample);return resolved;}

function normalizeBackgroundLayerPublic(layer={},index=0){const base=normalizeBackgroundLayerPublicPhase8(layer,index);return {...base,depth_role:String(layer.depth_role||'middle'),mask_type:['none','rectangle','rounded','circle','ellipse','custom_clip'].includes(String(layer.mask_type||''))?String(layer.mask_type):'none',mask_size:Math.max(0,Math.min(160,Number(layer.mask_size??100))),mask_x:Math.max(0,Math.min(100,Number(layer.mask_x??50))),mask_y:Math.max(0,Math.min(100,Number(layer.mask_y??50))),mask_radius:Math.max(0,Math.min(100,Number(layer.mask_radius??24))),clip_path:String(layer.clip_path||''),entry_animation:String(layer.entry_animation||'none'),exit_animation:String(layer.exit_animation||'none'),section_visibility:String(layer.section_visibility||'').split(',').map(v=>v.trim()).filter(Boolean)};}
function sfLayerClip(layer){if(layer.clip_path&&/^(polygon|inset|circle|ellipse)\(/i.test(layer.clip_path.trim()))return layer.clip_path.trim();const size=layer.mask_size,edge=Math.max(0,(100-size)/2);if(layer.mask_type==='circle')return `circle(${size/2}% at ${layer.mask_x}% ${layer.mask_y}%)`;if(layer.mask_type==='ellipse')return `ellipse(${size/2}% ${Math.max(8,size*.34)}% at ${layer.mask_x}% ${layer.mask_y}%)`;if(['rectangle','rounded'].includes(layer.mask_type))return `inset(${edge}% ${edge}% round ${layer.mask_type==='rounded'?layer.mask_radius:0}px)`;return 'none';}
function sfBackgroundLayerNode(layer){const node=sfBackgroundLayerNodePhase8(layer);if(!node)return null;node.dataset.depthRole=layer.depth_role;node.dataset.entryAnimation=layer.entry_animation;node.dataset.exitAnimation=layer.exit_animation;node.dataset.sectionVisibility=(layer.section_visibility||[]).join(',');const clip=sfLayerClip(layer);if(clip!=='none')node.style.clipPath=clip;return node;}
function setupV9BackgroundSectionVisibility(root,config,controller){const scoped=(config.background_stack||[]).filter(layer=>Array.isArray(layer.section_visibility)&&layer.section_visibility.length);if(!scoped.length)return;const update=()=>{const center=innerHeight*.5;let active='';document.querySelectorAll('[data-home-block-id]').forEach(node=>{const r=node.getBoundingClientRect();if(r.top<=center&&r.bottom>=center)active=String(node.dataset.homeBlockId||'');});root.querySelectorAll('[data-background-layer-id]').forEach(node=>{const layer=scoped.find(row=>row.id===node.dataset.backgroundLayerId);if(!layer)return;node.hidden=Boolean(active&&!layer.section_visibility.includes(active));});};window.addEventListener('scroll',update,{passive:true,signal:controller.signal});window.addEventListener('resize',update,{passive:true,signal:controller.signal});update();}

function v9RouteProjects(ids=[]){const wanted=new Set((ids||[]).map(String));return (DATA.projects||[]).filter(project=>!project.hidden&&wanted.has(String(project.project_entity_id||project.project_id||project.id||'')));}
function v9ProjectLink(project){const path=String(project.seo_route||'').replace(/^\/+|\/+$/g,'');return path?`/${path}/`:`/#projectsBlock`;}
function v9RouteProjectCards(projects=[]){const grid=document.createElement('div');grid.className='v9-route-project-grid';projects.forEach(project=>{const a=document.createElement('a');a.href=v9ProjectLink(project);a.className='v9-route-project-card';const img=imageWithFallback(project,sectionMediaCandidates(project),{lazy:true,upgradeUrls:sectionMediaCandidates(project)});const copy=document.createElement('span');copy.innerHTML=`<strong>${esc(project.title||project.name||'Projeto')}</strong><small>${esc(project.description||'')}</small>`;a.append(img,copy);grid.append(a);});return grid;}
function v9DiscoveryShell(route){$('#filters')?.setAttribute('hidden','');['hero','introBlock','lettering','projectsBlock','about','contact'].forEach(id=>{const node=$('#'+id);if(node)node.hidden=true;});const root=$('#customPageRoot');if(!root)return null;root.hidden=false;root.replaceChildren();root.dataset.v9RouteKind=route.kind||'';const head=document.createElement('header');head.className='custom-public-page-head v9-discovery-head reveal';const k=document.createElement('small');k.textContent='MENSAGEM STUDIO';const h=document.createElement('h1');h.textContent=route.title||'Página';const p=document.createElement('p');p.textContent=route.description||'';head.append(k,h,p);root.append(head);return root;}
function renderV9DiscoveryRoute(route){const root=v9DiscoveryShell(route);if(!root)return;const b=DATA.site_builder||{},kind=String(route.kind||'');if(kind==='clients'){const wrap=document.createElement('div');wrap.className='v9-client-grid';(b.clients?.items||[]).filter(x=>x.visible!==false).forEach(item=>{const a=document.createElement('a');a.href=`/${String(b.clients?.slug||'clientes').replace(/^\/+|\/+$/g,'')}/${String(item.slug||item.id||'cliente').replace(/^\/+|\/+$/g,'')}/`;a.innerHTML=`<strong>${esc(item.name||'Cliente')}</strong><span>${esc(item.description||'')}</span>`;wrap.append(a);});root.append(wrap);}else if(kind==='client'){const item=(b.clients?.items||[]).find(x=>String(x.id||'')===String(route.entity_id||''));if(item){const info=document.createElement('section');info.className='v9-client-profile';info.innerHTML=`<h2>${esc(item.name||'Cliente')}</h2><p>${esc(item.description||'')}</p>${safeExternalHttps(item.website||'')?`<a href="${esc(item.website)}" target="_blank" rel="noopener">Visitar site ↗</a>`:''}`;root.append(info,v9RouteProjectCards(v9RouteProjects(item.project_ids||[])));}}else if(kind==='tag'){const item=(b.taxonomies?.items||[]).find(x=>String(x.id||'')===String(route.entity_id||''));root.append(v9RouteProjectCards(v9RouteProjects(item?.project_ids||[])));}else if(kind==='archive'){root.append(v9RouteProjectCards((DATA.projects||[]).filter(p=>!p.hidden)));}else if(kind==='search'){const box=document.createElement('section');box.className='v9-search-route';box.innerHTML='<label>Buscar no portfólio<input type="search" data-v9-search-input placeholder="Projeto, serviço, cliente ou tag…"></label><div data-v9-search-results></div>';root.append(box);const input=box.querySelector('[data-v9-search-input]'),results=box.querySelector('[data-v9-search-results]');const run=()=>{const q=String(input.value||'').trim().toLowerCase();results.replaceChildren();if(!q)return;const projects=(DATA.projects||[]).filter(p=>!p.hidden&&`${p.title||''} ${p.description||''}`.toLowerCase().includes(q));results.append(v9RouteProjectCards(projects));};input.addEventListener('input',run);}else if(kind==='about'){const about=b.about||{},sec=document.createElement('section');sec.className='v9-special-route-copy';sec.innerHTML=`<h2>${esc(about.headline||about.title||route.title||'Sobre')}</h2><p>${esc(about.body||route.description||'')}</p>`;root.append(sec);}else if(kind==='contact'||kind==='quote'){const contact=b.contact||{},sec=document.createElement('section');sec.className='v9-special-route-copy';sec.innerHTML=`<h2>${esc(kind==='quote'?'Vamos construir algo juntos?':contact.title||route.title||'Contato')}</h2><p>${esc(contact.body||route.description||'')}</p>${contact.email?`<a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>`:''}`;root.append(sec);if(kind==='quote'){const a=document.createElement('a');a.className='v9-route-cta';a.href=serviceWhatsappHref(null,null);a.target='_blank';a.rel='noopener';a.textContent=contact.cta_label||'Solicitar orçamento';root.append(a);}}else if(kind==='not_found'){const sec=document.createElement('section');sec.className='v9-special-route-copy v9-not-found';sec.innerHTML='<strong>404</strong><p>O endereço solicitado não foi encontrado.</p><a href="/">Voltar para a Home</a>';root.append(sec);}bindReveal();tick();}
// R2.2 Stage 7 — Immersive V3.1 is the only global 3D/scroll runtime when enabled.
let SF_IMMERSIVE_V31_LOAD_PROMISE=null;
function sfImmersiveV31Config(){const raw=DATA?.site_builder?.immersive&&typeof DATA.site_builder.immersive==='object'?DATA.site_builder.immersive:{};return{enabled:raw.enabled!==false,runtime_version:String(raw.runtime_version||'3.1'),visual_proof:raw.visual_proof!==false,quality:['auto','high','medium','low','fallback'].includes(String(raw.quality||'auto').toLowerCase())?String(raw.quality||'auto').toLowerCase():'auto',intensity:Math.max(.2,Math.min(1.5,Number(raw.intensity??1)||1)),glb_asset_id:String(raw.glb_asset_id||'studio-orbit-dish'),debug:raw.debug===true,fallback:raw.fallback!==false};}
function sfImmersiveV31Enabled(){return sfImmersiveV31Config().enabled===true;}
function sfLoadImmersiveV31Runtime(){if(window.StudioFrameImmersiveV31?.mount)return Promise.resolve(window.StudioFrameImmersiveV31);if(SF_IMMERSIVE_V31_LOAD_PROMISE)return SF_IMMERSIVE_V31_LOAD_PROMISE;SF_IMMERSIVE_V31_LOAD_PROMISE=new Promise((resolve,reject)=>{let script=document.getElementById('studioframe-immersive-v31');const done=()=>window.StudioFrameImmersiveV31?.mount?resolve(window.StudioFrameImmersiveV31):reject(new Error('Immersive V3.1 carregou sem API'));if(script){script.addEventListener('load',done,{once:true});script.addEventListener('error',()=>reject(new Error('Immersive V3.1 indisponível')),{once:true});return;}script=document.createElement('script');script.id='studioframe-immersive-v31';script.src=studioFrameRuntimeAssetUrl('immersive/immersive-v31.js');script.async=false;script.dataset.owner='experience.runtime';script.addEventListener('load',done,{once:true});script.addEventListener('error',()=>reject(new Error('Immersive V3.1 indisponível')),{once:true});document.head.append(script);});return SF_IMMERSIVE_V31_LOAD_PROMISE;}
async function setupImmersiveV31(){window.__STUDIOFRAME_IMMERSIVE_CONFIG__=sfImmersiveV31Config();window.__STUDIOFRAME_IMMERSIVE_THREE_URL__=studioFrameRuntimeAssetUrl('motion/vendor/three/three.module.min.js');if(!sfImmersiveV31Enabled()){window.StudioFrameImmersiveV31?.destroy?.();document.documentElement.dataset.immersiveV31='disabled';return null;}SF_HERO_GSAP_CONTROLLER?.abort?.();SF_HERO_GSAP_CONTROLLER=null;SF_THREE_D_CONTROLLER?.abort?.();SF_THREE_D_CONTROLLER=null;try{const api=await sfLoadImmersiveV31Runtime();const kernel=await api.mount();document.documentElement.dataset.immersiveLegacyGlobalRuntimes='suppressed';return kernel;}catch(error){console.warn('[StudioFrame][ImmersiveV31] fail-safe',error);document.documentElement.dataset.immersiveV31='error';return null;}}
window.StudioFrameImmersive=Object.freeze({refresh:setupImmersiveV31,enabled:sfImmersiveV31Enabled,snapshot:()=>window.StudioFrameImmersiveV31?.snapshot?.()||{mounted:false}});
function sfHandleV9PreviewCommand(command,data={}){if(command==='performance-profile'){sfApplyPerformanceProfile(String(data.profile||'auto'));if(sfImmersiveV31Enabled())setupImmersiveV31();return true;}if(command==='reduced-motion'){document.documentElement.dataset.sfForceReducedMotion=data.enabled===true?'true':'false';if(sfImmersiveV31Enabled())setupImmersiveV31();else setupHeroGsapScroll();return true;}if(command==='motion-pause'){document.documentElement.dataset.sfMotionPaused='true';return true;}if(command==='motion-play'){document.documentElement.dataset.sfMotionPaused='false';return true;}if(command==='motion-restart'){document.documentElement.dataset.sfMotionPaused='false';document.querySelectorAll('.is-sliced-ready,[data-sf-text-motion]').forEach(node=>{node.classList.remove('is-sliced-ready','is-inview');void node.offsetWidth;node.classList.add(node.matches('[data-sf-text-motion]')?'is-inview':'is-sliced-ready');});refreshStudioFrameMotionV77(document);return true;}if(command==='timeline-scrub'){const progress=Math.max(0,Math.min(1,Number(data.progress||0)));document.documentElement.style.setProperty('--sf-preview-timeline',String(progress));scrollTo({top:progress*Math.max(0,document.documentElement.scrollHeight-innerHeight),behavior:'instant'});SF_HERO_GSAP_PROGRESS_APPLIER?.(progress);updateHeroStoryScroll(progress);sfEmitHeroBackgroundSync(progress);return true;}return false;}

// Preview uses inline data and therefore reaches load() without an initial
// network await. Defer one microtask so every runtime controller declared
// later in this bundle is initialized before the first render starts.
Promise.resolve().then(() => load()).then(() => {
  if (window.parent !== window) window.parent.postMessage({
    type:'studioframe-preview-ready',
    revision:String(DATA?.editorial_revision||''),
    home_structure_signature:previewJson(previewHomeStructure(DATA?.site_builder||{})),
  }, location.origin);
}).catch((error) => {
  $('#empty').hidden = false;
  $('#empty').textContent = `Não foi possível carregar o portfólio: ${error.message}`;
  console.error(error);
});

addEventListener('pageshow', () => {
  if (!STUDIOFRAME_INITIAL_HASH) {
    requestAnimationFrame(() => scrollTo({ top: 0, left: 0, behavior: 'auto' }));
  }
}, { once: true });


// ============================================================================
// StudioFrame V7.8.9 · Global Media Canvas + true authoring preview
// Same DATA/state and same renderer used by public, preview and Block Browser.
// ============================================================================
let SF_GLOBAL_CANVAS_SCROLL_CONTROLLER=null;
let SF_BACKGROUND_STORY_TIMERS=[];
function normalizeBackgroundStoryPublic(raw={}){const mode=['scroll','timeline'].includes(String(raw.mode||''))?String(raw.mode):'scroll';const scenes=(Array.isArray(raw.scenes)?raw.scenes:[]).filter(scene=>scene&&typeof scene==='object'&&scene.enabled!==false).map((scene,index)=>({id:String(scene.id||`background-story-${index}`),label:String(scene.label||''),phrase:String(scene.phrase||''),subtitle:String(scene.subtitle||''),position:['top-left','top-center','center-left','center','center-right','bottom-left','bottom-center','bottom-right'].includes(String(scene.position||''))?String(scene.position):'center-left',enter:['fade','slide_up','slide_left','blur','scale','mask_reveal'].includes(String(scene.enter||''))?String(scene.enter):'fade',exit:['fade','blur','none'].includes(String(scene.exit||''))?String(scene.exit):'fade',start_percent:Math.max(0,Math.min(100,Number(scene.start_percent??index*33)||0)),end_percent:Math.max(0,Math.min(100,Number(scene.end_percent??Math.min(100,index*33+28))||0)),start_seconds:Math.max(0,Math.min(120,Number(scene.start_seconds??index*2.4)||0)),duration_seconds:Math.max(.2,Math.min(60,Number(scene.duration_seconds??2.4)||2.4)),sync_layer_id:String(scene.sync_layer_id||''),desktop_visible:scene.desktop_visible!==false,tablet_visible:scene.tablet_visible!==false,mobile_visible:scene.mobile_visible!==false}));return{enabled:raw.enabled===true&&scenes.length>0,mode,scenes};}
function normalizeBackgroundLayerPublicPhase8(layer={},index=0){const types=['media_canvas','media','color','gradient','texture','grid_beam','reactive_tiles','particles','glow','overlay'],type=types.includes(String(layer.type||''))?String(layer.type):'overlay';return{...layer,id:String(layer.id||`background-layer-${index}`),label:String(layer.label||''),type,visible:layer.visible!==false,source:['media','safe_url'].includes(String(layer.source||''))?String(layer.source):'media',media_id:String(layer.media_id||''),url:String(layer.url||''),media_type:layer.media_type==='video'?'video':'image',color:/^#[0-9a-f]{6}$/i.test(String(layer.color||''))?String(layer.color):'#000000',gradient_start:/^#[0-9a-f]{6}$/i.test(String(layer.gradient_start||''))?String(layer.gradient_start):'#071018',gradient_end:/^#[0-9a-f]{6}$/i.test(String(layer.gradient_end||''))?String(layer.gradient_end):'#183B48',gradient_angle:Number(layer.gradient_angle??145),x:Math.max(-100,Math.min(100,Number(layer.x||0))),y:Math.max(-100,Math.min(100,Number(layer.y||0))),scale:Math.max(.2,Math.min(3,Number(layer.scale||1))),rotation:Math.max(-180,Math.min(180,Number(layer.rotation||0))),opacity:Math.max(0,Math.min(1,Number(layer.opacity??1))),blend_mode:String(layer.blend_mode||'normal'),blur:Math.max(0,Math.min(40,Number(layer.blur||0))),depth:Math.max(-2,Math.min(2,Number(layer.depth||0))),scroll_speed:Math.max(-2,Math.min(2,Number(layer.scroll_speed??0))),mouse_response:Math.max(0,Math.min(2,Number(layer.mouse_response??0))),gyro_response:Math.max(0,Math.min(2,Number(layer.gyro_response??0))),motion_mode:String(layer.motion_mode||'static'),loop:layer.loop!==false,z_index:Number(layer.z_index??index),desktop_visible:layer.desktop_visible!==false,tablet_visible:layer.tablet_visible!==false,mobile_visible:layer.mobile_visible!==false,tile_columns:Math.max(3,Math.min(18,Number(layer.tile_columns||12))),tile_rows:Math.max(3,Math.min(12,Number(layer.tile_rows||7))),tile_gap:Math.max(0,Math.min(32,Number(layer.tile_gap??8))),tile_radius:Math.max(0,Math.min(40,Number(layer.tile_radius??8))),tile_depth:Math.max(0,Math.min(2,Number(layer.tile_depth??.8))),tile_pointer_strength:Math.max(0,Math.min(2,Number(layer.tile_pointer_strength??1)))};}
function normalizeGlobalMediaCanvasPublic(raw={}){const mask=raw.mask&&typeof raw.mask==='object'?raw.mask:{};return {...raw,enabled:raw.enabled===true,scope:String(raw.scope||'home'),source:['media','safe_url'].includes(raw.source)?raw.source:'media',media_id:String(raw.media_id||''),url:String(raw.url||''),media_type:raw.media_type==='video'?'video':'image',fit:raw.fit==='contain'?'contain':'cover',focal_x:Math.max(0,Math.min(100,Number(raw.focal_x??50))),focal_y:Math.max(0,Math.min(100,Number(raw.focal_y??50))),position_x:Math.max(-100,Math.min(100,Number(raw.position_x||0))),position_y:Math.max(-100,Math.min(100,Number(raw.position_y||0))),scale:Math.max(.2,Math.min(3,Number(raw.scale||1))),rotation:Math.max(-180,Math.min(180,Number(raw.rotation||0))),opacity:Math.max(0,Math.min(1,Number(raw.opacity??1))),blur:Math.max(0,Math.min(40,Number(raw.blur||0))),brightness:Math.max(0,Math.min(2,Number(raw.brightness??1))),contrast:Math.max(0,Math.min(2,Number(raw.contrast??1))),saturation:Math.max(0,Math.min(2,Number(raw.saturation??1))),depth:Number(raw.depth||0),motion_mode:String(raw.motion_mode||'static'),parallax_strength:Math.max(0,Math.min(2,Number(raw.parallax_strength??.25))),mouse_strength:Math.max(0,Math.min(2,Number(raw.mouse_strength??.35))),gyro_strength:Math.max(0,Math.min(2,Number(raw.gyro_strength??.25))),mask:{type:String(mask.type||'full'),size:Math.max(0,Math.min(160,Number(mask.size??100))),x:Math.max(0,Math.min(100,Number(mask.x??50))),y:Math.max(0,Math.min(100,Number(mask.y??50))),radius:Math.max(0,Math.min(100,Number(mask.radius??24))),feather:Math.max(0,Math.min(50,Number(mask.feather||0))),scale:Math.max(.2,Math.min(3,Number(mask.scale||1))),rotation:Number(mask.rotation||0),clip:String(mask.clip||'')},background_stack:(Array.isArray(raw.background_stack)?raw.background_stack:[]).map(normalizeBackgroundLayerPublic),story:normalizeBackgroundStoryPublic(raw.story||{})};}
function sfGlobalCanvasSourceNode(config){const media=config.source==='media'?publicMediaById(config.media_id):null;if(media){if(config.media_type==='video'&&media.type==='video')return createResilientVideo(media,{autoplay:true,muted:true,loop:true,controls:false,preload:'none',className:'sf-global-media-canvas-media',defer:true,metadataReady:false,timeoutMs:45000});return imageWithFallback(media,sectionMediaCandidates(media),{lazy:false,upgradeUrls:sectionMediaCandidates(media)});}const url=safeExternalHttps(config.url||'');if(!url)return null;if(config.media_type==='video'){const video=document.createElement('video');video.className='sf-global-media-canvas-media';video.src=url;video.autoplay=true;video.muted=true;video.loop=true;video.playsInline=true;return video;}const img=document.createElement('img');img.className='sf-global-media-canvas-media';img.src=url;img.alt='';return img;}
function sfBackgroundLayerViewportAllows(layer){const w=innerWidth;if(w<=700)return layer.mobile_visible!==false;if(w<=1024)return layer.tablet_visible!==false;return layer.desktop_visible!==false;}
function sfBackgroundLayerMediaNode(layer){const media=layer.source==='media'?publicMediaById(layer.media_id):null;if(media){if(media.type==='video'){const video=createResilientVideo(media,{autoplay:true,muted:true,loop:layer.loop!==false,controls:false,preload:'none',className:'sf-background-layer-media',defer:true,metadataReady:false,timeoutMs:45000});return video;}return imageWithFallback(media,sectionMediaCandidates(media),{lazy:false,upgradeUrls:sectionMediaCandidates(media)});}const url=safeExternalHttps(layer.url||'');if(!url)return null;if(layer.media_type==='video'){const video=document.createElement('video');video.src=url;video.className='sf-background-layer-media';video.autoplay=true;video.muted=true;video.loop=layer.loop!==false;video.playsInline=true;return video;}const img=document.createElement('img');img.src=url;img.alt='';img.className='sf-background-layer-media';return img;}
function sfReactiveTileCount(layer){const perf=document.documentElement.dataset.sfPerformanceResolved||'full',mobile=innerWidth<=700;let cols=Math.max(3,layer.tile_columns||12),rows=Math.max(3,layer.tile_rows||7);if(perf==='low'){cols=Math.min(cols,8);rows=Math.min(rows,5);}if(mobile){cols=Math.min(cols,7);rows=Math.min(rows,6);}return {cols,rows,count:cols*rows};}
function sfCreateReactiveTiles(layer,node){const {cols,rows,count}=sfReactiveTileCount(layer);node.style.setProperty('--sf-tiles-cols',String(cols));node.style.setProperty('--sf-tiles-rows',String(rows));node.style.setProperty('--sf-tiles-gap',`${layer.tile_gap}px`);node.style.setProperty('--sf-tiles-radius',`${layer.tile_radius}px`);node.dataset.reactiveTiles='true';const frag=document.createDocumentFragment();for(let i=0;i<count;i+=1){const tile=document.createElement('i');const col=i%cols,row=Math.floor(i/cols);tile.className='sf-reactive-tile';tile.dataset.rx=String(cols<=1?0:col/(cols-1)*2-1);tile.dataset.ry=String(rows<=1?0:row/(rows-1)*2-1);frag.append(tile);}node.append(frag);}
function sfUpdateReactiveTiles(node,layer,px=0,py=0,scrollProgress=0){if(!node?.dataset.reactiveTiles)return;const strength=layer.tile_pointer_strength||1,depth=layer.tile_depth||.8;node.querySelectorAll('.sf-reactive-tile').forEach(tile=>{const rx=Number(tile.dataset.rx||0),ry=Number(tile.dataset.ry||0),dx=px-rx,dy=py-ry,dist=Math.sqrt(dx*dx+dy*dy),influence=Math.max(0,1-dist/1.25),z=influence*depth*42*strength,tiltX=(-dy*influence*10*strength),tiltY=(dx*influence*12*strength),drift=(scrollProgress-.5)*(layer.scroll_speed||0)*28;tile.style.transform=`translate3d(0,${drift}px,${z}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;tile.style.opacity=String(Math.min(1,.36+influence*.64));});}
function sfBackgroundLayerNodePhase8(layer){if(layer.visible===false||layer.type==='media_canvas'||!sfBackgroundLayerViewportAllows(layer))return null;const node=document.createElement('div');node.className=`sf-background-layer sf-background-layer-${String(layer.type).replace(/[^a-z0-9_-]/gi,'')}`;node.dataset.backgroundLayerId=layer.id;node.dataset.motionMode=layer.motion_mode;node.style.setProperty('--sf-bg-x',`${layer.x}%`);node.style.setProperty('--sf-bg-y',`${layer.y}%`);node.style.setProperty('--sf-bg-scale',String(layer.scale));node.style.setProperty('--sf-bg-rotation',`${layer.rotation}deg`);node.style.setProperty('--sf-bg-opacity',String(layer.opacity));node.style.setProperty('--sf-bg-blur',`${layer.blur}px`);node.style.setProperty('--sf-bg-depth',`${layer.depth*90}px`);node.style.setProperty('--sf-bg-scroll-speed',String(layer.scroll_speed));node.style.setProperty('--sf-bg-mouse-response',String(layer.mouse_response));node.style.setProperty('--sf-bg-gyro-response',String(layer.gyro_response));node.style.setProperty('--sf-bg-color',layer.color);node.style.setProperty('--sf-bg-gradient-start',layer.gradient_start);node.style.setProperty('--sf-bg-gradient-end',layer.gradient_end);node.style.setProperty('--sf-bg-gradient-angle',`${layer.gradient_angle}deg`);node.style.mixBlendMode=layer.blend_mode;node.style.zIndex=String(layer.z_index);if(layer.type==='media'){const media=sfBackgroundLayerMediaNode(layer);if(!media)return null;node.append(media);}if(layer.type==='reactive_tiles')sfCreateReactiveTiles(layer,node);return node;}
function sfGlobalMaskClip(mask={}){const size=Math.max(0,Math.min(160,Number(mask.size??100))),x=Math.max(0,Math.min(100,Number(mask.x??50))),y=Math.max(0,Math.min(100,Number(mask.y??50)));if(mask.type==='circle')return `circle(${size/2}% at ${x}% ${y}%)`;if(mask.type==='ellipse')return `ellipse(${size/2}% ${Math.max(8,size*.34)}% at ${x}% ${y}%)`;if(mask.type==='rectangle'||mask.type==='rounded')return `inset(${Math.max(0,(100-size)/2)}% ${Math.max(0,(100-size)/2)}% round ${mask.type==='rounded'?Math.max(0,Number(mask.radius||24)):0}px)`;if(mask.type==='split'){const edge=Math.max(0,Math.min(49,(100-size)/2));return `polygon(0 0,${50-edge}% 0,${50-edge}% 100%,0 100%,0 0,100% 0,100% 100%,${50+edge}% 100%,${50+edge}% 0)`;}if(mask.type==='slices')return 'polygon(0 0,18% 0,18% 100%,24% 100%,24% 0,47% 0,47% 100%,53% 100%,53% 0,76% 0,76% 100%,82% 100%,82% 0,100% 0,100% 100%,0 100%)';if(mask.type==='custom_clip'&&typeof mask.clip==='string'&&mask.clip.trim())return mask.clip;return 'none';}
function sfApplyGlobalCanvasFrame(root,config,override={}){const x=Number(override.section_global_canvas_x??config.position_x),y=Number(override.section_global_canvas_y??config.position_y),scale=Number(override.section_global_canvas_scale??config.scale),rotation=Number(override.section_global_canvas_rotation??config.rotation),opacity=Number(override.section_global_canvas_opacity??config.opacity),blur=Number(override.section_global_canvas_blur??config.blur),depth=Number(override.section_global_canvas_depth??config.depth),mask={...config.mask,type:override.section_global_canvas_mask||config.mask.type,size:Number(override.section_global_canvas_mask_size??config.mask.size),radius:Number(override.section_global_canvas_mask_radius??config.mask.radius),feather:Number(override.section_global_canvas_mask_feather??config.mask.feather)};root.style.setProperty('--sf-gmc-x',`${x}%`);root.style.setProperty('--sf-gmc-y',`${y}%`);root.style.setProperty('--sf-gmc-scale',String(scale));root.style.setProperty('--sf-gmc-rotation',`${rotation}deg`);root.style.setProperty('--sf-gmc-opacity',String(opacity));root.style.setProperty('--sf-gmc-filter',`blur(${blur}px) brightness(${config.brightness}) contrast(${config.contrast}) saturate(${config.saturation})`);root.style.setProperty('--sf-gmc-depth',`${depth*120}px`);root.style.clipPath=sfGlobalMaskClip(mask);root.dataset.mask=mask.type;root.dataset.transition=override.section_global_canvas_transition||'fade';}
function sfBackgroundStoryViewportAllows(scene){const w=innerWidth;if(w<=700)return scene.mobile_visible!==false;if(w<=1024)return scene.tablet_visible!==false;return scene.desktop_visible!==false;}
function sfClearBackgroundStoryTimers(){SF_BACKGROUND_STORY_TIMERS.forEach(clearTimeout);SF_BACKGROUND_STORY_TIMERS=[];}
function sfSetupBackgroundStory(config,canvasRoot,controller){sfClearBackgroundStoryTimers();document.querySelector('#sfBackgroundStory')?.remove();const story=config.story;if(!story?.enabled)return null;const scenes=story.scenes.filter(sfBackgroundStoryViewportAllows);if(!scenes.length)return null;const root=document.createElement('div');root.id='sfBackgroundStory';root.className='sf-background-story';root.setAttribute('aria-hidden','true');root.innerHTML='<div class="sf-background-story-inner"><span class="sf-background-story-kicker"></span><strong class="sf-background-story-phrase"></strong><p class="sf-background-story-subtitle"></p></div>';document.body.append(root);let activeId='';const apply=scene=>{if(!scene||scene.id===activeId)return;activeId=scene.id;root.dataset.position=scene.position;root.dataset.enter=scene.enter;root.dataset.exit=scene.exit;root.style.setProperty('--sf-bg-story-duration',`${Math.min(1.4,Math.max(.2,scene.duration_seconds))}s`);root.querySelector('.sf-background-story-kicker').textContent=scene.label||'';root.querySelector('.sf-background-story-phrase').textContent=scene.phrase||'';root.querySelector('.sf-background-story-subtitle').textContent=scene.subtitle||'';root.classList.remove('is-entering');void root.offsetWidth;root.classList.add('is-entering');canvasRoot?.querySelectorAll('[data-background-layer-id]').forEach(layer=>layer.toggleAttribute('data-story-sync',Boolean(scene.sync_layer_id&&layer.dataset.backgroundLayerId===scene.sync_layer_id)));};if(story.mode==='timeline'&&!reduced){const sorted=scenes.slice().sort((a,b)=>a.start_seconds-b.start_seconds);apply(sorted[0]);sorted.slice(1).forEach(scene=>SF_BACKGROUND_STORY_TIMERS.push(setTimeout(()=>apply(scene),scene.start_seconds*1000)));controller?.signal.addEventListener('abort',sfClearBackgroundStoryTimers,{once:true});return root;}const update=()=>{const pct=(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))*100;const sorted=scenes.slice().sort((a,b)=>a.start_percent-b.start_percent);let scene=sorted[0];for(const candidate of sorted){if(candidate.start_percent<=pct)scene=candidate;else break;}apply(scene);};window.addEventListener('scroll',update,{passive:true,signal:controller.signal});window.addEventListener('resize',update,{passive:true,signal:controller.signal});update();return root;}
function setupGlobalMediaCanvasV789(){SF_GLOBAL_CANVAS_SCROLL_CONTROLLER?.abort?.();SF_GLOBAL_CANVAS_SCROLL_CONTROLLER=null;document.querySelector('#sfGlobalMediaCanvas')?.remove();document.querySelector('#sfBackgroundStory')?.remove();sfClearBackgroundStoryTimers();const config=normalizeGlobalMediaCanvasPublic(DATA.site_builder?.global_media_canvas||{});if(!config.enabled)return null;const route=currentSeoRoute(),custom=currentCustomPage(),path=requestedRoutePath(),homeLike=!path||route?.kind==='home';const scopeAllowed=config.scope==='site'||config.scope==='page'||(config.scope==='home'&&homeLike)||(config.scope==='category'&&route?.kind==='category')||(config.scope==='project'&&route?.kind==='project')||(config.scope==='services'&&route?.kind==='services')||(config.scope==='service'&&route?.kind==='service')||(config.scope==='custom_page'&&Boolean(custom));const allBlocks=publicHomeBlocks().map(block=>normalizeSharedPublicBlock(block));const globalBlocks=allBlocks.filter(block=>block.visible!==false&&block.section_background_type==='global_media_canvas');if(config.scope==='section_group'&&!globalBlocks.length)return null;if(config.scope!=='section_group'&&!scopeAllowed)return null;const root=document.createElement('div');root.id='sfGlobalMediaCanvas';root.className='sf-global-media-canvas';root.dataset.scope=config.scope;root.dataset.motionMode=config.motion_mode;root.dataset.sfGlobalCanvas='true';root.setAttribute('aria-hidden','true');root.style.setProperty('--sf-gmc-fit',config.fit);root.style.setProperty('--sf-gmc-focal-x',`${config.focal_x}%`);root.style.setProperty('--sf-gmc-focal-y',`${config.focal_y}%`);const source=sfGlobalCanvasSourceNode(config);if(source){source.classList.add('sf-global-media-canvas-media');root.append(source);}sfBudgetBackgroundLayers(config.background_stack).filter(layer=>layer.type!=='media_canvas').sort((a,b)=>a.z_index-b.z_index).forEach(layer=>{const node=sfBackgroundLayerNode(layer);if(node)root.append(node);});if(!source&&!root.childElementCount&&!config.story.enabled)return null;document.body.prepend(root);sfApplyGlobalCanvasFrame(root,config,{});const controller=new AbortController();SF_GLOBAL_CANVAS_SCROLL_CONTROLLER=controller;setupV9BackgroundSectionVisibility(root,config,controller);const blockMap=new Map(allBlocks.map(block=>[String(block.id||''),block]));const sections=[...document.querySelectorAll('[data-home-block-id]')].map(node=>({node,block:blockMap.get(String(node.dataset.homeBlockId||''))})).filter(record=>record.block?.section_background_type==='global_media_canvas');const activate=record=>{sections.forEach(item=>item.node.classList.toggle('sf-global-canvas-active',item===record));if(record)sfApplyGlobalCanvasFrame(root,config,record.block);};let active=sections[0]||null;if(active)activate(active);const ratios=new Map();if(sections.length&&'IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>ratios.set(entry.target,entry.isIntersecting?entry.intersectionRatio:0));const next=sections.slice().sort((a,b)=>(ratios.get(b.node)||0)-(ratios.get(a.node)||0))[0];if(next&&(ratios.get(next.node)||0)>0&&next!==active){active=next;if(config.motion_mode!=='section_keyframes')activate(active);else sections.forEach(item=>item.node.classList.toggle('sf-global-canvas-active',item===active));}},{threshold:[.05,.2,.4,.65],rootMargin:'-20% 0px -45% 0px'});sections.forEach(({node})=>observer.observe(node));controller.signal.addEventListener('abort',()=>observer.disconnect(),{once:true});}const lerp=(a,b,t)=>Number(a)+(Number(b)-Number(a))*t;const frameValues=(block={})=>({section_global_canvas_x:Number(block.section_global_canvas_x??config.position_x),section_global_canvas_y:Number(block.section_global_canvas_y??config.position_y),section_global_canvas_scale:Number(block.section_global_canvas_scale??config.scale),section_global_canvas_rotation:Number(block.section_global_canvas_rotation??config.rotation),section_global_canvas_opacity:Number(block.section_global_canvas_opacity??config.opacity),section_global_canvas_blur:Number(block.section_global_canvas_blur??config.blur),section_global_canvas_depth:Number(block.section_global_canvas_depth??config.depth),section_global_canvas_mask:String(block.section_global_canvas_mask||config.mask.type),section_global_canvas_mask_size:Number(block.section_global_canvas_mask_size??config.mask.size),section_global_canvas_mask_radius:Number(block.section_global_canvas_mask_radius??config.mask.radius),section_global_canvas_mask_feather:Number(block.section_global_canvas_mask_feather??config.mask.feather),section_global_canvas_transition:String(block.section_global_canvas_transition||'fade')});const interpolateFrames=(before,after,t)=>{const a=frameValues(before),b=frameValues(after),out={};['section_global_canvas_x','section_global_canvas_y','section_global_canvas_scale','section_global_canvas_rotation','section_global_canvas_opacity','section_global_canvas_blur','section_global_canvas_depth','section_global_canvas_mask_size','section_global_canvas_mask_radius','section_global_canvas_mask_feather'].forEach(key=>out[key]=lerp(a[key],b[key],t));out.section_global_canvas_mask=t<.5?a.section_global_canvas_mask:b.section_global_canvas_mask;out.section_global_canvas_transition=t<.5?a.section_global_canvas_transition:b.section_global_canvas_transition;return out;};let pointerX=0,pointerY=0,gyroX=0,gyroY=0;const updateLayers=()=>{const denom=Math.max(1,document.documentElement.scrollHeight-innerHeight),progress=scrollY/denom-.5;root.querySelectorAll('[data-background-layer-id]').forEach(node=>{const layer=config.background_stack.find(item=>item.id===node.dataset.backgroundLayerId);if(!layer)return;node.style.setProperty('--sf-bg-scroll-y',`${progress*layer.scroll_speed*-180}px`);node.style.setProperty('--sf-bg-pointer-x',`${(pointerX*layer.mouse_response+gyroX*layer.gyro_response)*18}px`);node.style.setProperty('--sf-bg-pointer-y',`${(pointerY*layer.mouse_response+gyroY*layer.gyro_response)*18}px`);if(layer.type==='reactive_tiles')sfUpdateReactiveTiles(node,layer,pointerX+gyroX,pointerY+gyroY,progress+.5);});};const needsPointer=config.background_stack.some(layer=>layer.mouse_response>0)||['mouse_parallax','scroll_mouse'].includes(config.motion_mode);if(needsPointer)window.addEventListener('pointermove',event=>{pointerX=(event.clientX/Math.max(1,innerWidth)-.5)*2;pointerY=(event.clientY/Math.max(1,innerHeight)-.5)*2;updateLayers();},{passive:true,signal:controller.signal});if(config.background_stack.some(layer=>layer.gyro_response>0))window.addEventListener('deviceorientation',event=>{gyroX=Math.max(-1,Math.min(1,Number(event.gamma||0)/45))*config.gyro_strength;gyroY=Math.max(-1,Math.min(1,Number(event.beta||0)/45))*config.gyro_strength;updateLayers();},{passive:true,signal:controller.signal});let ticking=false;const update=()=>{ticking=false;if(!root.isConnected){controller.abort();return;}if(config.motion_mode==='section_keyframes'&&sections.length){const viewportCenter=innerHeight*.5,records=sections.map(record=>{const rect=record.node.getBoundingClientRect();return{...record,center:rect.top+rect.height*.5};}).sort((a,b)=>a.center-b.center);let before=records[0],after=records[records.length-1];for(let i=0;i<records.length;i+=1){if(records[i].center<=viewportCenter)before=records[i];if(records[i].center>=viewportCenter){after=records[i];break;}}const span=Math.max(1,after.center-before.center),t=before===after?0:Math.max(0,Math.min(1,(viewportCenter-before.center)/span));sfApplyGlobalCanvasFrame(root,config,interpolateFrames(before.block,after.block,t));const nearest=t<.5?before:after;if(nearest!==active){active=nearest;sections.forEach(item=>item.node.classList.toggle('sf-global-canvas-active',item===active));}}else if(['parallax','scroll_tracked','scroll_mouse'].includes(config.motion_mode)){const progress=(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))-.5;root.style.setProperty('--sf-gmc-scroll-y',`${progress*config.parallax_strength*-90}px`);}updateLayers();};window.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(update);},{passive:true,signal:controller.signal});window.addEventListener('resize',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true,signal:controller.signal});update();sfSetupBackgroundStory(config,root,controller);controller.signal.addEventListener('abort',()=>{root.remove();document.querySelector('#sfBackgroundStory')?.remove();sfClearBackgroundStoryTimers();},{once:true});return root;}

let SF_THREE_D_CONTROLLER=null;
const V9_PHASE_E_3D_ASSETS=Object.freeze({
  'oryzo-controller':{id:'oryzo-controller',engine:'glb',bundled_path:'3d/oryzo-controller.glb.gz',compression:'gzip',runtime_ready:true},
  'oryzo-crystal-cluster':{id:'oryzo-crystal-cluster',engine:'glb',bundled_path:'3d/oryzo-crystal-cluster.glb.gz',fallback_path:'3d/fallbacks/oryzo-crystal-cluster.png',compression:'gzip',runtime_ready:true,license:'CC0-1.0'},
  'studio-orbit-dish':{id:'studio-orbit-dish',engine:'glb',bundled_path:'3d/studio-orbit-dish.glb.gz',fallback_path:'3d/fallbacks/studio-orbit-dish.png',compression:'gzip',runtime_ready:true,license:'CC0-1.0'},
  'organic-editorial-tree':{id:'organic-editorial-tree',engine:'glb',bundled_path:'3d/organic-editorial-tree.glb.gz',fallback_path:'3d/fallbacks/organic-editorial-tree.png',compression:'gzip',runtime_ready:true,license:'CC0-1.0'}
});
function normalizeThreeDScenePublic(raw={}){const interaction=raw.interaction&&typeof raw.interaction==='object'?raw.interaction:{},performance=raw.performance&&typeof raw.performance==='object'?raw.performance:{};return {...raw,version:1,enabled:raw.enabled===true,engine:['three_scene','glb','spline'].includes(String(raw.engine||''))?String(raw.engine):'three_scene',placement:['global_background','hero','section'].includes(String(raw.placement||''))?String(raw.placement):'global_background',section_block_id:String(raw.section_block_id||''),source:['safe_url','drive_file_id'].includes(String(raw.source||''))?String(raw.source):'safe_url',url:String(raw.url||'').trim(),drive_file_id:String(raw.drive_file_id||'').trim().replace(/[^A-Za-z0-9_-]/g,''),fallback_url:String(raw.fallback_url||'').trim(),geometry:['torus_knot','icosahedron','wire_cube','orb'].includes(String(raw.geometry||''))?String(raw.geometry):'torus_knot',x:Math.max(-100,Math.min(100,Number(raw.x||0))),y:Math.max(-100,Math.min(100,Number(raw.y||0))),scale:Math.max(.1,Math.min(3,Number(raw.scale||1))),rotation_x:Math.max(-180,Math.min(180,Number(raw.rotation_x||0))),rotation_y:Math.max(-180,Math.min(180,Number(raw.rotation_y||0))),rotation_z:Math.max(-180,Math.min(180,Number(raw.rotation_z||0))),opacity:Math.max(0,Math.min(1,Number(raw.opacity??1))),interaction:{pointer_mode:['tilt','follow','orbit','none'].includes(String(interaction.pointer_mode||''))?String(interaction.pointer_mode):'tilt',pointer_strength:Math.max(0,Math.min(2,Number(interaction.pointer_strength??.35))),scroll_mode:['rotate','translate_y','dolly','none'].includes(String(interaction.scroll_mode||''))?String(interaction.scroll_mode):'rotate',scroll_strength:Math.max(0,Math.min(2,Number(interaction.scroll_strength??.45))),gyro:interaction.gyro===true,auto_rotate:interaction.auto_rotate===true,pointer_events:interaction.pointer_events===true},performance:{max_pixel_ratio:Math.max(.75,Math.min(2,Number(performance.max_pixel_ratio??1.5))),transparent:performance.transparent!==false,desktop_enabled:performance.desktop_enabled!==false,tablet_enabled:performance.tablet_enabled!==false,mobile_enabled:performance.mobile_enabled!==false,reduced_motion_fallback:performance.reduced_motion_fallback!==false}};}
function sfThreeViewportAllows(c){const w=innerWidth;return w<=700?c.performance.mobile_enabled:(w<=1024?c.performance.tablet_enabled:c.performance.desktop_enabled);}
function sfThreeSourceUrl(c){if(c.engine==='spline')return safeExternalHttps(c.url||'');if(c.source==='drive_file_id'&&c.drive_file_id)return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(c.drive_file_id)}&export=download&authuser=0`;return safeExternalHttps(c.url||'');}
// V9.1.1-E · additive bundled-asset support; Phase 9 canonical functions remain preserved above.
const V9_PHASE_E_NORMALIZE_THREE_D_PUBLIC_BASE=normalizeThreeDScenePublic;
normalizeThreeDScenePublic=function(raw={}){const c=V9_PHASE_E_NORMALIZE_THREE_D_PUBLIC_BASE(raw);c.asset_id=String(raw.asset_id||c.asset_id||'');if(String(raw.source||'')==='bundled_asset')c.source='bundled_asset';return c;};
const V9_PHASE_E_THREE_SOURCE_BASE=sfThreeSourceUrl;
sfThreeSourceUrl=function(c){if(c?.source==='bundled_asset'){const asset=V9_PHASE_E_3D_ASSETS[c.asset_id];if(asset?.runtime_ready)return studioFrameRuntimeAssetUrl(asset.bundled_path);}return V9_PHASE_E_THREE_SOURCE_BASE(c);};

function sfThreeTarget(c){if(c.placement==='hero')return document.querySelector('.hero');if(c.placement==='section'&&c.section_block_id)return document.querySelector(`[data-home-block-id="${CSS.escape(c.section_block_id)}"]`);return document.body;}
function sfThreeFallback(root,c,label='3D indisponível'){const url=safeExternalHttps(c.fallback_url||'');root.replaceChildren();root.dataset.fallback='true';if(url){const img=document.createElement('img');img.className='sf-three-d-fallback';img.src=url;img.alt='';root.append(img);}else{const note=document.createElement('span');note.className='sf-three-d-fallback-note';note.textContent=label;root.append(note);}return root;}
const EDITOR_ENGINE_12_THREE_FALLBACK_BASE=sfThreeFallback;
function editorEngine12BundledFallbackUrl(c){const asset=c?.source==='bundled_asset'?V9_PHASE_E_3D_ASSETS[c.asset_id]:null;return asset?.fallback_path?studioFrameRuntimeAssetUrl(asset.fallback_path):'';}
sfThreeFallback=function(root,c,label='3D indisponível'){const bundled=editorEngine12BundledFallbackUrl(c);if(!safeExternalHttps(c?.fallback_url||'')&&bundled){root.replaceChildren();root.dataset.fallback='true';root.dataset.fallbackSource='bundled_asset';root.dataset.sourceAsset=String(c?.asset_id||'');const img=document.createElement('img');img.className='sf-three-d-fallback';img.src=bundled;img.alt='';img.loading='lazy';img.decoding='async';root.append(img);return root;}return EDITOR_ENGINE_12_THREE_FALLBACK_BASE(root,c,label);};
function sfLoadExternalModuleOnce(key,url){window.__SF_3D_MODULES__ ||= {};return window.__SF_3D_MODULES__[key] ||= import(url);}
async function sfMountThreeProcedural(root,c,controller){const threeModuleUrl=window.__SF_THREE_MODULE_OVERRIDE_URL__||`${publicAssetBase()}motion/vendor/three/three.module.min.js`;const THREE=await import(threeModuleUrl);if(controller.signal.aborted)return;const canvas=document.createElement('canvas');canvas.className='sf-three-d-canvas';root.append(canvas);const renderer=new THREE.WebGLRenderer({canvas,alpha:c.performance.transparent,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,c.performance.max_pixel_ratio));renderer.setClearColor(0x000000,c.performance.transparent?0:1);const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,100);camera.position.set(0,0,4.3);let geometry;if(c.geometry==='icosahedron')geometry=new THREE.IcosahedronGeometry(1.25,2);else if(c.geometry==='wire_cube')geometry=new THREE.BoxGeometry(2,2,2,5,5,5);else if(c.geometry==='orb')geometry=new THREE.SphereGeometry(1.25,48,32);else geometry=new THREE.TorusKnotGeometry(.9,.28,160,24);const material=new THREE.MeshStandardMaterial({color:0xb8f5db,roughness:.32,metalness:.42,wireframe:c.geometry==='wire_cube',transparent:true,opacity:.95});const object=new THREE.Mesh(geometry,material);object.rotation.set(c.rotation_x*Math.PI/180,c.rotation_y*Math.PI/180,c.rotation_z*Math.PI/180);scene.add(object);scene.add(new THREE.AmbientLight(0xffffff,1.35));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(3,4,5);scene.add(key);const rim=new THREE.DirectionalLight(0x5ad6ff,1.5);rim.position.set(-4,1,-2);scene.add(rim);let mixerT=0,raf=0;const resize=()=>{const rect=root.getBoundingClientRect();renderer.setSize(Math.max(1,rect.width),Math.max(1,rect.height),false);camera.aspect=Math.max(.1,rect.width/Math.max(1,rect.height));camera.updateProjectionMatrix();};const frame=t=>{if(controller.signal.aborted)return;const dt=Math.min(.05,(t-mixerT||16)/1000);mixerT=t;if(!reduced&&c.interaction.auto_rotate)object.rotation.y+=dt*.45;const px=Number(root.dataset.pointerX||0),py=Number(root.dataset.pointerY||0),scroll=Number(root.dataset.scrollProgress||0);if(!reduced&&c.interaction.pointer_mode!=='none'){object.rotation.y+=((c.rotation_y*Math.PI/180)+(px*c.interaction.pointer_strength*.32)-object.rotation.y)*.06;object.rotation.x+=((c.rotation_x*Math.PI/180)+(py*c.interaction.pointer_strength*.24)-object.rotation.x)*.06;}if(!reduced&&c.interaction.scroll_mode==='rotate')object.rotation.z=(c.rotation_z*Math.PI/180)+scroll*c.interaction.scroll_strength*Math.PI*2;if(c.interaction.scroll_mode==='dolly')camera.position.z=4.3-scroll*c.interaction.scroll_strength*1.6;renderer.render(scene,camera);raf=requestAnimationFrame(frame);};resize();window.addEventListener('resize',resize,{passive:true,signal:controller.signal});raf=requestAnimationFrame(frame);controller.signal.addEventListener('abort',()=>{cancelAnimationFrame(raf);geometry.dispose();material.dispose();renderer.dispose();},{once:true});}
async function sfMountGlbViewer(root,c,controller){const src=sfThreeSourceUrl(c);if(!src){sfThreeFallback(root,c,'Informe uma URL ou Drive file ID para o GLB');return;}try{await sfLoadExternalModuleOnce('model-viewer-4.3.1','https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js');if(controller.signal.aborted)return;const view=document.createElement('model-viewer');view.className='sf-three-d-model-viewer';view.src=src;view.setAttribute('loading','lazy');view.setAttribute('interaction-prompt','none');view.setAttribute('shadow-intensity','1');view.setAttribute('exposure','1');if(c.interaction.pointer_events||c.interaction.pointer_mode==='orbit')view.setAttribute('camera-controls','');if(c.interaction.auto_rotate&&!reduced)view.setAttribute('auto-rotate','');view.addEventListener('error',()=>sfThreeFallback(root,c,'Falha ao carregar GLB / verifique CORS'),{once:true,signal:controller.signal});root.append(view);}catch(error){console.warn('StudioFrame 3D GLB fallback',error);sfThreeFallback(root,c,'Model Viewer indisponível');}}

const V9_PHASE_E_MOUNT_GLB_BASE=sfMountGlbViewer;
async function v9PhaseEInflateBundledGlb(src,signal){
  if(typeof DecompressionStream!=='function')throw new Error('GZIP GLB requer DecompressionStream');
  const response=await fetch(src,{signal,cache:'force-cache'});
  if(!response.ok||!response.body)throw new Error(`GLB compactado indisponível (${response.status})`);
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  const blob=await new Response(stream,{headers:{'Content-Type':'model/gltf-binary'}}).blob();
  return URL.createObjectURL(blob);
}
sfMountGlbViewer=async function(root,c,controller){
  const src=sfThreeSourceUrl(c);
  const asset=c?.source==='bundled_asset'?V9_PHASE_E_3D_ASSETS[c.asset_id]:null;
  if(!asset||asset.compression!=='gzip')return V9_PHASE_E_MOUNT_GLB_BASE(root,c,controller);
  if(!src){sfThreeFallback(root,c,'Asset 3D empacotado indisponível');return;}
  let objectUrl='';
  try{
    objectUrl=await v9PhaseEInflateBundledGlb(src,controller.signal);
    if(controller.signal.aborted){URL.revokeObjectURL(objectUrl);return;}
    await sfLoadExternalModuleOnce('model-viewer-4.3.1','https://ajax.googleapis.com/ajax/libs/model-viewer/4.3.1/model-viewer.min.js');
    if(controller.signal.aborted){URL.revokeObjectURL(objectUrl);return;}
    const view=document.createElement('model-viewer');view.className='sf-three-d-model-viewer';view.src=objectUrl;view.dataset.sourceAsset=asset.id;view.dataset.compression='gzip';view.setAttribute('loading','lazy');view.setAttribute('interaction-prompt','none');view.setAttribute('shadow-intensity','1');view.setAttribute('exposure','1');if(c.interaction.pointer_events||c.interaction.pointer_mode==='orbit')view.setAttribute('camera-controls','');if(c.interaction.auto_rotate&&!reduced)view.setAttribute('auto-rotate','');view.addEventListener('error',()=>sfThreeFallback(root,c,'Falha ao carregar GLB compactado'),{once:true,signal:controller.signal});root.append(view);controller.signal.addEventListener('abort',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);},{once:true});
  }catch(error){if(objectUrl)URL.revokeObjectURL(objectUrl);console.warn('StudioFrame bundled GLB fallback',error);sfThreeFallback(root,c,'Asset 3D compactado indisponível');}
};

async function sfMountSplineViewer(root,c,controller){const src=sfThreeSourceUrl(c);if(!src||!src.toLowerCase().includes('.splinecode')){sfThreeFallback(root,c,'Spline requer URL publicada .splinecode');return;}try{await sfLoadExternalModuleOnce('spline-viewer-1.12.97','https://unpkg.com/@splinetool/viewer@1.12.97/build/spline-viewer.js');if(controller.signal.aborted)return;const view=document.createElement('spline-viewer');view.className='sf-three-d-spline-viewer';view.setAttribute('url',src);view.setAttribute('loading','lazy');view.setAttribute('events-target',c.interaction.pointer_events?'local':'global');root.append(view);}catch(error){console.warn('StudioFrame Spline fallback',error);sfThreeFallback(root,c,'Spline Viewer indisponível');}}
function setupThreeDSceneV91(){SF_THREE_D_CONTROLLER?.abort?.();SF_THREE_D_CONTROLLER=null;document.querySelectorAll('.sf-three-d-scene[data-sf-three-d]').forEach(node=>node.remove());const c=normalizeThreeDScenePublic(DATA.site_builder?.three_d_scene||{});if(!c.enabled||!sfThreeViewportAllows(c))return null;const target=sfThreeTarget(c);if(!target)return null;const root=document.createElement('div');root.className=`sf-three-d-scene sf-three-d-${c.placement.replace('_','-')}`;root.dataset.sfThreeD='true';root.dataset.engine=c.engine;root.dataset.placement=c.placement;root.style.setProperty('--sf-3d-x',`${c.x}%`);root.style.setProperty('--sf-3d-y',`${c.y}%`);root.style.setProperty('--sf-3d-scale',String(c.scale));root.style.setProperty('--sf-3d-rot-x',`${c.rotation_x}deg`);root.style.setProperty('--sf-3d-rot-y',`${c.rotation_y}deg`);root.style.setProperty('--sf-3d-rot-z',`${c.rotation_z}deg`);root.style.setProperty('--sf-3d-opacity',String(c.opacity));root.style.pointerEvents=c.interaction.pointer_events?'auto':'none';if(c.placement==='global_background'){const bg=document.querySelector('#sfGlobalMediaCanvas');bg?.insertAdjacentElement('afterend',root);if(!root.isConnected)document.body.prepend(root);}else{target.classList.add('sf-three-d-host');target.append(root);}const controller=new AbortController();SF_THREE_D_CONTROLLER=controller;const fallbackReduced=reduced&&c.performance.reduced_motion_fallback&&safeExternalHttps(c.fallback_url||'');if(fallbackReduced){sfThreeFallback(root,c,'Reduced motion');return root;}let px=0,py=0,gx=0,gy=0;const updateTransform=()=>{root.dataset.pointerX=String(px+gx);root.dataset.pointerY=String(py+gy);root.style.setProperty('--sf-3d-pointer-x',`${(px+gx)*c.interaction.pointer_strength*22}px`);root.style.setProperty('--sf-3d-pointer-y',`${(py+gy)*c.interaction.pointer_strength*18}px`);};if(!reduced&&c.interaction.pointer_mode!=='none')window.addEventListener('pointermove',event=>{px=(event.clientX/Math.max(1,innerWidth)-.5)*2;py=(event.clientY/Math.max(1,innerHeight)-.5)*2;updateTransform();},{passive:true,signal:controller.signal});if(!reduced&&c.interaction.gyro)window.addEventListener('deviceorientation',event=>{gx=Math.max(-1,Math.min(1,Number(event.gamma||0)/45))*.45;gy=Math.max(-1,Math.min(1,Number(event.beta||0)/45))*.45;updateTransform();},{passive:true,signal:controller.signal});const updateScroll=()=>{const progress=scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight);root.dataset.scrollProgress=String(progress);root.style.setProperty('--sf-3d-scroll-y',c.interaction.scroll_mode==='translate_y'?`${(progress-.5)*c.interaction.scroll_strength*-180}px`:'0px');root.style.setProperty('--sf-3d-scroll-scale',c.interaction.scroll_mode==='dolly'?String(1+(progress-.5)*c.interaction.scroll_strength*.18):'1');};window.addEventListener('scroll',updateScroll,{passive:true,signal:controller.signal});updateScroll();if(c.engine==='three_scene')sfMountThreeProcedural(root,c,controller).catch(error=>{console.warn('StudioFrame Three.js fallback',error);sfThreeFallback(root,c,'WebGL indisponível');});else if(c.engine==='glb')sfMountGlbViewer(root,c,controller);else sfMountSplineViewer(root,c,controller);controller.signal.addEventListener('abort',()=>{root.remove();target.classList?.remove('sf-three-d-host');},{once:true});return root;}

// EDITOR ENGINE 12: a mesma cena canônica troca o renderer pelo poster empacotado
// quando o breakpoint desativa 3D ou quando reduced-motion solicita fallback.
const EDITOR_ENGINE_12_SETUP_THREE_BASE=setupThreeDSceneV91;
function editorEngine12MountThreeFallback(c,reason){SF_THREE_D_CONTROLLER?.abort?.();SF_THREE_D_CONTROLLER=null;document.querySelectorAll('.sf-three-d-scene[data-sf-three-d]').forEach(node=>node.remove());const target=sfThreeTarget(c);if(!target)return null;const root=document.createElement('div');root.className=`sf-three-d-scene sf-three-d-${c.placement.replace('_','-')}`;root.dataset.sfThreeD='true';root.dataset.engine=c.engine;root.dataset.placement=c.placement;root.style.setProperty('--sf-3d-x',`${c.x}%`);root.style.setProperty('--sf-3d-y',`${c.y}%`);root.style.setProperty('--sf-3d-scale',String(c.scale));root.style.setProperty('--sf-3d-opacity',String(c.opacity));root.style.pointerEvents='none';if(c.placement==='global_background'){const bg=document.querySelector('#sfGlobalMediaCanvas');bg?.insertAdjacentElement('afterend',root);if(!root.isConnected)document.body.prepend(root);}else{target.classList.add('sf-three-d-host');target.append(root);}const controller=new AbortController();SF_THREE_D_CONTROLLER=controller;root.dataset.fallbackReason=reason;sfThreeFallback(root,c,reason==='reduced-motion'?'Reduced motion':'Breakpoint fallback');controller.signal.addEventListener('abort',()=>{root.remove();target.classList?.remove('sf-three-d-host');},{once:true});return root;}
setupThreeDSceneV91=function(){if(sfImmersiveV31Enabled()){SF_THREE_D_CONTROLLER?.abort?.();SF_THREE_D_CONTROLLER=null;document.querySelectorAll('.sf-three-d-scene[data-sf-three-d]').forEach(node=>node.remove());return null;}const c=normalizeThreeDScenePublic(DATA.site_builder?.three_d_scene||{}),bundledFallback=editorEngine12BundledFallbackUrl(c);if(c.enabled&&bundledFallback){if(!sfThreeViewportAllows(c))return editorEngine12MountThreeFallback(c,'breakpoint');if(reduced&&c.performance.reduced_motion_fallback)return editorEngine12MountThreeFallback(c,'reduced-motion');}return EDITOR_ENGINE_12_SETUP_THREE_BASE();};

// V9.1 PHASE 10 — PHASER-001
const PHASER_4_2_1_CDN='https://cdn.jsdelivr.net/npm/phaser@4.2.1/dist/phaser.min.js';
let SF_PHASER_CONTROLLER=null,SF_PHASER_LIBRARY_PROMISE=null;
function normalizePhaserObjectPublic(raw={},index=0){const types=['circle','rect','text','image'],actions=['none','score','hide','goto'],type=types.includes(String(raw.type||''))?String(raw.type):'circle';return {...raw,id:String(raw.id||`phaser-object-${index+1}`),label:String(raw.label||`Object ${index+1}`),type,text:String(raw.text||''),asset_url:String(raw.asset_url||'').trim(),x:Math.max(0,Math.min(100,Number(raw.x??50))),y:Math.max(0,Math.min(100,Number(raw.y??50))),width:Math.max(4,Math.min(100,Number(raw.width??14))),height:Math.max(4,Math.min(100,Number(raw.height??14))),radius:Math.max(2,Math.min(50,Number(raw.radius??5))),color:/^#[0-9a-f]{6}$/i.test(String(raw.color||''))?String(raw.color):'#7aa2ff',font_size:Math.max(10,Math.min(96,Number(raw.font_size??28))),opacity:Math.max(0,Math.min(1,Number(raw.opacity??1))),rotation:Math.max(-360,Math.min(360,Number(raw.rotation||0))),interactive:raw.interactive!==false,physics:raw.physics===true,immovable:raw.immovable===true,bounce:Math.max(0,Math.min(1,Number(raw.bounce||0))),collide_world_bounds:raw.collide_world_bounds!==false,velocity_x:Math.max(-2000,Math.min(2000,Number(raw.velocity_x||0))),velocity_y:Math.max(-2000,Math.min(2000,Number(raw.velocity_y||0))),control:raw.control==='player'?'player':'none',action:actions.includes(String(raw.action||''))?String(raw.action):'none',action_value:String(raw.action_value||''),score_delta:Math.max(-9999,Math.min(9999,Number(raw.score_delta??1))),visible:raw.visible!==false};}
function normalizePhaserScenePublic(raw={}){const controls=raw.controls&&typeof raw.controls==='object'?raw.controls:{},breakpoints=raw.breakpoints&&typeof raw.breakpoints==='object'?raw.breakpoints:{},fallback=raw.fallback&&typeof raw.fallback==='object'?raw.fallback:{},bp=name=>['same','fallback','hide'].includes(String(breakpoints[name]||''))?String(breakpoints[name]):'same';return {...raw,version:1,enabled:raw.enabled===true,template:['collector','hotspots','blank'].includes(String(raw.template||''))?String(raw.template):'collector',placement:['section','hero','global'].includes(String(raw.placement||''))?String(raw.placement):'section',section_block_id:String(raw.section_block_id||''),renderer:['auto','webgl','canvas'].includes(String(raw.renderer||''))?String(raw.renderer):'auto',height:Math.max(240,Math.min(1200,Number(raw.height||640))),background:/^#[0-9a-f]{6}$/i.test(String(raw.background||''))?String(raw.background):'#0b1020',transparent:raw.transparent===true,pixel_art:raw.pixel_art===true,physics:raw.physics==='none'?'none':'arcade',gravity_y:Math.max(-3000,Math.min(3000,Number(raw.gravity_y||0))),autostart:raw.autostart!==false,pause_outside_viewport:raw.pause_outside_viewport!==false,controls:{keyboard:controls.keyboard!==false,pointer:controls.pointer!==false,touch:controls.touch!==false,gyro:controls.gyro===true},score_enabled:raw.score_enabled!==false,initial_score:Math.max(-99999,Math.min(99999,Number(raw.initial_score||0))),target_score:Math.max(0,Math.min(99999,Number(raw.target_score||10))),objects:(Array.isArray(raw.objects)?raw.objects:[]).filter(v=>v&&typeof v==='object').slice(0,48).map(normalizePhaserObjectPublic),breakpoints:{desktop:bp('desktop'),tablet:bp('tablet'),mobile:bp('mobile')},fallback:{title:String(fallback.title||'Experiência interativa'),body:String(fallback.body||'Esta experiência usa uma versão compatível com seu dispositivo.'),poster_url:String(fallback.poster_url||'').trim()}};}
function sfPhaserViewportMode(c){const w=innerWidth||1024;return w<=600?c.breakpoints.mobile:w<=980?c.breakpoints.tablet:c.breakpoints.desktop;}
function sfPhaserTarget(c){if(c.placement==='global')return document.body;if(c.placement==='hero')return document.querySelector('.hero')||document.querySelector('#top');if(c.section_block_id)return document.querySelector(`[data-home-block-id="${CSS.escape(c.section_block_id)}"]`)||document.getElementById(c.section_block_id);return document.querySelector('#top')||document.body;}
function sfPhaserFallbackCard(root,c,reason='Fallback'){root.dataset.runtime='fallback-card';root.innerHTML='';const card=document.createElement('div');card.className='sf-phaser-fallback-card';const poster=safeExternalHttps(c.fallback.poster_url||'');if(poster){const img=document.createElement('img');img.src=poster;img.alt='';img.loading='lazy';card.append(img);}const copy=document.createElement('div');copy.innerHTML=`<strong>${esc(c.fallback.title)}</strong><p>${esc(c.fallback.body)}</p><small>${esc(reason)}</small>`;card.append(copy);root.append(card);return {destroy(){root.innerHTML='';}};}
function sfPhaserAction(c,obj,state,node){if(!obj||!obj.interactive)return;if(obj.action==='score'){state.score+=Number(obj.score_delta||1);state.hidden.add(obj.id);node?.setAttribute?.('data-collected','true');}else if(obj.action==='hide'){state.hidden.add(obj.id);}else if(obj.action==='goto'){const url=safeExternalHttps(obj.action_value||'');if(url)location.href=url;}if(state.hud)state.hud.textContent=`SCORE ${state.score}${c.target_score?` / ${c.target_score}`:''}`;if(c.target_score&&state.score>=c.target_score)state.root.dataset.complete='true';}
function sfMountNativePhaserFallback(root,c,controller){root.dataset.runtime='native-canvas';const wrap=document.createElement('div');wrap.className='sf-phaser-native';const canvas=document.createElement('canvas');canvas.className='sf-phaser-canvas';canvas.tabIndex=0;wrap.append(canvas);const hud=c.score_enabled?document.createElement('div'):null;if(hud){hud.className='sf-phaser-score';hud.textContent=`SCORE ${c.initial_score}${c.target_score?` / ${c.target_score}`:''}`;wrap.append(hud);}root.replaceChildren(wrap);const ctx=canvas.getContext('2d'),state={root,score:c.initial_score,hud,hidden:new Set(),keys:new Set(),objects:c.objects.map(o=>({...o})),images:new Map(),running:c.autostart!==false,last:performance.now()};for(const o of state.objects)if(o.type==='image'&&safeExternalHttps(o.asset_url)){const img=new Image();img.crossOrigin='anonymous';img.src=o.asset_url;state.images.set(o.id,img);}const resize=()=>{const r=root.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.floor(r.width*dpr));canvas.height=Math.max(1,Math.floor(r.height*dpr));canvas.style.width=`${r.width}px`;canvas.style.height=`${r.height}px`;ctx.setTransform(dpr,0,0,dpr,0,0);};resize();window.addEventListener('resize',resize,{signal:controller.signal});const hit=(o,x,y,w,h)=>{const ox=o.x/100*w,oy=o.y/100*h;if(o.type==='circle')return Math.hypot(x-ox,y-oy)<=o.radius/100*Math.min(w,h);const ow=o.width/100*w,oh=o.height/100*h;return x>=ox-ow/2&&x<=ox+ow/2&&y>=oy-oh/2&&y<=oy+oh/2;};const activate=(x,y)=>{const r=canvas.getBoundingClientRect();for(let i=state.objects.length-1;i>=0;i--){const o=state.objects[i];if(!state.hidden.has(o.id)&&o.visible!==false&&o.interactive&&hit(o,x-r.left,y-r.top,r.width,r.height)){root.dataset.lastAction=o.id;sfPhaserAction(c,o,state,canvas);break;}}};if(c.controls.pointer){root.dataset.pointerReady='true';canvas.addEventListener('pointerdown',e=>{root.dataset.pointerEvent='true';root.dataset.pointerCoords=`${e.clientX},${e.clientY}`;canvas.focus();activate(e.clientX,e.clientY);},{signal:controller.signal});}if(c.controls.keyboard){window.addEventListener('keydown',e=>state.keys.add(e.key.toLowerCase()),{signal:controller.signal});window.addEventListener('keyup',e=>state.keys.delete(e.key.toLowerCase()),{signal:controller.signal});}let gx=0,gy=0;if(c.controls.gyro)window.addEventListener('deviceorientation',e=>{gx=Math.max(-1,Math.min(1,Number(e.gamma||0)/45));gy=Math.max(-1,Math.min(1,Number(e.beta||0)/45));},{passive:true,signal:controller.signal});let observer=null;if(c.pause_outside_viewport&&'IntersectionObserver'in window){observer=new IntersectionObserver(entries=>{state.running=entries.some(e=>e.isIntersecting)&&c.autostart!==false;},{threshold:.02});observer.observe(root);controller.signal.addEventListener('abort',()=>observer.disconnect(),{once:true});}const frame=t=>{if(controller.signal.aborted)return;const r=canvas.getBoundingClientRect(),dt=Math.min(.05,Math.max(0,(t-state.last)/1000));state.last=t;if(state.running&&!reduced){for(const o of state.objects){if(o.control==='player'){const speed=42*dt;let dx=(state.keys.has('arrowright')||state.keys.has('d')?1:0)-(state.keys.has('arrowleft')||state.keys.has('a')?1:0),dy=(state.keys.has('arrowdown')||state.keys.has('s')?1:0)-(state.keys.has('arrowup')||state.keys.has('w')?1:0);o.x=Math.max(0,Math.min(100,o.x+dx*speed+gx*speed*.18));o.y=Math.max(0,Math.min(100,o.y+dy*speed+gy*speed*.18));}if(o.physics&&c.physics==='arcade'){o.velocity_y+=c.gravity_y*dt;o.x=Math.max(0,Math.min(100,o.x+o.velocity_x*dt/Math.max(1,r.width)*100));o.y=Math.max(0,Math.min(100,o.y+o.velocity_y*dt/Math.max(1,r.height)*100));}}}ctx.clearRect(0,0,r.width,r.height);if(!c.transparent){ctx.fillStyle=c.background;ctx.fillRect(0,0,r.width,r.height);}for(const o of state.objects){if(o.visible===false||state.hidden.has(o.id))continue;const x=o.x/100*r.width,y=o.y/100*r.height;ctx.save();ctx.globalAlpha=o.opacity;ctx.translate(x,y);ctx.rotate(o.rotation*Math.PI/180);if(o.type==='circle'){ctx.fillStyle=o.color;ctx.beginPath();ctx.arc(0,0,o.radius/100*Math.min(r.width,r.height),0,Math.PI*2);ctx.fill();}else if(o.type==='rect'){ctx.fillStyle=o.color;ctx.fillRect(-o.width/200*r.width,-o.height/200*r.height,o.width/100*r.width,o.height/100*r.height);}else if(o.type==='text'){ctx.fillStyle=o.color;ctx.font=`700 ${o.font_size}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(o.text||o.label,0,0);}else if(o.type==='image'){const img=state.images.get(o.id);if(img?.complete&&img.naturalWidth)ctx.drawImage(img,-o.width/200*r.width,-o.height/200*r.height,o.width/100*r.width,o.height/100*r.height);else{ctx.strokeStyle=o.color;ctx.strokeRect(-o.width/200*r.width,-o.height/200*r.height,o.width/100*r.width,o.height/100*r.height);}}ctx.restore();}requestAnimationFrame(frame);};requestAnimationFrame(frame);return {destroy(){observer?.disconnect();wrap.remove();}};}
function loadPhaser4Runtime(){if(window.Phaser?.Game)return Promise.resolve(window.Phaser);if(SF_PHASER_LIBRARY_PROMISE)return SF_PHASER_LIBRARY_PROMISE;SF_PHASER_LIBRARY_PROMISE=new Promise((resolve,reject)=>{const existing=document.querySelector('script[data-sf-phaser-runtime]');if(existing){existing.addEventListener('load',()=>resolve(window.Phaser),{once:true});existing.addEventListener('error',()=>reject(new Error('Phaser load failed')),{once:true});return;}const script=document.createElement('script');script.src=PHASER_4_2_1_CDN;script.async=true;script.crossOrigin='anonymous';script.dataset.sfPhaserRuntime='4.2.1';script.onload=()=>window.Phaser?.Game?resolve(window.Phaser):reject(new Error('Phaser global missing'));script.onerror=()=>reject(new Error('Phaser CDN unavailable'));document.head.append(script);setTimeout(()=>{if(!window.Phaser?.Game)reject(new Error('Phaser load timeout'));},3500);}).catch(error=>{console.warn('StudioFrame Phaser fallback',error);return null;});return SF_PHASER_LIBRARY_PROMISE;}
function sfMountPhaser4(root,c,controller,Phaser){if(!Phaser?.Game||controller.signal.aborted)return null;root.innerHTML='';root.dataset.runtime='phaser4';const parent=document.createElement('div');parent.className='sf-phaser-game';root.append(parent);let score=c.initial_score,hud=null,game=null;const assets=c.objects.filter(o=>o.type==='image'&&safeExternalHttps(o.asset_url));const config={type:c.renderer==='webgl'?(Phaser.WEBGL??2):c.renderer==='canvas'?(Phaser.CANVAS??1):(Phaser.AUTO??0),parent,width:Math.max(320,root.clientWidth||800),height:c.height,transparent:c.transparent,backgroundColor:c.background,pixelArt:c.pixel_art,physics:c.physics==='arcade'?{default:'arcade',arcade:{gravity:{y:c.gravity_y},debug:false}}:undefined,scene:{preload(){for(const o of assets)this.load?.image?.(o.id,o.asset_url);},create(){const scene=this,created=new Map();for(const o of c.objects){let node=null;const x=o.x/100*scene.scale.width,y=o.y/100*scene.scale.height;if(o.type==='circle')node=scene.add.circle(x,y,o.radius/100*Math.min(scene.scale.width,scene.scale.height),parseInt(o.color.slice(1),16),o.opacity);else if(o.type==='rect')node=scene.add.rectangle(x,y,o.width/100*scene.scale.width,o.height/100*scene.scale.height,parseInt(o.color.slice(1),16),o.opacity);else if(o.type==='text')node=scene.add.text(x,y,o.text||o.label,{fontFamily:'sans-serif',fontSize:`${o.font_size}px`,fontStyle:'bold',color:o.color}).setOrigin(.5);else if(o.type==='image'&&scene.textures?.exists?.(o.id))node=scene.add.image(x,y,o.id).setDisplaySize(o.width/100*scene.scale.width,o.height/100*scene.scale.height);if(!node)continue;node.setAngle?.(o.rotation);created.set(o.id,node);if(o.physics&&c.physics==='arcade'){scene.physics.add.existing(node);node.body?.setCollideWorldBounds?.(o.collide_world_bounds);node.body?.setBounce?.(o.bounce);node.body?.setVelocity?.(o.velocity_x,o.velocity_y);if(o.immovable)node.body?.setImmovable?.(true);}if(o.interactive&&c.controls.pointer){node.setInteractive?.({useHandCursor:true});node.on?.('pointerdown',()=>{const st={score,hud,hidden:new Set(),root};sfPhaserAction(c,o,st,node);score=st.score;if(st.hidden.has(o.id))node.setVisible?.(false);});}}if(c.score_enabled){hud=scene.add.text(16,14,`SCORE ${score}${c.target_score?` / ${c.target_score}`:''}`,{fontFamily:'monospace',fontSize:'16px',color:'#ffffff',backgroundColor:'#00000088',padding:{x:8,y:5}}).setDepth?.(999);}const playerObj=c.objects.find(o=>o.control==='player'),player=playerObj?created.get(playerObj.id):null,cursors=c.controls.keyboard?scene.input.keyboard?.createCursorKeys?.():null;scene.__sfUpdate=()=>{if(!player||!cursors)return;const speed=220,body=player.body;if(body){body.setVelocityX?.((cursors.left?.isDown?-1:cursors.right?.isDown?1:0)*speed);if(c.gravity_y===0)body.setVelocityY?.((cursors.up?.isDown?-1:cursors.down?.isDown?1:0)*speed);}else{player.x+=(cursors.right?.isDown?4:cursors.left?.isDown?-4:0);player.y+=(cursors.down?.isDown?4:cursors.up?.isDown?-4:0);}};},update(){this.__sfUpdate?.();}}};try{game=new Phaser.Game(config);}catch(error){console.warn('StudioFrame Phaser create failed',error);root.dataset.runtime='native-canvas';return null;}controller.signal.addEventListener('abort',()=>{try{game?.destroy?.(true);}catch(_){}},{once:true});return game;}
function setupPhaserSceneV91(){SF_PHASER_CONTROLLER?.abort?.();SF_PHASER_CONTROLLER=null;document.querySelectorAll('.sf-phaser-scene[data-sf-phaser]').forEach(n=>n.remove());const c=normalizePhaserScenePublic(DATA.site_builder?.phaser_scene||{});if(!c.enabled)return null;const mode=sfPhaserViewportMode(c);if(mode==='hide')return null;const target=sfPhaserTarget(c);if(!target)return null;const root=document.createElement('section');root.className=`sf-phaser-scene sf-phaser-${c.placement}`;root.dataset.sfPhaser='true';root.dataset.placement=c.placement;root.style.setProperty('--sf-phaser-height',`${c.height}px`);if(c.placement==='global'){root.classList.add('sf-phaser-global');document.body.append(root);}else{target.classList.add('sf-phaser-host');target.append(root);}const controller=new AbortController();SF_PHASER_CONTROLLER=controller;controller.signal.addEventListener('abort',()=>{root.remove();target.classList?.remove('sf-phaser-host');},{once:true});if(mode==='fallback'||reduced&&!c.autostart){sfPhaserFallbackCard(root,c,mode==='fallback'?'Breakpoint fallback':'Reduced motion');return root;}let fallback=sfMountNativePhaserFallback(root,c,controller);loadPhaser4Runtime().then(Phaser=>{if(!Phaser||controller.signal.aborted)return;fallback?.destroy?.();const game=sfMountPhaser4(root,c,controller,Phaser);if(!game&&!controller.signal.aborted)fallback=sfMountNativePhaserFallback(root,c,controller);});return root;}

function sfAuthoringQuery(){return new URLSearchParams(location.search);}
function sfPreviewSampleBlockV789(type){const base={id:`sf-preview-${type}`,type,visible:true,label:type,section_width:'full',section_size:'normal'};const samples={text_motion:{...base,title:'Text Motion',animation_type:'fadeInUp',trigger:'load',duration:600,stagger:50},grid_beam:{...base,body:'Latency | 12ms\nThroughput | 2.4k\nUptime | 99.97%',palette:'ocean',cols:3,duration:4.2,strength:.85},canvas_fractal_grid:{...base,dot_size:4,dot_spacing:26,dot_opacity:.8,wave_intensity:34,wave_radius:220,dot_color:'#64b5f6',glow_color:'#1abc9c',mouse_glow:true,performance:'balanced'},dynamic_island:{...base,title:'Dynamic Island',body:'Estado real do componente',trigger:'click'},carousel_3d:{...base,autoplay:true,interval:2800,perspective:1200,depth:180,body:'https://picsum.photos/seed/sf1/900/700 | Item 1\nhttps://picsum.photos/seed/sf2/900/700 | Item 2\nhttps://picsum.photos/seed/sf3/900/700 | Item 3'},textured_reveal:{...base,title:'Textured Reveal',textured_source:'theme_texture',section_texture_mode:'theme',decorative_lines:true,line_style:'orbits'},sliced_hero:{...base,title:'Sliced Hero',slice_count:7,slice_orientation:'vertical',slice_gap:5,slice_overlap:2,sliced_preset:'sliced_depth_parallax',slice_depth_spread:.7,mouse_parallax:true,scroll_parallax:true,layers:[{id:'background-frame',role:'background',label:'BACKGROUND FRAME',media_type:'gradient',gradient_start:'#08111A',gradient_end:'#163E38',opacity:1,scale:1.05,depth:.1},{id:'middle-frame',role:'middle',label:'MIDDLE FRAME',media_type:'gradient',gradient_start:'#132A35',gradient_end:'#5266eb',opacity:.8,scale:1.02,depth:.5},{id:'foreground-frame',role:'foreground',label:'FOREGROUND FRAME',media_type:'transparent',opacity:.25,depth:.9}]}};return samples[type]||base;}
function sfApplyAuthoringPreviewModesV789(){const q=sfAuthoringQuery(),isolate=q.get('sf_isolate_block'),previewType=q.get('sf_block_preview');if(isolate){document.body.classList.add('sf-authoring-isolate');document.querySelectorAll('[data-sf-block-id]').forEach(node=>{node.hidden=String(node.dataset.sfBlockId||'')!==String(isolate);});const target=document.querySelector(`[data-sf-block-id="${CSS.escape(isolate)}"]`);target?.scrollIntoView({block:'start'});}
if(previewType){document.body.classList.add('sf-block-preview-mode');const actual=document.querySelector(`[data-sf-block-type="${CSS.escape(previewType)}"]`);if(actual){document.querySelectorAll('#top > *').forEach(node=>{if(node!==actual)node.hidden=true;});actual.hidden=false;actual.classList.add('sf-block-preview-target');}else{const sample=sfPreviewSampleBlockV789(previewType),node=createCustomHomeBlock(sample);if(node){const main=$('#top');main.replaceChildren(node);node.classList.add('sf-block-preview-target');sfMarkBlockNode(node,sample,'v789-sample-real-renderer');}}}
}
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.data?.type!=='studioframe-v789-preview-command')return;const command=String(event.data.command||'');if(sfHandleV9PreviewCommand(command,event.data||{}))return;if(command==='replay-motion'){document.querySelectorAll('.is-sliced-ready').forEach(node=>{node.classList.remove('is-sliced-ready');requestAnimationFrame(()=>requestAnimationFrame(()=>node.classList.add('is-sliced-ready')));});document.querySelectorAll('[data-sf-text-motion]').forEach(node=>{node.classList.remove('is-inview');void node.offsetWidth;node.classList.add('is-inview');});refreshStudioFrameMotionV77(document);}if(command==='reset-view'){scrollTo({top:0,behavior:'instant'});}},false);

// ============================================================================
// R2.2 STAGE 5 — STUDIOPLAYER + PDF / HTML5 / MODEL SHOWCASE HUB
// Owners: studio.player · media.coordinator · studio.model · studio.pdf · studio.html5
// ============================================================================
const R22_SHOWCASE_DEFAULTS=Object.freeze({
  enabled:true,layout:'tabs',eyebrow:'SHOWCASE HUB',title:'Experiências interativas',description:'3D, PDF, HTML5 e mídia executados como módulos independentes.',
  player:{enabled:true,title:'Media / Player',description:'Player próprio com estados físicos sincronizados.',src:'/assets/showcases/proof/stage5-player-proof.mp4',poster:'/assets/showcases/proof/stage5-poster.png',autoplay:false,muted:false,loop:false,controls:true,aspect_ratio:'16/9'},
  model:{enabled:true,title:'Showcase 3D',description:'Modelo GLB com orbit, presets de câmera e fallback procedural.',asset_id:'studio-orbit-dish',fallback:'/assets/3d/fallbacks/studio-orbit-dish.png',camera_preset:'three-quarter',auto_rotate:true,interaction:true,quality:'balanced'},
  pdf:{enabled:true,title:'Showcase PDF',description:'Documento paginado em canvas responsivo.',src:'/assets/showcases/proof/stage5-pdf-proof.pdf',start_page:1,fit_mode:'width',controls:true,zoom:1},
  html5:{enabled:true,title:'Showcase HTML5',description:'Experiência HTML real isolada em iframe sandbox.',entrypoint:'/assets/showcases/proof/html5/index.html',sandbox:'allow-scripts',allow_fullscreen:true,aspect_ratio:'16/9'}
});
function sfR22Merge(base,incoming){const out={...base};Object.entries(incoming&&typeof incoming==='object'?incoming:{}).forEach(([k,v])=>{out[k]=(v&&typeof v==='object'&&!Array.isArray(v)&&base[k]&&typeof base[k]==='object')?sfR22Merge(base[k],v):v;});return out;}
function sfR22ShowcaseConfig(){return sfR22Merge(R22_SHOWCASE_DEFAULTS,DATA.site_builder?.showcases||{});}
function sfR22AssetUrl(value=''){const raw=String(value||'').trim();if(!raw)return '';if(/^https:\/\//i.test(raw)||/^blob:/i.test(raw))return raw;if(raw.startsWith('/assets/'))return `${publicAssetBase()}assets/${raw.slice('/assets/'.length)}`;if(raw.startsWith('assets/'))return `${publicAssetBase()}${raw}`;return raw;}
const R22_FRAME_LOOP=window.__STUDIOFRAME_R22_FRAME_LOOP__=window.__STUDIOFRAME_R22_FRAME_LOOP__||(()=>{const subs=new Set();let raf=0,last=0;const tick=t=>{const dt=Math.min(.05,Math.max(0,(t-last||16)/1000));last=t;subs.forEach(fn=>{try{fn(t,dt);}catch(error){console.warn('StudioFrame shared FrameLoop subscriber failed',error);}});raf=subs.size?requestAnimationFrame(tick):0;};return{subscribe(fn){subs.add(fn);if(!raf)raf=requestAnimationFrame(tick);return()=>{subs.delete(fn);if(!subs.size&&raf){cancelAnimationFrame(raf);raf=0;last=0;}}},count:()=>subs.size};})();
window.StudioFrameMediaCoordinator=Object.freeze({claimNative:claimNativePlayback,claimEmbed:claimEmbeddedPlayback,pauseOthers:pauseOtherManagedNativePlayback,snapshot:()=>({kind:MEDIA_PLAYBACK_COORDINATOR.kind,active:Boolean(MEDIA_PLAYBACK_COORDINATOR.active)})});
let R22_SHOWCASE_CONTROLLER=null,R22_STUDIO_PLAYER=null;
function sfR22Status(root,state,message=''){if(!root)return;root.dataset.health=state;const node=root.querySelector?.('[data-showcase-status]');if(node){node.textContent=message||state;node.dataset.state=state;}}
function sfR22Button(label,cls=''){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;return b;}
function sfR22StudioPlayer(mount,c,controller){mount.replaceChildren();const root=document.createElement('div');root.className='sf-studio-player';root.tabIndex=0;root.dataset.owner='studio.player';root.dataset.state='IDLE';const stage=document.createElement('div');stage.className='sf-player-stage';stage.style.aspectRatio=String(c.aspect_ratio||'16/9').replace('/',' / ');const video=document.createElement('video');video.className='sf-player-media';video.playsInline=true;video.preload='metadata';video.muted=Boolean(c.muted);video.defaultMuted=Boolean(c.muted);video.loop=Boolean(c.loop);video.poster=sfR22AssetUrl(c.poster||'');video.src=sfR22AssetUrl(c.src||'');video.setAttribute('aria-label',c.title||'StudioPlayer');if(c.captions){const track=document.createElement('track');track.kind='captions';track.label='Legendas';track.srclang='pt-BR';track.src=sfR22AssetUrl(c.captions);video.append(track);}stage.append(video);
 const controls=document.createElement('div');controls.className='sf-player-controls';const play=sfR22Button('▶','sf-player-play');play.setAttribute('aria-label','Reproduzir');const seek=document.createElement('input');seek.type='range';seek.min='0';seek.max='1000';seek.value='0';seek.step='1';seek.className='sf-player-seek';seek.setAttribute('aria-label','Progresso');const time=document.createElement('output');time.className='sf-player-time';time.textContent='0:00 / 0:00';const mute=sfR22Button(video.muted?'🔇':'🔊','sf-player-mute');mute.setAttribute('aria-label',video.muted?'Ativar som':'Silenciar');const volume=document.createElement('input');volume.type='range';volume.min='0';volume.max='1';volume.step='.05';volume.value=String(video.volume);volume.className='sf-player-volume';volume.setAttribute('aria-label','Volume');const fs=sfR22Button('⛶','sf-player-fullscreen');fs.setAttribute('aria-label','Tela cheia');controls.append(play,seek,time,mute,volume,fs);controls.hidden=c.controls===false;const status=document.createElement('div');status.className='sf-player-status';status.dataset.showcaseStatus='';status.textContent='READY';root.append(stage,controls,status);mount.append(root);
 const format=t=>{if(!Number.isFinite(t)||t<0)return'0:00';const m=Math.floor(t/60),s=Math.floor(t%60);return`${m}:${String(s).padStart(2,'0')}`};const sync=()=>{const dur=Number(video.duration||0),cur=Number(video.currentTime||0);if(dur>0&&!seek.matches(':active'))seek.value=String(Math.round(cur/dur*1000));time.textContent=`${format(cur)} / ${format(dur)}`;play.textContent=video.paused?'▶':'❚❚';play.setAttribute('aria-label',video.paused?'Reproduzir':'Pausar');mute.textContent=video.muted?'🔇':'🔊';mute.setAttribute('aria-label',video.muted?'Ativar som':'Silenciar');root.dataset.state=video.error?'ERROR':video.readyState<2?'LOADING':video.paused?'PAUSED':'PLAYING';sfR22Status(root,root.dataset.state,root.dataset.state);};
 const toggle=async()=>{try{if(video.paused){claimNativePlayback(video);await video.play();}else video.pause();}catch(error){root.dataset.state='ERROR';sfR22Status(root,'ERROR',String(error?.message||'Playback bloqueado'));}};play.addEventListener('click',toggle,{signal:controller.signal});seek.addEventListener('input',()=>{if(Number.isFinite(video.duration)&&video.duration>0)video.currentTime=video.duration*(Number(seek.value)/1000);sync();},{signal:controller.signal});mute.addEventListener('click',()=>{video.muted=!video.muted;sync();},{signal:controller.signal});volume.addEventListener('input',()=>{video.volume=Math.max(0,Math.min(1,Number(volume.value)));if(video.volume>0)video.muted=false;sync();},{signal:controller.signal});fs.addEventListener('click',()=>{const target=stage;if(target.requestFullscreen)target.requestFullscreen().catch(()=>{});else if(video.webkitEnterFullscreen)try{video.webkitEnterFullscreen();}catch(_){root.dataset.fullscreen='unsupported';}},{signal:controller.signal});root.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k===' '||k==='k'){e.preventDefault();toggle();}else if(k==='m'){video.muted=!video.muted;sync();}else if(k==='f'){fs.click();}else if(e.key==='ArrowRight'){video.currentTime=Math.min(video.duration||Infinity,video.currentTime+5);sync();}else if(e.key==='ArrowLeft'){video.currentTime=Math.max(0,video.currentTime-5);sync();}},{signal:controller.signal});['loadedmetadata','durationchange','timeupdate','play','playing','pause','volumechange','ended'].forEach(name=>video.addEventListener(name,sync,{signal:controller.signal}));video.addEventListener('waiting',()=>sfR22Status(root,'BUFFERING','BUFFERING'),{signal:controller.signal});video.addEventListener('error',()=>sfR22Status(root,'ERROR',video.error?`ERROR ${video.error.code}`:'ERROR'),{signal:controller.signal});if(c.autoplay){video.muted=true;video.defaultMuted=true;video.play().catch(()=>{});}sync();R22_STUDIO_PLAYER={root,video,play,pause:()=>video.pause(),destroy:()=>{try{video.pause();}catch(_){}}};return R22_STUDIO_PLAYER;}
async function sfR22ModelShowcase(mount,c,controller){mount.replaceChildren();const root=document.createElement('div');root.className='sf-model-showcase';root.dataset.owner='studio.model';const copy=document.createElement('div');copy.className='sf-showcase-copy';copy.innerHTML=`<small>3D / WEBGL</small><h3>${esc(c.title||'Showcase 3D')}</h3><p>${esc(c.description||'')}</p><span data-showcase-status>PREPARING</span>`;const stage=document.createElement('div');stage.className='sf-model-stage';stage.tabIndex=0;const canvas=document.createElement('canvas');canvas.className='sf-model-proof-canvas';stage.append(canvas);const toolbar=document.createElement('div');toolbar.className='sf-model-toolbar';[['front','Frente'],['three-quarter','3/4'],['top','Topo'],['reset','Reset']].forEach(([key,label])=>{const b=sfR22Button(label);b.dataset.modelView=key;toolbar.append(b)});stage.append(toolbar);root.append(copy,stage);mount.append(root);
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;let THREE,renderer,scene,camera,object,geometry,material,disposeLoop=()=>{},yaw=.5,pitch=.18,distance=4.4,drag=false,lastX=0,lastY=0;const applyCamera=preset=>{if(preset==='front'){yaw=0;pitch=.05;distance=4.3}else if(preset==='top'){yaw=.2;pitch=1.05;distance=5}else if(preset==='three-quarter'){yaw=.65;pitch=.28;distance=4.4}else{yaw=.5;pitch=.18;distance=4.4}};applyCamera(c.camera_preset||'three-quarter');try{const threeUrl=window.__SF_THREE_MODULE_OVERRIDE_URL__||studioFrameRuntimeAssetUrl('motion/vendor/three/three.module.min.js');THREE=await import(threeUrl);if(controller.signal.aborted)return;renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:c.quality==='high'?'high-performance':'default'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,c.quality==='high'?2:c.quality==='performance'?1:1.5));scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,1,.1,100);geometry=new THREE.TorusKnotGeometry(.9,.25,160,28);material=c.material==='standard'?new THREE.MeshStandardMaterial({color:0x68f2a5,roughness:.42,metalness:.18}):new THREE.MeshPhysicalMaterial({color:0x68f2a5,roughness:.28,metalness:.46,clearcoat:.28,clearcoatRoughness:.32});object=new THREE.Mesh(geometry,material);scene.add(object);scene.add(new THREE.HemisphereLight(0xffffff,0x1b2233,2));const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,4,5);scene.add(key);const rim=new THREE.PointLight(0x9b7cff,20,8);rim.position.set(-2,1,2);scene.add(rim);const resize=()=>{const r=stage.getBoundingClientRect();const w=Math.max(1,r.width),h=Math.max(280,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};const ro=new ResizeObserver(resize);ro.observe(stage);resize();disposeLoop=R22_FRAME_LOOP.subscribe((_t,dt)=>{if(controller.signal.aborted||stage.closest('[hidden]'))return;if(!reduced&&c.auto_rotate&&!drag)yaw+=dt*.28;const cp=Math.cos(pitch);camera.position.set(Math.sin(yaw)*cp*distance,Math.sin(pitch)*distance,Math.cos(yaw)*cp*distance);camera.lookAt(0,0,0);object.rotation.y+=reduced?0:dt*.12;renderer.render(scene,camera);});controller.signal.addEventListener('abort',()=>{disposeLoop();ro.disconnect();geometry?.dispose();material?.dispose();renderer?.dispose();},{once:true});sfR22Status(root,'READY_PROCEDURAL','VISUAL PROOF READY');
  if(c.interaction!==false){stage.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;stage.setPointerCapture?.(e.pointerId);},{signal:controller.signal});stage.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-lastX)*.008;pitch=Math.max(-1.1,Math.min(1.1,pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;},{signal:controller.signal});stage.addEventListener('pointerup',()=>drag=false,{signal:controller.signal});stage.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(2.7,Math.min(7,distance+Math.sign(e.deltaY)*.25));},{passive:false,signal:controller.signal});toolbar.addEventListener('click',e=>{const b=e.target.closest('[data-model-view]');if(b)applyCamera(b.dataset.modelView);},{signal:controller.signal});}
 }catch(error){console.warn('StudioFrame ModelShowcase procedural fallback unavailable',error);const img=document.createElement('img');img.className='sf-model-static-fallback';img.src=sfR22AssetUrl(c.fallback||'');img.alt='';stage.prepend(img);sfR22Status(root,'FALLBACK_IMAGE','WEBGL FALLBACK');}
 // Actual GLB path uses the protected loader owner and stays isolated from the procedural proof clock.
 try{const glbC=normalizeThreeDScenePublic({enabled:true,engine:'glb',source:'bundled_asset',asset_id:c.asset_id||'studio-orbit-dish',fallback_url:c.fallback||'',interaction:{pointer_mode:'orbit',pointer_events:c.interaction!==false,auto_rotate:!reduced&&c.auto_rotate},performance:{max_pixel_ratio:c.quality==='high'?2:c.quality==='performance'?1:1.5,transparent:true,desktop_enabled:true,tablet_enabled:true,mobile_enabled:true,reduced_motion_fallback:true}});const source=sfThreeSourceUrl(glbC);if(source){const host=document.createElement('div');host.className='sf-model-glb-layer';stage.append(host);const childController=new AbortController();controller.signal.addEventListener('abort',()=>childController.abort(),{once:true});await sfMountGlbViewer(host,glbC,childController);const view=host.querySelector('model-viewer');if(view){view.addEventListener('load',()=>{canvas.hidden=true;host.dataset.glbReady='1';sfR22Status(root,'READY_GLB','GLB READY');},{once:true,signal:controller.signal});view.addEventListener('error',()=>{host.remove();canvas.hidden=false;sfR22Status(root,'READY_PROCEDURAL','GLB FALLBACK / VISUAL PROOF');},{once:true,signal:controller.signal});}}
 }catch(error){console.info('StudioFrame ModelShowcase: GLB loader em fallback procedural',error);}
 return root;}
async function sfR22PdfShowcase(mount,c,controller){mount.replaceChildren();const root=document.createElement('div');root.className='sf-pdf-showcase';root.dataset.owner='studio.pdf';const head=document.createElement('div');head.className='sf-showcase-copy';head.innerHTML=`<small>PDF</small><h3>${esc(c.title||'Showcase PDF')}</h3><p>${esc(c.description||'')}</p><span data-showcase-status>LOADING</span>`;const toolbar=document.createElement('div');toolbar.className='sf-pdf-toolbar';const prev=sfR22Button('←','sf-pdf-prev'),next=sfR22Button('→','sf-pdf-next'),minus=sfR22Button('−','sf-pdf-minus'),plus=sfR22Button('+','sf-pdf-plus'),counter=document.createElement('output');counter.textContent='— / —';toolbar.append(prev,counter,next,minus,plus);const viewport=document.createElement('div');viewport.className='sf-pdf-viewport';const canvas=document.createElement('canvas');canvas.className='sf-pdf-canvas';viewport.append(canvas);toolbar.hidden=c.controls===false;root.append(head,toolbar,viewport);mount.append(root);const src=sfR22AssetUrl(c.src||'');if(!src){sfR22Status(root,'ERROR','PDF SOURCE MISSING');return root;}let doc=null,pageNum=Math.max(1,Number(c.start_page||1)),zoom=Math.max(.5,Math.min(3,Number(c.zoom||1))),renderTask=null,pdfjs=null;const render=async()=>{if(!doc)return;pageNum=Math.max(1,Math.min(doc.numPages,pageNum));const page=await doc.getPage(pageNum),base=page.getViewport({scale:1});const available=Math.max(240,viewport.clientWidth-24),availableH=Math.max(320,viewport.clientHeight-28),fitScale=c.fit_mode==='page'?Math.min(available/base.width,availableH/base.height):(available/base.width),scale=fitScale*zoom,vp=page.getViewport({scale});canvas.width=Math.max(1,Math.floor(vp.width*(devicePixelRatio||1)));canvas.height=Math.max(1,Math.floor(vp.height*(devicePixelRatio||1)));canvas.style.width=`${vp.width}px`;canvas.style.height=`${vp.height}px`;const ctx=canvas.getContext('2d');ctx.setTransform(devicePixelRatio||1,0,0,devicePixelRatio||1,0,0);try{renderTask?.cancel?.();}catch(_){}renderTask=page.render({canvasContext:ctx,viewport:vp});await renderTask.promise;counter.textContent=`${pageNum} / ${doc.numPages}`;prev.disabled=pageNum<=1;next.disabled=pageNum>=doc.numPages;sfR22Status(root,'READY','PDF.js READY');};try{pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.min.mjs');pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs';doc=await pdfjs.getDocument({url:src}).promise;await render();const ro=new ResizeObserver(()=>render().catch(()=>{}));ro.observe(viewport);controller.signal.addEventListener('abort',()=>{ro.disconnect();try{renderTask?.cancel?.();doc?.destroy?.();}catch(_){}},{once:true});prev.addEventListener('click',()=>{pageNum-=1;render().catch(()=>{});},{signal:controller.signal});next.addEventListener('click',()=>{pageNum+=1;render().catch(()=>{});},{signal:controller.signal});minus.addEventListener('click',()=>{zoom=Math.max(.5,zoom-.1);render().catch(()=>{});},{signal:controller.signal});plus.addEventListener('click',()=>{zoom=Math.min(3,zoom+.1);render().catch(()=>{});},{signal:controller.signal});}catch(error){console.warn('StudioFrame PDF.js fallback',error);viewport.replaceChildren();const frame=document.createElement('iframe');frame.className='sf-pdf-fallback-frame';frame.src=src;frame.title=c.title||'PDF';frame.loading='lazy';viewport.append(frame);toolbar.hidden=true;sfR22Status(root,'DEGRADED_NATIVE','PDF.js indisponível · fallback nativo');}return root;}
function sfR22Html5Showcase(mount,c,controller){mount.replaceChildren();const root=document.createElement('div');root.className='sf-html5-showcase';root.dataset.owner='studio.html5';const head=document.createElement('div');head.className='sf-showcase-copy';head.innerHTML=`<small>HTML5</small><h3>${esc(c.title||'Showcase HTML5')}</h3><p>${esc(c.description||'')}</p><span data-showcase-status>LOADING</span>`;const frame=document.createElement('iframe');frame.className='sf-html5-showcase-frame';frame.style.aspectRatio=String(c.aspect_ratio||'16/9').replace('/',' / ');frame.title=c.title||'HTML5 Showcase';frame.loading='lazy';frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox',String(c.sandbox||'allow-scripts'));if(c.allow_fullscreen!==false)frame.allow='fullscreen';const src=sfR22AssetUrl(c.entrypoint||'');if(src)frame.src=src;frame.addEventListener('load',()=>sfR22Status(root,'READY_ONLOAD','HTML5 READY'),{signal:controller.signal});frame.addEventListener('error',()=>sfR22Status(root,'ERROR','HTML5 LOAD ERROR'),{signal:controller.signal});frame.addEventListener('pointerdown',()=>claimEmbeddedPlayback(root),{signal:controller.signal});frame.addEventListener('focus',()=>claimEmbeddedPlayback(root),{signal:controller.signal});const onMessage=event=>{if(event.source!==frame.contentWindow||event.data?.type!=='studioframe-showcase-health')return;sfR22Status(root,String(event.data.state||'READY'),String(event.data.state||'READY'));};window.addEventListener('message',onMessage,{signal:controller.signal});root.append(head,frame);mount.append(root);if(!src)sfR22Status(root,'ERROR','HTML5 SOURCE MISSING');return root;}
function sfR22ActivateShowcase(root,key,config,controller,mounted){root.querySelectorAll('[data-showcase-tab]').forEach(btn=>{const active=btn.dataset.showcaseTab===key;btn.setAttribute('aria-selected',active?'true':'false');btn.tabIndex=active?0:-1;});root.querySelectorAll('[data-showcase-panel]').forEach(panel=>{const active=panel.dataset.showcasePanel===key;panel.hidden=!active;panel.classList.toggle('is-active',active);});if(R22_STUDIO_PLAYER&&!R22_STUDIO_PLAYER.video.paused)R22_STUDIO_PLAYER.pause();const mount=root.querySelector(`#showcase${key==='html5'?'Html':key[0].toUpperCase()+key.slice(1)}Mount`);if(!mount||mounted.has(key))return;mounted.add(key);if(key==='model')sfR22ModelShowcase(mount,config.model,controller);else if(key==='pdf')sfR22PdfShowcase(mount,config.pdf,controller);else if(key==='html5')sfR22Html5Showcase(mount,config.html5,controller);}
function setupR22ShowcaseHub(){R22_SHOWCASE_CONTROLLER?.abort?.();R22_SHOWCASE_CONTROLLER=null;R22_STUDIO_PLAYER?.destroy?.();R22_STUDIO_PLAYER=null;const root=$('#showcaseHub');if(!root)return null;const c=sfR22ShowcaseConfig();root.hidden=!c.enabled;if(!c.enabled)return null;root.dataset.layout=c.layout||'tabs';$('#showcaseHubEyebrow') && ($('#showcaseHubEyebrow').textContent=c.eyebrow||'SHOWCASE HUB');$('#showcaseHubTitle') && ($('#showcaseHubTitle').textContent=c.title||'Experiências interativas');$('#showcaseHubDescription') && ($('#showcaseHubDescription').textContent=c.description||'');$('#studioPlayerTitle') && ($('#studioPlayerTitle').textContent=c.player.title||'Media / Player');$('#studioPlayerDescription') && ($('#studioPlayerDescription').textContent=c.player.description||'');const controller=new AbortController();R22_SHOWCASE_CONTROLLER=controller;const mounted=new Set();const tabs=[...root.querySelectorAll('[data-showcase-tab]')];const enabledKeys=['model','pdf','html5'].filter(key=>c[key]?.enabled!==false);tabs.forEach(btn=>{const ok=enabledKeys.includes(btn.dataset.showcaseTab);btn.hidden=!ok;btn.addEventListener('click',()=>sfR22ActivateShowcase(root,btn.dataset.showcaseTab,c,controller,mounted),{signal:controller.signal});btn.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const visible=tabs.filter(x=>!x.hidden),i=visible.indexOf(btn);const next=e.key==='Home'?visible[0]:e.key==='End'?visible.at(-1):visible[(i+(e.key==='ArrowRight'?1:-1)+visible.length)%visible.length];next?.focus();next?.click();},{signal:controller.signal});});if(c.layout==='stack'){root.querySelector('.sf-showcase-tabs')?.setAttribute('hidden','');root.querySelectorAll('[data-showcase-panel]').forEach(panel=>{const key=panel.dataset.showcasePanel,active=enabledKeys.includes(key);panel.hidden=!active;panel.classList.toggle('is-active',active);if(active){const mount=root.querySelector(`#showcase${key==='html5'?'Html':key[0].toUpperCase()+key.slice(1)}Mount`);if(mount&&!mounted.has(key)){mounted.add(key);if(key==='model')sfR22ModelShowcase(mount,c.model,controller);else if(key==='pdf')sfR22PdfShowcase(mount,c.pdf,controller);else if(key==='html5')sfR22Html5Showcase(mount,c.html5,controller);}}});}else{root.querySelector('.sf-showcase-tabs')?.removeAttribute('hidden');const first=enabledKeys[0];if(first)sfR22ActivateShowcase(root,first,c,controller,mounted);else root.querySelector('.sf-showcase-stage-grid')?.setAttribute('hidden','');}const playerSection=$('#studioPlayerSection');if(playerSection)playerSection.hidden=c.player?.enabled===false;if(c.player?.enabled!==false&&$('#studioPlayerMount'))sfR22StudioPlayer($('#studioPlayerMount'),c.player,controller);controller.signal.addEventListener('abort',()=>{R22_STUDIO_PLAYER?.destroy?.();},{once:true});return root;}
window.StudioFrameShowcaseHub=Object.freeze({refresh:setupR22ShowcaseHub,config:()=>JSON.parse(JSON.stringify(sfR22ShowcaseConfig())),frameSubscribers:()=>R22_FRAME_LOOP.count()});
