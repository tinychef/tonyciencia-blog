-- Market Tony v2 — datos de vitrina, reseñas reales y lista de espera.
-- Solo agrega columnas y tablas: el código anterior sigue funcionando con este esquema.

-- Texto corto bajo el título (tarjetas y ficha).
ALTER TABLE products ADD COLUMN tagline TEXT NOT NULL DEFAULT '';
-- Slug de categoría (ver src/lib/catalog.ts → CATEGORIES).
ALTER TABLE products ADD COLUMN category TEXT NOT NULL DEFAULT '';
-- JSON: ["prompts de anuncios", ...] — palabras clave (SEO y búsqueda en la tienda).
ALTER TABLE products ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';
-- Etiqueta manual opcional ("Edición 2.0"). Las automáticas (Nuevo, Más vendido, Próximamente) salen de datos reales.
ALTER TABLE products ADD COLUMN badge TEXT NOT NULL DEFAULT '';
-- Color de acento de la ficha (#rrggbb), tomado de la paleta de la portada.
ALTER TABLE products ADD COLUMN accent TEXT NOT NULL DEFAULT '';
-- SEO: si están vacíos se usan el título y el resumen.
ALTER TABLE products ADD COLUMN meta_title TEXT NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN meta_description TEXT NOT NULL DEFAULT '';
-- JSON: ["Lo que incluye 1", ...]
ALTER TABLE products ADD COLUMN highlights TEXT NOT NULL DEFAULT '[]';
-- JSON: [{ "label": "Formato", "value": "ZIP" }, ...]
ALTER TABLE products ADD COLUMN specs TEXT NOT NULL DEFAULT '[]';
-- JSON: [{ "q": "¿Pregunta?", "a": "Respuesta" }, ...]
ALTER TABLE products ADD COLUMN faq TEXT NOT NULL DEFAULT '[]';
-- Id de un video de YouTube de demostración (opcional).
ALTER TABLE products ADD COLUMN video_id TEXT NOT NULL DEFAULT '';
-- Precio de referencia tachado (centavos). Solo si es un precio real anterior; la app exige que sea mayor al precio.
ALTER TABLE products ADD COLUMN compare_at_cents INTEGER;
-- coming_soon = visible en la tienda con lista de espera; no se puede comprar ni descargar.
ALTER TABLE products ADD COLUMN availability TEXT NOT NULL DEFAULT 'available' CHECK (availability IN ('available', 'coming_soon'));
-- Ventas reales hechas FUERA de este market (p. ej. otra plataforma). Se suman a las pagadas aquí.
ALTER TABLE products ADD COLUMN sales_offset INTEGER NOT NULL DEFAULT 0 CHECK (sales_offset >= 0);

-- Reseñas: solo de personas con acceso vigente al producto (compra verificada). Una por persona y producto.
CREATE TABLE reviews (
	id TEXT PRIMARY KEY,
	product_id TEXT NOT NULL REFERENCES products (id),
	user_id TEXT NOT NULL REFERENCES users (id),
	rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
	body TEXT NOT NULL DEFAULT '',
	display_name TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	UNIQUE (product_id, user_id)
);
CREATE INDEX idx_reviews_product ON reviews (product_id, status, created_at);

-- "Avísame cuando salga" de los productos próximos. Solo el correo y la fecha.
CREATE TABLE waitlist (
	id TEXT PRIMARY KEY,
	product_id TEXT NOT NULL REFERENCES products (id),
	email TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	UNIQUE (product_id, email)
);
CREATE INDEX idx_waitlist_product ON waitlist (product_id, created_at);
