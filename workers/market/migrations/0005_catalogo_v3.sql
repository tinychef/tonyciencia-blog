-- Market Tony v3 — productos nuevos (repos publicados), ficha de CutPilot con el motor real y título en español de SpecReel.
-- GENERADO por scripts/gen-catalog-v3-migration.mjs desde seed/catalog-v3.json. No editar a mano.
-- Seguro sobre datos reales: inserta con ON CONFLICT(slug) DO NOTHING, reescribe solo fichas «Próximamente» sin archivo
-- y cambia títulos solo si siguen siendo exactamente los anteriores. No toca precios de productos existentes ni archivos.

INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description, highlights, specs, faq, availability, price_mode, min_price_cents, max_price_cents)
VALUES ('9c4d6e8f-3a51-4c7d-8e9f-1a2b3c4d5e01', 'pagespeed-forensics', 'PageSpeed Forensics: skill de Claude Code para PageSpeed móvil', 'Skill para Claude Code con 11 scripts de Node.js que encuentran, con evidencia, por qué tu web no pasa de ~85–90 en PageSpeed móvil y prueban arreglos sin recompilar.', '## Qué es

PageSpeed Forensics es una skill para Claude Code (y cualquier agente que lea SKILL.md) para el último tramo del puntaje móvil en PageSpeed Insights y Lighthouse. Trae un método paso a paso, 6 guías técnicas y 11 scripts de Node.js sin dependencias, salvo sharp (opcional) para la comparación visual.

## Qué problema resuelve

Los consejos de siempre (comprimir imágenes, diferir JavaScript, precargar la imagen del LCP) suelen dejar una página cerca de 85. Los puntos que faltan en móvil se esconden donde esas listas no miran: cómo cruza el HTML la red, cuándo Chrome produce el primer cuadro y cómo el simulador de Lighthouse convierte una corrida en puntaje.

Si Lighthouse marca 100 en tu PC y PageSpeed marca 85, si la primera pintura sale 1–2 s tarde sin que nada la bloquee, o si el TBT viene casi todo del administrador de etiquetas, esta skill busca la causa y la demuestra con evidencia.

## Cómo funciona en 3 pasos

- Lee el informe real: psi-report guarda de pagespeed.web.dev los puntajes, las métricas, las auditorías con sus tablas, el entorno de prueba, la captura final y la tira de cuadros, sin llave de API.
- Reproduce PageSpeed en tu computador: un proxy local agrega latencia y tiempo de servidor, y entrega el HTML en tandas tipo arranque lento de TCP. Corres Lighthouse 3–5 veces por variante y comparas medianas de métricas simuladas y observadas.
- Prueba y verifica: el proxy aplica arreglos sin recompilar (CSS en línea, sin precarga de fuentes o imágenes, content-visibility o CSS propio). Antes de pasar nada al código comparas capturas en gris con desenfoque y revisas anclas, elementos fixed y la altura de la página.

## Qué recibes

- SKILL.md: el método en 6 pasos, una tabla síntoma → causa y una plantilla de informe (hallazgo, evidencia, causa, arreglo, riesgo, cómo revertir y si requiere decisión del dueño)
- 6 guías: congelamiento del primer cuadro, primera tanda TCP (initcwnd), arreglos del camino de render y sus trampas, particularidades de Lighthouse y PageSpeed, etiquetas de terceros y verificación
- 11 scripts: flight-proxy, burst-timing, lh-runs, lh-summary, trace-milestones, main-thread-per-second, trace-first-frame, psi-report, screens, visual-diff y section-heights
- README en español e inglés y archivo de licencia

## Para quién es

- Desarrolladores y agencias con sitios que no pasan de ~85–90 en móvil después de aplicar los consejos típicos
- Equipos con landing pages en Next.js o React (las guías traen notas específicas de Next.js)
- Quien necesita explicar con datos por qué PageSpeed y su computador no dan el mismo puntaje

## Requisitos

- Node.js 22 o superior
- Google Chrome o Chromium (o la variable CHROME_PATH)
- Internet para Lighthouse (se ejecuta con npx, sin instalar) y para leer PageSpeed
- sharp, solo para la comparación visual (npm i -D sharp)
- Un build de producción de tu sitio servido por HTTP en tu computador, para el laboratorio
- Claude Code u otro agente que lea SKILL.md (o correr los scripts a mano)

## Notas importantes

- No garantiza un puntaje: encuentra causas y mide cada cambio con medianas. El resultado depende de tu sitio y de lo que decidas cambiar.
- Algunos arreglos son decisiones de negocio (diferir la analítica, cambiar el servidor o poner un CDN): la skill te muestra el costo y la decisión es tuya.
- Los datos de campo de CrUX tardan 28 días en reflejar un cambio.
- La skill, las guías y la salida de los scripts están en inglés; el README está en español e inglés.
- psi-report lee la página web de PageSpeed: si Google cambia su diseño, ese script puede dejar de funcionar.
- Ampliar la ventana TCP inicial del servidor requiere acceso de administrador a un servidor Linux, o un CDN.
- Producto independiente, sin afiliación con Google. PageSpeed Insights, Lighthouse y Chrome son marcas de Google.', 900, 'usd', 'paid', '[{"src":"/market/static/products/pagespeed-forensics/cover.webp","alt":"PageSpeed Forensics: traza que muestra 2067 ms sin cuadros antes de la primera pintura, marcada FROZEN"},{"src":"/market/static/products/pagespeed-forensics/screen-1.webp","alt":"Método de PageSpeed Forensics en 6 pasos con sus scripts y la plantilla de informe"},{"src":"/market/static/products/pagespeed-forensics/screen-2.webp","alt":"burst-timing: el <head> no cabe en la primera tanda TCP, y los 6 modos del proxy para probar arreglos"}]', NULL, NULL, 10, 1, 12, 1793534400000, 1793534400000, 'Descubre con evidencia por qué tu web saca 85 en PageSpeed móvil y 100 en tu PC, y prueba arreglos sin recompilar.', 'seo-web', '["mejorar PageSpeed móvil","optimizar Core Web Vitals","subir puntaje de Lighthouse","LCP y FCP lentos en móvil","skill para Claude Code","auditoría de rendimiento web","optimizar Next.js para PageSpeed"]', '', '#0cce6b', 'PageSpeed Forensics: skill de Claude Code para PageSpeed', 'Skill para Claude Code que encuentra con evidencia por qué tu web no pasa de 85–90 en PageSpeed móvil: red de laboratorio, trazas, Lighthouse y prueba visual.', '["Laboratorio que imita la red de PageSpeed: latencia, tiempo de servidor y HTML en tandas tipo arranque lento de TCP","Detecta el «congelamiento del primer cuadro»: huecos sin cuadros antes de la primera pintura, marcados FROZEN en la traza","Mide la primera tanda TCP de tu servidor (initcwnd) en conexiones nuevas y abiertas, y te dice si tu <head> cabe","Prueba arreglos sin recompilar: CSS en línea, sin precarga de fuentes o imágenes, content-visibility o CSS propio","Medianas de 3–5 corridas de Lighthouse con métricas simuladas y observadas, elemento LCP y sus partes","Verificación visual en gris con desenfoque, más revisión de anclas, elementos fixed y altura de la página"]', '[{"label":"Formato","value":"ZIP con la skill (SKILL.md), 11 scripts de Node.js, 6 guías técnicas, README y licencia"},{"label":"Funciona con","value":"Claude Code u otro agente que lea SKILL.md; los scripts también corren solos en la terminal"},{"label":"Requisitos","value":"Node.js 22+, Google Chrome o Chromium e internet; sharp solo para la comparación visual"},{"label":"Sistemas","value":"Windows, macOS y Linux (rutas de Chrome previstas para los tres)"},{"label":"Salida","value":"JSON de Lighthouse y PageSpeed, trazas, capturas PNG y resúmenes en la terminal"},{"label":"Idioma","value":"README en español e inglés; skill, guías y salida de los scripts en inglés"},{"label":"Licencia","value":"MIT (archivo LICENSE incluido)"}]', '[{"q":"¿Necesito una llave de API de Google PageSpeed?","a":"No. El script psi-report abre pagespeed.web.dev en Chrome sin interfaz y guarda puntajes, métricas, auditorías, el entorno de prueba y la tira de cuadros. Como lee la página web, si Google cambia su diseño ese script puede dejar de funcionar."},{"q":"¿Garantiza 100 en PageSpeed?","a":"No. Encuentra las causas y mide cada cambio con la mediana de varias corridas. El resultado depende de tu sitio y de lo que decidas cambiar; algunos arreglos (diferir la analítica, tocar el servidor o poner un CDN) son decisiones tuyas, y los datos de campo de CrUX tardan 28 días en moverse."},{"q":"¿Sirve solo para Next.js?","a":"No. Los scripts trabajan con cualquier sitio que entregue HTML: el laboratorio necesita un build de producción servido por HTTP en tu computador y la medición de red, un sitio en HTTPS. Las guías traen notas específicas solo para Next.js; para otros stacks, el consejo es general."},{"q":"¿Necesito Claude Code?","a":"Está hecha como skill para Claude Code y para cualquier agente que lea SKILL.md. Los 11 scripts también se pueden correr a mano con Node.js desde la terminal, siguiendo el README."},{"q":"¿Está en español?","a":"El README está en español e inglés. La skill, las 6 guías y la salida de los scripts están en inglés."},{"q":"¿Cuánto cuesta?","a":"Tú eliges: es «paga lo que quieras». Escribe 0 para descargarla gratis o apoya el proyecto con el monto que quieras; con tarjeta, desde $0.50 USD."}]', 'coming_soon', 'pwyw', 0, NULL)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description, highlights, specs, faq, availability, price_mode, min_price_cents, max_price_cents)
VALUES ('9c4d6e8f-3a51-4c7d-8e9f-1a2b3c4d5e02', 'specreel-stick', 'SpecReel Stick: videos de muñequitos de palo con Claude Code y Codex', 'Skill para Claude Code y Codex que convierte una idea en un sketch corto con muñequitos de palo: dos personajes, una comparación y un número final. Entrega un MP4 con subtítulos y música.', 'SpecReel Stick es una skill para Claude Code y Codex que hace sketches cortos con muñequitos de palo. Le das una idea del tipo «uno ahorra y el otro gasta» o «1 % mejor cada día» y tu agente escribe las líneas, anima a dos personajes (el protagonista, con sombrero) sobre un escenario limpio, agrega el contador y el número final, mezcla música y efectos, y te entrega un MP4 con subtítulos. Todo corre en tu computador.

## Qué problema resuelve

Un sketch animado de 15 segundos tiene muchas piezas: guion, animación, tiempos de los subtítulos, música y efectos. SpecReel Stick le da a tu agente un método y un motor para armarlas: primero escribe el brief, la spec, el guion y el storyboard, te pide tu aprobación y solo entonces anima. Mientras construye, renderiza fotogramas de prueba, los mira y los corrige antes del render final.

## Cómo funciona, en 3 pasos

- Abres Claude Code o Codex en una carpeta vacía y le cuentas la idea: quién hace qué, quién no y cuál es el remate.
- Revisas el guion y el storyboard (punto de control A) y luego la hoja de fotogramas (punto de control B).
- Recibes el MP4, el archivo .srt, la portada, los créditos y un reporte técnico del render.

## Qué recibes

- La skill SpecReel Stick, con sus instrucciones, referencias y plantillas de especificación.
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
- Es la versión 1.0 e incluye un sketch de ejemplo.', 1200, 'usd', 'paid', '[{"src":"/market/static/products/specreel-stick/cover.webp","alt":"SpecReel Stick: tres fotogramas reales de un sketch de muñequitos de palo en formato vertical 9:16"},{"src":"/market/static/products/specreel-stick/screen-1.webp","alt":"Cómo funciona SpecReel Stick: apruebas guion y fotogramas, y recibes el MP4 de un sketch de 4 líneas"},{"src":"/market/static/products/specreel-stick/screen-2.webp","alt":"Fotograma real anotado: contador, número final, protagonista con sombrero, escalones, emotes y subtítulos"}]', NULL, NULL, 5, 1, 8, 1793534400000, 1793534400000, 'Le cuentas la idea a tu agente y te devuelve un sketch de muñequitos de palo en MP4, con subtítulos, música y efectos.', 'video', '["videos de muñequitos de palo","animación de stick figures","videos con Claude Code","videos con Codex","reels animados de hábitos","videos sin voz con subtítulos","sketches animados para TikTok"]', 'Versión 1.0', '#e63946', 'Videos de muñequitos de palo con Claude Code y Codex', 'SpecReel Stick: skill para Claude Code y Codex que crea sketches de muñequitos de palo en MP4, con subtítulos, música y efectos. Corre en tu computador.', '["Sketches de 12 a 30 s: dos personajes, una comparación, un contador y un número final","Muñequitos 3D con sombrero (bombín, chistera, gorra o gorro), 23 poses, caminatas, carreras y saltos","Bocadillos, nubes de pensamiento, 6 emotes y utilería: escalones que crecen, banco, caja y teléfono","Sin voz por defecto: subtítulos karaoke, archivo .srt, música y efectos generados por código","Estilo noir (negro con un acento rojo) o tu kit de marca desde tu logo o tus colores HEX","9:16, 1:1, 4:5 y 16:9 — Windows, macOS y Linux, con o sin GPU"]', '[{"label":"Versión","value":"1.0"},{"label":"Formato","value":"ZIP con la skill, el motor de animación, un sketch de ejemplo y guías"},{"label":"Funciona con","value":"Claude Code y Codex (no incluidos)"},{"label":"Requisitos","value":"Node 20+, Python 3.10+, ffmpeg y Playwright Chromium"},{"label":"Sistemas","value":"Windows 10/11, macOS 12+ y Linux"},{"label":"Salida","value":"MP4 H.264 (30 fps por defecto) en 9:16, 1:1, 4:5 o 16:9, con .srt y portada"},{"label":"Licencia","value":"1 creador: uso comercial de tus videos, propios o para clientes; actualizaciones 1.x gratis"}]', '[{"q":"¿Convierte una foto mía en un muñeco de palitos?","a":"No. Los personajes son muñequitos genéricos dibujados por código: eliges su sombrero, sus colores y sus movimientos, pero no se parecen a una persona real. La única imagen que puedes darle es tu logo, para sacar la paleta de colores."},{"q":"¿Necesito saber programar?","a":"No para empezar. Le describes la idea a tu agente y él escribe y ajusta el código del sketch. Para instalarlo sí corres algunos comandos en la terminal."},{"q":"¿Necesito grabar mi voz?","a":"No. Por defecto el sketch va sin voz: los subtítulos cuentan la historia y la música marca el ritmo. Si quieres narrador, puedes usar una voz local o ElevenLabs o Fish Audio con tu propia cuenta."},{"q":"¿Necesito tener SpecReel?","a":"No. SpecReel Stick trae su propio motor y funciona solo. SpecReel es otro producto, para videos explicativos 3D de productos, procesos o datos."},{"q":"¿Puedo usar los videos comercialmente?","a":"Los videos que hagas son tuyos y puedes publicarlos en tu marca y tus canales, incluso monetizados. Si agregas una voz, revisa su licencia: algunos modelos locales no permiten uso comercial y el Doctor te avisa."}]', 'coming_soon', 'fixed', 0, NULL)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description, highlights, specs, faq, availability, price_mode, min_price_cents, max_price_cents)
VALUES ('9c4d6e8f-3a51-4c7d-8e9f-1a2b3c4d5e03', 'motor-creativo-claude-code', 'Motor creativo para Claude Code: 13 agentes para diseño, video y docs', 'Kit en español que convierte Claude Code en un estudio creativo: 13 agentes, cada uno con su skill y el MCP oficial de una app open source ArtCraft, más router, CLI, panel local y QA de entregas. Próximamente.', 'Un kit para Claude Code que trabaja como un estudio creativo en español. Le pides una pieza en lenguaje natural y un agente especializado la produce con una app open source de escritorio, a través del servidor MCP oficial de esa app.

No es un programa de diseño propio: orquesta las 13 apps open source ArtCraft (de storytold, publicadas en GitHub) para imagen, foto, vector, video, animación, maquetación, PDF, interfaz, audio, presentaciones, documentos, planillas y CAD.

## El problema que resuelve

Conectar Claude Code a una docena de apps creativas suele terminar con todos los servidores MCP cargados a la vez, cientos de herramientas ocupando contexto y agentes que no saben qué app usar. Aquí cada app tiene su propio subagente, y su MCP se conecta solo mientras ese agente trabaja. La sesión principal solo decide a quién delegar.

## Cómo funciona en 3 pasos

- Pides: escribes el encargo en la terminal de Claude Code o en el panel local y adjuntas tu archivo.
- El router decide: clasifica el pedido (por ejemplo, VECTOR o SLIDES), elige el agente y su skill, y si la tarea combina apps las encadena en serie.
- El agente produce y revisa: trabaja sobre una copia, exporta a output/<proyecto>/ y mira el resultado antes de entregarlo. Al final, el agente revisor y los comandos revisar y empaquetar arman la entrega.

## Lo que recibes

- 13 subagentes de app y 1 agente revisor de solo lectura (qa-agent).
- 14 skills de flujo por app, incluida mixed para encadenar apps, y las skills kit-de-marca y entrega.
- CLI artcraft.py con doctor, route, marcas, revisar, empaquetar, sync, probe, smoke, actualizaciones, actualizar y volver.
- Router de intención en español e inglés, con su batería de casos de prueba.
- Hooks de Claude Code: contexto al iniciar sesión, aviso diario de versiones nuevas y protección de originales y binarios.
- Panel web local para usar las 13 apps sin escribir comandos.
- Registro de marcas (marcas.json) con plantilla para dar de alta a cada cliente: logos, paleta, fuentes y reglas que los agentes respetan.
- Perfiles MCP por app para abrir una sesión de Claude Code dedicada a una sola app.
- Documentación de arquitectura, índice maestro y registro de herramientas con formatos y límites de cada app.

## Para quién es

- Diseñadores, community managers y agencias pequeñas que ya usan Claude Code y producen piezas para varios clientes.
- Quien quiere probar apps open source de escritorio para imagen, video y oficina operadas por agentes.
- Equipos que necesitan que la IA no invente datos: los agentes dejan marcadores visibles como [precio] cuando falta información.

## Requisitos

- Windows x64 (desarrollado en Windows 11).
- Claude Code instalado y con sesión iniciada; cada pedido consume uso de tu plan.
- Python 3.10 o superior y Git.
- Las 13 apps ArtCraft, que se descargan gratis desde sus releases oficiales en GitHub (no vienen en el paquete).
- ffmpeg y Google Chrome para algunas funciones. python artcraft.py doctor te dice qué falta.

## Limitaciones honestas

- Solo Windows: las apps se instalan como binarios portables para Windows x64.
- Las apps son de terceros y están en versiones 0.x. FilmCraft no transcribe ni corta silencios automáticamente, CADCraft abre cerca del 30 % de los formatos de AutoCAD, FigCraft importa .fig en modo best effort y SoundCraft exporta solo WAV, AIFF o FLAC.
- No reemplaza tu criterio: revisa cada pieza antes de entregarla a un cliente.
- Las versiones, formatos y límites de las apps pueden cambiar con cada release de sus autores.
- Este kit no está afiliado a storytold ni a Anthropic. ArtCraft y Claude son marcas de sus titulares.

## Estado

Producto en preparación: las funciones y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis y no te compromete a comprar.', 1900, 'usd', 'paid', '[{"src":"/market/static/products/motor-creativo-claude-code/cover.webp","alt":"Motor creativo para Claude Code: 13 agentes en español y el router eligiendo animación y presentaciones"},{"src":"/market/static/products/motor-creativo-claude-code/screen-1.webp","alt":"Salida real del router: un pedido en español se asigna a su categoría, su agente y su skill"},{"src":"/market/static/products/motor-creativo-claude-code/screen-2.webp","alt":"Ilustración del panel local para pedir piezas, con el veredicto del agente revisor antes de entregar"}]', NULL, NULL, 5, 1, 55, 1793534400000, 1793534400000, 'Pide en español la pieza que necesitas y un agente de Claude Code la produce con apps open source en tu PC.', 'agentes', '["agentes de Claude Code para diseño","automatizar diseño gráfico con IA","servidores MCP para diseño y video","editar PDF con Claude Code","crear presentaciones y planillas con IA","apps open source de diseño con IA","subagentes y skills para Claude Code"]', '', '#ff8a3d', 'Agentes de Claude Code para diseño, video y PDF', '13 agentes de Claude Code en español que operan apps open source de diseño, video, audio, PDF y oficina vía MCP. Router, panel local y QA. Para Windows.', '["13 subagentes de Claude Code (imagen, foto, vector, video, animación, maquetación, PDF, interfaz, audio, presentaciones, documentos, planillas y CAD), cada uno con su skill y el MCP oficial de su app, que se conecta solo mientras trabaja.","Router de intención en español e inglés: `python artcraft.py route \"<pedido>\"` devuelve categoría, agentes y skills, y encadena varias apps en tareas mixtas (p. ej. vector → animación).","Panel web local (127.0.0.1) para pedir en lenguaje natural, adjuntar un archivo y descargar el resultado, con hasta 4 consultas en paralelo e historial por app.","Instalador/actualizador de las apps desde sus releases oficiales en GitHub con doble verificación SHA256, prueba MCP antes de registrar y vuelta atrás con `volver`.","Agente revisor de solo lectura y comandos `revisar` y `empaquetar`: medidas, marcadores sin completar y ZIP de entrega con índice.","Hooks de Claude Code que impiden sobrescribir los archivos originales de tus clientes y los binarios, y te avisan una vez al día si hay versiones nuevas de las apps."]', '[{"label":"Estado","value":"En preparación — lista de espera abierta"},{"label":"Formato","value":"Carpeta de proyecto (ZIP) con CLI en Python, agentes, skills y hooks de Claude Code y panel web local"},{"label":"Funciona con","value":"Claude Code + las 13 apps open source ArtCraft de storytold (se descargan aparte, gratis, desde GitHub)"},{"label":"Requisitos","value":"Claude Code con sesión iniciada (consume uso de tu plan), Python 3.10 o superior, Git; ffmpeg y Google Chrome para algunas funciones"},{"label":"Sistemas","value":"Windows x64 (las apps se instalan como binarios portables para Windows; desarrollado en Windows 11)"},{"label":"Salida","value":"Archivos en output/<proyecto>/: PSD, PNG, SVG, PDF, MP4, PPTX, DOCX, XLSX, CSV, DXF/DWG, WAV/FLAC, según la app"},{"label":"Idioma","value":"Español (agentes, skills, router, panel y documentación)"}]', '[{"q":"¿Incluye las 13 apps?","a":"No. Son apps open source de terceros (storytold, en GitHub) y se descargan aparte desde sus releases oficiales. El motor las registra, comprueba el SHA256 de cada descarga, prueba su servidor MCP y te avisa cuando hay versiones nuevas."},{"q":"¿Funciona en Mac o Linux?","a":"No en esta versión. El registro y el actualizador usan los binarios portables de Windows x64 y el panel busca claude.exe. El router y la CLI son Python, pero las apps y el panel están preparados solo para Windows."},{"q":"¿Necesito una API key?","a":"No. Usa tu propia sesión de Claude Code; el panel lanza Claude Code en modo sin ventana. Cada pedido consume uso de tu plan de Claude: en las pruebas del autor, una consulta simple tardó unos 30 segundos y las largas entre 1 y 4 minutos."},{"q":"¿Mis archivos se procesan en mi PC?","a":"Las apps y el panel corren en tu equipo (el panel solo escucha en 127.0.0.1) y tus originales se copian antes de tocarlos. Pero Claude Code envía a Anthropic lo que el agente lee para razonar, como cualquier uso de Claude Code."},{"q":"¿Qué tan maduras son las apps?","a":"Son versiones 0.x. Sus propios documentos lo dicen: FilmCraft es joven y no transcribe ni corta silencios automáticamente, CADCraft abre cerca del 30 % de los formatos de AutoCAD y FigCraft importa .fig en modo best effort. Cada agente avisa qué no puede hacer su app."},{"q":"¿Cuándo sale?","a":"Estamos preparando la versión para compradores (instalador, guía y licencia). Únete a la lista de espera y te avisamos el día del lanzamiento."}]', 'coming_soon', 'pwyw', 0, NULL)
ON CONFLICT(slug) DO NOTHING;

UPDATE products SET title = 'CutPilot: edita tus videos hablados con Claude Code, en tu PC',
  summary = 'Estudio local para videos hablados en español: quita muletillas y silencios desde la transcripción, agrega subtítulos y gráficos que planifica Claude y exporta en 16:9, 9:16 y 1:1. Próximamente.',
  tagline = 'Dejas tu grabación en una carpeta y recibes el video limpio, subtitulado, con gráficos y revisado por un QA automático.',
  category = 'video',
  meta_title = 'Edita videos con Claude Code en local — CutPilot',
  meta_description = 'Edita videos hablados en español con Claude Code: quita muletillas y silencios, agrega subtítulos y gráficos y exporta en 16:9, 9:16 y 1:1. Lista de espera.',
  description = 'CutPilot es un editor automático para videos hablados que corre en tu computador. Le das un video hablado en español y te devuelve el video limpio, con subtítulos, gráficos animados y sonido nivelado, en horizontal, vertical o cuadrado.

## El problema que resuelve

Editar un video a cámara se va en tareas repetitivas: buscar los «eh» y los silencios, cortar las frases que repetiste, poner subtítulos, nivelar el audio y sacar una versión vertical. Este estudio hace ese trabajo a partir de la transcripción palabra por palabra, para que tú solo revises.

## Cómo funciona, en 3 pasos

- Copias tu grabación en la carpeta entrada/ o la arrastras al panel de Chrome.
- El estudio limpia el audio, transcribe, quita muletillas, silencios y retomas, y Claude propone los gráficos indicando en qué palabra va cada uno.
- Revisas la hoja de contacto si quieres aprobar antes del render, y recibes el video final con su informe de calidad.

## Qué recibes

- El orquestador editar.py y los módulos del pipeline: reducción de ruido, transcripción, limpieza, plan visual, detección de cara, render, mezcla y QA.
- El proyecto de Remotion con subtítulos palabra a palabra, tarjetas de datos, listas, títulos de capítulo, zooms, intro y cierre.
- Una skill y un subagente revisor para Claude Code, más un hook que protege tus videos originales.
- La extensión de Chrome con su servidor local: cola de trabajos, kit de marca, ajustes y diagnóstico.
- Herramientas para descargar efectos de sonido CC0, renderizar sin internet e importar música de la biblioteca de YouTube que ya descargaste.
- Tests automáticos y un archivo config.yaml con todos los parámetros comentados.

## Para quién es

Creadores, profesores, coaches y equipos de marketing que graban videos hablados en español y usan Claude Code, y que prefieren procesar en su propio computador en vez de pagar créditos por minuto.

## Requisitos

- Python 3.12 con uv, Node.js y ffmpeg.
- El binario de DeepFilterNet para la reducción de ruido.
- Claude Code para las decisiones de IA (opcional).
- GPU NVIDIA recomendada; sin ella, Whisper corre en la CPU.
- Unos 20 GB libres: el modelo de Whisper se descarga la primera vez (unos 1,6 GB).

## Limitaciones honestas

- Probado solo en Windows. macOS y Linux no están verificados.
- Solo videos en español.
- La instalación usa la terminal y la extensión se carga en modo desarrollador de Chrome.
- Renderizar toma tiempo: la estimación medida es de 35 a 45 minutos por formato para 10 minutos de crudo.
- Whisper puede confundir palabras en clips muy cortos y una repetición intencional puede cortarse: revisa el .srt y la lista de cortes del informe.
- Remotion se rige por su propia licencia; las empresas de más de 3 empleados necesitan la de empresa.
- Para música y logos de marcas usa solo material con licencia: el estudio registra la fuente y la licencia de cada recurso, pero la responsabilidad del uso es tuya.

## Estado

Producto en preparación: las funciones y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis.',
  tags = '["editar videos con Claude Code","quitar muletillas de un video","cortar silencios automáticamente","subtítulos automáticos en español","editar videos con Whisper","video vertical 9:16 automático","editar videos con Remotion"]',
  highlights = '["Quita muletillas, silencios, repeticiones y retomas leyendo la transcripción palabra por palabra (Whisper + VAD)","Claude planifica los gráficos: logos de marcas, cifras, listas de pasos, títulos de capítulo y zooms","Render en 16:9, 9:16 y 1:1 con Remotion, con detección de cara para no taparla y centrar el vertical","QA automático: -14 LUFS, desfase de audio y solapes, con hoja de contacto e informe de cada video","Exporta .srt, .vtt, EDL CMX3600 para Premiere o Resolve y capítulos para YouTube","Panel lateral de Chrome con cola de trabajos, kit de marca y ajustes, todo en tu computador"]',
  specs = '[{"label":"Estado","value":"En preparación — lista de espera abierta"},{"label":"Motor","value":"Estudio de video v2.2 (Python + Remotion)"},{"label":"Formato","value":"ZIP con el código (Python + Remotion), skill y subagente para Claude Code, extensión de Chrome y tests"},{"label":"Funciona con","value":"Claude Code (opcional: sin él usa un plan sin IA)"},{"label":"Probado en","value":"Windows con GPU NVIDIA de 4 GB; macOS y Linux sin verificar"},{"label":"Requisitos","value":"Python 3.12 con uv, Node.js, ffmpeg y DeepFilterNet; 20 GB libres recomendados"},{"label":"Idioma de los videos","value":"Español"},{"label":"Salida","value":"MP4 en 16:9, 9:16 o 1:1, .srt, .vtt, .edl, capítulos e informe"}]',
  faq = '[{"q":"¿Necesito una licencia de Remotion?","a":"Depende de ti. Remotion tiene su propia licencia: es gratis para personas, empresas de hasta 3 empleados y organizaciones sin fines de lucro; si tu empresa es más grande, necesitas la licencia de empresa de Remotion. Remotion no viene dentro del ZIP: se instala con npm desde su fuente oficial."},{"q":"¿Necesito una tarjeta gráfica?","a":"No es obligatoria: sin GPU NVIDIA, Whisper transcribe en la CPU, más lento. El estudio se midió en una GTX 1650 de 4 GB: un crudo de 49,5 s tardó unos 40 s en transcribirse y unos 110 s en renderizarse en 16:9. Para 10 minutos de crudo la estimación es de 35 a 45 minutos por formato."},{"q":"¿Hay un costo por video?","a":"El estudio no cobra por minuto. Las decisiones de IA usan Claude Code en tu computador y consumen tu plan; cada informe anota el costo estimado y las respuestas se guardan en caché para no pagar dos veces. Sin Claude Code, el estudio usa un plan automático sin IA."},{"q":"¿Funciona en Mac o Linux?","a":"Se desarrolló y probó en Windows. Incluye un instalador para macOS y Linux, pero esas plataformas no están verificadas, y el registro automático de la extensión de Chrome existe solo para Windows."},{"q":"¿Sirve para videos en inglés?","a":"No. La transcripción está fijada en español y la detección de muletillas está pensada para el español."},{"q":"¿Cuándo sale?","a":"Estamos preparando la versión para compradores (instalador y guía). Únete a la lista de espera y te escribimos el día del lanzamiento."}]',
  images = '[{"src":"/market/static/products/cutpilot/cover.webp","alt":"CutPilot: edita videos con Claude Code — cortes, subtítulos y versión vertical"}]',
  updated_at = 1793534400000
WHERE slug = 'cutpilot' AND availability = 'coming_soon' AND file_key IS NULL;

UPDATE products SET title = 'SpecReel: videos 3D explicativos y de producto con Claude Code y Codex', updated_at = 1793534400000 WHERE slug = 'specreel' AND title = 'SpecReel: Make 3D Explainer & Product Videos with Claude Code and Codex';

-- Meta descripciones ≤ 160 caracteres (Google corta las más largas). Solo si siguen siendo las anteriores.
UPDATE products SET meta_description = 'Agente de IA en español que investiga tu negocio y tu competencia y te entrega 250+ prompts de anuncios para Meta, Google, TikTok y LinkedIn. Pago único.', updated_at = 1793534400000 WHERE slug = 'anuncios-infinitos' AND meta_description = 'Anuncios Infinitos: agente de IA en español que investiga tu negocio y tu competencia y te entrega 250+ prompts de anuncios con estrategia para Meta, Google, TikTok y LinkedIn. Pago único.';
UPDATE products SET meta_description = 'Skill para Claude Code y Codex que convierte cualquier tema en un video 3D narrado, con subtítulos, música y cámara de cine. Corre en tu PC. Pago único.', updated_at = 1793534400000 WHERE slug = 'specreel' AND meta_description = 'Skill para Claude Code y Codex que convierte cualquier tema en un video 3D narrado, con subtítulos, música y cámara de cine. Corre en tu computador. Pago único y actualizaciones 2.x gratis.';
UPDATE products SET meta_description = '12 flujos de n8n con IA para captar y atender clientes: agente de WhatsApp que agenda, leads de Meta Ads y Google Maps, Stripe al CRM. Lista de espera.', updated_at = 1793534400000 WHERE slug = 'kit-n8n-agentes-ia' AND meta_description = 'Kit de 12 automatizaciones de n8n con IA listas para importar: agente de WhatsApp que agenda citas, leads de Google Maps y Meta Ads, webhooks de Stripe al CRM. En español. Lista de espera abierta.';
UPDATE products SET meta_description = 'Skill para Claude Code y Codex que escribe, diseña y exporta carruseles de Instagram y LinkedIn en tu estilo. Únete a la lista de espera gratis.', updated_at = 1793534400000 WHERE slug = 'carruseles-infinitos' AND meta_description = 'Carruseles Infinitos: skill para Claude Code y Codex que escribe, diseña y exporta carruseles de Instagram y LinkedIn en tu estilo, en PNG y PDF. Únete a la lista de espera.';

-- Precios escritos a mano dentro de descripciones (quedarían viejos con la oferta): el precio vigente se ve en la ficha.
UPDATE products SET description = replace(description, 'Price: US$36.90, one-time payment.', 'One-time payment (current price shown above).'), updated_at = 1793534400000 WHERE slug = 'specreel' AND instr(description, 'Price: US$36.90, one-time payment.') > 0;
UPDATE products SET description = replace(description, 'Precio: US$36,90, pago único.', 'Pago único (el precio vigente se muestra arriba).'), updated_at = 1793534400000 WHERE slug = 'specreel' AND instr(description, 'Precio: US$36,90, pago único.') > 0;
