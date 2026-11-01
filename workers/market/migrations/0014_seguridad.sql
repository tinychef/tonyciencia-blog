-- Market Tony — endurecimiento de seguridad tras la auditoría del 2026-11-01. Solo agrega columnas e índices.
--
-- users.auth_subject: identificador fijo de la cuenta («google:<sub>», o «dev:<correo>» en maqueta). El correo de
--   una cuenta de Google Workspace se puede reasignar a otra persona; con el sub guardado, esa persona no hereda las
--   compras (ni el admin). Se llena en el próximo inicio de sesión de cada usuario.
-- orders.coupon_code: cupón con que se abrió el checkout. Permite limitar el cupón de bienvenida aunque haya varios
--   checkouts abiertos a la vez.
-- entitlements.revoked_reason: por qué se revocó un acceso («refund», «dispute»). Si una disputa se gana, solo se
--   devuelve el acceso que quitó la disputa.
ALTER TABLE users ADD COLUMN auth_subject TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_subject ON users (auth_subject) WHERE auth_subject IS NOT NULL;
ALTER TABLE orders ADD COLUMN coupon_code TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_coupon ON orders (user_id, coupon_code) WHERE coupon_code IS NOT NULL;
ALTER TABLE entitlements ADD COLUMN revoked_reason TEXT;
UPDATE entitlements SET revoked_reason = 'refund' WHERE revoked_at IS NOT NULL AND revoked_reason IS NULL;
