-- Market Tony — títulos y frases cortas por palabra clave (pedido del dueño, 2026-11-01). Slugs iguales.
-- Las tarjetas muestran el nombre (lo que va antes de «:» en title) y debajo el tagline: ambos pasan a usar lo que la
-- gente escribe en Google. Investigación: autocompletado de Google (suggestqueries, hl=es con gl=mx/co/es/us; hl=en con
-- gl=us/gb/ca), consultado el 2026-11-01, y revisión de lo que rankea. SIN volúmenes de búsqueda (no hay acceso a Keyword
-- Planner ni a Search Console): que una frase salga en el autocompletado indica que se busca, no cuánto.
--
-- Campos: title (≤ 70, «<Nombre>: <frase>», el nombre de marca no cambia), tagline (≤ 75), meta_title (≤ 60),
-- meta_description (120–160) y tags; lo mismo en inglés dentro de i18n.en con json_set (el resto del JSON no se toca).
--
-- Guardas, para no pisar lo que el dueño edite en /market/admin: cada campo cambia solo si sigue EXACTAMENTE con el valor
-- que dejaron las migraciones 0009–0011 (comprobado contra el HTML público del 2026-11-01). Las etiquetas se comparan con
-- json() (mismo arreglo, sin importar espacios). Sin LIKE. Idempotente. No toca precios, archivos, disponibilidad,
-- descripción, FAQ, imágenes ni slugs. Los valores se escribieron una vez con un script desechable: edítala como SQL.

-- ── anuncios-infinitos → Anuncios Automáticos ──────────────────────────────────────────────────────────────
-- ES principal: «anuncios con inteligencia artificial» · secundarias: anuncios publicitarios con IA · ads con IA · prompts para anuncios publicitarios · prompts para Meta/Facebook Ads
-- EN principal: «AI advertising agent» · secondary: AI ad copy · AI advertising prompts · prompts for Facebook ads · AI ads prompt library
UPDATE products SET title = 'Anuncios Automáticos: agente de anuncios con inteligencia artificial', updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND title = 'Anuncios Automáticos: 250+ prompts para anuncios publicitarios con IA';

UPDATE products SET tagline = 'Anuncios con inteligencia artificial: tu agente investiga y escribe los ads', updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND tagline = 'Tu estratega de publicidad con IA: investiga tu negocio y te entrega 250+ prompts de anuncios, cada uno con su razón.';

UPDATE products SET meta_title = 'Anuncios Automáticos: anuncios con inteligencia artificial', updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND meta_title = 'Anuncios Automáticos: 250+ prompts para anuncios con IA';

UPDATE products SET meta_description = 'Anuncios con inteligencia artificial: un agente en español investiga tu negocio y escribe 250+ prompts y los textos de tus ads para Meta, Google y TikTok.', updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND meta_description = 'Anuncios Automáticos: agente de IA en español que investiga tu negocio y competencia y te entrega 250+ prompts para anuncios en Meta, Google, TikTok y LinkedIn.';

UPDATE products SET tags = json('["anuncios con inteligencia artificial","anuncios publicitarios con IA","ads con IA","prompts para anuncios publicitarios","prompts para Meta Ads","prompts para Facebook Ads","agente de IA en español"]'), updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND json_valid(tags) AND json(tags) = json('["prompts de anuncios","anuncios con IA","Meta Ads","Google Ads","TikTok Ads","LinkedIn Ads","agente de IA en español"]');

UPDATE products SET i18n = json_set(i18n, '$.en.title', 'Automatic Ads: AI advertising agent that writes your ads in Spanish'), updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND json_valid(i18n) AND json_extract(i18n, '$.en.title') = 'Automatic Ads: Spanish-language AI agent with 250+ ad prompts';

UPDATE products SET i18n = json_set(i18n, '$.en.tagline', 'AI ads in Spanish: your agent researches your business and writes the ads'), updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND json_valid(i18n) AND json_extract(i18n, '$.en.tagline') = 'Your AI advertising strategist, in Spanish: it researches your business and gives you 250+ ad prompts, each with its reasoning.';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_title', 'Automatic Ads: AI advertising agent (Spanish-language)'), updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_title') = 'Automatic Ads: 250+ AI ad prompts (Spanish-language agent)';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_description', 'Spanish-language AI advertising agent: researches your business and competitors, then writes 250+ ad prompts and ad copy for Meta, Google and TikTok.'), updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_description') = 'Automatic Ads: Spanish-language AI agent that researches your business and competitors and delivers 250+ ad prompts for Meta, Google, TikTok and LinkedIn.';

UPDATE products SET i18n = json_set(i18n, '$.en.tags', json('["AI advertising agent","AI ads agent","AI ad copy","AI advertising prompts","prompts for Facebook ads","AI ads prompt library","Spanish-language ads"]')), updated_at = 1793640000000
WHERE slug = 'anuncios-infinitos' AND json_valid(i18n) AND json_type(i18n, '$.en.tags') = 'array'
	AND json(json_extract(i18n, '$.en.tags')) = json('["AI ad prompts","prompts for Facebook ads","ad copy prompts","AI ads prompt library","Meta Ads","Google Ads","Spanish-language AI ad agent"]');


-- ── specreel → Motion 3D Video ─────────────────────────────────────────────────────────────────────────────
-- ES principal: «videos explicativos con IA» · secundarias: videos 3D con IA · videos de productos con IA · videos animados con IA · crear videos con Claude Code
-- EN principal: «AI explainer video» · secondary: 3D explainer video · 3D product video AI · Claude Code video generation skill
UPDATE products SET title = 'Motion 3D Video: crea videos explicativos 3D con IA y Claude Code', updated_at = 1793640000000
WHERE slug = 'specreel' AND title = 'Motion 3D Video: videos explicativos y de producto con Claude Code';

UPDATE products SET tagline = 'Videos explicativos con IA: pides un tema y recibes un MP4 3D narrado', updated_at = 1793640000000
WHERE slug = 'specreel' AND tagline = 'Pide un video a tu agente y recibe un MP4 3D narrado, con subtítulos, música y cámara de cine.';

UPDATE products SET meta_title = 'Motion 3D Video: videos explicativos con IA y de producto', updated_at = 1793640000000
WHERE slug = 'specreel' AND meta_title = 'Motion 3D Video: videos explicativos con Claude Code y Codex';

UPDATE products SET meta_description = 'Crea videos explicativos y de producto con IA: una skill para Claude Code y Codex convierte tu tema en un video 3D narrado, con subtítulos y música. En tu PC.', updated_at = 1793640000000
WHERE slug = 'specreel' AND meta_description = 'Motion 3D Video: skill para Claude Code y Codex que convierte cualquier tema en un video 3D explicativo o de producto, narrado y con subtítulos. En tu PC.';

UPDATE products SET tags = json('["videos explicativos con IA","videos 3D con IA","videos de productos con IA","videos animados con IA","crear videos con Claude Code","videos con Codex","subtítulos karaoke"]'), updated_at = 1793640000000
WHERE slug = 'specreel' AND json_valid(tags) AND json(tags) = json('["videos con Claude Code","videos con Codex","videos 3D con IA","video explicativo con IA","video de producto con IA","subtítulos karaoke"]');

UPDATE products SET i18n = json_set(i18n, '$.en.title', 'Motion 3D Video: AI explainer and 3D product videos with Claude Code'), updated_at = 1793640000000
WHERE slug = 'specreel' AND json_valid(i18n) AND json_extract(i18n, '$.en.title') = 'Motion 3D Video: 3D explainer and product videos with Claude Code';

UPDATE products SET i18n = json_set(i18n, '$.en.tagline', 'AI explainer videos: give your agent a topic, get a narrated 3D MP4'), updated_at = 1793640000000
WHERE slug = 'specreel' AND json_valid(i18n) AND json_extract(i18n, '$.en.tagline') = 'Ask your agent for a video and get a narrated 3D MP4 with captions, music and a cinematic camera.';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_title', 'Motion 3D Video: AI explainer videos in 3D with Claude Code'), updated_at = 1793640000000
WHERE slug = 'specreel' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_title') = 'Motion 3D Video: 3D explainer videos with Claude Code';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_description', 'Make AI explainer and 3D product videos: a Claude Code and Codex skill turns any topic into a narrated 3D MP4 with captions and music. Runs on your PC.'), updated_at = 1793640000000
WHERE slug = 'specreel' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_description') = 'Motion 3D Video: a Claude Code and Codex skill that turns any topic into a narrated 3D explainer or product video with captions and music. Runs on your PC.';

UPDATE products SET i18n = json_set(i18n, '$.en.tags', json('["AI explainer video","3D explainer video","3D product video AI","Claude Code video generation skill","animated video AI from text","karaoke captions"]')), updated_at = 1793640000000
WHERE slug = 'specreel' AND json_valid(i18n) AND json_type(i18n, '$.en.tags') = 'array'
	AND json(json_extract(i18n, '$.en.tags')) = json('["Claude Code video skill","Claude Code video generation","explainer video AI","3D explainer video","animated video AI from text","karaoke captions"]');


-- ── specreel-stick → SpecReel Stick ────────────────────────────────────────────────────────────────────────
-- ES principal: «videos de palitos animados» · secundarias: animaciones de palitos · muñecos de palitos animados · monitos de palitos · stickman IA
-- EN principal: «stick figure animation AI» · secondary: stickman animation AI · AI stick figure video generator · stick figure video maker
UPDATE products SET title = 'SpecReel Stick: videos de palitos animados con IA para Reels y TikTok', updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND title = 'SpecReel Stick: videos animados de muñequitos de palo con Claude Code';

UPDATE products SET tagline = 'Animaciones de palitos con IA: cuentas la idea y recibes el MP4 con música', updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND tagline = 'Le cuentas la idea a tu agente y te devuelve un sketch de muñequitos de palo en MP4, con subtítulos, música y efectos.';

UPDATE products SET meta_title = 'SpecReel Stick: videos de palitos animados con IA', updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND meta_title = 'SpecReel Stick: videos de palitos animados con Claude Code';

UPDATE products SET meta_description = 'Videos de palitos animados con IA: skill para Claude Code y Codex que crea sketches de muñecos de palitos en MP4, con subtítulos, música y efectos. En tu PC.', updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND meta_description = 'Skill para Claude Code y Codex que crea sketches de muñequitos de palo (monitos de palitos) en MP4 vertical, con subtítulos, música y efectos. Corre en tu PC.';

UPDATE products SET tags = json('["videos de palitos animados","animaciones de palitos","muñecos de palitos animados","monitos de palitos","stickman con IA","sketches animados para Reels y TikTok","videos sin voz con subtítulos"]'), updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND json_valid(tags) AND json(tags) = json('["videos de muñequitos de palo","animación de stick figures","videos con Claude Code","videos con Codex","reels animados de hábitos","videos sin voz con subtítulos","sketches animados para TikTok"]');

UPDATE products SET i18n = json_set(i18n, '$.en.title', 'SpecReel Stick: AI stick figure animation videos with Claude Code'), updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND json_valid(i18n) AND json_extract(i18n, '$.en.title') = 'SpecReel Stick: stick figure animation videos with Claude Code';

UPDATE products SET i18n = json_set(i18n, '$.en.tagline', 'Stick figure animation with AI: tell your agent the idea, get the MP4'), updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND json_valid(i18n) AND json_extract(i18n, '$.en.tagline') = 'Tell your agent the idea and get back a stick-figure skit as an MP4, with captions, music and effects.';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_description', 'AI stick figure animation: a Claude Code and Codex skill that creates stick-figure skits as MP4s with captions, music and effects. Runs on your PC.'), updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_description') = 'Claude Code and Codex skill that creates stick-figure skits as vertical MP4s with captions, music and effects. Runs on your computer, with or without a GPU.';

UPDATE products SET i18n = json_set(i18n, '$.en.tags', json('["stick figure animation AI","stickman animation AI","AI stick figure video generator","stick figure video maker","animated skits for TikTok and Reels","silent videos with captions"]')), updated_at = 1793640000000
WHERE slug = 'specreel-stick' AND json_valid(i18n) AND json_type(i18n, '$.en.tags') = 'array'
	AND json(json_extract(i18n, '$.en.tags')) = json('["stick figure animation","stick figure animation AI","stick figure AI video generator","stick figure animation for YouTube","animated habit reels","silent videos with captions","animated skits for TikTok"]');


-- ── pagespeed-forensics → PageSpeed Forensics ──────────────────────────────────────────────────────────────
-- ES principal: «PageSpeed móvil» · secundarias: mejorar la velocidad de carga de mi página web · mejorar LCP · Core Web Vitals · Lighthouse móvil
-- EN principal: «PageSpeed Insights mobile score (low)» · secondary: improve PageSpeed Insights · improve LCP on mobile · Core Web Vitals fix
UPDATE products SET title = 'PageSpeed Forensics: mejora tu PageSpeed móvil con Claude Code', updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND title = 'PageSpeed Forensics: skill de Claude Code para mejorar PageSpeed móvil';

UPDATE products SET tagline = '¿PageSpeed móvil atascado en 85? Encuentra la causa y prueba arreglos', updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND tagline = 'Descubre con evidencia por qué tu web saca 85 en PageSpeed móvil y 100 en tu PC, y prueba arreglos sin recompilar.';

UPDATE products SET meta_title = 'PageSpeed Forensics: mejora tu PageSpeed móvil y tu LCP', updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND meta_title = 'Mejorar PageSpeed móvil con Claude Code: PageSpeed Forensics';

UPDATE products SET meta_description = '¿Tu web no pasa de 85–90 en PageSpeed móvil? Skill de Claude Code que encuentra la causa con evidencia, mide el LCP y prueba arreglos sin recompilar.', updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND meta_description = 'Skill de Claude Code que muestra con evidencia por qué tu web no pasa de 85–90 en PageSpeed móvil y prueba arreglos sin recompilar. Tú pones el precio.';

UPDATE products SET tags = json('["PageSpeed móvil","mejorar la velocidad de carga de mi página web","mejorar LCP","Core Web Vitals","Lighthouse móvil","skill para Claude Code","PageSpeed Insights sin API key"]'), updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND json_valid(tags) AND json(tags) = json('["mejorar PageSpeed móvil","optimizar Core Web Vitals","subir puntaje de Lighthouse","LCP y FCP lentos en móvil","skill para Claude Code","auditoría de rendimiento web","optimizar Next.js para PageSpeed"]');

UPDATE products SET i18n = json_set(i18n, '$.en.title', 'PageSpeed Forensics: find why your mobile PageSpeed score is low'), updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND json_valid(i18n) AND json_extract(i18n, '$.en.title') = 'PageSpeed Forensics: Claude Code skill to improve mobile PageSpeed';

UPDATE products SET i18n = json_set(i18n, '$.en.tagline', 'Low PageSpeed mobile score? Find the cause with evidence and test fixes'), updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND json_valid(i18n) AND json_extract(i18n, '$.en.tagline') = 'Find out, with evidence, why your site scores 85 on mobile PageSpeed and 100 on your PC, and test fixes without rebuilding.';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_title', 'Low PageSpeed Insights mobile score? A Claude Code skill'), updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_title') = 'Improve PageSpeed Insights mobile score with Claude Code';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_description', 'Claude Code skill that shows with evidence why your PageSpeed Insights mobile score is stuck at 85–90, measures LCP and tests fixes without rebuilding.'), updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_description') = 'Claude Code skill that shows with evidence why your site is stuck at 85–90 on mobile PageSpeed and tests fixes without rebuilding. Pay what you want.';

UPDATE products SET i18n = json_set(i18n, '$.en.tags', json('["PageSpeed Insights mobile score low","improve PageSpeed Insights","improve LCP on mobile","Core Web Vitals fix","Lighthouse mobile performance score","Claude Code skills","PageSpeed Insights without API key"]')), updated_at = 1793640000000
WHERE slug = 'pagespeed-forensics' AND json_valid(i18n) AND json_type(i18n, '$.en.tags') = 'array'
	AND json(json_extract(i18n, '$.en.tags')) = json('["PageSpeed Insights mobile score low","improve PageSpeed Insights","Core Web Vitals","Lighthouse mobile performance score","Claude Code skills","slow LCP on mobile","PageSpeed Insights without API key"]');


-- ── cutpilot → Edit Pro para YouTube ───────────────────────────────────────────────────────────────────────
-- ES principal: «editar videos para YouTube con IA» · secundarias: editor de video con IA para PC · quitar muletillas de un video · quitar silencios de un video · editar videos con Claude Code
-- EN principal: «AI video editor for YouTube» · secondary: remove filler words from video · remove silence from video · Claude Code video editing
UPDATE products SET title = 'Edit Pro para YouTube: edita con IA tus videos hablados en español', updated_at = 1793640000000
WHERE slug = 'cutpilot' AND title = 'Edit Pro para YouTube: edita tus videos hablados con Claude Code';

UPDATE products SET tagline = 'Edita con IA tus videos en español: quita muletillas y silencios, subtitula', updated_at = 1793640000000
WHERE slug = 'cutpilot' AND tagline = 'Dejas tu grabación en una carpeta y recibes el video limpio, subtitulado, con gráficos y revisado por un QA automático.';

UPDATE products SET meta_title = 'Edit Pro para YouTube: editar videos con IA en español', updated_at = 1793640000000
WHERE slug = 'cutpilot' AND meta_title = 'Edit Pro para YouTube: edita videos con Claude Code';

UPDATE products SET meta_description = 'Edita videos para YouTube con IA en tu PC: quita muletillas, silencios y retomas de tus videos hablados en español, subtitula y exporta en 16:9 y 9:16.', updated_at = 1793640000000
WHERE slug = 'cutpilot' AND meta_description = 'Edit Pro para YouTube: edita en tu PC videos hablados en español con Claude Code. Quita muletillas y silencios, subtitula y exporta 9:16 para Shorts y Reels.';

UPDATE products SET tags = json('["editar videos para YouTube con IA","editor de video con IA para PC","quitar muletillas de un video","quitar silencios de un video","subtítulos automáticos en español","editar videos con Claude Code","editar Shorts con IA"]'), updated_at = 1793640000000
WHERE slug = 'cutpilot' AND json_valid(tags) AND json(tags) = json('["editar videos con Claude Code","quitar muletillas de un video","cortar silencios automáticamente","subtítulos automáticos en español","editar videos con Whisper","video vertical 9:16 automático","editar videos con Remotion"]');

UPDATE products SET i18n = json_set(i18n, '$.en.title', 'Edit Pro for YouTube: AI video editor for Spanish talking videos'), updated_at = 1793640000000
WHERE slug = 'cutpilot' AND json_valid(i18n) AND json_extract(i18n, '$.en.title') = 'Edit Pro for YouTube: edit Spanish talking videos with Claude Code';

UPDATE products SET i18n = json_set(i18n, '$.en.tagline', 'AI video editor for Spanish videos: cuts filler words and silences'), updated_at = 1793640000000
WHERE slug = 'cutpilot' AND json_valid(i18n) AND json_extract(i18n, '$.en.tagline') = 'Drop your recording in a folder and get the video back clean, captioned, with graphics and checked by automatic QA. For videos in Spanish.';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_title', 'Edit Pro for YouTube: AI video editor (Spanish videos)'), updated_at = 1793640000000
WHERE slug = 'cutpilot' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_title') = 'Edit Pro for YouTube: Claude Code video editing (Spanish)';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_description', 'AI video editor for YouTube, for talking videos in Spanish: removes filler words, silences and retakes, adds captions and exports 16:9 and 9:16. On your PC.'), updated_at = 1793640000000
WHERE slug = 'cutpilot' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_description') = 'Edit Pro for YouTube: edit Spanish-language talking videos on your PC with Claude Code. Removes filler words and silences, adds captions and exports 9:16.';

UPDATE products SET i18n = json_set(i18n, '$.en.tags', json('["AI video editor for YouTube","remove filler words from video","remove silence from video","automatic video editing","Claude Code video editing","automatic Spanish subtitles","Spanish video editing"]')), updated_at = 1793640000000
WHERE slug = 'cutpilot' AND json_valid(i18n) AND json_type(i18n, '$.en.tags') = 'array'
	AND json(json_extract(i18n, '$.en.tags')) = json('["Claude Code video editing","remove filler words from video","remove silence from video","YouTube video editor AI","Spanish video editing","automatic Spanish subtitles","Claude Code Remotion"]');


-- ── motor-creativo-claude-code → Creative Factory ──────────────────────────────────────────────────────────
-- ES principal: «agentes de IA para diseño gráfico» · secundarias: agentes de Claude Code · Claude Code para diseño gráfico · subagentes de Claude Code · Claude Code MCP
-- EN principal: «AI agents for graphic design» · secondary: Claude Code agents · Claude Code subagents · Claude Code for designers · Claude Code MCP servers
UPDATE products SET title = 'Creative Factory: 13 agentes de IA para diseño gráfico, video y PDF', updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND title = 'Creative Factory: 13 agentes de Claude Code para diseño, video y PDF';

UPDATE products SET tagline = 'Agentes de IA para diseño gráfico: pides la pieza y Claude Code la produce', updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND tagline = 'Pide en español la pieza que necesitas y un agente de Claude Code la produce con apps open source en tu PC.';

UPDATE products SET meta_title = 'Creative Factory: agentes de IA para diseño gráfico y video', updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND meta_title = 'Creative Factory: agentes de Claude Code para diseño gráfico';

UPDATE products SET meta_description = 'Agentes de IA para diseño gráfico, video, PDF y oficina: 13 subagentes de Claude Code en español que operan apps open source vía MCP en tu PC con Windows.', updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND meta_description = 'Creative Factory: 13 subagentes de Claude Code en español que operan apps open source de diseño gráfico, video, audio, PDF y oficina vía MCP. Para Windows.';

UPDATE products SET tags = json('["agentes de IA para diseño gráfico","agentes de Claude Code","Claude Code para diseño gráfico","subagentes de Claude Code","Claude Code MCP","apps open source de diseño con IA","editar PDF con Claude Code"]'), updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(tags) AND json(tags) = json('["agentes de Claude Code para diseño","automatizar diseño gráfico con IA","servidores MCP para diseño y video","editar PDF con Claude Code","crear presentaciones y planillas con IA","apps open source de diseño con IA","subagentes y skills para Claude Code"]');

UPDATE products SET i18n = json_set(i18n, '$.en.title', 'Creative Factory: 13 AI agents for graphic design, video and PDF'), updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(i18n) AND json_extract(i18n, '$.en.title') = 'Creative Factory: 13 Claude Code agents for design, video and PDF';

UPDATE products SET i18n = json_set(i18n, '$.en.tagline', 'AI agents for graphic design: ask in Spanish and Claude Code makes it'), updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(i18n) AND json_extract(i18n, '$.en.tagline') = 'Ask in Spanish for the piece you need and a Claude Code agent produces it with open-source apps on your PC.';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_title', 'Creative Factory: AI agents for graphic design (Claude Code)'), updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_title') = 'Creative Factory: Claude Code agents for graphic design';

UPDATE products SET i18n = json_set(i18n, '$.en.meta_description', 'AI agents for graphic design: 13 Claude Code subagents run open-source design, video, PDF and office apps via MCP on Windows. Agents and docs in Spanish.'), updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(i18n) AND json_extract(i18n, '$.en.meta_description') = 'Creative Factory: 13 Claude Code subagents that run open-source design, video, audio, PDF and office apps via MCP. Agents and docs in Spanish. Windows only.';

UPDATE products SET i18n = json_set(i18n, '$.en.tags', json('["AI agents for graphic design","Claude Code agents","Claude Code subagents","Claude Code for designers","Claude Code graphic design","Claude Code MCP servers","open-source design apps with AI"]')), updated_at = 1793640000000
WHERE slug = 'motor-creativo-claude-code' AND json_valid(i18n) AND json_type(i18n, '$.en.tags') = 'array'
	AND json(json_extract(i18n, '$.en.tags')) = json('["Claude Code agents","Claude Code subagents","Claude Code MCP servers","Claude Code for designers","Claude Code skills","AI graphic design automation","open-source design apps with AI"]');
