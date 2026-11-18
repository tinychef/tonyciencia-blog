-- Market Tony — columnas para la Membresía Dorada y la subida automática de precio por venta (pedido del dueño,
-- 2026-11-17). Solo esquema: los datos van en la 0023.
--
-- Subida por venta: cada pedido PAGADO de verdad (status pending → paid, monto > 0, sin acceso previo) sube el precio
-- `raise_per_sale_cents` centavos, sin pasar de `raise_cap_cents` (NULL = sin tope). Al llegar al precio tachado se
-- quita el tachado (ya no sería una rebaja). Lo hace el webhook (src/services/orders.ts) en el mismo lote atómico que
-- marca el pedido pagado. Los reembolsos no lo bajan.
ALTER TABLE products ADD COLUMN raise_per_sale_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN raise_cap_cents INTEGER;

-- Membresía: un producto con grants_all = 1 da acceso a todos los demás productos activos y disponibles, los de hoy y
-- los que salgan después (syncMemberships en src/services/memberships.ts crea un pedido de USD 0 y su acceso por
-- cada producto). Esos pedidos llevan provider = 'membership' y membership_order_id = el pedido pagado de la
-- membresía: si esa compra se reembolsa o se disputa, sus accesos derivados se revocan con ella.
ALTER TABLE products ADD COLUMN grants_all INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN membership_order_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_membership ON orders (membership_order_id) WHERE membership_order_id IS NOT NULL;
