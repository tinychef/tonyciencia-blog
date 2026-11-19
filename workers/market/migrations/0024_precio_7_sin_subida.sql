-- Decisión del dueño (2026-11-19): fin de la subida de USD 1 por venta (0023) y precio fijo de USD 7 con USD 47
-- tachado en los productos que estaban en ese plan:
--   specreel             USD 1.10 (o lo que haya subido) → USD 7 (tachado 47)
--   stick-sketch         USD 1.10 (o lo que haya subido) → USD 7 (tachado 47)
--   video-4k-con-claude  USD 1.10 (o lo que haya subido) → USD 7 (tachado 47)
-- NO cambian: anuncios-infinitos (USD 33.33 con 76.90 tachado), los de «paga lo que quieras» desde USD 0
-- (pagespeed-forensics, cutpilot, motor-creativo-claude-code) ni la Membresía Dorada (USD 100).
-- Guarda: solo los que siguen en el plan de subida (precio fijo, 47 tachado, +USD 1 por venta); un precio puesto
-- a mano en el admin sin ese plan no se toca. Idempotente: tras la primera pasada ya nadie tiene subida.
UPDATE products SET price_cents = 700, compare_at_cents = 4700, updated_at = 1795046400000
WHERE slug IN ('specreel', 'stick-sketch', 'video-4k-con-claude')
	AND kind = 'paid' AND price_mode = 'fixed' AND compare_at_cents = 4700 AND raise_per_sale_cents = 100
	AND price_cents BETWEEN 110 AND 4700;

-- La subida queda apagada en todo el catálogo (el código sigue, pero sin productos configurados no hace nada).
UPDATE products SET raise_per_sale_cents = 0, raise_cap_cents = NULL WHERE raise_per_sale_cents <> 0 OR raise_cap_cents IS NOT NULL;
