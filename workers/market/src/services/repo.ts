import { parseI18n, type ProductLocale } from "../lib/i18n";
import { parseCompat, type Compat } from "../lib/brands";
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
	// ── Vitrina (migración 0002) ──
	tagline: string;
	category: string;
	tags: string;
	badge: string;
	accent: string;
	meta_title: string;
	meta_description: string;
	highlights: string;
	specs: string;
	faq: string;
	video_id: string;
	compare_at_cents: number | null;
	availability: "available" | "coming_soon";
	sales_offset: number;
	// ── Precios flexibles (migración 0004) ──
	price_mode: "fixed" | "pwyw";
	min_price_cents: number;
	max_price_cents: number | null;
	// ── Logos de compatibilidad (migración 0007) ──
	compat: string;
	// ── Versión en inglés (migración 0011; filas anteriores no la traen) ──
	i18n?: string;
}

export interface ProductSpec {
	label: string;
	value: string;
}

export interface ProductFaq {
	q: string;
	a: string;
}

export type Product = Omit<ProductRow, "images" | "tags" | "highlights" | "specs" | "faq" | "compat" | "i18n"> & {
	compat: Compat;
	i18n: { en?: ProductLocale };
	images: ProductImage[];
	tags: string[];
	highlights: string[];
	specs: ProductSpec[];
	faq: ProductFaq[];
};

/** Cifras públicas de un producto. Todas reales: pedidos pagados (+ ventas fuera del market) y reseñas publicadas. */
export interface ProductStats {
	sales: number;
	ratingCount: number;
	ratingAvg: number | null;
}

export type ShopProduct = Product & { stats: ProductStats };

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

function parseJsonArray<T>(raw: string | null | undefined, keep: (v: unknown) => v is T): T[] {
	try {
		const v = JSON.parse(raw ?? "[]") as unknown;
		return Array.isArray(v) ? v.filter(keep) : [];
	} catch {
		return [];
	}
}

const isStr = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isSpec = (v: unknown): v is ProductSpec => !!v && typeof (v as ProductSpec).label === "string" && typeof (v as ProductSpec).value === "string";
const isFaq = (v: unknown): v is ProductFaq => !!v && typeof (v as ProductFaq).q === "string" && typeof (v as ProductFaq).a === "string";

const toProduct = (r: ProductRow): Product => ({
	...r,
	// Filas de antes de la migración 0002 (pruebas que insertan a mano) no traen estas columnas.
	tagline: r.tagline ?? "",
	category: r.category ?? "",
	badge: r.badge ?? "",
	accent: r.accent ?? "",
	meta_title: r.meta_title ?? "",
	meta_description: r.meta_description ?? "",
	video_id: r.video_id ?? "",
	compare_at_cents: r.compare_at_cents ?? null,
	availability: r.availability === "coming_soon" ? "coming_soon" : "available",
	sales_offset: r.sales_offset ?? 0,
	price_mode: r.price_mode === "pwyw" && r.kind === "paid" ? "pwyw" : "fixed",
	min_price_cents: r.min_price_cents ?? 0,
	max_price_cents: r.max_price_cents ?? null,
	compat: parseCompat(r.compat),
	i18n: parseI18n(r.i18n),
	images: parseImages(r.images),
	tags: parseJsonArray(r.tags, isStr),
	highlights: parseJsonArray(r.highlights, isStr),
	specs: parseJsonArray(r.specs, isSpec),
	faq: parseJsonArray(r.faq, isFaq),
});

export async function listActiveProducts(db: D1Database): Promise<Product[]> {
	const { results } = await db
		.prepare("SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC, created_at ASC")
		.all<ProductRow>();
	return results.map(toProduct);
}

type StatsRow = { paid_sales: number; rating_count: number; rating_sum: number | null };

/**
 * Una reseña cuenta solo mientras su autor conserva el producto: si el acceso se revoca (reembolso, disputa), la
 * reseña deja de mostrarse y de sumar a las estrellas.
 */
const REVIEW_VISIBLE = `r.status = 'published' AND EXISTS (SELECT 1 FROM entitlements e WHERE e.product_id = r.product_id AND e.user_id = r.user_id AND e.revoked_at IS NULL)`;

const STATS_SQL = `
	(SELECT COUNT(*) FROM orders o WHERE o.product_id = p.id AND o.status = 'paid') AS paid_sales,
	(SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND ${REVIEW_VISIBLE}) AS rating_count,
	(SELECT SUM(r.rating) FROM reviews r WHERE r.product_id = p.id AND ${REVIEW_VISIBLE}) AS rating_sum`;

function toShopProduct(r: ProductRow & StatsRow): ShopProduct {
	const product = toProduct(r);
	return {
		...product,
		stats: {
			sales: (r.paid_sales ?? 0) + product.sales_offset,
			ratingCount: r.rating_count ?? 0,
			ratingAvg: r.rating_count ? (r.rating_sum ?? 0) / r.rating_count : null,
		},
	};
}

/** Catálogo público: disponibles primero, luego "Próximamente"; con cifras reales. */
export async function listShopProducts(db: D1Database): Promise<ShopProduct[]> {
	const { results } = await db
		.prepare(
			`SELECT p.*, ${STATS_SQL} FROM products p WHERE p.active = 1
			 ORDER BY CASE WHEN p.availability = 'coming_soon' THEN 1 ELSE 0 END, p.sort_order ASC, p.created_at ASC`,
		)
		.all<ProductRow & StatsRow>();
	return results.map(toShopProduct);
}

export async function getShopProduct(db: D1Database, slug: string): Promise<ShopProduct | null> {
	const row = await db
		.prepare(`SELECT p.*, ${STATS_SQL} FROM products p WHERE p.slug = ?1 AND p.active = 1`)
		.bind(slug)
		.first<ProductRow & StatsRow>();
	return row ? toShopProduct(row) : null;
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

/** El correo ya pertenece a OTRA cuenta del proveedor (p. ej. un correo de Workspace reasignado). */
export class SubjectMismatchError extends Error {}

/**
 * Crea o actualiza la persona que inicia sesión. La cuenta queda atada a su identificador fijo del proveedor
 * (`subject`): si el mismo correo llega desde otra cuenta, se rechaza en vez de entregarle compras ajenas.
 */
export async function upsertUser(db: D1Database, email: string, name: string, subject: string, now = Date.now()): Promise<User> {
	const prev = await db.prepare("SELECT auth_subject FROM users WHERE email = ?1").bind(email).first<{ auth_subject: string | null }>();
	if (prev?.auth_subject && prev.auth_subject !== subject) throw new SubjectMismatchError(`el correo ${email} pertenece a otra cuenta`);
	const user = await db
		.prepare(
			`INSERT INTO users (id, email, name, auth_subject, created_at, last_login_at) VALUES (?1, ?2, ?3, ?5, ?4, ?4)
			 ON CONFLICT(email) DO UPDATE SET name = CASE WHEN excluded.name <> '' THEN excluded.name ELSE users.name END,
			   last_login_at = excluded.last_login_at,
			   auth_subject = COALESCE(users.auth_subject, excluded.auth_subject)
			 RETURNING id, email, name, marketing_opt_in, marketing_opt_in_at, created_at, auth_subject`,
		)
		.bind(crypto.randomUUID(), email, name, now, subject)
		.first<User & { auth_subject: string | null }>();
	if (user && user.auth_subject !== subject) throw new SubjectMismatchError(`el correo ${email} pertenece a otra cuenta`);
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

/** Compras pagadas (con dinero) de esta persona en el market. Sirve para la regla "solo primera compra". */
export async function countPaidOrders(db: D1Database, userId: string): Promise<number> {
	const r = await db
		.prepare("SELECT COUNT(*) AS n FROM orders WHERE user_id = ?1 AND kind = 'paid' AND status IN ('paid', 'refunded', 'review')")
		.bind(userId)
		.first<{ n: number }>();
	return r?.n ?? 0;
}

/** Vida máxima de una sesión de Stripe Checkout: pasado esto, un pedido pendiente ya no se puede pagar. */
const CHECKOUT_MAX_AGE_MS = 24 * 3600_000;

/**
 * Pedidos de esta persona con el cupón `code` para OTRO producto: pagados (o en revisión/reembolsados) o pendientes
 * que todavía se pueden pagar. Sirve para que el cupón de bienvenida no se aplique en varios checkouts abiertos a la vez.
 */
export async function countOtherWelcomeOrders(db: D1Database, userId: string, productId: string, code: string, now: number): Promise<number> {
	const r = await db
		.prepare(
			`SELECT COUNT(*) AS n FROM orders
			 WHERE user_id = ?1 AND coupon_code = ?2 AND product_id <> ?3
			   AND (status IN ('paid', 'refunded', 'review') OR (status = 'pending' AND created_at > ?4))`,
		)
		.bind(userId, code.toUpperCase(), productId, now - CHECKOUT_MAX_AGE_MS)
		.first<{ n: number }>();
	return r?.n ?? 0;
}

export interface LibraryItem {
	/** Calificación que esta persona ya dejó (null si aún no opina). */
	my_rating: number | null;
	my_review: string | null;
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
			        o.id AS order_id, o.amount_cents, o.currency,
			        r.rating AS my_rating, r.body AS my_review
			 FROM entitlements e
			 JOIN products p ON p.id = e.product_id
			 JOIN orders o ON o.id = e.order_id
			 LEFT JOIN reviews r ON r.product_id = e.product_id AND r.user_id = e.user_id
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

// ── Reseñas (solo compradores verificados) ───────────────────────────

export interface ReviewRow {
	id: string;
	product_id: string;
	user_id: string;
	rating: number;
	body: string;
	display_name: string;
	status: "published" | "hidden";
	created_at: number;
	updated_at: number;
	/** Cómo obtuvo el producto quien opina: pagando («paid») o gratis («free»). */
	order_kind?: "paid" | "free" | null;
}

export async function listPublishedReviews(db: D1Database, productId: string, limit = 30): Promise<ReviewRow[]> {
	const { results } = await db
		.prepare(
			`SELECT r.*, (SELECT o.kind FROM entitlements e JOIN orders o ON o.id = e.order_id
			              WHERE e.product_id = r.product_id AND e.user_id = r.user_id AND e.revoked_at IS NULL LIMIT 1) AS order_kind
			 FROM reviews r WHERE r.product_id = ?1 AND ${REVIEW_VISIBLE} ORDER BY r.created_at DESC LIMIT ?2`,
		)
		.bind(productId, limit)
		.all<ReviewRow>();
	return results;
}

/** Cuántas reseñas publicadas hay por número de estrellas (5 → n, 4 → n, …). */
export async function ratingBreakdown(db: D1Database, productId: string): Promise<Record<number, number>> {
	const { results } = await db
		.prepare(`SELECT r.rating, COUNT(*) AS n FROM reviews r WHERE r.product_id = ?1 AND ${REVIEW_VISIBLE} GROUP BY r.rating`)
		.bind(productId)
		.all<{ rating: number; n: number }>();
	const out: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
	for (const r of results) out[r.rating] = r.n;
	return out;
}

/** Crea o actualiza la reseña de esta persona. Quien llama ya verificó que tiene acceso vigente. */
export async function upsertReview(
	db: D1Database,
	r: { productId: string; userId: string; rating: number; body: string; displayName: string },
	now = Date.now(),
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO reviews (id, product_id, user_id, rating, body, display_name, status, created_at, updated_at)
			 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'published', ?7, ?7)
			 ON CONFLICT(product_id, user_id) DO UPDATE SET rating = excluded.rating, body = excluded.body,
			   display_name = excluded.display_name, updated_at = excluded.updated_at`,
		)
		.bind(crypto.randomUUID(), r.productId, r.userId, r.rating, r.body, r.displayName, now)
		.run();
}

export interface AdminReviewRow extends ReviewRow {
	product_title: string;
	email: string;
}

export async function listAllReviews(db: D1Database, limit = 200): Promise<AdminReviewRow[]> {
	const { results } = await db
		.prepare(
			`SELECT r.*, p.title AS product_title, u.email FROM reviews r
			 JOIN products p ON p.id = r.product_id JOIN users u ON u.id = r.user_id
			 ORDER BY r.created_at DESC LIMIT ?1`,
		)
		.bind(limit)
		.all<AdminReviewRow>();
	return results;
}

export async function setReviewStatus(db: D1Database, id: string, status: "published" | "hidden"): Promise<void> {
	await db.prepare("UPDATE reviews SET status = ?2, updated_at = ?3 WHERE id = ?1").bind(id, status, Date.now()).run();
}

// ── Lista de espera ("Avísame cuando salga") ─────────────────────────

/** true si el correo quedó anotado ahora; false si ya estaba. */
export async function joinWaitlist(db: D1Database, productId: string, email: string, now = Date.now()): Promise<boolean> {
	const r = await db
		.prepare("INSERT INTO waitlist (id, product_id, email, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(product_id, email) DO NOTHING")
		.bind(crypto.randomUUID(), productId, email, now)
		.run();
	return (r.meta.changes ?? 0) > 0;
}

export async function waitlistCounts(db: D1Database): Promise<Record<string, number>> {
	const { results } = await db.prepare("SELECT product_id, COUNT(*) AS n FROM waitlist GROUP BY product_id").all<{ product_id: string; n: number }>();
	return Object.fromEntries(results.map((r) => [r.product_id, r.n]));
}

export interface WaitlistRow {
	email: string;
	created_at: number;
	product_title: string;
	slug: string;
}

export async function listWaitlist(db: D1Database): Promise<WaitlistRow[]> {
	const { results } = await db
		.prepare(
			`SELECT w.email, w.created_at, p.title AS product_title, p.slug FROM waitlist w
			 JOIN products p ON p.id = w.product_id ORDER BY p.sort_order, w.created_at DESC LIMIT 2000`,
		)
		.all<WaitlistRow>();
	return results;
}
