from __future__ import annotations
from .briefing import default_briefing_config

# Mensagem Studio Engine V8 product identity.
# APP_VERSION and BUILD_ID remain the inherited compatibility-core protocol
# identifiers because cloud state, migrations and historical regression tests
# depend on them. Product/release identity is separate and additive.
APP_NAME = "Mensagem Studio Engine"
APP_VERSION = "7.12.20"
PRODUCT_NAME = "Mensagem Studio Engine"
PRODUCT_VERSION = "8.0"
RELEASE_VERSION = "V8.0"
RELEASE_BUILD_ID = "MSE-V8-FINAL-INTEGRITY-20260825"
LEGACY_PRODUCT_NAME = "StudioFrame"
BUILD_ID = "V74-V75-EDITOR-MOTION-VIDEO"
# V7.5.9 Stage 7 contract marker: COMMERCIAL-CONTEXT-END-TO-END
# V7.5.8 Stage 6 contract marker: SERVICE-OFFER-NOTIFICATION
# V7.5.7 Stage 5 contract marker: TEXTURED-REVEAL-EDITORIAL-SECTION
# V7.5.6 Stage 4 contract marker: SECTION-EXPERIENCE-SCROLL-NAVIGATOR
# V7.5.5 Stage 2 contract marker: SERVICES-CATALOG-VISUAL-COMPOSITION
# V7.5.4 Stage 3 contract marker: PROJECT-SERVICE-COMMERCIAL-BRIDGE
# V7.5.3 Stage 1 contract marker: MOBILE-SERVICES-ESSENTIAL-NAVIGATION
# V7.5.2 Stage 1 contract marker: QUOTE-BUTTON-MOBILE-SAFE-AREA-RECOVERY
# V7.4.1 contract marker: PDF-MEDIA-VALIDATION-EXPERIENCE-HARDENING
# Historical release identity retained for inherited startup memory: BUILD_ID = "V74-1-PDF-MEDIA-VALIDATION"
# V7.4 contract marker: ZERO-COST-DRIVE-PLAYBACK-PUBLICATION-RECOVERY
# V7.3.2 historical marker: AUTOMATED-MEDIA-GATEWAY-DEPLOYMENT
# V7.3.1 contract marker: GATEWAY-BOOTSTRAP-PUBLICATION-RECOVERY
# Current release contract marker: STAGE5-5-1-CRITICAL-RECOVERY
# Inherited release marker required by Stage 5.5 checks: STAGE5-5-ARCHITECTURE-HARDENING
# Inherited release marker required by Stage 5.4 checks: STAGE5-4-REGRESSION-RECOVERY
# Inherited release marker required by ADR-003 startup checks: STAGE4-ZERO-DRIVE-UI-VIDEO
# Historical successor marker for the already incorporated Stage 3 contract: STAGE3-FLOATING-INDEPENDENT
# V5.14.0: this Drive folder is the protected catalog anchor for the current
# Historical contract markers (comments only): APP_VERSION = "7.12.16" | V71216-REGRESSION-RECOVERY
# Mensagem Studio workspace. The editor discovers/reads this folder by its
# stable Drive ID. In V5.26 the service account is read-only; physical Drive
# mutations are intentionally blocked by the application.
DEFAULT_ROOT_FOLDER_ID = "1ePsjyC57ddsmZYfQPB7OvyA8V1XHbZj0"
ROOT_FOLDER_ID = DEFAULT_ROOT_FOLDER_ID
SETTINGS_FILENAME = "portfolio.settings.json"
EXPORT_FILENAME = "index.html"
PUBLIC_DATA_FILENAME = "portfolio.json"
PUBLIC_SITE_DIRNAME = "site"
BRAND_GREEN = "#72F2A5"

GITHUB_OWNER = "GanaLD"
GITHUB_REPOSITORY = "mensagem-studio-portfolio"
GITHUB_BRANCH = "main"
PUBLIC_DOMAIN = "mensagemstudio.shop"
PUBLIC_URL = f"https://{PUBLIC_DOMAIN}/"

# V5.26: the Google service account is deliberately read-only. Drive is the
# source of folders, media IDs and media metadata; editorial state is never
# written to Drive. GitHub is the sole online synchronization/publication source for site edits; the project also carries a portable local snapshot.
SCOPES = (
    "https://www.googleapis.com/auth/drive.readonly",
)

FOLDER_MIME = "application/vnd.google-apps.folder"
SHORTCUT_MIME = "application/vnd.google-apps.shortcut"
IGNORED_FOLDERS = {"ICONE APK", "MANUAL DE MARCA"}
IGNORED_FILES = {"thumbs.db", "desktop.ini", ".ds_store", SETTINGS_FILENAME.lower()}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v"}
UNSUPPORTED_MEDIA_EXT = {".psd", ".psb"}
UNSUPPORTED_MEDIA_MIME = {
    "image/vnd.adobe.photoshop",
    "image/x-photoshop",
    "application/photoshop",
    "application/x-photoshop",
}

FIELDS = (
    "id,name,mimeType,parents,modifiedTime,size,md5Checksum,webViewLink,"
    "webContentLink,thumbnailLink,resourceKey,driveId,"
    "imageMediaMetadata,videoMediaMetadata,"
    "capabilities(canDownload,canEdit,canAddChildren,canRename,canTrash,canMoveItemWithinDrive),"
    "shortcutDetails(targetId,targetMimeType,targetResourceKey)"
)
LIST_FIELDS = f"nextPageToken,files({FIELDS})"

DEFAULT_SETTINGS = {
    "schema_version": 19,
    "app_version": APP_VERSION,
    "workspace": {
        "id": "mensagem-studio",
        "name": "Mensagem Studio",
        "drive_root_id": DEFAULT_ROOT_FOLDER_ID,
        "drive_root_name": "Portfólio Aesthetic",
    },
    "identity": {
        "studio_name": "MENSAGEM STUDIO",
        "portfolio_title": "Portfólio",
        "hero_line": "Ideias que ganham forma, ritmo e presença.",
        "description": (
            "Uma seleção de projetos, campanhas e experiências construídas "
            "pela Mensagem Studio."
        ),
        "accent_color": BRAND_GREEN,
        "site_url": "https://www.mensagemstudio.com.br/",
        "instagram_url": "https://www.instagram.com/mensagem_studio/",
        "public_url": PUBLIC_URL,
    },
    # Site Builder editorial metadata is persisted remotely in GitHub and compiled
    # into the public manifest. Drive remains the read-only physical media source;
    # local files are only a safety cache.
    "site_builder": {
        # V9.1 Phase 12: one canonical Briefing Engine configuration.
        "briefing": default_briefing_config(),
        # V7.8.1 Theme Architecture Foundation. Theme metadata is editorial
        # presentation state inside the existing site_builder; it does not own
        # content, Drive, publication or a parallel persistence layer.
        "theme": {
            "theme_id": "studioframe-default",
            "theme_version": 1,
            "theme_overrides": {},
            "custom_theme_metadata": {},
        },
        "media_delivery": {
            "mode": "drive_public_bytes",
            "public_base_url": "",
            "gateway_required": False,
            "gateway_state": "superseded",
            "zero_drive_ui": True,
            "github_media_storage": False,
            "poster_quality": "high",
            "motion_preview": True,
            "deployment_provider": "none",
            "deployment_mode": "superseded",
            "deploy_region": "",
            "deploy_service_name": "",
            "credential_policy": "embedded-json-required",
            "interactive_login_required": False,
            "billing_required": False,
            "mandatory_paid_infrastructure": False,
            "public_access_policy": "anyone-reader-only",
        },
        "editor_appearance": {
            "preset": "light",
            "background_color": "#EEF3F8",
            "surface_color": "#FFFFFF",
            "surface_alt_color": "#E3EAF2",
            "border_color": "#70859A",
            "text_color": "#172033",
            "muted_color": "#526277",
            "accent_color": "#007A68",
            "density": "comfortable",
            "font_scale": "large",
            "grid_visible": True,
            "grid_size": 24,
            "radius": 12,
        },
        "appearance": {
            "color_mode": "dark",
            "background_color": "#080C0E",
            "surface_color": "#101719",
            "text_color": "#F2F7F5",
            "muted_color": "#93A19D",
            "accent_color": BRAND_GREEN,
            "brand_title_visible": True,
            "brand_title": "MENSAGEM STUDIO",
            "brand_font_family": "display",
            "brand_font_size_desktop": 12,
            "brand_font_size_mobile": 12,
            "brand_font_weight": "500",
            "brand_letter_spacing": 0.16,
            "brand_text_transform": "uppercase",
            "brand_color": "#F2F7F5",
            "background_style": "aurora",
            "background_animation": "medium",
            "block_style": "glass",
            "block_radius": 14,
            "block_spacing": "normal",
            "shadow_style": "soft",
            "typography_preset": "studio",
            "border_style": "soft",
            "container_width": "wide",
            "section_spacing": "normal",
            "button_style": "pill",
            "cta_style": "solid",
            "grid_language": "balanced",
            "image_treatment": "clean",
            "overlay_style": "gradient",
            "motion_preset": "balanced",
            "reveal_preset": "lift",
            "parallax_preset": "subtle",
            "navigation_treatment": "floating",
            "background_texture": "off",
            "section_navigator": "off",
            "hero_treatment": "cover",
        },
        "site_tree": {
            "version": 1,
            "root_id": "site",
            "nodes": [
                {"id": "site-overview", "parent_id": "site", "kind": "panel", "label": "Visão geral", "tab": "workspace", "order": 10},
                {"id": "content", "parent_id": "site", "kind": "group", "label": "CONTEÚDO", "order": 20},
                {"id": "content-projects", "parent_id": "content", "kind": "section-editor", "label": "Projetos do portfólio", "tab": "projects", "order": 10},
                {"id": "content-collections", "parent_id": "content", "kind": "section-editor", "label": "Coleções / Drive", "tab": "categories", "order": 20},
                {"id": "pages", "parent_id": "site", "kind": "group", "label": "SITE E PÁGINAS", "order": 30},
                {"id": "pages-manager", "parent_id": "pages", "kind": "section-editor", "label": "Páginas / subpáginas", "tab": "pagebuilder", "order": 1},
                {"id": "pages-seo", "parent_id": "pages", "kind": "section-editor", "label": "SEO individual", "tab": "seo", "order": 3},
                {"id": "pages-sections", "parent_id": "pages", "kind": "section-editor", "label": "Inserir seções / carrosséis", "tab": "sections", "order": 5},
                {"id": "page-services", "parent_id": "pages", "kind": "section-editor", "label": "Serviços e preços", "tab": "services", "order": 8},
                {"id": "page-home", "parent_id": "pages", "kind": "group", "label": "Home", "order": 10},
                {"id": "home-structure", "parent_id": "page-home", "kind": "section-editor", "label": "Estrutura da Home", "tab": "home", "order": 10},
                {"id": "home-grid", "parent_id": "page-home", "kind": "section-editor", "label": "Grid principal", "tab": "homegrid", "order": 20},
                {"id": "home-hero", "parent_id": "page-home", "kind": "section-editor", "label": "Banners WEB / MOBILE", "tab": "hero", "order": 30},
                {"id": "site-audio", "parent_id": "global", "kind": "component", "label": "Áudio / Ambiente", "tab": "audio", "order": 40},
                {"id": "page-categories", "parent_id": "pages", "kind": "group", "label": "Páginas de coleção", "order": 20},
                {"id": "categories-pages", "parent_id": "page-categories", "kind": "section-editor", "label": "Estrutura e blocos", "tab": "categorypages", "order": 10},
                {"id": "appearance", "parent_id": "site", "kind": "group", "label": "APARÊNCIA", "order": 40},
                {"id": "appearance-editor", "parent_id": "appearance", "kind": "component", "label": "Aparência do editor", "tab": "editorappearance", "order": 10},
                {"id": "appearance-site", "parent_id": "appearance", "kind": "component", "label": "Aparência do site final", "tab": "siteappearance", "order": 20},
                {"id": "appearance-sections", "parent_id": "appearance", "kind": "component", "label": "Canvas / Navegação de seções", "tab": "siteappearance", "order": 30},
                {"id": "global", "parent_id": "site", "kind": "group", "label": "COMPONENTES GLOBAIS", "order": 50},
                {"id": "global-header", "parent_id": "global", "kind": "component", "label": "Header / Menu", "tab": "header", "order": 10},
                {"id": "global-footer", "parent_id": "global", "kind": "component", "label": "Footer / Contato / Sociais", "tab": "footer", "order": 20},
                {"id": "global-design", "parent_id": "global", "kind": "component", "label": "Identidade / Movimento", "tab": "design", "order": 30},
                {"id": "publication-group", "parent_id": "site", "kind": "group", "label": "PUBLICAÇÃO", "order": 60},
                {"id": "publication-main", "parent_id": "publication-group", "kind": "panel", "label": "Publicar atualização", "tab": "publication", "order": 10},
                {"id": "publication-diagnostics", "parent_id": "publication-group", "kind": "panel", "label": "Diagnóstico", "tab": "diagnostics", "order": 20},
            ],
        },
        "global": {
            "header": {
                "height": 72,
                "padding_x": 4,
                "background_mode": "adaptive",
                "background_opacity": 84,
                "blur": 18,
                "background_color": "#070707",
                "text_color": "#f4f4ef",
                "hover_color": "#ffffff",
                "sticky": True,
                "border": True,
                "logo_visible": True,
                "logo_label": "MENSAGEM STUDIO",
                "logo_mode": "text",
                "logo_media_id": "",
                "logo_alt": "Mensagem Studio",
                "logo_height_desktop": 34,
                "logo_height_mobile": 28,
                "font_family": "display",
                "font_size_desktop": 10,
                "font_size_mobile": 12,
                "font_weight": "500",
                "item_gap": 22,
                "mobile_mode": "drawer",
                "menu_items": [
                    {"id": "home", "label": "Home", "target": "/", "visible": True, "order": 10},
                    {"id": "projects", "label": "Projetos", "target": "/#projectsBlock", "visible": True, "order": 20},
                    {"id": "services", "label": "Serviços", "target": "/servicos/", "visible": True, "order": 30},
                    {"id": "about", "label": "Sobre", "target": "/#about", "visible": True, "order": 40},
                    {"id": "contact", "label": "Contato", "target": "/#contact", "visible": True, "order": 50},
                ],
            },
            "footer": {
                "visible": True,
                "studio_name": "MENSAGEM STUDIO",
                "tagline": "Direção criativa, design e experiências visuais.",
                "background_color": "#070707",
                "text_color": "#f4f4ef",
                "muted_color": "#8e918f",
                "divider": True,
                "alignment": "between",
                "font_size": 12,
                "icon_size": 20,
                "gap": 18,
                "whatsapp_visible": True,
                "whatsapp_number": "5541999999937",
                "whatsapp_label": "Contrate nossos serviços de design",
                "whatsapp_message": "Olá! Gostaria de conversar sobre um projeto de design com a Mensagem Studio.",
                "copyright": "© Mensagem Studio. Todos os direitos reservados.",
                "socials": [
                    {"id": "instagram", "label": "Instagram", "url": "https://www.instagram.com/mensagem_studio/", "visible": True, "order": 10},
                    {"id": "behance", "label": "Behance", "url": "", "visible": False, "order": 20},
                    {"id": "linkedin", "label": "LinkedIn", "url": "", "visible": False, "order": 30},
                    {"id": "youtube", "label": "YouTube", "url": "", "visible": False, "order": 40},
                ],
            },
        },
        # R2.2 Stage 7: canonical Immersive V3.1 runtime configuration.
        # It owns presentation/runtime configuration only; Save/Build/Publish remain separate owners.
        "immersive": {
            "enabled": True,
            "runtime_version": "3.1",
            "visual_proof": True,
            "quality": "auto",
            "intensity": 1.0,
            "glb_asset_id": "studio-orbit-dish",
            "debug": False,
            "fallback": True,
        },
        # V9.1 Phase 15B: shared runtime performance profile. This remains
        # presentation/runtime state and never owns SAVE/BUILD/PUBLISH.
        "performance": {
            "profile": "auto",
            "layer_budget": 12,
            "memory_budget_mb": 256,
            "fps_floor": 24,
            "weak_device_fallback": True,
            "pause_offscreen": True,
        },
        # V9.1 Phase 15B: first-class discovery entities that did not exist in
        # the inherited V8 inventory. They use the same site_builder state.
        "clients": {
            "enabled": True,
            "slug": "clientes",
            "title": "Clientes",
            "intro": "Projetos e relações selecionadas da Mensagem Studio.",
            "items": [],
        },
        "taxonomies": {
            "enabled": True,
            "tags_slug": "tags",
            "items": [],
        },
        "special_routes": {
            "about": {"enabled": True, "slug": "sobre", "title": "Sobre", "description": "Conheça a Mensagem Studio."},
            "contact": {"enabled": True, "slug": "contato", "title": "Contato", "description": "Entre em contato com a Mensagem Studio."},
            "quote": {"enabled": True, "slug": "orcamento", "title": "Orçamento", "description": "Solicite um orçamento."},
            "search": {"enabled": True, "slug": "busca", "title": "Busca", "description": "Busque projetos, serviços, clientes e tags."},
            "archive": {"enabled": True, "slug": "arquivo", "title": "Arquivo", "description": "Arquivo completo de projetos."},
            "not_found": {"enabled": True, "slug": "404", "title": "Página não encontrada", "description": "O endereço solicitado não foi encontrado.", "index": False},
        },
        "seo": {
            "projects_slug": "projetos",
            "title_suffix": "MENSAGEM STUDIO",
            "home": {"title": "", "description": "", "slug": "", "canonical": "", "image_media_id": "", "index": True, "follow": True},
        },
        "custom_pages": {},
        "services": {
            "visible": True,
            "show_on_home": True,
            "slug": "servicos",
            "menu_label": "Serviços",
            "eyebrow": "Soluções criativas",
            "title": "Serviços profissionais",
            "intro": "Design, audiovisual e direção criativa para marcas, produtos, campanhas e experiências digitais.",
            "home_title": "Como posso transformar seu projeto",
            "home_intro": "Dez frentes de trabalho que podem ser contratadas separadamente ou combinadas em uma solução completa.",
            "price_note": "Valores iniciais. O orçamento final considera escopo, prazo, volume e complexidade.",
            "cta_title": "Vamos construir algo relevante?",
            "cta_body": "Conte o que você precisa e receba uma proposta adequada ao projeto.",
            "cta_label": "Solicitar orçamento",
            "whatsapp_number": "5541999999937",
            "whatsapp_message": "Olá! Gostaria de solicitar um orçamento para um projeto.",
            "layout_style": "editorial",
            "catalog_density": "comfortable",
            "cover_ratio": "portrait",
            "show_prices": True,
            "show_deliverables": True,
            "show_deadlines": True,
            "show_revisions": True,
            "process_visible": True,
            "process_title": "Um processo claro do briefing à entrega",
            "process_body": "Escolha as soluções, descreva o projeto e receba uma proposta com escopo, prazo e investimento.",
            "process_steps": [
                "Escolha os serviços",
                "Envie o briefing",
                "Receba a proposta",
                "Aprove e acompanhe",
            ],
            "brief_visible": True,
            "brief_title": "Monte sua solicitação de orçamento",
            "brief_body": "Selecione uma ou mais soluções e envie um briefing organizado diretamente pelo WhatsApp.",
            "brief_button": "Abrir orçamento",
            "response_note": "Retorno comercial em até 1 dia útil.",
            "quote_enabled": True,
            "quote_title": "Seu orçamento",
            "quote_intro": "Revise os serviços, quantidades e referências antes de enviar o briefing.",
            "quote_finish_label": "Enviar solicitação",
            "quote_whatsapp_intro": "Olá! Gostaria de solicitar um orçamento.",
            "quote_dock_label": "Orçamento",
            "quote_item_action_label": "Adicionar ao orçamento",
            "quote_case_action_label": "Quero algo semelhante",
            "quote_show_estimate": True,
            "quote_show_deadline": True,
            "quote_show_revisions": True,
            "quote_state_version": 1,
            "quote_home_visible": True,
            "quote_endpoint_enabled": True,
            "quote_endpoint": "/api/quote",
            "quote_success_message": "Solicitação recebida. Guarde o protocolo para acompanhar o pedido.",
            "quote_fallback_whatsapp": True,
            "quote_home_title": "Monte seu orçamento",
            "quote_home_intro": "Escolha serviços, detalhe o escopo e envie uma solicitação com protocolo de recebimento.",
            "offer_notification": {
                "enabled": False,
                "delay_seconds": 8,
                "title": "Gostou deste projeto?",
                "message": "Podemos criar algo semelhante para sua marca.",
                "cta_label": "Solicitar orçamento",
                "cta_target": "quote",
                "position": "bottom_right",
                "dismissible": True,
                "frequency": "once_per_session",
                "frequency_value": 24,
                "pages": ["home", "project", "services", "service", "category", "custom"],
                "related_service_id": "",
                "use_theme_colors": True,
                "background_color": "",
                "text_color": "",
                "accent_color": "",
            },
            "categories": [
                {
                    "id": "social-media", "order": 10, "visible": True, "featured": True,
                    "number": "01", "title": "Artes para Redes Sociais", "short_title": "Social Media",
                    "description": "Peças consistentes e adaptáveis para fortalecer a presença visual de marcas nas redes.",
                    "accent": "#0071E3", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "social-single", "order": 10, "visible": True, "featured": False, "title": "Arte avulsa para post ou story", "description": "Uma peça estática em formato principal, com adaptação simples quando prevista no briefing.", "price_type": "from", "price": 90, "unit": "por peça", "deadline": "2 a 3 dias úteis", "revisions": 2, "deliverables": ["Arquivo final para publicação", "Versão JPG ou PNG", "Ajustes de texto e composição"]},
                        {"id": "social-carousel", "order": 20, "visible": True, "featured": True, "title": "Carrossel com até 5 páginas", "description": "Narrativa visual sequencial com capa, desenvolvimento e encerramento.", "price_type": "from", "price": 250, "unit": "por carrossel", "deadline": "3 a 5 dias úteis", "revisions": 2, "deliverables": ["Até 5 páginas", "Identidade visual consistente", "Arquivos prontos para publicação"]},
                        {"id": "social-pack-10", "order": 30, "visible": True, "featured": False, "title": "Pacote com 10 criativos", "description": "Conjunto visual para calendário de conteúdo, campanha ou lançamento.", "price_type": "from", "price": 800, "unit": "por pacote", "deadline": "7 a 12 dias úteis", "revisions": 2, "deliverables": ["10 peças estáticas", "Unidade visual entre as peças", "Organização por formatos"]},
                    ],
                },
                {
                    "id": "video-editing", "order": 20, "visible": True, "featured": True,
                    "number": "02", "title": "Edição de Vídeos", "short_title": "Vídeo",
                    "description": "Edição para redes, campanhas, podcasts, conteúdo institucional e plataformas digitais.",
                    "accent": "#7C3AED", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "video-reel-basic", "order": 10, "visible": True, "featured": False, "title": "Reel básico de até 90 segundos", "description": "Cortes, ritmo, trilha fornecida ou licenciada pelo cliente e acabamento para redes.", "price_type": "from", "price": 120, "unit": "por vídeo", "deadline": "2 a 4 dias úteis", "revisions": 3, "deliverables": ["Arquivo final editado em MP4", "Edição vertical", "Correção básica de cor", "Exportação pronta para redes"]},
                        {"id": "video-reel-motion", "order": 20, "visible": True, "featured": True, "title": "Reel com motion, legendas e efeitos", "description": "Edição dinâmica com elementos gráficos, legendagem e recursos de retenção.", "price_type": "from", "price": 280, "unit": "por vídeo", "deadline": "3 a 6 dias úteis", "revisions": 3, "deliverables": ["Arquivo final editado em MP4", "Motion e legendas", "Tratamento de áudio", "Efeitos e acabamento"]},
                        {"id": "video-pack-8", "order": 30, "visible": True, "featured": False, "title": "Pacote com 8 Reels", "description": "Pacote recorrente para calendário de conteúdo e presença contínua.", "price_type": "from", "price": 800, "unit": "por pacote", "deadline": "10 a 20 dias úteis", "revisions": 3, "deliverables": ["8 arquivos finais editados em MP4", "Padrão visual do projeto", "Finalização para redes", "Arquivos organizados"]},
                        {"id": "video-institutional", "order": 40, "visible": True, "featured": False, "title": "Vídeo institucional de 1 a 3 minutos", "description": "Montagem narrativa para apresentação de marca, produto, evento ou serviço.", "price_type": "from", "price": 500, "unit": "por projeto", "deadline": "7 a 15 dias úteis", "revisions": 3, "deliverables": ["Arquivo final editado em MP4", "Montagem narrativa", "Tratamento de cor e áudio", "Versão final em alta qualidade"]},
                    ],
                },
                {
                    "id": "audiovisual-production", "order": 30, "visible": True, "featured": True,
                    "number": "03", "title": "Produção Audiovisual", "short_title": "Produção",
                    "description": "Planejamento e captação de entrevistas, workshops, produtos, conteúdos e campanhas.",
                    "accent": "#FF6B00", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "av-capture-2h", "order": 10, "visible": True, "featured": False, "title": "Captação essencial de até 2 horas", "description": "Captação compacta em uma locação, adequada a entrevistas, conteúdos e demonstrações.", "price_type": "from", "price": 500, "unit": "por sessão", "deadline": "conforme agenda", "revisions": 0, "deliverables": ["Captação em uma locação", "Organização dos arquivos", "Direção técnica básica"]},
                        {"id": "av-half-day", "order": 20, "visible": True, "featured": True, "title": "Meia diária de produção", "description": "Produção audiovisual de até 4 horas para conteúdo de marca, workshops ou produtos.", "price_type": "from", "price": 900, "unit": "por diária", "deadline": "conforme agenda", "revisions": 0, "deliverables": ["Até 4 horas de captação", "Planejamento técnico", "Arquivos brutos organizados"]},
                        {"id": "av-full-day", "order": 30, "visible": True, "featured": False, "title": "Diária de produção audiovisual", "description": "Captação estruturada para projetos com maior volume de cenas e necessidades técnicas.", "price_type": "from", "price": 1500, "unit": "por diária", "deadline": "conforme agenda", "revisions": 0, "deliverables": ["Até 8 horas de captação", "Direção de cena", "Organização do material"]},
                        {"id": "av-product-video", "order": 40, "visible": True, "featured": False, "title": "Vídeo de produto", "description": "Captação dirigida para demonstrar atributos, uso, textura e diferenciais do produto.", "price_type": "from", "price": 600, "unit": "por projeto", "deadline": "5 a 10 dias úteis", "revisions": 2, "deliverables": ["Planejamento de cenas", "Captação do produto", "Edição de uma versão principal"]},
                    ],
                },
                {
                    "id": "motion-vfx", "order": 40, "visible": True, "featured": True,
                    "number": "04", "title": "Motion Design e VFX", "short_title": "Motion e VFX",
                    "description": "Animação, composição e efeitos visuais que ampliam impacto, clareza e movimento.",
                    "accent": "#00A896", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "motion-logo", "order": 10, "visible": True, "featured": False, "title": "Animação de logotipo", "description": "Abertura ou assinatura animada com movimento alinhado à identidade da marca.", "price_type": "from", "price": 250, "unit": "por animação", "deadline": "4 a 7 dias úteis", "revisions": 2, "deliverables": ["Animação principal", "Versão com fundo transparente quando aplicável", "Exportações para uso digital"]},
                        {"id": "motion-social", "order": 20, "visible": True, "featured": True, "title": "Motion para redes sociais", "description": "Peça curta com tipografia, grafismos, produtos ou informações em movimento.", "price_type": "from", "price": 350, "unit": "por peça", "deadline": "4 a 8 dias úteis", "revisions": 2, "deliverables": ["Motion vertical ou quadrado", "Design de movimento", "Arquivo final otimizado"]},
                        {"id": "vfx-shot", "order": 30, "visible": True, "featured": False, "title": "Composição e VFX por cena", "description": "Tracking, recorte, integração de elementos, limpeza ou composição visual.", "price_type": "from", "price": 300, "unit": "por cena", "deadline": "conforme complexidade", "revisions": 2, "deliverables": ["Composição da cena", "Tracking quando necessário", "Render final"]},
                        {"id": "motion-packshot", "order": 40, "visible": True, "featured": False, "title": "Packshot animado de produto", "description": "Apresentação final do produto com luz, textos, grafismos e movimento.", "price_type": "from", "price": 450, "unit": "por peça", "deadline": "5 a 10 dias úteis", "revisions": 2, "deliverables": ["Animação do produto", "Textos e destaques", "Versão final para campanha"]},
                    ],
                },
                {
                    "id": "photo-editing", "order": 50, "visible": True, "featured": False,
                    "number": "05", "title": "Edição de Fotos", "short_title": "Fotos",
                    "description": "Tratamento técnico e estético para retratos, produtos, eventos e comunicação visual.",
                    "accent": "#E5484D", "cover_media_id": "",
                    "services": [
                        {"id": "photo-basic", "order": 10, "visible": True, "featured": False, "title": "Correção básica", "description": "Ajustes de exposição, contraste, cor, enquadramento e nitidez.", "price_type": "from", "price": 30, "unit": "por foto", "deadline": "2 a 4 dias úteis", "revisions": 1, "deliverables": ["Correção de cor e luz", "Enquadramento", "Arquivo final em alta resolução"]},
                        {"id": "photo-retouch", "order": 20, "visible": True, "featured": True, "title": "Retoque avançado", "description": "Tratamento detalhado de pele, produto, superfícies e imperfeições.", "price_type": "from", "price": 60, "unit": "por foto", "deadline": "3 a 6 dias úteis", "revisions": 2, "deliverables": ["Retoque detalhado", "Tratamento de cor", "Finalização em alta resolução"]},
                        {"id": "photo-pack-10", "order": 30, "visible": True, "featured": False, "title": "Pacote com 10 fotos", "description": "Tratamento padronizado para ensaio, produto, evento ou catálogo.", "price_type": "from", "price": 300, "unit": "por pacote", "deadline": "5 a 10 dias úteis", "revisions": 1, "deliverables": ["10 imagens tratadas", "Consistência de cor", "Arquivos organizados"]},
                    ],
                },
                {
                    "id": "image-manipulation", "order": 60, "visible": True, "featured": False,
                    "number": "06", "title": "Manipulação de Imagens", "short_title": "Manipulação",
                    "description": "Fotomontagens e composições publicitárias com integração de luz, textura e perspectiva.",
                    "accent": "#D946EF", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "manipulation-simple", "order": 10, "visible": True, "featured": False, "title": "Montagem simples", "description": "Recortes e combinação direta de elementos com ajuste visual básico.", "price_type": "from", "price": 80, "unit": "por imagem", "deadline": "2 a 4 dias úteis", "revisions": 2, "deliverables": ["Recorte e composição", "Ajuste de cor", "Arquivo final"]},
                        {"id": "manipulation-ad", "order": 20, "visible": True, "featured": True, "title": "Composição publicitária", "description": "Peça com direção visual, integração de elementos e acabamento para campanha.", "price_type": "from", "price": 250, "unit": "por imagem", "deadline": "4 a 8 dias úteis", "revisions": 2, "deliverables": ["Composição completa", "Integração de luz e cor", "Finalização publicitária"]},
                        {"id": "manipulation-complex", "order": 30, "visible": True, "featured": False, "title": "Composição complexa", "description": "Construção visual com múltiplas fontes, cenários e alto nível de detalhamento.", "price_type": "from", "price": 700, "unit": "por imagem", "deadline": "7 a 15 dias úteis", "revisions": 2, "deliverables": ["Direção da composição", "Múltiplos elementos", "Arquivo final em alta resolução"]},
                    ],
                },
                {
                    "id": "visual-identity", "order": 70, "visible": True, "featured": True,
                    "number": "07", "title": "Identidade Visual", "short_title": "Identidade",
                    "description": "Sistemas de marca coerentes, reconhecíveis e preparados para aplicações reais.",
                    "accent": "#F5A524", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "identity-essential", "order": 10, "visible": True, "featured": True, "title": "Manual essencial", "description": "Organização dos fundamentos da identidade e das regras principais de aplicação.", "price_type": "from", "price": 1500, "unit": "por projeto", "deadline": "15 a 25 dias úteis", "revisions": 3, "deliverables": ["Manual essencial com aproximadamente 14 páginas", "Logotipo e versões", "Paleta e tipografia", "Aplicações da marca e da logo", "Regras essenciais de uso"]},
                        {"id": "identity-complete", "order": 20, "visible": True, "featured": False, "title": "Manual completo", "description": "Sistema de identidade ampliado com linguagem gráfica, aplicações e documentação completa.", "price_type": "from", "price": 3000, "unit": "por projeto", "deadline": "25 a 45 dias úteis", "revisions": 3, "deliverables": ["Manual completo com aproximadamente 29 páginas", "Sistema completo de marca", "Tom de voz da marca", "Público e direcionamento da marca", "Grafismos, padrões e aplicações", "Manual detalhado de uso"]},
                    ],
                },
                {
                    "id": "campaign-art-direction", "order": 80, "visible": True, "featured": True,
                    "number": "08", "title": "Campanhas e Direção de Arte", "short_title": "Campanhas",
                    "description": "Conceitos visuais e sistemas de campanha preparados para diferentes canais e formatos.",
                    "accent": "#FF3B30", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "campaign-kv", "order": 10, "visible": True, "featured": True, "title": "Key visual de campanha", "description": "Imagem central que organiza conceito, atmosfera, tipografia e direção da campanha.", "price_type": "from", "price": 500, "unit": "por conceito", "deadline": "7 a 12 dias úteis", "revisions": 2, "deliverables": ["Conceito visual", "Peça principal", "Direção de aplicações"]},
                        {"id": "campaign-package", "order": 20, "visible": True, "featured": False, "title": "Pacote visual de campanha", "description": "Key visual e desdobramentos principais para redes, banners e comunicação digital.", "price_type": "from", "price": 1000, "unit": "por campanha", "deadline": "10 a 20 dias úteis", "revisions": 2, "deliverables": ["Key visual", "Até 5 desdobramentos", "Guia rápido de aplicação"]},
                        {"id": "art-direction", "order": 30, "visible": True, "featured": False, "title": "Direção de arte", "description": "Definição da linguagem visual e acompanhamento criativo de uma entrega ou campanha.", "price_type": "from", "price": 800, "unit": "por projeto", "deadline": "conforme escopo", "revisions": 2, "deliverables": ["Direção visual", "Referências e linguagem", "Orientação dos desdobramentos"]},
                    ],
                },
                {
                    "id": "products-ecommerce", "order": 90, "visible": True, "featured": True,
                    "number": "09", "title": "Produtos e E-commerce", "short_title": "E-commerce",
                    "description": "Imagens e comunicação comercial para produtos, vitrines, catálogos e marketplaces.",
                    "accent": "#32ADE6", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "product-image", "order": 10, "visible": True, "featured": False, "title": "Imagem tratada de produto", "description": "Recorte, limpeza, correção e preparação comercial de uma imagem de produto.", "price_type": "from", "price": 50, "unit": "por imagem", "deadline": "2 a 4 dias úteis", "revisions": 1, "deliverables": ["Tratamento do produto", "Fundo conforme briefing", "Arquivo para e-commerce"]},
                        {"id": "product-pack-10", "order": 20, "visible": True, "featured": True, "title": "Pacote com 10 imagens de produto", "description": "Tratamento padronizado para catálogo, loja virtual ou marketplace.", "price_type": "from", "price": 400, "unit": "por pacote", "deadline": "5 a 10 dias úteis", "revisions": 1, "deliverables": ["10 imagens tratadas", "Padrão visual consistente", "Arquivos organizados"]},
                        {"id": "marketplace-kit", "order": 30, "visible": True, "featured": False, "title": "Kit visual para marketplace", "description": "Imagem principal, destaques, benefícios e peças complementares para um anúncio.", "price_type": "from", "price": 350, "unit": "por produto", "deadline": "5 a 8 dias úteis", "revisions": 2, "deliverables": ["Imagem principal", "Até 4 imagens informativas", "Adaptação ao canal"]},
                        {"id": "ecommerce-banner", "order": 40, "visible": True, "featured": False, "title": "Banner para loja ou coleção", "description": "Peça comercial para vitrine, lançamento, categoria ou ação promocional.", "price_type": "from", "price": 250, "unit": "por banner", "deadline": "3 a 6 dias úteis", "revisions": 2, "deliverables": ["Banner principal", "Uma adaptação de formato", "Arquivo pronto para publicação"]},
                    ],
                },
                {
                    "id": "illustration-script-storyboard", "order": 100, "visible": True, "featured": True,
                    "number": "10", "title": "Ilustração, Roteiro e Storyboard", "short_title": "Narrativa Visual",
                    "description": "Ideias transformadas em personagens, cenas, roteiros e planejamento visual de produção.",
                    "accent": "#A855F7", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.38, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "illustration-single", "order": 10, "visible": True, "featured": False, "title": "Ilustração individual", "description": "Ilustração para conteúdo, campanha, apresentação ou peça editorial.", "price_type": "from", "price": 200, "unit": "por ilustração", "deadline": "5 a 10 dias úteis", "revisions": 2, "deliverables": ["Esboço aprovado", "Arte final", "Arquivo em alta resolução"]},
                        {"id": "character-design", "order": 20, "visible": True, "featured": False, "title": "Criação de personagem", "description": "Desenvolvimento visual de personagem com linguagem, silhueta e características próprias.", "price_type": "from", "price": 300, "unit": "por personagem", "deadline": "7 a 15 dias úteis", "revisions": 2, "deliverables": ["Pesquisa visual", "Desenvolvimento do personagem", "Arte final"]},
                        {"id": "script-short", "order": 30, "visible": True, "featured": False, "title": "Roteiro curto publicitário", "description": "Estrutura narrativa para vídeo curto, campanha, anúncio ou conteúdo de marca.", "price_type": "from", "price": 250, "unit": "por roteiro", "deadline": "3 a 7 dias úteis", "revisions": 2, "deliverables": ["Conceito narrativo", "Roteiro estruturado", "Indicações de cena e fala"]},
                        {"id": "storyboard-8", "order": 40, "visible": True, "featured": True, "title": "Storyboard com até 8 quadros", "description": "Planejamento visual de cenas, enquadramentos, ações e continuidade.", "price_type": "from", "price": 400, "unit": "por sequência", "deadline": "5 a 10 dias úteis", "revisions": 2, "deliverables": ["Até 8 quadros", "Indicação de câmera e ação", "Arquivo final para produção"]},
                    ],
                },
                {
                    "id": "web-platforms", "order": 110, "visible": True, "featured": True,
                    "number": "11", "title": "Sites e Plataformas", "short_title": "Sites Premium",
                    "description": "Sites HTML publicados no GitHub com editor StudioFrame conectado ao Google Drive, estrutura personalizável e operação independente.",
                    "accent": "#B8E600", "cover_media_id": "", "cover_fit": "cover", "cover_position_x": 50, "cover_position_y": 50, "overlay_strength": 0.34, "text_alignment": "left", "visual_height": "large", "show_cover": True,
                    "services": [
                        {"id": "studioframe-site-implementation", "order": 10, "visible": True, "featured": True, "title": "Site HTML + editor StudioFrame", "description": "Criação de site premium em HTML com publicação no GitHub, editor visual StudioFrame e biblioteca de mídia organizada no Google Drive. Inclui implantação completa e 60 dias de garantia técnica, sem manutenção recorrente.", "price_type": "from", "price": 18900, "unit": "por projeto", "deadline": "até 45 dias", "revisions": 3, "deliverables": ["Direção visual e arquitetura do site", "Site HTML responsivo publicado no GitHub", "Editor StudioFrame personalizável", "Integração editorial com Google Drive", "Treinamento de uso", "60 dias de garantia técnica"]},
                        {"id": "studioframe-site-managed", "order": 20, "visible": True, "featured": True, "title": "Site StudioFrame + manutenção mensal", "description": "Implantação premium completa com acompanhamento contínuo para atualizações técnicas, pequenos ajustes editoriais, monitoramento e suporte de publicação.", "price_type": "from", "price": 22900, "unit": "implantação + R$ 1.490/mês", "deadline": "até 45 dias", "revisions": 4, "deliverables": ["Tudo do plano de implementação", "60 dias de lançamento assistido", "Manutenção técnica mensal", "Pequenos ajustes editoriais contínuos", "Monitoramento de publicação", "Suporte prioritário"]},
                    ],
                },
            ],
        },
        "navigation": {
            "projects_label": "Projetos",
            "about_label": "Sobre",
            "contact_label": "Contato",
            # V5.25: public navigation becomes a visual site layer instead of a
            # dashboard-like top nav. Items are derived from the editorial Home
            # and Drive sections; these options only control presentation.
            "side_menu_enabled": True,
            "menu_label": "Menu",
            "menu_title": "Navegação",
            # V7.9.5.3: the former sticky category pill bar can be absorbed by
            # the floating menu so it never overlays portfolio media.
            "show_top_link": False,
            "top_label": "Ir para o topo",
            "show_services_link": True,
            "show_contact_link": True,
            "show_home_sections": False,
            "show_drive_sections": False,
            "floating_position": "left",
            "floating_button_size": 42,
            "floating_gap": 8,
            "menu_panel_width": 520,
            "menu_text_size": 48,
            "floating_whatsapp_visible": True,
            "floating_whatsapp_label": "WhatsApp",
            "floating_whatsapp_number": "",
            "floating_whatsapp_message": "",
        },
        "floating_controls": {
            # V7.12.20 Stage 3 / ADR-006: Menu, WhatsApp and Quote are
            # independent editorial controls. Shared theme tokens are allowed;
            # shared mandatory position/state/dock ownership is not.
            "menu": {"visible": True, "position": "bottom_left", "offset_x": 0, "offset_y": 0, "size": 42, "label": "Menu", "style": "theme", "shape": "pill", "background_color": "", "foreground_color": "", "border_color": ""},
            "whatsapp": {"visible": True, "position": "bottom_left", "offset_x": 0, "offset_y": 0, "size": 42, "label": "WhatsApp", "style": "theme", "shape": "circle", "background_color": "#25D366", "foreground_color": "#FFFFFF", "border_color": "#25D366", "display_mode": "icon", "number": "", "message": ""},
            "quote": {"visible": True, "position": "bottom_left", "offset_x": 0, "offset_y": 0, "size": 42, "label": "Orçamento", "style": "theme", "shape": "pill", "background_color": "", "foreground_color": "", "border_color": "", "show_icon": True},
        },
        # V5.16 / Etapas 4-5: configurable cinematic lettering and Hero.
        "hero": {
            # V5.23: independent multi-slide Hero. ``media_id`` remains as a
            # backward-compatible single-slide fallback.
            "slides": [],
            "media_id": "",
            "mobile_media_id": "",
            "mobile_format": "portrait45",
            "mobile_reference_width": 1080,
            "mobile_reference_height": 1350,
            "title": "",
            "subtitle": "",
            "position_x": 50,
            "position_y": 50,
            "height": "fullscreen",
            "text_position": "bottom-left",
            "overlay": "medium",
            "effect": "cinematic",
            "kicker": "Portfólio · Direção criativa",
            "cta_label": "Explorar projeto",
            "scroll_label": "Role para explorar",
            "rotation_seconds": 6.2,
            "start_muted": True,
            "sound_control_visible": True,
            # Editor Engine 12: one additive scroll controller inside the
            # canonical Hero owner. Disabled defaults preserve every old save.
            "gsap_scroll": {
                "version": 1,
                "enabled": False,
                "mode": "video_scrub",
                "media_id": "",
                "mobile_media_id": "",
                "asset_id": "hero-spacecraft-user",
                "pin": True,
                "start": "top top",
                "end_percent": 180,
                "scrub": 0.7,
                "smoothing": 0.18,
                "speed": 1.0,
                "rotation_x_from": 8,
                "rotation_x_to": -6,
                "rotation_y_from": -48,
                "rotation_y_to": 54,
                "rotation_z_from": -4,
                "rotation_z_to": 5,
                "scale_from": 0.82,
                "scale_to": 1.08,
                "position_x_from": -10,
                "position_x_to": 10,
                "position_y_from": 8,
                "position_y_to": -8,
                "poster_url": "",
                "mobile_fallback": "poster",
                "reduced_motion": "poster",
                "attribution_visible": True,
            },
        },
        "audio": {
            "ambient_enabled": False,
            "source": "youtube",
            "youtube_url": "",
            "initial_volume": 30,
            "loop": True,
            "start_mode": "manual",
            "control_visible": True,
            "control_position": "bottom_left",
            "video_audio_behavior": "pause",
        },
        "section_navigator": {
            "enabled": False,
            "position": "right",
            "mode": "overlay",
            "eyebrow": "SEÇÕES",
            "show_eyebrow": True,
            "inactive_opacity": 0.34,
            "active_style": "accent",
            "animation": "slide",
            "desktop_only": False,
            "mobile_mode": "select",
        },
        "lettering": {
            "visible": True,
            "eyebrow": "Mensagem Studio",
            "text": "Ideias que ganham forma, ritmo e presença.",
            "style": "split",
            "direction": "left",
            "speed": "medium",
        },
        "projects": {
            "visible": True,
            "header_visible": True,
            "eyebrow": "Portfólio selecionado",
            "title": "Projetos",
            # Public category tabs and section sequence. ``order`` contains the
            # special id ``all`` plus physical first-level Drive folder IDs.
            "filters": {
                "all_label": "Todos",
                "all_visible": True,
                "order": [],
                # inline = regular non-overlapping row in the document flow;
                # menu = categories live only inside the floating navigation.
                # Legacy sticky values are migrated to inline by state_v6.
                "display_mode": "inline",
            },
        },
        "about": {
            "visible": True,
            "eyebrow": "Mensagem Studio",
            "title": "Ideias com direção, forma e movimento.",
            "body": "Criamos identidades, campanhas, experiências digitais e conteúdo visual com intenção, clareza e presença.",
            "headline": "",
            "location": "",
            "education": [],
            "specialties": [],
            "linkedin_url": "",
            "combine_contact": False,
        },
        "contact": {
            "visible": True,
            "eyebrow": "Contato",
            "title": "Vamos criar algo juntos?",
            "body": "Entre em contato para conversar sobre projetos, campanhas e novas ideias.",
            "email": "",
            "whatsapp": "",
            "instagram_url": "",
            "linkedin_url": "",
            "cta_label": "Vamos trabalhar juntos",
        },
        # V5.17 / Etapas 6-7: the Home is now a modular sequence. Core blocks
        # remain protected building primitives while custom blocks can be
        # created, duplicated, hidden, removed and reordered in Site Builder.
        "home": {
            "blocks": [
                {"id": "core-hero", "type": "hero", "label": "Hero", "visible": True, "core": True},
                {"id": "core-intro", "type": "intro", "label": "Introdução", "visible": True, "core": True, "eyebrow": "O QUE FAZEMOS", "title": "Design, vídeo e direção criativa para marcas que precisam se destacar."},
                {"id": "core-lettering", "type": "lettering", "label": "Lettering", "visible": True, "core": True, "eyebrow": "MENSAGEM STUDIO", "title": "Ideias que ganham forma, ritmo e presença."},
                {"id": "core-projects-header", "type": "projects_header", "label": "Cabeçalho do portfólio", "visible": True, "core": True, "eyebrow": "Portfólio selecionado", "title": "Projetos", "body": "", "text_align": "left", "section_width": "content", "section_size": "normal", "section_background": "none"},
                {"id": "core-projects", "type": "projects", "label": "Projetos", "visible": True, "core": True},
                {
                    "id": "youtube-showcase-main",
                    "type": "youtube_showcase",
                    "label": "YouTube Showcase",
                    "visible": True,
                    "youtube_url": "https://www.youtube.com/watch?v=G_2jdXfXxiI",
                    "title": "",
                    "body": "",
                    "primary_cta_label": "Assistir",
                    "youtube_cta_label": "Ver no YouTube",
                    "channel_url": "",
                    "channel_cta_label": "Conheça o canal",
                    "show_external_link": True,
                    "show_channel_link": False,
                    "ratio": "16:9",
                    "width": "wide",
                    "text_align": "left",
                    "section_size": "normal",
                    "section_width": "wide",
                    "section_background": "none",
                },
                {"id": "core-about", "type": "about", "label": "Sobre", "visible": True, "core": True},
                {"id": "core-contact", "type": "contact", "label": "Contato", "visible": True, "core": True},
            ]
        },
        "section_pages": {},
        "animations": {
            "global": {"background_motion": "medium", "section_flow": "integrated"},
            "texts": {
                "type": "reveal",
                "direction": "up",
                "duration": 800,
                "delay": 100,
                "easing": "ease-out",
                "opacity": 0,
                "offset": 40,
            },
        },
        "layout": {
            "projects_style": "uniform",
            "hero_fullscreen": True,
            "motion_enabled": True,
            # Visual Engine V1. These settings are consumed by both the local
            # preview and the generated public site, so the editor never has a
            # separate visual contract from GitHub Pages.
            "motion_preset": "cinematic",
            "parallax_strength": "medium",
            "reveal_style": "cinematic",
            "project_viewer": "fullscreen",
            "hero_expand": True,
            "card_parallax": True,
            # V5.15: interactive card foundation. Controls hover depth without
            # changing the canonical 3/2/1 responsive grid geometry.
            "card_interaction": "responsive",
            # V5.16 / Etapa 2: videos can preview inside cards on hover/viewport.
            "card_video_preview": True,
            "card_video_preview_mode": "hover",
            # V5.16 / Etapa 3: ambient response adds depth without changing layout.
            "ambient_motion": True,
            "ambient_strength": "medium",
        },
    },
    "folders": {},
    "collections": {},
    "projects": {},
    # Project-level editorial state. Keys are physical Drive project-folder IDs
    # (depth == 2). Media-level state remains in ``projects`` for backward
    # compatibility with the validated catalog/exporter.
    "project_sections": {},
    "publication": {
        "strict_public_validation": True,
        "direct_drive_media": True,
        "github_owner": GITHUB_OWNER,
        "github_repository": GITHUB_REPOSITORY,
        "github_branch": GITHUB_BRANCH,
        "public_domain": PUBLIC_DOMAIN,
    },
}
