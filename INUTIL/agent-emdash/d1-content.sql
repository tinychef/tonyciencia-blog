-- 1. Update byline: EmDash Editorial → Antonio Duque
UPDATE _emdash_bylines SET
  slug = 'antonio-duque',
  display_name = 'Antonio Duque',
  bio = 'Entrepreneur, educator y especialista en automatizacion e IA. Fundador de Tony Ciencia LLC.',
  website_url = 'https://tonyciencia.com',
  is_guest = 0
WHERE id = '01KP1Y1X15H4D3WWSM22CGQKRM';

-- 2. Update taxonomies: replace seed categories with real ones
UPDATE taxonomies SET slug = 'automatizacion', label = 'Automatizacion' WHERE slug = 'development';
UPDATE taxonomies SET slug = 'claude-code', label = 'Claude Code' WHERE slug = 'design';
UPDATE taxonomies SET slug = 'google-ads', label = 'Google Ads' WHERE slug = 'notes';
UPDATE taxonomies SET slug = 'meta-ads', label = 'Meta Ads' WHERE slug = 'webdev';
UPDATE taxonomies SET slug = 'n8n', label = 'n8n' WHERE slug = 'opinion';
UPDATE taxonomies SET slug = 'ia', label = 'Inteligencia Artificial' WHERE slug = 'tools';
UPDATE taxonomies SET slug = 'negocios', label = 'Negocios Digitales' WHERE slug = 'creativity';

-- 3. Delete seed posts and insert real Tony Ciencia posts
DELETE FROM content_taxonomies;
DELETE FROM ec_posts;

-- Post 1: Creative Is the New Targeting (Meta Ads 2026) - EN
INSERT INTO ec_posts (id, slug, status, primary_byline_id, created_at, updated_at, published_at, version, locale, translation_group, title, featured_image, content, excerpt) VALUES
('01KTC001META001EN00000000001', 'creative-is-the-new-targeting-2026', 'published', '01KP1Y1X15H4D3WWSM22CGQKRM', '2026-03-15T10:00:00.000Z', '2026-03-15T10:00:00.000Z', '2026-03-15T10:00:00.000Z', 1, 'en', 'grp-meta-creative', 'Creative Is the New Targeting: Meta Ads Strategy for 2026', NULL,
'[{"_type":"block","style":"normal","children":[{"_type":"span","text":"In 2026, the old playbook for Meta advertising is dead. The audience-first approach—where you meticulously built custom audiences, lookalikes, and interest stacks—has been replaced by something more fundamental: creative excellence."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"Why Creative Now Leads"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Meta Advantage+ has fundamentally changed how ads are distributed. The algorithm now finds your audience based on your creative signal. That means a high-performing video or image does the targeting work for you—reaching people who respond to that specific message, tone, and visual language."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Brands that are winning in this environment have one thing in common: they test creative relentlessly. Not just A/B testing headlines, but fundamentally different hooks, formats, and emotional angles. They treat their ad account like a media company."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"What This Means for Your Budget"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"If you are spending more on audience research than on creative production, your budget allocation is wrong. The 2026 playbook is: 20% on audience/strategy, 80% on creative iteration. Great creative at scale beats perfect targeting with mediocre ads every time."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"For entrepreneurs and small agencies, this is actually good news. You can now compete with larger players if your creative is more authentic, more resonant, and more human. The algorithm does not care about your budget—it cares about engagement signals."}]}]',
'The audience-first playbook is dead. In 2026, Meta''s algorithm finds your audience based on your creative. Here''s how to adapt.');

-- Post 2: Creative Is the New Targeting - ES
INSERT INTO ec_posts (id, slug, status, primary_byline_id, created_at, updated_at, published_at, version, locale, translation_group, title, featured_image, content, excerpt) VALUES
('01KTC001META001ES00000000002', 'el-creativo-es-el-nuevo-targeting-2026', 'published', '01KP1Y1X15H4D3WWSM22CGQKRM', '2026-03-15T10:00:00.000Z', '2026-03-15T10:00:00.000Z', '2026-03-15T10:00:00.000Z', 1, 'es', 'grp-meta-creative', 'El Creativo Es el Nuevo Targeting: Estrategia de Meta Ads para 2026', NULL,
'[{"_type":"block","style":"normal","children":[{"_type":"span","text":"En 2026, el antiguo manual de publicidad en Meta ha muerto. El enfoque centrado en audiencias—donde construias meticulosamente audiencias personalizadas, lookalikes y stacks de intereses—ha sido reemplazado por algo mas fundamental: la excelencia creativa."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"Por Que el Creativo Lidera Ahora"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Meta Advantage+ ha cambiado fundamentalmente como se distribuyen los anuncios. El algoritmo ahora encuentra tu audiencia basandose en tu senal creativa. Eso significa que un video o imagen de alto rendimiento hace el trabajo de targeting por ti."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Las marcas que estan ganando en este entorno tienen una cosa en comun: prueban creativos sin descanso. No solo testean titulos A/B, sino angulos emocionales, formatos y hooks fundamentalmente distintos. Tratan su cuenta de anuncios como una empresa de medios."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"Que Significa Esto para Tu Presupuesto"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Si gastas mas en investigacion de audiencias que en produccion creativa, tu asignacion de presupuesto esta equivocada. El playbook 2026 es: 20% en audiencia/estrategia, 80% en iteracion creativa. Un gran creativo a escala supera al targeting perfecto con anuncios mediocres."}]}]',
'El playbook de audiencias ha muerto. En 2026, el algoritmo de Meta encuentra tu audiencia segun tu creativo. Aqui como adaptarte.');

-- Post 3: Meta Advantage+ Algorithm - EN
INSERT INTO ec_posts (id, slug, status, primary_byline_id, created_at, updated_at, published_at, version, locale, translation_group, title, featured_image, content, excerpt) VALUES
('01KTC002ADVA001EN0000000003', 'meta-advantage-plus-when-algorithm-knows-better', 'published', '01KP1Y1X15H4D3WWSM22CGQKRM', '2026-02-20T10:00:00.000Z', '2026-02-20T10:00:00.000Z', '2026-02-20T10:00:00.000Z', 1, 'en', 'grp-advantage', 'Meta Advantage+: When the Algorithm Knows Better Than You', NULL,
'[{"_type":"block","style":"normal","children":[{"_type":"span","text":"Meta Advantage+ Shopping Campaigns launched with skepticism from most performance marketers. Giving control to the algorithm felt like a step backward. A year later, the results speak for themselves: brands that adopted Advantage+ early are seeing 20-32% lower cost per purchase compared to manual campaigns."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"What Advantage+ Actually Does"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Unlike traditional campaigns where you define the audience, Advantage+ uses machine learning to find buyers across Meta''s entire inventory—Facebook, Instagram, Reels, Messenger, Audience Network—with a single budget. It adjusts placement, creative, and audience in real time."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"The key insight is that Meta has more data than any single advertiser. It sees patterns across millions of accounts. When you fight the algorithm, you are fighting with one hand tied behind your back."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"When to Trust, When to Override"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Advantage+ works best for e-commerce with clear conversion events. It struggles when your product has a very narrow ideal customer (B2B enterprise, hyper-niche products). In those cases, a hybrid approach—Advantage+ for top-of-funnel, manual campaigns for retargeting—tends to outperform either alone."}]}]',
'Meta Advantage+ gives control to the algorithm—and early adopters are seeing 20-32% lower cost per purchase. Here is when to trust it.');

-- Post 4: Performance Max vs Search 2026 - EN
INSERT INTO ec_posts (id, slug, status, primary_byline_id, created_at, updated_at, published_at, version, locale, translation_group, title, featured_image, content, excerpt) VALUES
('01KTC003PMAX001EN0000000004', 'performance-max-vs-search-2026', 'published', '01KP1Y1X15H4D3WWSM22CGQKRM', '2026-01-10T10:00:00.000Z', '2026-01-10T10:00:00.000Z', '2026-01-10T10:00:00.000Z', 1, 'en', 'grp-pmax', 'Performance Max vs Search Campaigns: The 2026 Guide', NULL,
'[{"_type":"block","style":"normal","children":[{"_type":"span","text":"Google''s Performance Max has matured. When it launched, it was a black box that made veteran PPC managers nervous. By 2026, it has proven itself in specific scenarios while Search campaigns remain irreplaceable in others. The answer is not either/or—it is knowing when to use which."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"Where Performance Max Wins"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"PMax excels at finding incremental conversions across Google''s full inventory: Search, Display, YouTube, Gmail, Maps, Discover. For e-commerce brands with strong product feeds and clear ROAS targets, PMax typically delivers 15-25% more conversions at similar efficiency."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"The key to successful PMax is asset quality. Mediocre images and weak copy will produce mediocre results. The algorithm amplifies what works—give it great assets and it will find buyers; give it weak assets and it will waste budget."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"Where Search Still Dominates"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"For high-intent, high-competition keywords—legal services, financial products, B2B software—Search campaigns with exact and phrase match give you control that PMax cannot provide. When a click costs $40, you need to know exactly what triggered it and whether it aligns with your offer."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"The winning strategy: run PMax for your top products and let it find incremental volume. Use Search to defend your brand terms and capture highest-intent queries. Review Search Terms insights weekly and add negatives aggressively to prevent PMax from cannibalizing your best Search traffic."}]}]',
'Performance Max vs Search: the 2026 guide to knowing which campaign type wins in your specific situation and when to run both together.');

-- Post 5: Claude Code Banned by Trump - EN
INSERT INTO ec_posts (id, slug, status, primary_byline_id, created_at, updated_at, published_at, version, locale, translation_group, title, featured_image, content, excerpt) VALUES
('01KTC004CLDE001EN0000000005', 'claude-code-banned-by-trump-executive-order', 'published', '01KP1Y1X15H4D3WWSM22CGQKRM', '2025-12-05T10:00:00.000Z', '2025-12-05T10:00:00.000Z', '2025-12-05T10:00:00.000Z', 1, 'en', 'grp-claude-ban', 'Claude Code Banned by Trump Executive Order: What It Means for Developers', NULL,
'[{"_type":"block","style":"normal","children":[{"_type":"span","text":"In a move that surprised the tech industry, an executive order temporarily restricted the use of certain AI coding assistants in federal government systems. Claude Code, along with other AI development tools, was named in the order pending a national security review. Here is what actually happened and what it means for developers outside government."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"What the Order Actually Says"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"The executive order applies specifically to federal agencies and contractors handling classified or sensitive government data. It does not restrict private companies or individual developers from using Claude Code. The concern is around code generated by AI being reviewed and potentially logged by foreign-hosted AI infrastructure."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Anthropic, which makes Claude, is a US-based company. The order has been criticized by legal experts as overbroad and is currently under review. Most observers expect significant modifications before any final rules take effect."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"For Developers: Nothing Changes Today"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"If you are a private developer, agency, or business using Claude Code, today''s situation is unchanged. The tool remains available and legal. If you work with federal agencies on sensitive projects, check with your contracting officer about compliance requirements while the review plays out."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"The broader takeaway: AI tools are increasingly subject to policy scrutiny, and this will accelerate. Building your workflows on open-source models that you can self-host is smart insurance regardless of how this specific situation resolves."}]}]',
'An executive order temporarily restricted AI coding tools in federal systems. Here is what it actually means for developers and agencies.');

-- Post 6: n8n para Principiantes - ES
INSERT INTO ec_posts (id, slug, status, primary_byline_id, created_at, updated_at, published_at, version, locale, translation_group, title, featured_image, content, excerpt) VALUES
('01KTC005N8N001ES00000000006', 'n8n-para-principiantes-automatizacion-sin-codigo', 'published', '01KP1Y1X15H4D3WWSM22CGQKRM', '2025-11-18T10:00:00.000Z', '2025-11-18T10:00:00.000Z', '2025-11-18T10:00:00.000Z', 1, 'es', 'grp-n8n-beginners', 'n8n para Principiantes: Automatizacion Sin Codigo para Emprendedores', NULL,
'[{"_type":"block","style":"normal","children":[{"_type":"span","text":"Si eres emprendedor y todavia haces tareas repetitivas manualmente—copiar datos entre plataformas, enviar emails de seguimiento, actualizar hojas de calculo—n8n puede cambiar tu negocio. Es una herramienta de automatizacion open-source que conecta cualquier aplicacion sin necesidad de programar."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"Que Es n8n y Por Que Usarlo"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"n8n es el equivalente open-source de Zapier, pero con superpoderes: puedes hostearlo tu mismo, conectar APIs personalizadas, y ejecutar logica condicional compleja sin tocar una linea de codigo. La comunidad hispanohablante todavia subestima esta herramienta—y esa es tu ventaja competitiva."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Con n8n puedes automatizar: respuestas automaticas de WhatsApp, sincronizacion de leads de Meta Ads a tu CRM, reportes automaticos de Google Ads, notificaciones en Slack cuando un cliente paga, y decenas de procesos mas que hoy te roban horas cada semana."}]},{"_type":"block","style":"h2","children":[{"_type":"span","text":"Tu Primer Workflow en 20 Minutos"}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"Empieza con algo simple: cuando alguien llena un formulario de contacto en tu sitio, n8n guarda los datos en una hoja de Google Sheets Y envia una notificacion a tu correo. Este workflow elimina el paso manual de revisar el formulario y copiar datos—y lo configuras en 20 minutos sin escribir codigo."}]},{"_type":"block","style":"normal","children":[{"_type":"span","text":"El siguiente paso es conectar n8n con IA. Usando el nodo de OpenAI o Claude, puedes hacer que n8n analice automaticamente los mensajes de tus clientes, clasifique su urgencia, y genere una respuesta personalizada. Eso es automatizacion inteligente."}]}]',
'n8n es la herramienta de automatizacion que cada emprendedor hispanohablante deberia conocer. Sin codigo, open-source, con superpoderes.');

-- 4. Assign taxonomies to posts
-- Get taxonomy IDs from existing data
INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC001META001EN00000000001', 'posts' FROM taxonomies WHERE slug = 'meta-ads';
INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC001META001EN00000000001', 'posts' FROM taxonomies WHERE slug = 'automatizacion';

INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC001META001ES00000000002', 'posts' FROM taxonomies WHERE slug = 'meta-ads';
INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC001META001ES00000000002', 'posts' FROM taxonomies WHERE slug = 'automatizacion';

INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC002ADVA001EN0000000003', 'posts' FROM taxonomies WHERE slug = 'meta-ads';
INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC002ADVA001EN0000000003', 'posts' FROM taxonomies WHERE slug = 'automatizacion';

INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC003PMAX001EN0000000004', 'posts' FROM taxonomies WHERE slug = 'google-ads';
INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC003PMAX001EN0000000004', 'posts' FROM taxonomies WHERE slug = 'automatizacion';

INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC004CLDE001EN0000000005', 'posts' FROM taxonomies WHERE slug = 'claude-code';

INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC005N8N001ES00000000006', 'posts' FROM taxonomies WHERE slug = 'n8n';
INSERT INTO content_taxonomies (taxonomy_id, entry_id, collection)
SELECT id, '01KTC005N8N001ES00000000006', 'posts' FROM taxonomies WHERE slug = 'automatizacion';

-- 5. Update site options
INSERT INTO options (name, value) VALUES ('site:email', '"contact@tonyciencia.com"')
ON CONFLICT(name) DO UPDATE SET value = '"contact@tonyciencia.com"';
INSERT INTO options (name, value) VALUES ('site:description', '"Innovate, Automate & Grow. AI, automatizacion y negocios digitales para emprendedores hispanohablantes."')
ON CONFLICT(name) DO UPDATE SET value = '"Innovate, Automate & Grow. AI, automatizacion y negocios digitales para emprendedores hispanohablantes."';

-- 6. Update menu items to reflect real navigation
UPDATE _emdash_menu_items SET label = 'Home' WHERE label = 'Home' OR custom_url = '/';
UPDATE _emdash_menu_items SET label = 'Blog' WHERE label = 'Blog' OR label = 'Posts';
