-- Market Tony — esquema inicial.
-- Fechas: milisegundos Unix (INTEGER). Dinero: centavos (INTEGER). Nunca flotantes.

CREATE TABLE products (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	title TEXT NOT NULL,
	summary TEXT NOT NULL DEFAULT '',
	description TEXT NOT NULL DEFAULT '',
	price_cents INTEGER NOT NULL DEFAULT 0,
	currency TEXT NOT NULL DEFAULT 'usd',
	kind TEXT NOT NULL CHECK (kind IN ('paid', 'free')),
	-- JSON: [{ "src": "/market/...", "alt": "..." }]
	images TEXT NOT NULL DEFAULT '[]',
	-- Clave del archivo entregable en el almacén (R2 en live, almacén de desarrollo en mock).
	file_key TEXT,
	file_name TEXT,
	file_size INTEGER,
	download_limit INTEGER NOT NULL DEFAULT 5 CHECK (download_limit BETWEEN 1 AND 100),
	active INTEGER NOT NULL DEFAULT 0 CHECK (active IN (0, 1)),
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	CHECK (
		(kind = 'free' AND price_cents = 0)
		OR (kind = 'paid' AND price_cents >= 50 AND price_cents <= 1000000)
	)
);
CREATE INDEX idx_products_active ON products (active, sort_order);

-- Solo correo y nombre (más fechas y la decisión opcional de marketing).
CREATE TABLE users (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL DEFAULT '',
	marketing_opt_in INTEGER NOT NULL DEFAULT 0 CHECK (marketing_opt_in IN (0, 1)),
	marketing_opt_in_at INTEGER,
	marketing_opt_in_source TEXT,
	created_at INTEGER NOT NULL,
	last_login_at INTEGER
);

-- La cookie lleva un token aleatorio; aquí solo guardamos su SHA-256.
CREATE TABLE sessions (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions (user_id);
CREATE INDEX idx_sessions_expires ON sessions (expires_at);

CREATE TABLE orders (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users (id),
	product_id TEXT NOT NULL REFERENCES products (id),
	kind TEXT NOT NULL CHECK (kind IN ('paid', 'free')),
	status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'free', 'expired', 'refunded', 'review')),
	-- Copiado del producto en el servidor al crear el pedido. El navegador nunca lo envía.
	amount_cents INTEGER NOT NULL,
	currency TEXT NOT NULL,
	provider TEXT NOT NULL,
	provider_session_id TEXT UNIQUE,
	provider_payment_id TEXT,
	customer_email TEXT NOT NULL,
	note TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	paid_at INTEGER
);
CREATE INDEX idx_orders_user ON orders (user_id, created_at);
CREATE INDEX idx_orders_status ON orders (status, created_at);
CREATE INDEX idx_orders_payment ON orders (provider_payment_id);

-- Derecho de descarga (producto gratis obtenido o producto comprado).
CREATE TABLE entitlements (
	id TEXT PRIMARY KEY,
	user_id TEXT NOT NULL REFERENCES users (id),
	product_id TEXT NOT NULL REFERENCES products (id),
	order_id TEXT NOT NULL UNIQUE REFERENCES orders (id),
	download_limit INTEGER NOT NULL,
	download_count INTEGER NOT NULL DEFAULT 0,
	revoked_at INTEGER,
	created_at INTEGER NOT NULL
);
-- Un acceso vigente por persona y producto.
CREATE UNIQUE INDEX idx_entitlements_active ON entitlements (user_id, product_id) WHERE revoked_at IS NULL;

CREATE TABLE downloads (
	id TEXT PRIMARY KEY,
	entitlement_id TEXT NOT NULL REFERENCES entitlements (id),
	user_id TEXT NOT NULL REFERENCES users (id),
	via TEXT NOT NULL CHECK (via IN ('site', 'email')),
	created_at INTEGER NOT NULL
);
CREATE INDEX idx_downloads_entitlement ON downloads (entitlement_id);

-- Idempotencia del webhook: un evento del proveedor se procesa una sola vez.
CREATE TABLE payment_events (
	id TEXT PRIMARY KEY,
	provider TEXT NOT NULL,
	type TEXT NOT NULL,
	order_id TEXT,
	received_at INTEGER NOT NULL,
	processed_at INTEGER,
	result TEXT
);

-- Cola de correos. dedupe_key única ⇒ un mismo correo lógico jamás se envía dos veces.
CREATE TABLE email_outbox (
	id TEXT PRIMARY KEY,
	dedupe_key TEXT NOT NULL UNIQUE,
	kind TEXT NOT NULL,
	to_email TEXT NOT NULL,
	subject TEXT NOT NULL,
	html TEXT NOT NULL,
	text TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'dead')),
	provider TEXT,
	provider_message_id TEXT,
	attempts INTEGER NOT NULL DEFAULT 0,
	last_error TEXT,
	next_attempt_at INTEGER NOT NULL,
	locked_until INTEGER,
	order_id TEXT,
	created_at INTEGER NOT NULL,
	sent_at INTEGER
);
CREATE INDEX idx_outbox_due ON email_outbox (status, next_attempt_at);
CREATE INDEX idx_outbox_order ON email_outbox (order_id);

CREATE TABLE rate_limits (
	key TEXT PRIMARY KEY,
	window_start INTEGER NOT NULL,
	count INTEGER NOT NULL
);

-- ─── Solo modo maqueta ───────────────────────────────────────────────

-- Bandeja de /dev/correos.
CREATE TABLE dev_emails (
	id TEXT PRIMARY KEY,
	outbox_id TEXT,
	to_email TEXT NOT NULL,
	from_email TEXT NOT NULL,
	reply_to TEXT,
	subject TEXT NOT NULL,
	html TEXT NOT NULL,
	text TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

-- Almacén de archivos de desarrollo (máx. ~1,5 MB por archivo, límite de fila de D1).
CREATE TABLE mock_files (
	key TEXT PRIMARY KEY,
	content_type TEXT NOT NULL,
	size INTEGER NOT NULL,
	data BLOB NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE TABLE mock_checkout_sessions (
	id TEXT PRIMARY KEY,
	order_id TEXT NOT NULL,
	amount_cents INTEGER NOT NULL,
	currency TEXT NOT NULL,
	customer_email TEXT NOT NULL,
	product_title TEXT NOT NULL,
	success_url TEXT NOT NULL,
	cancel_url TEXT NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('open', 'complete', 'expired')),
	last_event TEXT,
	created_at INTEGER NOT NULL
);
