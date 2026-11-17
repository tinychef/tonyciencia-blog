-- Corrección pedida por el dueño (2026-11-17): la 0018 subió por error Anuncios Automáticos a USD 47 sin tachado.
-- Vuelve a como estaba esa mañana: USD 33.33 con USD 76.90 tachado (oferta vigente desde antes de la 0018).
-- El cupón BLACKFRIDAY no vale en este producto (dejaría el cobro bajo el mínimo de Stripe; lo rechaza startCheckout).
-- Guarda: solo si sigue exactamente como la dejó la 0018 (USD 47, sin tachado, precio fijo). Idempotente.
UPDATE products SET price_cents = 3333, compare_at_cents = 7690, updated_at = 1794873600001
WHERE slug = 'anuncios-infinitos' AND kind = 'paid' AND price_mode = 'fixed' AND price_cents = 4700 AND compare_at_cents IS NULL;
