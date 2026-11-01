-- Pedido del dueño (2026-11-01): Edit Pro para YouTube (cutpilot) pasa a «paga lo que quieras» desde USD 0,
-- con USD 12 como precio sugerido (rango pedido: 9 a 19). Guarda: solo si sigue en precio fijo de USD 12.
UPDATE products SET price_mode = 'pwyw', min_price_cents = 0, max_price_cents = NULL, compare_at_cents = NULL, updated_at = 1793580000000
WHERE slug = 'cutpilot' AND price_mode = 'fixed' AND price_cents = 1200;
