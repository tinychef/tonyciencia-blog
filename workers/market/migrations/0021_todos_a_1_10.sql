-- Decisión del dueño (2026-11-17): todos los productos de precio fijo pasan a USD 1.10 con USD 47 tachado,
-- sabiendo que Google Merchant y la regla de los 30 días piden otra cosa (el dueño lo pidió explícitamente).
--   specreel             USD 47 → USD 1.10 (tachado 47)
--   stick-sketch         USD 47 → USD 1.10 (tachado 47)
--   video-4k-con-claude  USD 47 → USD 1.10 (tachado 47)
-- NO cambian: anuncios-infinitos (USD 33.33 con 76.90 tachado, 0019) ni los de «paga lo que quieras» desde USD 0
-- (pagespeed-forensics, cutpilot, motor-creativo-claude-code), que ya se pueden llevar gratis.
-- El cupón BLACKFRIDAY (USD 45.90 menos) deja de tener uso: startCheckout lo rechaza porque dejaría el cobro bajo
-- el mínimo de Stripe. El de bienvenida (10 %) deja USD 0.99, que Stripe acepta.
-- Guarda: solo si siguen exactamente como los dejó la 0018 (USD 47 fijo, sin tachado). Idempotente.
UPDATE products SET price_cents = 110, compare_at_cents = 4700, updated_at = 1794873600003
WHERE slug IN ('specreel', 'stick-sketch', 'video-4k-con-claude')
	AND kind = 'paid' AND price_mode = 'fixed' AND price_cents = 4700 AND compare_at_cents IS NULL;
