-- Market Tony — logos de compatibilidad por producto y precio de CutPilot (pedido del dueño, 2026-11-01).
-- compat = {"works": [...], "includes": [...]} con claves de src/lib/brands.ts ("clave" o "clave|Etiqueta").
ALTER TABLE products ADD COLUMN compat TEXT NOT NULL DEFAULT '{}';

UPDATE products SET compat = '{"works":["claude-code","codex","cursor","gemini","antigravity","meta","google-ads","tiktok","linkedin"],"includes":["agent|Agente de anuncios","chrome-ext"]}' WHERE slug = 'anuncios-infinitos' AND compat = '{}';
UPDATE products SET compat = '{"works":["claude-code","codex","ffmpeg","windows","macos","linux"],"includes":[]}' WHERE slug = 'specreel' AND compat = '{}';
UPDATE products SET compat = '{"works":["claude-code","codex","python","node","ffmpeg","windows","macos","linux"],"includes":[]}' WHERE slug = 'specreel-stick' AND compat = '{}';
UPDATE products SET compat = '{"works":["claude-code","pagespeed","lighthouse","chrome","node"],"includes":[]}' WHERE slug = 'pagespeed-forensics' AND compat = '{}';
UPDATE products SET compat = '{"works":["claude-code","python","ffmpeg","windows"],"includes":["agent|Editor de video","chrome-ext|Panel de Chrome"]}' WHERE slug = 'cutpilot' AND compat = '{}';
UPDATE products SET compat = '{"works":["claude-code","python","windows"],"includes":["agent|13 agentes creativos"]}' WHERE slug = 'motor-creativo-claude-code' AND compat = '{}';
UPDATE products SET compat = '{"works":["n8n","whatsapp","meta","stripe"],"includes":[]}' WHERE slug = 'kit-n8n-agentes-ia' AND compat = '{}';
UPDATE products SET compat = '{"works":["claude-code","codex","instagram","linkedin"],"includes":[]}' WHERE slug = 'carruseles-infinitos' AND compat = '{}';

-- CutPilot a USD 12 (el dueño lo pidió). Nunca se vendió a 29.90 (era el precio previsto), así que NO lleva precio
-- tachado. Guarda: solo si sigue en 29.90.
UPDATE products SET price_cents = 1200, updated_at = 1793548800000 WHERE slug = 'cutpilot' AND price_cents = 2990 AND kind = 'paid';
