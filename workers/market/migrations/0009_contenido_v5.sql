-- Market Tony — contenido v5 de las fichas (aprobado por el dueño el 2026-11-01). Escrita a mano (no hay generador).
-- Base: textos de producción leídos el 2026-11-01 (copia en scripts/fixtures/produccion-2026-11-01.json) y la auditoría
-- docs/ux/propuesta-2026-11-01/seo.md. Nada inventado: cada frase nueva sale de la ficha actual o del repo del producto.
--
-- Guardas (no pisar lo que el dueño editó en /market/admin):
--   - Campos cortos (título, meta título, meta descripción, compat): solo si siguen EXACTAMENTE como en producción.
--   - Descripciones largas: cortes y reemplazos sobre el texto que haya, y solo si siguen ahí las marcas exactas del
--     texto viejo (el bloque en inglés, la sección de reembolso vieja…). Lo que el dueño haya escrito alrededor se conserva.
--   - FAQ: se agregan preguntas solo si no existen, y se cambia una respuesta solo si sigue siendo la vieja.
--   - El cambio de nombre usa replace(): si el nombre viejo ya no está, no cambia nada.
-- Idempotente: aplicarla dos veces da el mismo resultado. No toca precios, archivos, disponibilidad ni slugs.

-- ── 1. «Anuncios Infinitos» pasa a llamarse «Anuncios Automáticos» (el slug anuncios-infinitos NO cambia) ─────────
UPDATE products SET title = 'Anuncios Automáticos: 250+ prompts para anuncios publicitarios con IA', updated_at = 1793592000000
WHERE slug = 'anuncios-infinitos' AND title = 'Anuncios Infinitos: agente de IA con 250+ prompts de anuncios';

UPDATE products SET meta_title = 'Anuncios Automáticos: 250+ prompts para anuncios con IA', updated_at = 1793592000000
WHERE slug = 'anuncios-infinitos' AND meta_title = 'Prompts de anuncios con IA: 250+ para Meta, Google y TikTok';

UPDATE products SET meta_description = 'Anuncios Automáticos: agente de IA en español que investiga tu negocio y competencia y te entrega 250+ prompts para anuncios en Meta, Google, TikTok y LinkedIn.', updated_at = 1793592000000
WHERE slug = 'anuncios-infinitos' AND meta_description = 'Agente de IA en español que investiga tu negocio y tu competencia y te entrega 250+ prompts de anuncios para Meta, Google, TikTok y LinkedIn. Pago único.';

-- La descripción repetía sus propias «Preguntas frecuentes» (la ficha ya tiene la FAQ) y cerraba con una línea en
-- inglés. Se corta desde ese encabezado hasta el final, solo si ese tramo sigue siendo la FAQ vieja + la línea en inglés.
UPDATE products SET description = rtrim(substr(description, 1, instr(description, '## Preguntas frecuentes') - 1), char(10) || ' '), updated_at = 1793592000000
WHERE slug = 'anuncios-infinitos'
	AND instr(description, char(10) || '## Preguntas frecuentes' || char(10)) > 0
	AND instr(description, '¿Incluye una extensión de Chrome? No.') > instr(description, '## Preguntas frecuentes')
	AND instr(description, 'In English: a Spanish-language ad-strategy agent') > 0 AND substr(description, -length('One-time payment.')) = 'One-time payment.';

-- Las 2 preguntas que solo estaban en la descripción pasan a la FAQ de la ficha (texto tal cual).
UPDATE products SET faq = json_insert(json_insert(faq,
		'$[#]', json_object('q', '¿Incluye una extensión de Chrome?', 'a', 'No. El paquete trae el agente, la app local y las guías.')),
		'$[#]', json_object('q', '¿Qué herramientas de IA necesito?', 'a', 'Una compatible: Claude Code, Cursor, Codex, Antigravity o Gemini. La app local usa tu sesión de Claude iniciada.')),
	updated_at = 1793592000000
WHERE slug = 'anuncios-infinitos' AND json_valid(faq)
	AND NOT EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') IN ('¿Incluye una extensión de Chrome?', '¿Qué herramientas de IA necesito?'));

-- «2 en 1»: la extensión de Chrome NO va en el ZIP (licencia pendiente). Queda Agente + App local (la app corre con
-- Node.js según la ficha: «Node.js (gratis) para abrir la app local»; se usa el logo de Node.js ya existente).
UPDATE products SET compat = json_set(compat, '$.includes', json('["agent|Agente de anuncios","node|App local"]')), updated_at = 1793592000000
WHERE slug = 'anuncios-infinitos' AND json_valid(compat) AND json_extract(compat, '$.includes') = '["agent|Agente de anuncios","chrome-ext"]';

-- El nombre nuevo en todo lo demás (resumen, descripción, ALT de imágenes, beneficios, ficha técnica, FAQ, etiquetas).
UPDATE products SET
	title = replace(replace(title, 'Anuncios Infinitos', 'Anuncios Automáticos'), 'ANUNCIOS INFINITOS', 'ANUNCIOS AUTOMÁTICOS'),
	meta_title = replace(meta_title, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	meta_description = replace(meta_description, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	summary = replace(replace(summary, 'Anuncios Infinitos', 'Anuncios Automáticos'), 'ANUNCIOS INFINITOS', 'ANUNCIOS AUTOMÁTICOS'),
	tagline = replace(tagline, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	description = replace(replace(description, 'Anuncios Infinitos', 'Anuncios Automáticos'), 'ANUNCIOS INFINITOS', 'ANUNCIOS AUTOMÁTICOS'),
	images = replace(images, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	highlights = replace(highlights, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	specs = replace(specs, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	faq = replace(faq, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	tags = replace(tags, 'Anuncios Infinitos', 'Anuncios Automáticos'),
	updated_at = 1793592000000
WHERE slug = 'anuncios-infinitos' AND (
	instr(title || summary || tagline || meta_title || meta_description || description || images || highlights || specs || faq || tags, 'Anuncios Infinitos') > 0
	OR instr(title || summary || description, 'ANUNCIOS INFINITOS') > 0
);

-- ── 2. CutPilot está Disponible: fuera «Lista de espera.» del snippet; meta título con la búsqueda principal ────────
UPDATE products SET meta_description = 'Edita en tu PC videos hablados en español con Claude Code: quita muletillas, silencios y retomas, agrega subtítulos y gráficos y exporta en 16:9, 9:16 y 1:1.', updated_at = 1793592000000
WHERE slug = 'cutpilot' AND availability = 'available' AND meta_description = 'Edita videos hablados en español con Claude Code: quita muletillas y silencios, agrega subtítulos y gráficos y exporta en 16:9, 9:16 y 1:1. Lista de espera.';
-- Las dos, solo si CutPilot está Disponible (si volviera a «Próximamente», la lista de espera sería cierta).
-- Si el dueño ya había retocado la frase pero conserva la coletilla, solo se quita la coletilla.
UPDATE products SET meta_description = rtrim(substr(meta_description, 1, length(meta_description) - length(' Lista de espera.'))), updated_at = 1793592000000
WHERE slug = 'cutpilot' AND availability = 'available' AND substr(meta_description, -length(' Lista de espera.')) = ' Lista de espera.';

UPDATE products SET meta_title = 'CutPilot: edita videos con Claude Code y quita muletillas', updated_at = 1793592000000
WHERE slug = 'cutpilot' AND meta_title = 'Edita videos con Claude Code en local — CutPilot';

-- ── 3. SpecReel: descripción solo en español, reembolso = política del market, soporte business@ ─────────────────
UPDATE products SET meta_title = 'SpecReel: videos explicativos 3D con Claude Code y Codex', updated_at = 1793592000000
WHERE slug = 'specreel' AND meta_title = 'SpecReel: crea videos 3D con Claude Code y Codex';

UPDATE products SET meta_description = 'Skill para Claude Code y Codex que convierte cualquier tema en un video explicativo o de producto 3D narrado, con subtítulos, música y cámara de cine. En tu PC.', updated_at = 1793592000000
WHERE slug = 'specreel' AND meta_description = 'Skill para Claude Code y Codex que convierte cualquier tema en un video 3D narrado, con subtítulos, música y cámara de cine. Corre en tu PC. Pago único.';

-- 3a. Se quita el bloque en inglés: la descripción empieza en la versión en español (sin su encabezado ni la línea
--     «Es la misma oferta…»). Guarda: sigue empezando en inglés y la versión en español viene después.
UPDATE products SET description = substr(description, instr(description, 'SpecReel es una skill para Claude Code y Codex que convierte')), updated_at = 1793592000000
WHERE slug = 'specreel'
	AND substr(description, 1, length('SpecReel is an agent skill for Claude Code and Codex')) = 'SpecReel is an agent skill for Claude Code and Codex'
	AND instr(description, '## Descripción en español') > 0
	AND instr(description, 'SpecReel es una skill para Claude Code y Codex que convierte') > instr(description, '## Descripción en español');

-- 3b. Lo útil que solo estaba en inglés, traducido (todo verificado en /home/user/specreel: README.es.md,
--     references/01-sdd-workflow.md, 03-audio-providers.md, tts/providers.py, assets/spec-templates, docs/es).
UPDATE products SET description = replace(description, 'Audio con 13 adaptadores de voz, verificación por ASR',
		'Audio con 13 adaptadores de voz (Kokoro, Chatterbox, Piper, XTTS, Fish Speech, servidores locales compatibles con OpenAI, cualquier CLI, voces de Windows y macOS, eSpeak, ElevenLabs y Fish Audio), verificación por ASR'),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND instr(description, 'Audio con 13 adaptadores de voz, verificación por ASR') > 0;

UPDATE products SET description = replace(description, 'y loops para Claude Code y Codex.',
		'y loops para Claude Code y Codex (/ralph-loop, o loop.ps1 y loop.sh para correr sin supervisión).'),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND instr(description, 'y loops para Claude Code y Codex.') > 0;

UPDATE products SET description = replace(description, 'Showreel (inglés), demo v2 de la botella con kit de marca (vertical), Demo de la célula y Microneedling (español).',
		'Showreel (inglés, 21 s), demo v2 de la botella con kit de marca (vertical, 17 s), Demo de la célula (español, 15 s) y Microneedling (español, 47 s).'),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND instr(description, 'Showreel (inglés), demo v2 de la botella con kit de marca (vertical), Demo de la célula y Microneedling (español).') > 0;

UPDATE products SET description = replace(description, 'Documentación en español e inglés.',
		'Plantillas de spec: constitución, brief, spec, guion, storyboard, plan, tareas y estado.
- Documentación en español e inglés: instalación en Windows, macOS y Linux, plan maestro de desarrollo guiado por especificación (SDD) y guía para pasar la voz a ElevenLabs o Fish Audio.'),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND instr(description, 'Plantillas de spec:') = 0 AND instr(description, 'Documentación en español e inglés.') > 0;

UPDATE products SET description = replace(description, '## Requisitos', '## Qué obtienes

- MP4 (H.264, 30 fps) en 9:16 (1080×1920), 1:1, 4:5 o 16:9.
- Subtítulos karaoke incrustados y su archivo .srt.
- Por cada video, una imagen de portada, CREDITS.md (voz, fuentes y licencias) y un informe de QA (REPORT.md).
- Narración en cualquier idioma que soporte tu motor de voz.

## Requisitos'),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND instr(description, '## Qué obtienes') = 0 AND instr(description, '## Requirements') = 0
	AND (length(description) - length(replace(description, '## Requisitos', ''))) = length('## Requisitos');

UPDATE products SET description = replace(description, 'Fish Audio o ElevenLabs con tu propia clave.',
		'Fish Audio o ElevenLabs con tu propia clave.
- Algo de soltura con la terminal: en la instalación corres algunos comandos; el agente hace el resto.'),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND instr(description, 'soltura con la terminal') = 0 AND instr(description, '## Requirements') = 0
	AND (length(description) - length(replace(description, 'Fish Audio o ElevenLabs con tu propia clave.', ''))) = length('Fish Audio o ElevenLabs con tu propia clave.');

-- 3c. La garantía propia («funciona o te devolvemos el dinero», contact@) contradecía la política del market. Se cambia
--     por la política del market (14 días si no se descargó o si el archivo está dañado) y soporte business@.
--     Guarda: la sección vieja sigue ahí y es lo último de la descripción.
UPDATE products SET description = rtrim(substr(description, 1, instr(description, '## Política de reembolso') - 1), char(10) || ' ') || '

## Después de descargar

- Descomprime el ZIP y abre README.es.md (en inglés: README.md).
- Instala la skill. En Claude Code, copia skills/specreel a ~/.claude/skills/ (en Windows, %USERPROFILE%\.claude\skills\). En Codex, cópiala a ~/.agents/skills/.
- Prepara tu equipo y prueba el demo: desde la carpeta de la skill corre python scripts/setup.py (detecta Windows, macOS o Linux e instala lo que falta) y sigue «Primer video en 5 minutos» del README.

Después abre tu agente en una carpeta vacía y pega el prompt de arranque de docs/es/PLAN-SDD.md.

Voz de estudio (opcional): dentro de tu proyecto de video corre python tools/tts/fish_setup.py. Abre Fish Audio, te pide la clave sin mostrarla y la guarda en .env.

## Reembolsos y soporte

Aplica la política de reembolsos de Market Tony: te devolvemos el dinero si lo pides dentro de los 14 días posteriores a la compra y todavía no descargaste el producto, o si el archivo está dañado o no corresponde a lo descrito.

Soporte: business@tonyciencia.com. Si algo falla, escríbenos con la referencia de tu pedido, el archivo .svs/env.json de tu proyecto (no contiene claves) y la salida del comando que falla.',
	updated_at = 1793592000000
WHERE slug = 'specreel'
	AND instr(description, '## Refund policy') = 0
	AND instr(description, '## Política de reembolso') > 0
	AND instr(description, '«funciona o te devolvemos el dinero»') > instr(description, '## Política de reembolso')
	AND substr(description, -length('Soporte: contact@tonyciencia.com')) = 'Soporte: contact@tonyciencia.com';

-- 3d. FAQ: la respuesta de reembolso pasa a la política del market (solo si sigue siendo la vieja) y se agregan 3
--     preguntas que solo estaban en inglés (solo si no existen).
UPDATE products SET faq = json_set(faq,
		'$[' || (SELECT key FROM json_each(products.faq) WHERE json_extract(value, '$.q') = '¿Y si no me funciona?' AND json_extract(value, '$.a') = 'Tienes 14 días: si no logras renderizar el demo incluido en un sistema compatible después de que intentemos ayudarte, te devolvemos el dinero.') || '].a',
		'Revisa los requisitos antes de comprar. Si algo falla al instalar, escríbenos a business@tonyciencia.com con la referencia de tu pedido. Aplica la política de reembolsos de Market Tony: te devolvemos el dinero si lo pides dentro de los 14 días posteriores a la compra y todavía no descargaste el producto, o si el archivo está dañado o no corresponde a lo descrito.'),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND json_valid(faq)
	AND EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') = '¿Y si no me funciona?' AND json_extract(value, '$.a') = 'Tienes 14 días: si no logras renderizar el demo incluido en un sistema compatible después de que intentemos ayudarte, te devolvemos el dinero.');

UPDATE products SET faq = json_insert(json_insert(json_insert(faq,
		'$[#]', json_object('q', '¿Qué tipo de videos hace?', 'a', 'Explicativos, videos de producto y promoción, procesos («cómo funciona»), historias con datos y tutoriales, con escenas 3D ilustradas, etiquetas y subtítulos. No hace personas fotorrealistas, avatares ni sincronización de labios, y no edita video grabado con cámara.')),
		'$[#]', json_object('q', '¿En qué idiomas narra?', 'a', 'En cualquier idioma que soporte el motor de voz que uses; por ejemplo, Chatterbox Multilingual cubre 23 idiomas. La documentación viene en español e inglés.')),
		'$[#]', json_object('q', '¿Cuánto tarda en renderizar un video?', 'a', 'Depende de tu equipo y de la duración. El showreel de 21 segundos tardó unos 8 minutos en una máquina en la nube de 2 núcleos sin GPU. Con una GPU NVIDIA o Apple Silicon (recomendados) va más rápido.')),
	updated_at = 1793592000000
WHERE slug = 'specreel' AND json_valid(faq)
	AND NOT EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') IN ('¿Qué tipo de videos hace?', '¿En qué idiomas narra?', '¿Cuánto tarda en renderizar un video?'));

-- ── 4. Títulos y meta descripciones con la búsqueda principal (seo.md §3; meta título ≤ 60, H1 ≤ 70) ─────────────
UPDATE products SET meta_title = 'SpecReel Stick: videos de palitos animados con Claude Code', updated_at = 1793592000000
WHERE slug = 'specreel-stick' AND meta_title = 'Videos de muñequitos de palo con Claude Code y Codex';
UPDATE products SET meta_description = 'Skill para Claude Code y Codex que crea sketches de muñequitos de palo (monitos de palitos) en MP4 vertical, con subtítulos, música y efectos. Corre en tu PC.', updated_at = 1793592000000
WHERE slug = 'specreel-stick' AND meta_description = 'SpecReel Stick: skill para Claude Code y Codex que crea sketches de muñequitos de palo en MP4, con subtítulos, música y efectos. Corre en tu computador.';
UPDATE products SET title = 'SpecReel Stick: videos animados de muñequitos de palo con Claude Code', updated_at = 1793592000000
WHERE slug = 'specreel-stick' AND title = 'SpecReel Stick: videos de muñequitos de palo con Claude Code y Codex';

UPDATE products SET meta_title = 'Mejorar PageSpeed móvil con Claude Code: PageSpeed Forensics', updated_at = 1793592000000
WHERE slug = 'pagespeed-forensics' AND meta_title = 'PageSpeed Forensics: skill de Claude Code para PageSpeed';
UPDATE products SET meta_description = 'Skill de Claude Code que muestra con evidencia por qué tu web no pasa de 85–90 en PageSpeed móvil y prueba arreglos sin recompilar. Tú pones el precio.', updated_at = 1793592000000
WHERE slug = 'pagespeed-forensics' AND price_mode = 'pwyw' AND meta_description = 'Skill para Claude Code que encuentra con evidencia por qué tu web no pasa de 85–90 en PageSpeed móvil: red de laboratorio, trazas, Lighthouse y prueba visual.';
UPDATE products SET title = 'PageSpeed Forensics: skill de Claude Code para mejorar PageSpeed móvil', updated_at = 1793592000000
WHERE slug = 'pagespeed-forensics' AND title = 'PageSpeed Forensics: skill de Claude Code para PageSpeed móvil';

UPDATE products SET meta_title = 'Agentes de Claude Code para diseño gráfico, video y PDF', updated_at = 1793592000000
WHERE slug = 'motor-creativo-claude-code' AND meta_title = 'Agentes de Claude Code para diseño, video y PDF';
UPDATE products SET meta_description = '13 subagentes de Claude Code en español que operan apps open source de diseño gráfico, video, audio, PDF y oficina vía MCP. Para Windows. Paga lo que quieras.', updated_at = 1793592000000
WHERE slug = 'motor-creativo-claude-code' AND price_mode = 'pwyw' AND meta_description = '13 agentes de Claude Code en español que operan apps open source de diseño, video, audio, PDF y oficina vía MCP. Router, panel local y QA. Para Windows.';
UPDATE products SET title = 'Motor creativo: 13 agentes de Claude Code para diseño, video y PDF', updated_at = 1793592000000
WHERE slug = 'motor-creativo-claude-code' AND title = 'Motor creativo para Claude Code: 13 agentes para diseño, video y docs';

-- ── 5. «Funciona con» Antigravity solo donde el repo lo documenta ────────────────────────────────────────────────
-- Motor creativo: artcraft-studio-engine/ANTIGRAVITY.md, línea 1: «# ANTIGRAVITY.md · Guía operativa para Google
-- Antigravity · Motor creativo para Claude Code v2.2» (va en el ZIP). Anuncios ya lo tenía (su ficha: «Claude Code,
-- Cursor, Codex, Antigravity o Gemini»). SpecReel, SpecReel Stick y PageSpeed Forensics no lo mencionan; CutPilot
-- solo dice que otros agentes pueden editar su código, pero sus decisiones de IA llaman a Claude Code (AGENTS.md).
-- Grok no lo documenta ningún producto: no se agrega.
UPDATE products SET compat = json_set(compat, '$.works', json('["claude-code","antigravity","python","windows"]')), updated_at = 1793592000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(compat) AND json_extract(compat, '$.works') = '["claude-code","python","windows"]';

-- Para que el logo no prometa de más: qué cambia sin Claude Code (ANTIGRAVITY.md y AGENTS.md del repo).
UPDATE products SET faq = json_insert(faq, '$[#]', json_object('q', '¿Funciona con Antigravity u otros agentes?', 'a', 'Sí, con límites. El paquete trae ANTIGRAVITY.md, una guía para Google Antigravity, y AGENTS.md para Codex, OpenCode y Cursor. Sin Claude Code no hay hooks ni subagentes: las apps se operan con el cliente MCP incluido (python artcraft-workspace/router/mcp_client.py). El panel local usa Claude Code.')),
	updated_at = 1793592000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(faq) AND instr(compat, '"antigravity"') > 0
	AND NOT EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') = '¿Funciona con Antigravity u otros agentes?');
