/** Acceso a datos de D1. Todas las consultas usan parámetros (nunca concatenación de strings). */

export interface ProductImage {
	src: string;
	alt: string;
}

export interface ProductRow {
	id: string;
	slug: string;
	title: string;
	summary: string;
	description: string;
	price_cents: number;
	currency: string;
	kind: "paid" | "free";
	images: string;
	file_key: string | null;
	file_name: string | null;
	file_size: number | null;
	download_limit: number;
	active: number;
	sort_order: number;
	created_at: number;
	updated_at: number;
}

export type Product = Omit<ProductRow, "images"> & { images: ProductImage[] };

export interface User {
	id: string;
	email: string;
	name: string;
	marketing_opt_in: number;
	marketing_opt_in_at: number | null;
	created_at: number;
}

export interface OrderRow {
	id: string;
	user_id: string;
	product_id: string;
	kind: "paid" | "free";
	status: "pending" | "paid" | "free" | "expired" | "refunded" | "review";
	amount_cents: number;
	currency: string;
	provider: string;
	provider_session_id: string | null;
	provider_payment_id: string | null;
	customer_email: string;
	note: string | null;
	created_at: number;
	updated_at: number;
	paid_at: number | null;
}

export interface EntitlementRow {
	id: string;
	user_id: string;
	product_id: string;
	order_id: string;
	download_limit: number;
	download_count: number;
	revoked_at: number | null;
	created_at: number;
}

export function parseImages(raw: string): ProductImage[] {
	try {
		const v = JSON.parse(raw) as unknown;
		if (!Array.isArray(v)) return [];
		return v
			.filter((i): i is ProductImage => !!i && typeof i.src === "string" && typeof i.alt === "string")
			.filter((i) => i.src.startsWith("/market/"));
	} catch {
		return [];
	}
}

const toProduct = (r: ProductRow): Product => ({ ...r, images: parseImages(r.images) });

export async function listActiveProducts(db: D1Database): Promise<Product[]> {
	const { results } = await db
		.prepare("SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC, created_at ASC")
		.all<ProductRow>();
	return results.map(toProduct);
}

export async function listAllProducts(db: D1Database): Promise<Product[]> {
	const { results } = await db.prepare("SELECT * FROM products ORDER BY sort_order ASC, created_at ASC").all<ProductRow>();
	return results.map(toProduct);
}

export async function getProductBySlug(db: D1Database, slug: string, onlyActive = true): Promise<Product | null> {
	const row = await db
		.prepare(`SELECT * FROM products WHERE slug = ?1 ${onlyActive ? "AND active = 1" : ""}`)
		.bind(slug)
		.first<ProductRow>();
	return row ? toProduct(row) : null;
}

export async function getProductById(db: D1Database, id: string): Promise<Product | null> {
	const row = await db.prepare("SELECT * FROM products WHERE id = ?1").bind(id).first<ProductRow>();
	return row ? toProduct(row) : null;
}

export async function upsertUser(db: D1Database, email: string, name: string, now = Date.now()): Promise<User> {
	const user = await db
		.prepare(
			`INSERT INTO users (id, email, name, created_at, last_login_at) VALUES (?1, ?2, ?3, ?4, ?4)
			 ON CONFLICT(email) DO UPDATE SET name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE users.name END,
			   last_login_at = excluded.last_login_at
			 RETURNING id, email, name, marketing_opt_in, marketing_opt_in_at, created_at`,
		)
		.bind(crypto.randomUUID(), email, name, now)
		.first<User>();
	if (!user) throw new Error("No se pudo crear el usuario");
	return user;
}

export function getUserById(db: D1Database, id: string): Promise<User | null> {
	return db
		.prepare("SELECT id, email, name, marketing_opt_in, marketing_opt_in_at, created_at FROM users WHERE id = ?1")
		.bind(id)
		.first<User>();
}

export async function setMarketingOptIn(db: D1Database, userId: string, optIn: boolean, source: string, now = Date.now()): Promise<void> {
	await db
		.prepare(
			`UPDATE users SET marketing_opt_in = ?2,
			   marketing_opt_in_at = CASE WHEN ?2 = 1 THEN ?3 ELSE NULL END,
			   marketing_opt_in_source = CASE WHEN ?2 = 1 THEN ?4 ELSE NULL END
			 WHERE id = ?1`,
		)
		.bind(userId, optIn ? 1 : 0, now, source)
		.run();
}

export function getActiveEntitlement(db: D1Database, userId: string, productId: string): Promise<EntitlementRow | null> {
	return db
		.prepare("SELECT * FROM entitlements WHERE user_id = ?1 AND product_id = ?2 AND revoked_at IS NULL")
		.bind(userId, productId)
		.first<EntitlementRow>();
}

export interface LibraryItem {
	entitlement_id: string;
	download_limit: number;
	download_count: number;
	revoked_at: number | null;
	created_at: number;
	product_id: string;
	slug: string;
	title: string;
	kind: "paid" | "free";
	file_key: string | null;
	order_id: string;
	amount_cents: number;
	currency: string;
}

export async function listLibrary(db: D1Database, userId: string): Promise<LibraryItem[]> {
	const { results } = await db
		.prepare(
			`SELECT e.id AS entitlement_id, e.download_limit, e.download_count, e.revoked_at, e.created_at,
			        p.id AS product_id, p.slug, p.title, p.kind, p.file_key,
			        o.id AS order_id, o.amount_cents, o.currency
			 FROM entitlements e
			 JOIN products p ON p.id = e.product_id
			 JOIN orders o ON o.id = e.order_id
			 WHERE e.user_id = ?1
			 ORDER BY e.created_at DESC`,
		)
		.bind(userId)
		.all<LibraryItem>();
	return results;
}

export function getOrder(db: D1Database, id: string): Promise<OrderRow | null> {
	return db.prepare("SELECT * FROM orders WHERE id = ?1").bind(id).first<OrderRow>();
}
