-- Market Tony v3 — precios flexibles ("paga lo que quieras", tipo Gumroad) y ofertas.
-- Solo agrega columnas y actualiza dos precios con guarda: el código anterior sigue funcionando con este esquema.

-- fixed = precio fijo (price_cents). pwyw = "paga lo que quieras": el comprador elige el monto;
-- price_cents pasa a ser el precio SUGERIDO y min/max acotan lo que se puede pagar.
ALTER TABLE products ADD COLUMN price_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (price_mode IN ('fixed', 'pwyw'));
-- Mínimo en centavos. 0 = se puede descargar gratis escribiendo 0. Si es mayor que 0, debe ser ≥ 50 (mínimo de Stripe).
ALTER TABLE products ADD COLUMN min_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_price_cents >= 0 AND min_price_cents <= 99999999);
-- Máximo en centavos (NULL = tope de Stripe: 99999999 = USD 999,999.99).
ALTER TABLE products ADD COLUMN max_price_cents INTEGER CHECK (max_price_cents IS NULL OR (max_price_cents >= 50 AND max_price_cents <= 99999999));

-- Estado interno pequeño (clave → JSON), p. ej. el resultado de crear el cupón de bienvenida en Stripe.
CREATE TABLE IF NOT EXISTS market_state (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL,
	updated_at INTEGER NOT NULL
);

-- Ofertas pedidas por el dueño el 2026-11-01. El precio tachado es el precio REAL anterior de cada producto.
-- La guarda (price_cents = precio anterior) evita pisar un precio que el dueño ya haya cambiado a mano.
UPDATE products SET compare_at_cents = 7690, price_cents = 3333, updated_at = 1793534400000
WHERE slug = 'anuncios-infinitos' AND price_cents = 7690 AND kind = 'paid';
UPDATE products SET compare_at_cents = 3690, price_cents = 1200, updated_at = 1793534400000
WHERE slug = 'specreel' AND price_cents = 3690 AND kind = 'paid';
