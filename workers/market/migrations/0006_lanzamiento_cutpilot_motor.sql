-- Market Tony v4 — lanzamiento de CutPilot y del Motor creativo (sin inyección de metadatos de Adobe ni borrado de marcas de IA).
-- GENERADO por scripts/gen-catalog-v4-migration.mjs desde seed/catalog-v4.json. No editar a mano.
-- Solo reescribe fichas que siguen «Próximamente» y sin archivo: nunca pisa un producto ya lanzado.

UPDATE products SET title = 'CutPilot: edita tus videos hablados con Claude Code, en tu PC',
  summary = 'Estudio local para videos hablados en español: quita muletillas y silencios desde la transcripción, agrega subtítulos y gráficos que planifica Claude y exporta en 16:9, 9:16 y 1:1.',
  tagline = 'Dejas tu grabación en una carpeta y recibes el video limpio, subtitulado, con gráficos y revisado por un QA automático.',
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
- Para música y logos de marcas usa solo material con licencia: el estudio registra la fuente y la licencia de cada recurso, pero la responsabilidad del uso es tuya.',
  highlights = '["Quita muletillas, silencios, repeticiones y retomas leyendo la transcripción palabra por palabra (Whisper + VAD)","Claude planifica los gráficos: logos de marcas, cifras, listas de pasos, títulos de capítulo y zooms","Render en 16:9, 9:16 y 1:1 con Remotion, con detección de cara para no taparla y centrar el vertical","QA automático: -14 LUFS, desfase de audio y solapes, con hoja de contacto e informe de cada video","Exporta .srt, .vtt, EDL CMX3600 para Premiere o Resolve y capítulos para YouTube","Panel lateral de Chrome con cola de trabajos, kit de marca y ajustes, todo en tu computador"]',
  specs = '[{"label":"Motor","value":"Estudio de video v2.2 (Python + Remotion)"},{"label":"Formato","value":"ZIP con el código (Python + Remotion), skill y subagente para Claude Code, extensión de Chrome y tests"},{"label":"Funciona con","value":"Claude Code (opcional: sin él usa un plan sin IA)"},{"label":"Probado en","value":"Windows con GPU NVIDIA de 4 GB; macOS y Linux sin verificar"},{"label":"Requisitos","value":"Python 3.12 con uv, Node.js, ffmpeg y DeepFilterNet; 20 GB libres recomendados"},{"label":"Idioma de los videos","value":"Español"},{"label":"Salida","value":"MP4 en 16:9, 9:16 o 1:1, .srt, .vtt, .edl, capítulos e informe"}]',
  faq = '[{"q":"¿Necesito una licencia de Remotion?","a":"Depende de ti. Remotion tiene su propia licencia: es gratis para personas, empresas de hasta 3 empleados y organizaciones sin fines de lucro; si tu empresa es más grande, necesitas la licencia de empresa de Remotion. Remotion no viene dentro del ZIP: se instala con npm desde su fuente oficial."},{"q":"¿Necesito una tarjeta gráfica?","a":"No es obligatoria: sin GPU NVIDIA, Whisper transcribe en la CPU, más lento. El estudio se midió en una GTX 1650 de 4 GB: un crudo de 49,5 s tardó unos 40 s en transcribirse y unos 110 s en renderizarse en 16:9. Para 10 minutos de crudo la estimación es de 35 a 45 minutos por formato."},{"q":"¿Hay un costo por video?","a":"El estudio no cobra por minuto. Las decisiones de IA usan Claude Code en tu computador y consumen tu plan; cada informe anota el costo estimado y las respuestas se guardan en caché para no pagar dos veces. Sin Claude Code, el estudio usa un plan automático sin IA."},{"q":"¿Funciona en Mac o Linux?","a":"Se desarrolló y probó en Windows. Incluye un instalador para macOS y Linux, pero esas plataformas no están verificadas, y el registro automático de la extensión de Chrome existe solo para Windows."},{"q":"¿Sirve para videos en inglés?","a":"No. La transcripción está fijada en español y la detección de muletillas está pensada para el español."}]',
  images = '[{"src":"/market/static/products/cutpilot/cover.webp","alt":"CutPilot: transcripción con muletillas y retomas tachadas, línea de tiempo con cortes y el video en 16:9, 1:1 y 9:16"},{"src":"/market/static/products/cutpilot/screen-1.webp","alt":"Cómo funciona CutPilot: copias el video, se limpia y transcribe, Claude propone gráficos, y render con QA de -14 LUFS"},{"src":"/market/static/products/cutpilot/screen-2.webp","alt":"CutPilot entrega el mismo video en 16:9, 1:1 y 9:16, más .srt, .vtt, EDL, capítulos, hoja de contacto e informe de QA"}]',
  updated_at = 1793534400000
WHERE slug = 'cutpilot' AND availability = 'coming_soon' AND file_key IS NULL;
UPDATE products SET title = 'Motor creativo para Claude Code: 13 agentes para diseño, video y docs',
  summary = 'Kit en español que convierte Claude Code en un estudio creativo: 13 agentes, cada uno con su skill y el MCP de una app open source de storytold, más router, CLI, panel local y QA de entregas.',
  tagline = 'Pide en español la pieza que necesitas y un agente de Claude Code la produce con apps open source en tu PC.',
  meta_title = 'Agentes de Claude Code para diseño, video y PDF',
  meta_description = '13 agentes de Claude Code en español que operan apps open source de diseño, video, audio, PDF y oficina vía MCP. Router, panel local y QA. Para Windows.',
  description = 'Un kit para Claude Code que trabaja como un estudio creativo en español. Le pides una pieza en lenguaje natural y un agente especializado la produce con una app open source de escritorio, a través del servidor MCP oficial de esa app.

No es un programa de diseño propio: orquesta 13 apps open source de storytold publicadas en GitHub (PhotoCraft, LightCraft, VectorCraft, FilmCraft, EffectCraft, DesignCraft, PdfCraft, FigCraft, SoundCraft, DeckCraft, WordCraft, GridCraft y CADCraft) para imagen, foto, vector, video, animación, maquetación, PDF, interfaz, audio, presentaciones, documentos, planillas y CAD.

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
- Las 13 apps de storytold, que se descargan gratis desde sus releases oficiales en GitHub (no vienen en el paquete).
- ffmpeg y Google Chrome para algunas funciones. python artcraft.py doctor te dice qué falta.

## Limitaciones honestas

- Solo Windows: las apps se instalan como binarios portables para Windows x64.
- Las apps son de terceros y están en versiones 0.x. FilmCraft no transcribe ni corta silencios automáticamente, CADCraft abre cerca del 30 % de los formatos de AutoCAD, FigCraft importa .fig en modo best effort y SoundCraft exporta solo WAV, AIFF o FLAC.
- No reemplaza tu criterio: revisa cada pieza antes de entregarla a un cliente.
- Las versiones, formatos y límites de las apps pueden cambiar con cada release de sus autores.
- Este kit no está afiliado a storytold ni a Anthropic. Los nombres de las apps y Claude son marcas de sus titulares; se nombran solo para indicar compatibilidad.',
  highlights = '["13 subagentes de Claude Code (imagen, foto, vector, video, animación, maquetación, PDF, interfaz, audio, presentaciones, documentos, planillas y CAD), cada uno con su skill y el MCP oficial de su app, que se conecta solo mientras trabaja.","Router de intención en español e inglés: `python artcraft.py route \"<pedido>\"` devuelve categoría, agentes y skills, y encadena varias apps en tareas mixtas (p. ej. vector → animación).","Panel web local (127.0.0.1) para pedir en lenguaje natural, adjuntar un archivo y descargar el resultado, con hasta 4 consultas en paralelo e historial por app.","Instalador/actualizador de las apps desde sus releases oficiales en GitHub con doble verificación SHA256, prueba MCP antes de registrar y vuelta atrás con `volver`.","Agente revisor de solo lectura y comandos `revisar` y `empaquetar`: medidas, marcadores sin completar y ZIP de entrega con índice.","Hooks de Claude Code que impiden sobrescribir los archivos originales de tus clientes y los binarios, y te avisan una vez al día si hay versiones nuevas de las apps."]',
  specs = '[{"label":"Formato","value":"Carpeta de proyecto (ZIP) con CLI en Python, agentes, skills y hooks de Claude Code y panel web local"},{"label":"Funciona con","value":"Claude Code + 13 apps open source de storytold (MIT o Apache-2.0), que se descargan gratis desde sus releases oficiales con verificación SHA256"},{"label":"Requisitos","value":"Windows 10/11 x64, Python 3.10+ y Git; Claude Code con sesión iniciada (consume tu plan). ffmpeg y Chrome/Edge opcionales"},{"label":"Sistemas","value":"Solo Windows 10/11 x64 (el instalador usa las versiones portables para Windows)"},{"label":"Salida","value":"Archivos en output/<proyecto>/: PSD, PNG, SVG, PDF, MP4, PPTX, DOCX, XLSX, CSV, DXF/DWG, WAV/FLAC, según la app"},{"label":"Idioma","value":"Español (agentes, skills, router, panel y documentación)"},{"label":"Incluye","value":"CLI y router, 13 agentes + revisor QA, skills, hooks, panel local «Studio Motor», guía de instalación, licencia y avisos de terceros. Las apps (~1 GB) se descargan aparte"},{"label":"Licencia","value":"1 creador: uso propio y comercial de lo que produces; sin reventa del motor"}]',
  faq = '[{"q":"¿Incluye las 13 apps?","a":"No. Son apps open source de terceros (storytold, en GitHub) y se descargan aparte desde sus releases oficiales. El motor las registra, comprueba el SHA256 de cada descarga, prueba su servidor MCP y te avisa cuando hay versiones nuevas."},{"q":"¿Funciona en Mac o Linux?","a":"No en esta versión. El instalador y el registro de apps usan los binarios portables de Windows x64. El router y la CLI son Python, pero las apps están preparadas solo para Windows."},{"q":"¿Necesito una API key?","a":"No. Usa tu propia sesión de Claude Code; el panel lanza Claude Code en modo sin ventana. Cada pedido consume uso de tu plan de Claude: en las pruebas del autor, una consulta simple tardó unos 30 segundos y las largas entre 1 y 4 minutos."},{"q":"¿Mis archivos se procesan en mi PC?","a":"Las apps y el panel corren en tu equipo (el panel solo escucha en 127.0.0.1) y tus originales se copian antes de tocarlos. Pero Claude Code envía a Anthropic lo que el agente lee para razonar, como cualquier uso de Claude Code."},{"q":"¿Qué tan maduras son las apps?","a":"Son versiones 0.x. Sus propios documentos lo dicen: FilmCraft es joven y no transcribe ni corta silencios automáticamente, CADCraft abre cerca del 30 % de los formatos de AutoCAD y FigCraft importa .fig en modo best effort. Cada agente avisa qué no puede hacer su app."},{"q":"¿El motor se conecta a internet?","a":"Para instalar o actualizar las apps las descarga de sus releases oficiales en GitHub, y una vez al día consulta la API de GitHub para avisarte si hay versiones nuevas. Lo que pides en Claude Code lo procesa Claude con tu cuenta, como cualquier sesión de Claude Code."}]',
  images = '[{"src":"/market/static/products/motor-creativo-claude-code/cover.webp","alt":"Motor creativo para Claude Code: 13 agentes en español y el router eligiendo animación y presentaciones"},{"src":"/market/static/products/motor-creativo-claude-code/screen-1.webp","alt":"Salida real del router: un pedido en español se asigna a su categoría, su agente y su skill"},{"src":"/market/static/products/motor-creativo-claude-code/screen-2.webp","alt":"Ilustración del panel local para pedir piezas, con el veredicto del agente revisor antes de entregar"}]',
  updated_at = 1793534400000
WHERE slug = 'motor-creativo-claude-code' AND availability = 'coming_soon' AND file_key IS NULL;
