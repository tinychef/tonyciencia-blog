-- Market Tony v2 — catálogo: vitrina de los productos existentes, portadas nuevas y productos próximos.
-- GENERADO por scripts/gen-catalog-migration.mjs desde seed/catalog.mjs. No editar a mano.
-- Seguro sobre datos reales: solo rellena columnas vacías, antepone portadas (conserva las subidas por el dueño)
-- e inserta productos nuevos con ON CONFLICT(slug) DO NOTHING. No toca precios, títulos, descripciones ni archivos.

UPDATE products SET tagline = CASE WHEN tagline = '' THEN 'Tu estratega de publicidad con IA: investiga tu negocio y te entrega 250+ prompts de anuncios, cada uno con su razón.' ELSE tagline END,
  category = CASE WHEN category = '' THEN 'anuncios' ELSE category END,
  tags = CASE WHEN tags = '[]' THEN '["prompts de anuncios","anuncios con IA","Meta Ads","Google Ads","TikTok Ads","LinkedIn Ads","agente de IA en español"]' ELSE tags END,
  accent = CASE WHEN accent = '' THEN '#f5e400' ELSE accent END,
  meta_title = CASE WHEN meta_title = '' THEN 'Prompts de anuncios con IA: 250+ para Meta, Google y TikTok' ELSE meta_title END,
  meta_description = CASE WHEN meta_description = '' THEN 'Anuncios Infinitos: agente de IA en español que investiga tu negocio y tu competencia y te entrega 250+ prompts de anuncios con estrategia para Meta, Google, TikTok y LinkedIn. Pago único.' ELSE meta_description END,
  highlights = CASE WHEN highlights = '[]' THEN '["Investigación real de tu marca y de tu competencia, con herramientas de verdad (no inventada)","250+ prompts: mínimo 5 categorías × 50 prompts, en archivos separados","Textos completos de cada anuncio: gancho, cuerpo y llamado a la acción","Estrategia de campañas, inversión y métricas, más un Puntaje de Preparación de 0 a 100","App local para usarlo sin terminal y 3 guías en PDF","Pago único: lo usas con todos tus negocios o clientes, todos los meses"]' ELSE highlights END,
  specs = CASE WHEN specs = '[]' THEN '[{"label":"Formato","value":"ZIP: agente (22 archivos de skills), app local y 3 guías en PDF"},{"label":"Idioma","value":"Español"},{"label":"Funciona con","value":"Claude Code, Cursor, Codex, Antigravity o Gemini"},{"label":"Plataformas de anuncios","value":"Meta, Google, TikTok y LinkedIn"},{"label":"Requisitos","value":"Node.js (gratis) y una herramienta de IA compatible"},{"label":"Licencia","value":"Pago único, sin suscripción"}]' ELSE specs END,
  faq = CASE WHEN faq = '[]' THEN '[{"q":"¿Necesito saber programar?","a":"No. Abres la app o tu herramienta de IA y conversas con Tony, el agente."},{"q":"¿Genera las imágenes y los videos?","a":"No. Escribe los prompts y los textos. Los conviertes en imagen o video con el generador que ya uses (por ejemplo Nano Banana o Google Flow), con tu cuenta."},{"q":"¿Funciona sin las claves de Firecrawl, Apify y Serper?","a":"Sí, pero investiga menos. Las tres son gratuitas y se configuran en unos 5 minutos con botones."},{"q":"¿Garantiza ventas?","a":"No. Entrega estrategia, prompts y textos. El resultado depende de tu oferta, tu presupuesto y tu ejecución."},{"q":"¿Sirve para cualquier negocio?","a":"Está pensado para negocios de habla hispana que pautan en Meta, Google, TikTok o LinkedIn. Tony te pregunta lo que necesita antes de proponer nada."}]' ELSE faq END
WHERE slug = 'anuncios-infinitos';
UPDATE products SET tagline = CASE WHEN tagline = '' THEN 'Pide un video a tu agente y recibe un MP4 3D narrado, con subtítulos, música y cámara de cine.' ELSE tagline END,
  category = CASE WHEN category = '' THEN 'video' ELSE category END,
  tags = CASE WHEN tags = '[]' THEN '["videos con Claude Code","videos con Codex","videos 3D con IA","video explicativo con IA","video de producto con IA","subtítulos karaoke"]' ELSE tags END,
  badge = CASE WHEN badge = '' THEN 'Versión 2.0' ELSE badge END,
  accent = CASE WHEN accent = '' THEN '#e8e8e8' ELSE accent END,
  meta_title = CASE WHEN meta_title = '' THEN 'SpecReel: crea videos 3D con Claude Code y Codex' ELSE meta_title END,
  meta_description = CASE WHEN meta_description = '' THEN 'Skill para Claude Code y Codex que convierte cualquier tema en un video 3D narrado, con subtítulos, música y cámara de cine. Corre en tu computador. Pago único y actualizaciones 2.x gratis.' ELSE meta_description END,
  highlights = CASE WHEN highlights = '[]' THEN '["Escribes una instrucción; recibes un MP4 terminado con subtítulos karaoke y archivo .srt","Cámara de cine: 16 movimientos y 8 transiciones anclados a cada palabra","Kit de marca desde tu logo o tus colores HEX, con contraste revisado","Voces locales gratis o de estudio (Fish Audio, ElevenLabs) con tu propia clave","9:16, 1:1, 4:5 y 16:9 — Windows, macOS y Linux","Pago único con actualizaciones 2.x gratis"]' ELSE highlights END,
  specs = CASE WHEN specs = '[]' THEN '[{"label":"Versión","value":"2.0"},{"label":"Formato","value":"ZIP con la skill, el motor 3D, recetas de escena, ejemplos y documentación"},{"label":"Funciona con","value":"Claude Code y Codex"},{"label":"Sistemas","value":"Windows 10/11, macOS y Linux"},{"label":"Salida","value":"MP4 H.264 a 30 fps en 9:16, 1:1, 4:5 o 16:9, con .srt"},{"label":"Documentación","value":"Inglés y español"},{"label":"Licencia","value":"1 creador, uso comercial y para clientes incluido"}]' ELSE specs END,
  faq = CASE WHEN faq = '[]' THEN '[{"q":"¿Necesito saber programar?","a":"No para empezar. Describes el video en lenguaje natural y el agente escribe y corrige el código de las escenas. Durante la instalación corres algunos comandos en la terminal."},{"q":"¿Hay un costo por video?","a":"No por parte de SpecReel. Con una voz local solo pagas el uso de tu agente; las voces en la nube te cobran directamente."},{"q":"¿Funciona en Mac?","a":"Sí. Windows, macOS y Linux se detectan solos y un comando instala las dependencias. Apple Silicon renderiza rápido."},{"q":"¿Puedo usar los videos comercialmente?","a":"Sí, para tu marca y para clientes. Revisa la licencia de la voz que elijas; el Doctor avisa de los modelos no comerciales."},{"q":"¿Y si no me funciona?","a":"Tienes 14 días: si no logras renderizar el demo incluido en un sistema compatible después de que intentemos ayudarte, te devolvemos el dinero."}]' ELSE faq END
WHERE slug = 'specreel';

UPDATE products SET images = (
  SELECT json_group_array(json(v)) FROM (
    SELECT value AS v, 0 AS g, CAST(key AS INTEGER) AS k FROM json_each('[{"src":"/market/static/products/anuncios-infinitos/cover.webp","alt":"Anuncios Infinitos: 250+ prompts de anuncios para Meta, Google, TikTok y LinkedIn"},{"src":"/market/static/products/anuncios-infinitos/screen-1.webp","alt":"Sesión con Tony, el agente: investigación de tu negocio y puntaje de preparación"},{"src":"/market/static/products/anuncios-infinitos/screen-2.webp","alt":"Entregables de Anuncios Infinitos: carpetas de prompts por categoría, estrategia y plan"}]')
    UNION ALL
    SELECT value, 1, CAST(key AS INTEGER) FROM json_each(products.images)
    ORDER BY g, k
  )
)
WHERE slug = 'anuncios-infinitos' AND json_valid(images) AND instr(images, '/market/static/products/anuncios-infinitos/cover.webp') = 0;
UPDATE products SET images = (
  SELECT json_group_array(json(v)) FROM (
    SELECT value AS v, 0 AS g, CAST(key AS INTEGER) AS k FROM json_each('[{"src":"/market/static/products/specreel/cover.webp","alt":"SpecReel: pide un video a tu agente y recibe un MP4 3D narrado, compatible con Claude Code y Codex"},{"src":"/market/static/products/specreel/screen-1.webp","alt":"SpecReel: 16 movimientos de cámara y 8 transiciones anclados a cada palabra"},{"src":"/market/static/products/specreel/screen-2.webp","alt":"SpecReel: kit de marca y salida en 9:16, 1:1, 4:5 y 16:9"}]')
    UNION ALL
    SELECT value, 1, CAST(key AS INTEGER) FROM json_each(products.images)
    ORDER BY g, k
  )
)
WHERE slug = 'specreel' AND json_valid(images) AND instr(images, '/market/static/products/specreel/cover.webp') = 0;

INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description, highlights, specs, faq, availability)
VALUES ('8b3c5d7e-2f40-4b6c-9d8e-0f1a2b3c4d01', 'cutpilot', 'CutPilot: edita videos con Claude Code y Codex', 'Skill para Claude Code y Codex que edita tus grabaciones: quita silencios y muletillas, agrega subtítulos y saca reels verticales. Próximamente.', 'CutPilot es una skill para Claude Code y Codex que edita tus grabaciones por ti. Le pasas el video crudo y tu agente lo transcribe palabra por palabra, propone los cortes, agrega subtítulos y te entrega el video final y los reels verticales.

## Lo que hará

- Quitar silencios, muletillas y tomas repetidas, con tu aprobación antes del render.
- Subtítulos animados en tu estilo, quemados en el video y en archivo .srt.
- Reels verticales 9:16 con el encuadre centrado en quien habla.
- Capítulos, título y descripción para YouTube.
- Todo local con ffmpeg y Whisper: sin créditos por minuto y sin subir tus videos a otra plataforma.

## Cómo editar videos con Claude Code, en 3 pasos

- Abres tu agente en la carpeta del video y le pides: edita grabacion.mp4.
- Revisas la lista de cortes y el estilo de subtítulos que te propone.
- Apruebas y recibes el video editado, los reels y los textos.

## Para quién es

Creadores, coaches, agencias y equipos de marketing que graban mucho y editan poco: tutoriales, podcasts, clases, webinars y videos para redes.

## Importante

Producto en desarrollo: las funciones y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis y no te compromete a comprar.', 2990, 'usd', 'paid', '[{"src":"/market/static/products/cutpilot/cover.webp","alt":"CutPilot: edita videos con Claude Code — editor con cortes, subtítulos y reel vertical"},{"src":"/market/static/products/cutpilot/screen-1.webp","alt":"CutPilot: de 18 minutos de grabación cruda a 11 minutos editados"},{"src":"/market/static/products/cutpilot/screen-2.webp","alt":"CutPilot: video largo, 5 reels verticales, capítulos y subtítulos desde una grabación"}]', NULL, NULL, 5, 1, 50, 1793448000000, 1793448000000, 'Le pasas tu grabación cruda; tu agente te devuelve el video editado, los subtítulos y los reels.', 'video', '["editar videos con Claude","editar videos con IA","Claude Code video","cortar silencios automáticamente","subtítulos automáticos","reels verticales con IA"]', '', '#9b5cff', 'Edita videos con Claude Code y Codex — CutPilot', '¿Quieres editar videos con Claude? CutPilot es una skill para Claude Code y Codex que quita silencios, agrega subtítulos y crea reels verticales desde tu grabación. Únete a la lista de espera.', '["Quita silencios, muletillas y tomas repetidas, con tu aprobación antes del render","Subtítulos animados en tu estilo, en el video y en archivo .srt","Reels verticales 9:16 con el encuadre centrado en quien habla","Capítulos, título y descripción para YouTube","Todo local con ffmpeg y Whisper: sin créditos por minuto"]', '[{"label":"Estado","value":"En desarrollo — lista de espera abierta"},{"label":"Funcionará con","value":"Claude Code y Codex"},{"label":"Motor","value":"ffmpeg y Whisper, en tu computador"},{"label":"Salida prevista","value":"MP4 editado, reels 9:16, .srt y textos para YouTube"}]', '[{"q":"¿Se puede editar videos con Claude?","a":"Sí. Claude Code y Codex pueden manejar herramientas como ffmpeg y Whisper desde tu computador. CutPilot les da el método: transcribir, proponer cortes, subtitular y exportar."},{"q":"¿Cuándo sale?","a":"Está en desarrollo. Si te unes a la lista de espera te escribimos el día del lanzamiento."},{"q":"¿Tengo que pagar para unirme a la lista?","a":"No. Solo dejas tu correo y te avisamos. No hay compromiso de compra."}]', 'coming_soon')
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description, highlights, specs, faq, availability)
VALUES ('8b3c5d7e-2f40-4b6c-9d8e-0f1a2b3c4d02', 'kit-n8n-agentes-ia', 'Kit n8n de Agentes IA: 12 automatizaciones para captar y atender clientes', '12 flujos de n8n con IA listos para importar: agente de WhatsApp que agenda, leads de Google Maps y Meta Ads, pagos de Stripe al CRM y más. Próximamente.', 'El Kit n8n de Agentes IA reúne 12 automatizaciones probadas para captar y atender clientes con inteligencia artificial. Importas el archivo, conectas tus cuentas siguiendo la video-guía y lo pones a trabajar.

## Los flujos

- Agente de WhatsApp que responde, califica y agenda citas.
- Leads desde Google Maps para prospección.
- Leads de Meta Ads con respuesta en menos de un minuto.
- Pagos de Stripe y PayPal a tu CRM por webhook.
- Formulario a seguimiento automático.
- Pedido de reseñas después de la venta.
- Noticias por RSS a Google Sheets.
- Notas de voz convertidas en tareas.
- Respuestas de correo con IA.
- Recuperación de carritos y citas perdidas.
- Reporte semanal automático.
- Onboarding de clientes.

## Para quién es

Dueños de negocio, agencias y freelancers que ya usan o quieren usar n8n y no quieren armar cada flujo desde cero.

## Importante

Producto en desarrollo: la lista de flujos y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis.', 4700, 'usd', 'paid', '[{"src":"/market/static/products/kit-n8n-agentes-ia/cover.webp","alt":"Kit n8n de Agentes IA: flujo de WhatsApp con agente de IA que agenda citas"},{"src":"/market/static/products/kit-n8n-agentes-ia/screen-1.webp","alt":"Los 12 flujos de n8n incluidos en el kit"},{"src":"/market/static/products/kit-n8n-agentes-ia/screen-2.webp","alt":"Flujo de n8n: del lead de Meta Ads a la cita agendada"}]', NULL, NULL, 5, 1, 60, 1793448000000, 1793448000000, 'Importas el flujo, conectas tus cuentas y tienes un agente que capta, responde y da seguimiento.', 'automatizacion', '["plantillas n8n","automatizaciones n8n","agente de IA para WhatsApp","n8n WhatsApp","n8n HighLevel","workflows n8n en español"]', '', '#ff6d5a', '12 plantillas de n8n con IA para captar y atender clientes', 'Kit de 12 automatizaciones de n8n con IA listas para importar: agente de WhatsApp que agenda citas, leads de Google Maps y Meta Ads, webhooks de Stripe al CRM. En español. Lista de espera abierta.', '["Agente de WhatsApp que responde, califica y agenda en tu calendario","Leads desde Google Maps, formularios y Meta Ads directo a tu CRM","Pagos de Stripe y PayPal a tu CRM por webhook","Seguimiento, reseñas y reactivación automáticos","Video-guía en español para cada flujo"]', '[{"label":"Estado","value":"En desarrollo — lista de espera abierta"},{"label":"Contenido previsto","value":"12 workflows .json + 12 video-guías"},{"label":"Funcionará con","value":"n8n (nube o autoalojado)"},{"label":"Integraciones","value":"WhatsApp, HighLevel, Google Sheets, Google Calendar, Stripe, Meta Ads"}]', '[{"q":"¿Sirve con n8n en la nube y autoalojado?","a":"Sí, esa es la idea: los flujos se importan en cualquier instalación de n8n reciente."},{"q":"¿Cuándo sale?","a":"Está en desarrollo. Únete a la lista de espera y te avisamos el día del lanzamiento."},{"q":"¿Tengo que pagar para unirme a la lista?","a":"No. Solo dejas tu correo; no hay compromiso de compra."}]', 'coming_soon')
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description, highlights, specs, faq, availability)
VALUES ('8b3c5d7e-2f40-4b6c-9d8e-0f1a2b3c4d03', 'carruseles-infinitos', 'Carruseles Infinitos: crea carruseles de Instagram y LinkedIn con Claude', 'Skill para Claude Code y Codex que escribe, diseña y exporta carruseles de Instagram y LinkedIn en tu estilo. De la familia de Anuncios Infinitos. Próximamente.', 'Carruseles Infinitos es una skill para Claude Code y Codex que convierte un tema en un carrusel completo para Instagram o LinkedIn: escribe el gancho, desarrolla las ideas, cierra con un llamado a la acción y lo diseña con tu marca.

## Lo que hará

- Escribir carruseles de 5 a 10 slides en tu tono de marca.
- Diseñarlos en 8 estilos con tus colores y tu logo.
- Exportar PNG 1080×1350 y un PDF listo para LinkedIn.
- Escribir el texto del post que acompaña al carrusel.

## Para quién es

Marcas personales, creadores y agencias que publican seguido en Instagram y LinkedIn y quieren producir más sin perder su estilo.

## Importante

Producto en desarrollo: las funciones y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis.', 1990, 'usd', 'paid', '[{"src":"/market/static/products/carruseles-infinitos/cover.webp","alt":"Carruseles Infinitos: carruseles de Instagram y LinkedIn hechos por tu agente"},{"src":"/market/static/products/carruseles-infinitos/screen-1.webp","alt":"Carruseles Infinitos: un tema, diez slides listos para exportar"},{"src":"/market/static/products/carruseles-infinitos/screen-2.webp","alt":"Carruseles Infinitos: ocho estilos de diseño"}]', NULL, NULL, 5, 1, 70, 1793448000000, 1793448000000, 'Tú das el tema; tu agente escribe, diseña y exporta el carrusel en tu estilo.', 'contenido', '["carruseles con IA","carruseles de Instagram","carruseles de LinkedIn","crear carruseles con Claude","contenido para redes con IA"]', '', '#ff3d8b', 'Crea carruseles de Instagram y LinkedIn con Claude', 'Carruseles Infinitos: skill para Claude Code y Codex que escribe, diseña y exporta carruseles de Instagram y LinkedIn en tu estilo, en PNG y PDF. Únete a la lista de espera.', '["Gancho, desarrollo y cierre con llamado a la acción, en tu tono de marca","8 estilos de diseño con tus colores y tu logo","Exporta PNG 1080×1350 y PDF listo para LinkedIn","Escribe también el texto del post","Todo en español"]', '[{"label":"Estado","value":"En desarrollo — lista de espera abierta"},{"label":"Funcionará con","value":"Claude Code y Codex"},{"label":"Formatos previstos","value":"4:5, 1:1 y 9:16 · PNG y PDF"},{"label":"Idioma","value":"Español"}]', '[{"q":"¿En qué se diferencia de una plantilla de Canva?","a":"El agente escribe el contenido a partir de tu tema y lo diseña con tu marca; no partes de una plantilla en blanco."},{"q":"¿Cuándo sale?","a":"Está en desarrollo. Únete a la lista de espera y te avisamos el día del lanzamiento."},{"q":"¿Tengo que pagar para unirme a la lista?","a":"No. Solo dejas tu correo; no hay compromiso de compra."}]', 'coming_soon')
ON CONFLICT(slug) DO NOTHING;
