-- Market Tony — rebranding de «SpecReel Stick» (pedido del dueño, 2026-11-01): producto nuevo «Stick Sketch» con
-- slug nuevo (stick-sketch), ficha y portadas nuevas y precio fijo de USD 36.90. Escrita a mano (los textos se
-- pasaron a SQL una vez con un script desechable: edítala como SQL).
--
--   1. Crea stick-sketch. No tiene ventas, reseñas ni precio anterior: sales_offset = 0, compare_at_cents = NULL (nada
--      tachado: USD 36.90 nunca se cobró; la oferta vendrá cuando ese precio haya estado vigente de verdad).
--      El archivo NO se vuelve a subir: file_key, file_name y file_size se copian de specreel-stick tal como estén en
--      la base (mismo ZIP, mismo SHA-256 de provision/manifest.json). Sin archivo, entra como «Próximamente».
--      «Funciona con» (compat), orden del catálogo y límite de descargas también se copian del producto viejo.
--   2. Retira specreel-stick con active = 0 (no se borra: conserva sus pedidos y su lista de espera). Su ficha
--      (/market/producto/specreel-stick y /market/en/product/specreel-stick) responde 301 a la nueva en el mismo
--      idioma: RENAMED_PRODUCTS en src/lib/catalog.ts.
--
-- Guardas: el INSERT solo corre si stick-sketch no existe (no pisa lo que el dueño edite después en /market/admin) y
-- el viejo solo se retira si el nuevo quedó activo y con el MISMO archivo (nunca se cambia un producto a la venta por
-- uno sin archivo). Idempotente. Sin LIKE (límite de D1).
--
-- Dentro del ZIP el producto sigue llamándose SpecReel Stick (README, carpeta skills/specreel-stick): la ficha lo dice
-- en la descripción y en la FAQ, como Edit Pro (CutPilot) y Creative Factory en la 0010.
-- Nombre: «Stick Sketch» no coincide con ninguna app o software publicado (búsqueda web del 2026-11-01; sí existen
-- «Stick Studio», «Stick Animator», «StickMotion Animation» y «StickReel», que se descartaron por eso).
-- Palabras clave: ES «videos de muñequitos de palo con IA» (+ «videos de palitos animados», de la 0013);
-- EN «AI stick figure animation».

-- ── 1. Producto nuevo: stick-sketch ────────────────────────────────────────────────────────────────────────────
INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, file_size,
	download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description,
	highlights, specs, faq, video_id, compare_at_cents, availability, sales_offset, price_mode, min_price_cents, max_price_cents, compat, i18n)
SELECT
	'5ca040ba-c0a1-4aaa-94aa-f17b84142b4d',
	'stick-sketch',
	'Stick Sketch: videos de muñequitos de palo con IA para Reels y TikTok',
	'Skill para Claude Code y Codex que convierte una idea en un video corto de muñequitos de palo: dos personajes, una comparación y un número final. Entrega un MP4 con subtítulos y música.',
	'¿Quieres publicar Reels o TikToks de hábitos, dinero o mentalidad sin grabarte en cámara? Stick Sketch convierte una idea en un video corto de muñequitos de palo. Le cuentas a Claude Code o a Codex algo como «uno ahorra y el otro gasta» o «1 % mejor cada día», y tu agente escribe las líneas, anima a dos personajes (el protagonista, con sombrero) sobre un escenario limpio, agrega el contador y el número final, mezcla música y efectos, y te entrega un MP4 con subtítulos. Todo corre en tu computador.

En el ZIP la skill se llama SpecReel Stick: ese nombre verás en el README, en la carpeta skills/specreel-stick y al pedirle el video a tu agente («Usa la skill specreel-stick…»).

## El problema que resuelve

Un video de contraste («el que empieza vs. el que espera») parece simple, pero hacerlo cuesta: o te grabas, o armas a mano cada pieza de un sketch de 15 segundos (guion, animación, tiempos de los subtítulos, música y efectos). Stick Sketch le da a tu agente el método y el motor para armarlas por ti. Primero escribe el brief, la spec, el guion y el storyboard; te pide tu aprobación y solo entonces anima. Mientras construye, renderiza fotogramas de prueba, los mira y los corrige antes del render final.

## Cómo funciona, en 3 pasos

- Abres Claude Code o Codex en una carpeta vacía y le cuentas la idea: quién hace qué, quién no y cuál es el remate.
- Apruebas el guion y el storyboard (punto de control A) y después la hoja de fotogramas (punto de control B). En modo supervisado, nada se anima sin tu visto bueno.
- Recibes el MP4, el archivo .srt, la portada, los créditos y un reporte técnico del render.

## Qué recibes

- La skill (en el ZIP, SpecReel Stick), con sus instrucciones, referencias y plantillas de especificación.
- Un motor de animación 3D (three.js) con muñequitos con sombrero (bombín, chistera, gorra o gorro de lana), 23 poses, gestos por capas, caminatas, carreras y saltos.
- Escenario con reflejo y sombras, utilería (escalones que crecen, banco, caja y teléfono), bocadillos, nubes de pensamiento, emotes y etiquetas.
- Diseño Reel/Story con titular arriba y subtítulos karaoke abajo, estilo noir por defecto o tu kit de marca (desde tu logo, tus colores HEX o 25 paletas inspiradas en marcas conocidas, con contraste revisado).
- Música y efectos generados por código, mezclados a −14 LUFS.
- Un sketch de ejemplo listo para editar («1 % mejor cada día»), con su video de muestra.
- Instalador y diagnóstico (Doctor) para Windows, macOS y Linux, y guías en español e inglés.

## Para quién es

Creadores y marcas que publican Reels, TikTok o Shorts sobre hábitos, productividad, dinero o mentalidad y quieren piezas cortas con un contraste claro entre dos personajes, sin grabarse en cámara.

## Requisitos

- Claude Code o Codex, con tu propia cuenta (no incluidos).
- Node 20+, Python 3.10+, ffmpeg y Playwright Chromium. El instalador incluido revisa qué falta y lo instala (con winget, brew, apt, dnf o pacman); la instalación automática también descarga una voz local de unos 350 MB.
- Windows 10/11, macOS 12+ o Linux. Funciona con o sin GPU; sin GPU el render es más lento.

## Importante

- No convierte fotos ni personas en muñecos de palitos. Los personajes son figuras genéricas creadas por código; puedes cambiar su sombrero, sus colores y sus movimientos, pero no copiar el aspecto de alguien.
- Está pensado para sketches de 12 a 30 segundos con dos personajes y una comparación. Las historias nuevas las programa tu agente sobre el sketch de ejemplo, así que el resultado depende de tu agente y de tus indicaciones.
- Los personajes no tienen boca: hablan con bocadillos y subtítulos.
- La música es sintetizada por código, no una biblioteca de canciones.
- Las voces en la nube (ElevenLabs, Fish Audio) se pagan aparte, y algunos modelos de voz locales no permiten uso comercial.
- Es la versión 1.0 e incluye un sketch de ejemplo.',
	3690, 'usd', 'paid',
	'[{"src":"/market/static/products/stick-sketch/cover.webp","alt":"Stick Sketch: tres escenas reales de videos de muñequitos de palo hechas con el motor incluido"},{"src":"/market/static/products/stick-sketch/screen-1.webp","alt":"Cómo funciona Stick Sketch: apruebas guion y fotogramas, y recibes el MP4 de un sketch de 4 líneas"},{"src":"/market/static/products/stick-sketch/screen-2.webp","alt":"Fotograma real anotado: contador, número final, protagonista con sombrero, escalones, emotes y subtítulos"}]',
	old.file_key, old.file_name, old.file_size,
	COALESCE(old.download_limit, 5),
	1,
	COALESCE(old.sort_order, 8),
	1793664000000, 1793664000000,
	'Sin grabarte en cámara: cuentas la idea y tu agente la anima en MP4',
	'video',
	'["videos de muñequitos de palo con IA","videos de palitos animados","animaciones de palitos","stickman con IA","sketches animados para Reels y TikTok","videos con Claude Code y Codex","videos sin voz con subtítulos"]',
	'Versión 1.0',
	'#e63946',
	'Stick Sketch: videos de muñequitos de palo con IA',
	'Videos de muñequitos de palo con IA: una skill para Claude Code y Codex anima tu idea en un sketch MP4 con subtítulos, música y efectos. En tu PC.',
	'["Sketches de 12 a 30 s para Reels, TikTok y Shorts: dos personajes, una comparación y un número final","Modo supervisado: apruebas el guion antes de animar y los fotogramas antes del render final","Muñequitos 3D con sombrero (bombín, chistera, gorra o gorro), 23 poses, caminatas, carreras y saltos","Sin voz por defecto: subtítulos karaoke, archivo .srt, y música y efectos generados por código","Estilo noir (negro con un acento rojo) o tu kit de marca desde tu logo o tus colores HEX","9:16, 1:1, 4:5 y 16:9 — Windows, macOS y Linux, con o sin GPU"]',
	'[{"label":"Versión","value":"1.0"},{"label":"Formato","value":"ZIP con la skill (SpecReel Stick), el motor de animación, un sketch de ejemplo y guías"},{"label":"Funciona con","value":"Claude Code y Codex (no incluidos)"},{"label":"Requisitos","value":"Node 20+, Python 3.10+, ffmpeg y Playwright Chromium (el instalador revisa lo que falta)"},{"label":"Sistemas","value":"Windows 10/11, macOS 12+ y Linux, con o sin GPU"},{"label":"Salida","value":"MP4 H.264 (30 fps por defecto) en 9:16, 1:1, 4:5 o 16:9, con .srt y portada"},{"label":"Idioma","value":"Subtítulos en el idioma que pidas; guías en español e inglés; ejemplo en español"},{"label":"Licencia","value":"1 creador: uso comercial de tus videos, propios o para clientes; actualizaciones 1.x gratis"}]',
	'[{"q":"¿Necesito saber programar?","a":"No para empezar. Le describes la idea a tu agente y él escribe y ajusta el código del sketch. Para instalarlo sí corres algunos comandos en la terminal."},{"q":"¿Necesito grabar mi voz?","a":"No. Por defecto el sketch va sin voz: los subtítulos cuentan la historia y la música marca el ritmo. Si quieres narrador, puedes usar una voz local o ElevenLabs o Fish Audio con tu propia cuenta."},{"q":"¿Convierte una foto mía en un muñeco de palitos?","a":"No. Los personajes son muñequitos genéricos dibujados por código: eliges su sombrero, sus colores y sus movimientos, pero no se parecen a una persona real. La única imagen que puedes darle es tu logo, para sacar la paleta de colores."},{"q":"¿En qué idiomas funciona?","a":"La skill escribe las líneas y los subtítulos en el idioma que le pidas, y sus guías vienen en español e inglés. El sketch de ejemplo incluido está en español."},{"q":"¿Cuánto cuesta cada video?","a":"Nada extra: todo corre en tu computador y la música y los efectos se generan por código. Solo pagas el uso de tu agente (Claude Code o Codex, con tu cuenta) y, si eliges una voz en la nube como ElevenLabs o Fish Audio, ese servicio."},{"q":"¿Puedo usar los videos comercialmente?","a":"Los videos que hagas son tuyos y puedes publicarlos en tu marca y tus canales, incluso monetizados, o hacerlos para clientes. Si agregas una voz, revisa su licencia: algunos modelos locales no permiten uso comercial y el Doctor te avisa."},{"q":"¿Necesito tener Motion 3D Video?","a":"No. Stick Sketch trae su propio motor y funciona solo. Motion 3D Video (la skill SpecReel) es otro producto, para videos explicativos 3D de productos, procesos o datos."},{"q":"¿Por qué el ZIP dice SpecReel Stick?","a":"Stick Sketch es el nombre en la tienda; por dentro la skill se llama SpecReel Stick. Ese nombre verás en el ZIP, en el README, en la carpeta skills/specreel-stick y al pedirle el video a tu agente. Es el mismo producto."}]',
	'',
	NULL,
	CASE WHEN old.file_key IS NULL THEN 'coming_soon' ELSE COALESCE(old.availability, 'coming_soon') END,
	0,
	'fixed', 0, NULL,
	CASE WHEN json_valid(old.compat) AND json_type(old.compat, '$.works') = 'array' THEN old.compat ELSE '{"works":["claude-code","codex","python","node","ffmpeg","windows","macos","linux"],"includes":[]}' END,
	json('{"en":{"title":"Stick Sketch: AI stick figure animation videos with Claude Code","tagline":"No filming: tell your agent the idea and get a stick figure video MP4","summary":"Claude Code and Codex skill that turns an idea into a short stick figure video: two characters, a contrast and a payoff number. It delivers an MP4 with captions and music.","meta_title":"Stick Sketch: AI stick figure animation with Claude Code","meta_description":"AI stick figure animation: a Claude Code and Codex skill turns your idea into a stick figure skit MP4 with captions, music and effects. Runs on your PC.","description":"Want to post Reels or TikToks about habits, money or mindset without filming yourself? Stick Sketch turns an idea into a short stick figure video. You tell Claude Code or Codex something like \"one saves, the other spends\" or \"1% better every day\", and your agent writes the lines, animates two characters (the hero wears a hat) on a clean stage, adds the counter and the payoff number, mixes music and effects, and delivers an MP4 with captions. It all runs on your computer.\n\nInside the ZIP the skill is called SpecReel Stick: that is the name you will see in the README, in the skills/specreel-stick folder and when you ask your agent for a video (\"Use the specreel-stick skill…\").\n\n## The problem it solves\n\nA contrast video (\"the one who starts vs. the one who waits\") looks simple, but making one takes work: either you film yourself, or you build every part of a 15-second skit by hand (script, animation, caption timing, music and effects). Stick Sketch gives your agent the method and the engine to build them for you. First it writes the brief, the spec, the script and the storyboard; it asks for your approval and only then animates. While it builds, it renders test stills, looks at them and fixes them before the final render.\n\n## How it works, in 3 steps\n\n- Open Claude Code or Codex in an empty folder and tell it the idea: who does what, who doesn''t and what the punchline is.\n- Approve the script and the storyboard (checkpoint A) and then the stills sheet (checkpoint B). In supervised mode, nothing gets animated without your OK.\n- Get the MP4, the .srt file, the cover, the credits and a technical render report.\n\n## What you get\n\n- The skill (SpecReel Stick inside the ZIP), with its instructions, references and spec templates.\n- A 3D animation engine (three.js) with hat-wearing stick figures (bowler, top hat, cap or beanie), 23 poses, layered gestures, walks, runs and jumps.\n- A stage with reflection and shadows, props (growing steps, bench, box and phone), speech bubbles, thought clouds, emotes and tags.\n- Reel/Story layout with a headline on top and karaoke captions below, noir style by default or your brand kit (from your logo, your HEX colors or 25 palettes inspired by well-known brands, with contrast checks).\n- Music and effects generated by code, mixed at −14 LUFS.\n- An example skit ready to edit (\"1% better every day\", in Spanish), with its sample video.\n- Installer and diagnostics (Doctor) for Windows, macOS and Linux, and guides in English and Spanish.\n\n## Who it is for\n\nCreators and brands that post Reels, TikToks or Shorts about habits, productivity, money or mindset and want short pieces with a clear contrast between two characters, without filming themselves.\n\n## Requirements\n\n- Claude Code or Codex, with your own account (not included).\n- Node 20+, Python 3.10+, ffmpeg and Playwright Chromium. The included installer checks what is missing and installs it (with winget, brew, apt, dnf or pacman); the automatic install also downloads a local voice of about 350 MB.\n- Windows 10/11, macOS 12+ or Linux. Works with or without a GPU; without a GPU rendering is slower.\n\n## Important\n\n- It does not turn photos or people into stick figures. The characters are generic figures created by code; you can change their hat, colors and moves, but not copy someone''s look.\n- It is designed for 12- to 30-second skits with two characters and a contrast. New stories are coded by your agent on top of the example skit, so the result depends on your agent and your instructions.\n- The characters have no mouths: they talk with speech bubbles and captions.\n- The music is synthesized by code, not a song library.\n- Cloud voices (ElevenLabs, Fish Audio) are paid separately, and some local voice models do not allow commercial use.\n- The skill writes the lines and captions in the language you ask for; the included example skit is in Spanish.\n- This is version 1.0 and it includes one example skit.","highlights":["12- to 30-second skits for Reels, TikTok and Shorts: two characters, a contrast and a payoff number","Supervised mode: you approve the script before animating and the stills before the final render","3D stick figures with hats (bowler, top hat, cap or beanie), 23 poses, walks, runs and jumps","Silent by default: karaoke captions, an .srt file, and music and effects generated by code","Noir style (black with one red accent) or your brand kit from your logo or HEX colors","9:16, 1:1, 4:5 and 16:9 — Windows, macOS and Linux, with or without a GPU"],"specs":[{"label":"Version","value":"1.0"},{"label":"Format","value":"ZIP with the skill (SpecReel Stick), the animation engine, an example skit and guides"},{"label":"Works with","value":"Claude Code and Codex (not included)"},{"label":"Requirements","value":"Node 20+, Python 3.10+, ffmpeg and Playwright Chromium (the installer checks what is missing)"},{"label":"Systems","value":"Windows 10/11, macOS 12+ and Linux, with or without a GPU"},{"label":"Output","value":"H.264 MP4 (30 fps by default) in 9:16, 1:1, 4:5 or 16:9, with .srt and a cover"},{"label":"Language","value":"Captions in the language you ask for; guides in English and Spanish; example in Spanish"},{"label":"License","value":"1 creator: commercial use of your videos, your own or for clients; free 1.x updates"}],"faq":[{"q":"Do I need to know how to code?","a":"Not to get started. You describe the idea to your agent and it writes and tweaks the skit''s code. To install it you do run a few commands in the terminal."},{"q":"Do I need to record my voice?","a":"No. By default the skit is silent: the captions tell the story and the music sets the rhythm. If you want a narrator, you can use a local voice, or ElevenLabs or Fish Audio with your own account."},{"q":"Can it turn a photo of me into a stick figure?","a":"No. The characters are generic stick figures drawn by code: you choose their hat, colors and moves, but they don''t look like a real person. The only image you can give it is your logo, to take the color palette from it."},{"q":"Which languages does it work in?","a":"The skill writes the lines and captions in the language you ask for; its guides are in English and Spanish. The included example skit is in Spanish."},{"q":"How much does each video cost?","a":"Nothing extra: everything runs on your computer and the music and effects are generated by code. You only pay for your agent (Claude Code or Codex, with your account) and, if you pick a cloud voice such as ElevenLabs or Fish Audio, that service."},{"q":"Can I use the videos commercially?","a":"The videos you make are yours and you can publish them on your brand and your channels, even monetized, or make them for clients. If you add a voice, check its license: some local models do not allow commercial use, and the Doctor warns you."},{"q":"Do I need Motion 3D Video?","a":"No. Stick Sketch has its own engine and works on its own. Motion 3D Video (the SpecReel skill) is a different product, for 3D explainer videos about products, processes or data."},{"q":"Why does the ZIP say SpecReel Stick?","a":"Stick Sketch is the name in the store; inside, the skill is called SpecReel Stick. That is the name you will see in the ZIP, in the README, in the skills/specreel-stick folder and when you ask your agent for a video. It is the same product."}],"tags":["AI stick figure animation","stickman animation AI","AI stick figure video generator","stick figure video maker","animated skits for TikTok and Reels","Claude Code video skill","silent videos with captions"],"image_alts":["Stick Sketch: three real scenes of stick figure videos made with the included engine","How Stick Sketch works: you approve the script and stills, and get the MP4 of a 4-line skit","Annotated real frame: counter, payoff number, hero with a hat, steps, emotes and captions"]}}')
FROM (SELECT 1) AS one
LEFT JOIN products AS old ON old.slug = 'specreel-stick'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'stick-sketch');

-- ── 2. Retirar specreel-stick (active = 0, sin borrar) ─────────────────────────────────────────────────────────
UPDATE products SET active = 0, updated_at = 1793664000000
WHERE slug = 'specreel-stick' AND active = 1
	AND EXISTS (SELECT 1 FROM products AS n WHERE n.slug = 'stick-sketch' AND n.active = 1 AND n.file_key IS products.file_key);
