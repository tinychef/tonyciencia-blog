-- Market Tony — producto nuevo «Membresía Dorada» (pedido del dueño, 2026-11-17) y subida automática de precio por
-- venta. Generada una vez con un script desechable: edítala como SQL. Columnas nuevas: migración 0022.
--
-- 1) Subida por venta (decisión del dueño): specreel, stick-sketch y video-4k-con-claude (hoy USD 1.10 con 47 tachado)
--    suben USD 1 por cada venta pagada, con tope en USD 47 (el precio tachado; al llegar ahí se quita el tachado).
--    Anuncios Automáticos (33.33) y los de pago libre no suben. Cambiar el tope = cambiar raise_cap_cents (NULL = sin
--    tope); apagarlo = raise_per_sale_cents = 0. Guarda: solo si siguen en precio fijo y sin subida configurada.
--
-- 2) Membresía Dorada: USD 100 fijo, sin tachado (regla de lanzamiento > USD 77), sin archivo propio (grants_all = 1:
--    da acceso a todos los demás productos activos y a la venta, los de hoy y los que salgan después; lo hace
--    syncMemberships en src/services/memberships.ts). Va primera en el catálogo (sort_order -1) y sin categoría.
--    Diseño propio de boleto dorado en el estilo de Tony Ciencia: sin nombres, personajes ni imágenes de películas.
--    «De por vida» = mientras exista Market Tony, y la ficha lo dice así.
--    Guarda: solo corre si el slug no existe (no pisa lo que el dueño edite después en /market/admin). Idempotente.

UPDATE products SET raise_per_sale_cents = 100, raise_cap_cents = 4700, updated_at = 1794873600004
WHERE slug IN ('specreel', 'stick-sketch', 'video-4k-con-claude')
	AND kind = 'paid' AND price_mode = 'fixed' AND raise_per_sale_cents = 0;

INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, file_size,
	download_limit, active, sort_order, created_at, updated_at, tagline, category, tags, badge, accent, meta_title, meta_description,
	highlights, specs, faq, video_id, compare_at_cents, availability, sales_offset, price_mode, min_price_cents, max_price_cents, compat, i18n,
	grants_all, raise_per_sale_cents, raise_cap_cents)
SELECT
	'3b9f6c1e-8d2a-4f57-9e0b-6a4c2d1f8e73',
	'membresia-dorada',
	'Membresía Dorada: todo Market Tony, hoy y lo que venga',
	'Pagas una vez y tienes todos los productos de Market Tony: los que están a la venta hoy y cada uno que salga después, sin volver a pagar. Aparecen solos en Mis compras.',
	'¿Te gustan varias herramientas de Market Tony y no quieres comprarlas una por una? La Membresía Dorada es un solo pago que te da todos los productos de la tienda: los que están a la venta hoy y cada uno que se publique después.

## Cómo funciona
- Pagas USD 100 una sola vez, con tu cuenta de Google.
- En unos minutos, todos los productos disponibles aparecen en Mis compras, listos para descargar.
- Cuando sale un producto nuevo, se agrega solo a tu cuenta en cuanto queda a la venta. No pagas nada más.
- Si un producto actualiza su archivo, descargas la versión vigente desde Mis compras.

## Qué incluye
- Todos los productos de Market Tony que estén a la venta, de pago o gratis. La lista de hoy está en esta página.
- Los productos que se publiquen en el futuro, desde el día en que quedan a la venta (los «Próximamente» se agregan cuando salen).
- Cada producto con sus propias descargas, guía y requisitos, igual que si lo compraras por separado.

## Qué no incluye
- Servicios, asesorías o trabajos a medida de Tony Ciencia.
- Las cuentas y suscripciones que piden los productos (por ejemplo, Claude u otras herramientas): esas las pones tú.

## De por vida
Sin mensualidades ni renovaciones: mientras Market Tony exista, tu cuenta conserva el acceso a todo. Si algún día la tienda cerrara, te avisaríamos por correo con tiempo para que descargues tus productos.

## Para quién es
Para quien ya usa, o quiere usar, varias herramientas de la tienda y prefiere tenerlas todas, también las que vienen.',
	10000, 'usd', 'paid',
	'[{"src":"/market/static/products/membresia-dorada/cover.webp","alt":"Membresía Dorada de Market Tony: boleto dorado de acceso total a los productos actuales y futuros"},{"src":"/market/static/products/membresia-dorada/screen-1.webp","alt":"Productos de Market Tony incluidos hoy en la Membresía Dorada"},{"src":"/market/static/products/membresia-dorada/screen-2.webp","alt":"Cómo funciona la Membresía Dorada: un pago, todo en Mis compras y los productos nuevos se agregan solos"}]',
	NULL, NULL, NULL,
	5,
	1,
	-1,
	1794873600004, 1794873600004,
	'Un solo pago y acceso de por vida a todos los productos, actuales y futuros',
	'',
	'["membresía de por vida","todos los productos de Market Tony","acceso a productos futuros","pago único sin suscripción","herramientas de IA en un solo pago","Membresía Dorada"]',
	'Acceso de por vida',
	'#d4a017',
	'Membresía Dorada: todos los productos de Market Tony',
	'Membresía Dorada de Market Tony: un solo pago de USD 100 y acceso de por vida a todos los productos actuales y futuros. Cada novedad llega sola a tu cuenta.',
	'["Un solo pago de USD 100: sin mensualidades ni renovaciones","Todos los productos que hoy están a la venta, en tu cuenta en minutos","Cada producto nuevo se agrega solo a Mis compras cuando sale a la venta","Acceso de por vida con tu cuenta de Google","Cada producto con sus descargas y su guía, como si lo compraras aparte"]',
	'[{"label":"Tipo","value":"Membresía de pago único (sin renovaciones)"},{"label":"Incluye","value":"Todos los productos de Market Tony a la venta, actuales y futuros"},{"label":"Duración","value":"De por vida, mientras exista Market Tony"},{"label":"Entrega","value":"En Mis compras, con tu cuenta de Google"},{"label":"Productos nuevos","value":"Se agregan solos cuando salen a la venta"},{"label":"No incluye","value":"Servicios ni trabajos a medida"}]',
	'[{"q":"¿Qué productos incluye?","a":"Todos los productos de Market Tony que estén a la venta: hoy, los del catálogo (la lista está en esta página), y los que se publiquen después. Los que aparecen como «Próximamente» se agregan cuando salen a la venta."},{"q":"¿Tengo que hacer algo cuando sale un producto nuevo?","a":"No. Se agrega solo a tu cuenta en unos minutos y lo ves en Mis compras."},{"q":"¿Qué significa «de por vida»?","a":"Que no hay mensualidades ni renovaciones: mientras Market Tony exista, tu cuenta conserva el acceso a todos los productos. Si algún día la tienda cerrara, te avisaríamos por correo con tiempo para que descargues lo tuyo."},{"q":"¿Hay que pagar otra vez cada mes o cada año?","a":"No. Es un solo pago de USD 100."},{"q":"¿Qué pasa con los productos que ya compré?","a":"Siguen en tu cuenta tal como están, y la membresía agrega los que te faltan. Lo que pagaste antes no se descuenta del precio de la membresía."},{"q":"¿Incluye servicios o trabajos a medida?","a":"No. Incluye los productos digitales de Market Tony; los servicios y asesorías de Tony Ciencia van aparte."},{"q":"¿Puedo compartirla con otra persona?","a":"No. El acceso queda en la cuenta de Google con la que pagas, y solo esa cuenta puede descargar los productos."},{"q":"¿Y si me arrepiento?","a":"Aplica la política de reembolsos de Market Tony. Si se reembolsa la membresía, también se retira el acceso a los productos que te dio."}]',
	'',
	NULL,
	'available',
	0,
	'fixed', 0, NULL,
	'{}',
	json('{"en":{"title":"Golden Membership: all of Market Tony, now and to come","tagline":"One payment and lifetime access to every product, current and future","summary":"Pay once and get every Market Tony product: the ones on sale today and each one released after, without paying again. They show up on their own in My purchases.","meta_title":"Golden Membership: every Market Tony product","meta_description":"Market Tony''s Golden Membership: one USD 100 payment and lifetime access to every current and future product. Each new release lands in your account.","description":"Like several Market Tony tools and don''t want to buy them one by one? The Golden Membership is a single payment that gives you every product in the store: the ones on sale today and each one released after.\n\n## How it works\n- You pay USD 100 once, with your Google account.\n- Within minutes, every available product shows up in My purchases, ready to download.\n- When a new product comes out, it is added to your account as soon as it goes on sale. You pay nothing more.\n- If a product updates its file, you download the current version from My purchases.\n\n## What''s included\n- Every Market Tony product on sale, paid or free. Today''s list is on this page.\n- Products released in the future, from the day they go on sale (\"Coming soon\" ones are added when they launch).\n- Each product with its own downloads, guide and requirements, just as if you bought it separately.\n\n## What''s not included\n- Services, consulting or custom work by Tony Ciencia.\n- The accounts and subscriptions the products need (for example, Claude or other tools): you bring those.\n\n## Lifetime\nNo monthly fees or renewals: as long as Market Tony exists, your account keeps access to everything. If the store ever closed, we would email you in advance so you can download your products.\n\n## Who it''s for\nFor anyone who already uses, or wants to use, several tools from the store and would rather have them all, including the ones to come.","highlights":["One USD 100 payment: no monthly fees or renewals","Every product on sale today, in your account within minutes","Each new product is added to My purchases when it goes on sale","Lifetime access with your Google account","Each product with its downloads and guide, as if bought separately"],"specs":[{"label":"Type","value":"One-time membership (no renewals)"},{"label":"Includes","value":"Every Market Tony product on sale, current and future"},{"label":"Duration","value":"Lifetime, as long as Market Tony exists"},{"label":"Delivery","value":"In My purchases, with your Google account"},{"label":"New products","value":"Added automatically when they go on sale"},{"label":"Not included","value":"Services or custom work"}],"faq":[{"q":"Which products does it include?","a":"Every Market Tony product on sale: today, the ones in the catalog (the list is on this page), and the ones released later. Products shown as \"Coming soon\" are added when they go on sale."},{"q":"Do I have to do anything when a new product comes out?","a":"No. It is added to your account within minutes and you see it in My purchases."},{"q":"What does \"lifetime\" mean?","a":"No monthly fees or renewals: as long as Market Tony exists, your account keeps access to every product. If the store ever closed, we would email you in advance so you can download your products."},{"q":"Do I pay again every month or year?","a":"No. It is a single USD 100 payment."},{"q":"What about the products I already bought?","a":"They stay in your account as they are, and the membership adds the ones you are missing. What you paid before is not deducted from the membership price."},{"q":"Does it include services or custom work?","a":"No. It includes Market Tony''s digital products; Tony Ciencia''s services and consulting are separate."},{"q":"Can I share it with someone else?","a":"No. Access stays on the Google account you pay with, and only that account can download the products."},{"q":"What if I change my mind?","a":"Market Tony''s refund policy applies. If the membership is refunded, access to the products it gave you is removed too."}],"tags":["lifetime membership","every Market Tony product","access to future products","one-time payment, no subscription","AI tools in one payment","Golden Membership"],"image_alts":["Market Tony Golden Membership: golden ticket with full access to current and future products","Market Tony products included today in the Golden Membership","How the Golden Membership works: one payment, everything in My purchases and new products added automatically"]}}'),
	1, 0, NULL
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'membresia-dorada');
