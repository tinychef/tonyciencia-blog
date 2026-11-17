-- Market Tony — «Reel 4K Studio» pasa a llamarse «Video 4K» (pedido del dueño, 2026-11-17), con slug nuevo
-- video-4k-con-claude (decisión del dueño). Generada una vez con un script desechable: edítala como SQL.
--
-- A diferencia de la 0015 (Stick Sketch), aquí se renombra la MISMA fila: mismo id, mismo archivo ya subido, mismos
-- pedidos y accesos de quien ya compró. El slug viejo deja de existir en la base y su ficha responde 301 a la nueva
-- porque la ruta mira RENAMED_PRODUCTS (src/lib/catalog.ts) antes de dar 404. Precio, archivo, disponibilidad,
-- compat, orden, ventas y reseñas no cambian.
--
-- Nombre: «Video 4K»; «con Claude» / «con Claude Code» van solo como descripción de compatibilidad (las reglas de marca
-- de Anthropic no permiten «Claude» como nombre de un producto ajeno, y «por Claude» daría a entender que lo hace o lo
-- respalda Anthropic). Se mantiene el aviso de producto independiente en la descripción y en la FAQ.
-- Subtítulo (tagline): los estilos de las 7 herramientas. Redes (YouTube, TikTok, Instagram, Facebook): solo como
-- formato (16:9 / 9:16), que la guía LEEME-PRIMERO respalda («una versión vertical recompuesta» para redes); la FAQ
-- nueva aclara que no publica por ti ni tiene relación con esas plataformas.
-- Dentro del ZIP sigue llamándose Code Video Studio V3 (y el archivo, reel-4k-studio-3.0.zip, no se vuelve a subir).
--
-- Guarda: solo corre si existe reel-4k-studio y todavía no existe video-4k-con-claude. Idempotente. Sin LIKE.

UPDATE products SET
	slug = 'video-4k-con-claude',
	title = 'Video 4K: 7 herramientas para videos con Claude Code',
	tagline = 'Intros, collage editorial, paisajes, personajes, acción 3D y anuncios',
	summary = 'Siete herramientas (skills) para Claude: intros de títulos, collage editorial, paisajes en parallax, personajes, acción 3D, anuncios y un director. MP4 en 4K (o 2K), en 16:9 o 9:16 para tus redes.',
	meta_title = 'Video 4K: videos animados con Claude Code',
	meta_description = 'Videos animados con Claude en 4K: 7 herramientas para intros, collage editorial, paisajes, personajes, acción 3D y anuncios, en 16:9 o 9:16 para tus redes.',
	description = replace(replace(description, 'Reel 4K Studio', 'Video 4K'), 'Creadores y marcas que necesitan cabeceras, intros de canal, explainers, escenas de ambiente o anuncios cortos, y prefieren que Claude los haga en código antes que animar a mano o contratar un estudio.', 'Creadores y marcas que necesitan cabeceras, intros de canal, explainers, escenas de ambiente o anuncios cortos, y prefieren que Claude los haga en código antes que animar a mano o contratar un estudio. Los videos salen en 16:9 o 9:16, el formato de YouTube, TikTok, Instagram y Facebook.'),
	highlights = json('["7 herramientas, 7 estilos: intros de títulos, collage editorial, paisajes en parallax, personajes, acción 3D, anuncios y un director","Claude diseña, anima, compone la música y los efectos, revisa su trabajo y entrega el MP4","MP4 a 30 fps en 4K (2K si tu máquina no da para 4K), en 16:9 o 9:16: para YouTube, TikTok, Instagram y Facebook","Apruebas un cuadro de estilo antes de animar, y la entrega solo vale cuando verify.txt dice PASS","Briefs probados para cada skill, en español e inglés, listos para copiar","Cada entrega trae vista previa 1080p, afiche, hoja de contactos y notas con fuentes y licencias"]'),
	tags = json('["videos animados con Claude","skills de Claude para video","videos para YouTube, TikTok e Instagram con IA","intros animadas para tu canal","explainers animados con IA","anuncios en video con IA","videos en 4K con Claude Code"]'),
	faq = json_insert(replace(faq, 'Reel 4K Studio', 'Video 4K'), '$[#]', json('{"q":"¿Sirve para YouTube, TikTok, Instagram y Facebook?","a":"Sí, por formato: cada pieza sale en 16:9 (horizontal), 9:16 (vertical) o ambos, y product-spot arma una versión vertical recompuesta para redes. Video 4K no publica por ti ni tiene relación con esas plataformas: el MP4 lo subes tú."}')),
	specs = replace(specs, 'Reel 4K Studio', 'Video 4K'),
	images = replace(replace(images, 'Reel 4K Studio', 'Video 4K'), '/products/reel-4k-studio/', '/products/video-4k-con-claude/'),
	i18n = json_set(replace(i18n, 'Reel 4K Studio', 'Video 4K'),
		'$.en.title', 'Video 4K: 7 tools for videos with Claude Code',
		'$.en.tagline', 'Intros, editorial collage, landscapes, characters, 3D action and ads',
		'$.en.summary', 'Seven tools (skills) for Claude: title intros, editorial collage, parallax landscapes, characters, 3D action, ads and a director. A 4K (or 2K) MP4 in 16:9 or 9:16 for your socials.',
		'$.en.meta_title', 'Video 4K: animated videos with Claude Code',
		'$.en.meta_description', 'Animated videos with Claude in 4K: 7 tools for intros, editorial collage, landscapes, characters, 3D action and ads, in 16:9 or 9:16 for your socials.',
		'$.en.description', replace(replace(json_extract(i18n, '$.en.description'), 'Reel 4K Studio', 'Video 4K'), 'Creators and brands that need openers, channel intros, explainers, mood scenes or short ads, and would rather have Claude make them in code than animate by hand or hire a studio.', 'Creators and brands that need openers, channel intros, explainers, mood scenes or short ads, and would rather have Claude make them in code than animate by hand or hire a studio. The videos come out in 16:9 or 9:16, the format of YouTube, TikTok, Instagram and Facebook.'),
		'$.en.highlights', json('["7 tools, 7 styles: title intros, editorial collage, parallax landscapes, characters, 3D action, ads and a director","Claude designs, animates, composes the music and effects, reviews its work and delivers the MP4","30 fps MP4 in 4K (2K if your machine can''t handle 4K), in 16:9 or 9:16: for YouTube, TikTok, Instagram and Facebook","You approve a style frame before animating, and the delivery only counts when verify.txt says PASS","Tested briefs for every skill, in English and Spanish, ready to copy","Every delivery comes with a 1080p preview, poster, contact sheet and notes on fonts and licenses"]'),
		'$.en.tags', json('["animated videos with Claude","Claude skills for video","AI videos for YouTube, TikTok and Instagram","animated channel intros","AI animated explainers","AI video ads","4K videos with Claude Code"]'),
		'$.en.faq', json(json_insert(replace(json_extract(i18n, '$.en.faq'), 'Reel 4K Studio', 'Video 4K'), '$[#]', json('{"q":"Does it work for YouTube, TikTok, Instagram and Facebook?","a":"Yes, format-wise: every piece comes out in 16:9 (horizontal), 9:16 (vertical) or both, and product-spot builds a recomposed vertical version for social media. Video 4K doesn''t post for you and has no relationship with those platforms: you upload the MP4."}')))),
	updated_at = 1794873600002
WHERE slug = 'reel-4k-studio'
	AND NOT EXISTS (SELECT 1 FROM products WHERE slug = 'video-4k-con-claude');
