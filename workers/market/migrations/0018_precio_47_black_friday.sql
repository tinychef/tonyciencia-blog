-- Pedido del dueño (2026-11-17): todos los productos de precio fijo pasan a USD 47, SIN tachado. El precio de
-- Black Friday (USD 1.10) se obtiene con el cupón BLACKFRIDAY de Stripe (USD 45.90 de descuento, con fecha de fin),
-- no con un precio «antes» inflado: así el precio publicado en la ficha, el feed de Google Merchant y el checkout
-- es el mismo (USD 47) y la oferta es un código promocional, que es lo que Google admite.
--   anuncios-infinitos  USD 33.33 (tachado 76.90) → USD 47, sin tachado
--   specreel            USD 12.00 (tachado 36.90) → USD 47, sin tachado
--   stick-sketch        USD 36.90                 → USD 47, sin tachado
--   reel-4k-studio      ya está en USD 47 (0017)  → sin cambios
-- No cambian los de «paga lo que quieras» desde USD 0 (pagespeed-forensics, cutpilot, motor-creativo-claude-code:
-- siguen pudiendo llevarse gratis; el servidor no acepta cupones en ellos) ni los gratis.
-- Reemplaza al plan anterior de la 0018 (USD 1.10 con el precio actual tachado, PR #58), que nunca se aplicó.
-- Guardas: solo productos de pago, de precio fijo y por debajo de USD 47 (si el dueño ya subió alguno a mano en el
-- admin, no se toca). Idempotente: con USD 47 ya no cambia nada.
UPDATE products SET price_cents = 4700, compare_at_cents = NULL, updated_at = 1794873600000
WHERE slug IN ('anuncios-infinitos', 'specreel', 'stick-sketch') AND kind = 'paid' AND price_mode = 'fixed' AND price_cents < 4700;
