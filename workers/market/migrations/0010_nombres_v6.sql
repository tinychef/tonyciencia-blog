-- Market Tony — nombres comerciales v6 (pedido del dueño, 2026-11-01). Escrita a mano. Los slugs NO cambian.
--   specreel                    → «Motion 3D Video»        (por dentro la skill se llama SpecReel)
--   cutpilot                    → «Edit Pro para YouTube»  (por dentro se llama CutPilot; las normas de marca de YouTube
--                                                           no permiten «YouTube» al inicio del nombre, sí «para YouTube»)
--   motor-creativo-claude-code  → «Creative Factory»       (por dentro: «Motor creativo para Claude Code»)
--   «SpecReel Stick» no cambia; solo su FAQ, que nombra a SpecReel como otro producto.
--
-- Base: producción tras la 0009 (comprobado el 2026-11-01: el HTML público coincide campo por campo con
-- scripts/fixtures/produccion-2026-11-01.json + 0009).
-- Guardas, para no pisar lo que el dueño edite en /market/admin:
--   - Título, meta título y meta descripción: solo si siguen EXACTAMENTE como los dejó la 0009.
--   - Descripción: el inicio se cambia solo si empieza con la frase exacta; los párrafos aclaratorios se insertan
--     antes de un encabezado que aparezca una sola vez y solo si todavía no están.
--   - FAQ: una pregunta se cambia solo si sigue con el texto exacto; las nuevas se agregan solo si no existen.
--   - ALT, ficha técnica y resumen: replace() de frases exactas (si ya no están, no cambia nada).
-- Sin LIKE (D1 rechaza patrones de más de 50 bytes). Idempotente. No toca precios, archivos, disponibilidad ni slugs.

-- ── 1. specreel → Motion 3D Video ──────────────────────────────────────────────────────────────────────────────
UPDATE products SET title = 'Motion 3D Video: videos explicativos y de producto con Claude Code', updated_at = 1793606400000
WHERE slug = 'specreel' AND title = 'SpecReel: videos 3D explicativos y de producto con Claude Code y Codex';

UPDATE products SET meta_title = 'Motion 3D Video: videos explicativos con Claude Code y Codex', updated_at = 1793606400000
WHERE slug = 'specreel' AND meta_title = 'SpecReel: videos explicativos 3D con Claude Code y Codex';

UPDATE products SET meta_description = 'Motion 3D Video: skill para Claude Code y Codex que convierte cualquier tema en un video 3D explicativo o de producto, narrado y con subtítulos. En tu PC.', updated_at = 1793606400000
WHERE slug = 'specreel' AND meta_description = 'Skill para Claude Code y Codex que convierte cualquier tema en un video explicativo o de producto 3D narrado, con subtítulos, música y cámara de cine. En tu PC.';

UPDATE products SET description = 'Motion 3D Video es una skill' || substr(description, length('SpecReel es una skill') + 1), updated_at = 1793606400000
WHERE slug = 'specreel' AND substr(description, 1, length('SpecReel es una skill')) = 'SpecReel es una skill';

-- Aclaración (una vez) para que el comprador no se confunda al abrir el ZIP. README.es.md: «Usa la skill specreel…».
UPDATE products SET description = replace(description, '## Pide un video. Recibe un MP4 terminado.',
		'En el ZIP la skill se llama SpecReel: ese nombre verás en el README, en la carpeta skills/specreel y al pedirle el video a tu agente («Usa la skill specreel…»).

## Pide un video. Recibe un MP4 terminado.'),
	updated_at = 1793606400000
WHERE slug = 'specreel' AND instr(description, 'la skill se llama SpecReel') = 0
	AND (length(description) - length(replace(description, '## Pide un video. Recibe un MP4 terminado.', ''))) = length('## Pide un video. Recibe un MP4 terminado.');

-- «La skill SpecReel (formato abierto SKILL.md)» se queda: es el nombre real de la skill.
UPDATE products SET description = replace(description, 'SpecReel es un producto independiente', 'Motion 3D Video es un producto independiente'), updated_at = 1793606400000
WHERE slug = 'specreel' AND instr(description, 'SpecReel es un producto independiente') > 0;

UPDATE products SET images = replace(images, '"alt":"SpecReel: ', '"alt":"Motion 3D Video: '), updated_at = 1793606400000
WHERE slug = 'specreel' AND instr(images, '"alt":"SpecReel: ') > 0;

UPDATE products SET faq = replace(faq, 'No por parte de SpecReel.', 'No por parte de Motion 3D Video.'), updated_at = 1793606400000
WHERE slug = 'specreel' AND instr(faq, 'No por parte de SpecReel.') > 0;

UPDATE products SET faq = json_insert(faq, '$[#]', json_object('q', '¿Por qué el ZIP dice SpecReel?', 'a', 'Motion 3D Video es el nombre en la tienda; la skill se llama SpecReel. Ese nombre verás en el README, en la carpeta skills/specreel y al pedirle el video a tu agente. Es el mismo producto.')),
	updated_at = 1793606400000
WHERE slug = 'specreel' AND json_valid(faq) AND instr(faq, 'Motion 3D Video') > 0
	AND NOT EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') = '¿Por qué el ZIP dice SpecReel?');

-- El resumen no se ve en la ficha (solo en la búsqueda de la tienda): nombre nuevo sin tocar «SpecReel Stick».
UPDATE products SET summary = replace(replace(replace(summary, 'SpecReel Stick', char(1)), 'SpecReel', 'Motion 3D Video'), char(1), 'SpecReel Stick'), updated_at = 1793606400000
WHERE slug = 'specreel' AND instr(replace(summary, 'SpecReel Stick', ''), 'SpecReel') > 0;

-- SpecReel Stick (no cambia de nombre): su FAQ presenta a SpecReel como otro producto → con su nombre nuevo.
UPDATE products SET faq = json_set(faq,
		'$[' || (SELECT key FROM json_each(products.faq) WHERE json_extract(value, '$.q') = '¿Necesito tener SpecReel?' AND json_extract(value, '$.a') = 'No. SpecReel Stick trae su propio motor y funciona solo. SpecReel es otro producto, para videos explicativos 3D de productos, procesos o datos.') || ']',
		json_object('q', '¿Necesito tener Motion 3D Video?', 'a', 'No. SpecReel Stick trae su propio motor y funciona solo. Motion 3D Video (la skill SpecReel) es otro producto, para videos explicativos 3D de productos, procesos o datos.')),
	updated_at = 1793606400000
WHERE slug = 'specreel-stick' AND json_valid(faq)
	AND EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') = '¿Necesito tener SpecReel?' AND json_extract(value, '$.a') = 'No. SpecReel Stick trae su propio motor y funciona solo. SpecReel es otro producto, para videos explicativos 3D de productos, procesos o datos.');

-- ── 2. cutpilot → Edit Pro para YouTube ────────────────────────────────────────────────────────────────────────
UPDATE products SET title = 'Edit Pro para YouTube: edita tus videos hablados con Claude Code', updated_at = 1793606400000
WHERE slug = 'cutpilot' AND title = 'CutPilot: edita tus videos hablados con Claude Code, en tu PC';

UPDATE products SET meta_title = 'Edit Pro para YouTube: edita videos con Claude Code', updated_at = 1793606400000
WHERE slug = 'cutpilot' AND meta_title = 'CutPilot: edita videos con Claude Code y quita muletillas';

UPDATE products SET meta_description = 'Edit Pro para YouTube: edita en tu PC videos hablados en español con Claude Code. Quita muletillas y silencios, subtitula y exporta 9:16 para Shorts y Reels.', updated_at = 1793606400000
WHERE slug = 'cutpilot' AND meta_description = 'Edita en tu PC videos hablados en español con Claude Code: quita muletillas, silencios y retomas, agrega subtítulos y gráficos y exporta en 16:9, 9:16 y 1:1.';

UPDATE products SET description = 'Edit Pro para YouTube es un editor automático' || substr(description, length('CutPilot es un editor automático') + 1), updated_at = 1793606400000
WHERE slug = 'cutpilot' AND substr(description, 1, length('CutPilot es un editor automático')) = 'CutPilot es un editor automático';

-- Para qué plataformas sirve (la ficha: 16:9, 9:16 y 1:1, capítulos para YouTube; no corta varios clips) y nombre interno.
UPDATE products SET description = replace(description, '## El problema que resuelve',
		'Sirve para YouTube (16:9, con capítulos) y, con el mismo video en 9:16, para Shorts, Reels y TikTok. Por dentro se llama CutPilot: ese nombre verás en el ZIP, en el README y en la guía de instalación.

## El problema que resuelve'),
	updated_at = 1793606400000
WHERE slug = 'cutpilot' AND instr(description, 'Por dentro se llama CutPilot') = 0
	AND (length(description) - length(replace(description, '## El problema que resuelve', ''))) = length('## El problema que resuelve');

UPDATE products SET images = replace(images, 'CutPilot', 'Edit Pro para YouTube'), updated_at = 1793606400000
WHERE slug = 'cutpilot' AND instr(images, 'CutPilot') > 0;

UPDATE products SET summary = replace(summary, 'CutPilot', 'Edit Pro para YouTube'), updated_at = 1793606400000
WHERE slug = 'cutpilot' AND instr(summary, 'CutPilot') > 0;

UPDATE products SET faq = json_insert(json_insert(faq,
		'$[#]', json_object('q', '¿Sirve para Shorts, Reels y TikTok?', 'a', 'Sí, en formato: entrega el mismo video en 16:9, 9:16 y 1:1, y en el vertical centra la cara. No corta varios clips de una grabación larga ni publica por ti: subes el MP4 a cada plataforma.')),
		'$[#]', json_object('q', '¿Por qué el ZIP dice CutPilot?', 'a', 'Edit Pro para YouTube es el nombre en la tienda; por dentro el estudio se llama CutPilot. Ese nombre verás en el ZIP, en el README y en la guía de instalación. Es el mismo producto.')),
	updated_at = 1793606400000
WHERE slug = 'cutpilot' AND json_valid(faq) AND instr(title, 'Edit Pro para YouTube') > 0
	AND NOT EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') IN ('¿Sirve para Shorts, Reels y TikTok?', '¿Por qué el ZIP dice CutPilot?'));

-- ── 3. motor-creativo-claude-code → Creative Factory ───────────────────────────────────────────────────────────
UPDATE products SET title = 'Creative Factory: 13 agentes de Claude Code para diseño, video y PDF', updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND title = 'Motor creativo: 13 agentes de Claude Code para diseño, video y PDF';

UPDATE products SET meta_title = 'Creative Factory: agentes de Claude Code para diseño gráfico', updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND meta_title = 'Agentes de Claude Code para diseño gráfico, video y PDF';

UPDATE products SET meta_description = 'Creative Factory: 13 subagentes de Claude Code en español que operan apps open source de diseño gráfico, video, audio, PDF y oficina vía MCP. Para Windows.', updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND meta_description = '13 subagentes de Claude Code en español que operan apps open source de diseño gráfico, video, audio, PDF y oficina vía MCP. Para Windows. Paga lo que quieras.';

UPDATE products SET description = 'Creative Factory es un kit para Claude Code' || substr(description, length('Un kit para Claude Code') + 1), updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND substr(description, 1, length('Un kit para Claude Code que trabaja')) = 'Un kit para Claude Code que trabaja';

-- Nombre interno: README.md del repo («# Motor creativo para Claude Code»), ANTIGRAVITY.md y AGENTS.md.
UPDATE products SET description = replace(description, '## El problema que resuelve',
		'Por dentro se llama «Motor creativo para Claude Code»: ese nombre verás en el ZIP, en el README y en la documentación.

## El problema que resuelve'),
	updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND instr(description, 'Por dentro se llama «Motor creativo') = 0
	AND (length(description) - length(replace(description, '## El problema que resuelve', ''))) = length('## El problema que resuelve');

UPDATE products SET images = replace(images, 'Motor creativo para Claude Code: 13 agentes en español', 'Creative Factory: 13 agentes de Claude Code en español'), updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND instr(images, 'Motor creativo para Claude Code: 13 agentes en español') > 0;

UPDATE products SET specs = replace(specs, 'sin reventa del motor', 'sin reventa de Creative Factory'), updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND instr(specs, 'sin reventa del motor') > 0;

UPDATE products SET faq = replace(replace(faq, 'El motor las registra', 'Creative Factory las registra'), '¿El motor se conecta a internet?', '¿Creative Factory se conecta a internet?'), updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND (instr(faq, 'El motor las registra') > 0 OR instr(faq, '¿El motor se conecta a internet?') > 0);

UPDATE products SET summary = replace(replace(summary, 'Motor creativo para Claude Code', 'Creative Factory'), 'Motor creativo', 'Creative Factory'), updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND instr(summary, 'Motor creativo') > 0;

UPDATE products SET faq = json_insert(faq, '$[#]', json_object('q', '¿Por qué el ZIP dice «Motor creativo para Claude Code»?', 'a', 'Creative Factory es el nombre en la tienda; por dentro el kit se llama «Motor creativo para Claude Code». Ese nombre verás en el ZIP, en el README y en la documentación. Es el mismo producto.')),
	updated_at = 1793606400000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(faq) AND instr(title, 'Creative Factory') > 0
	AND NOT EXISTS (SELECT 1 FROM json_each(products.faq) WHERE json_extract(value, '$.q') = '¿Por qué el ZIP dice «Motor creativo para Claude Code»?');
