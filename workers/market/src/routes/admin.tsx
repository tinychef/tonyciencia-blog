import type { Hono, MiddlewareHandler } from "hono";
import { MOCK_MAX_FILE_BYTES } from "../adapters/storage/mock";
import { deps, type AppEnv, type Ctx } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf } from "../lib/session";
import { cleanLine, cleanText, isId, isSlug, parseIntInRange, parseUsdToCents, safeFileName } from "../lib/validate";
import { retryEmail, sendOne, type OutboxRow } from "../services/outbox";
import { CATEGORIES, HEX_COLOR_RE, YOUTUBE_ID_RE } from "../lib/catalog";
import {
	getOrder,
	getProductById,
	listAllProducts,
	listAllReviews,
	listWaitlist,
	setReviewStatus,
	waitlistCounts,
	type EntitlementRow,
	type Product,
	type ProductFaq,
	type ProductImage,
	type ProductSpec,
} from "../services/repo";
import {
	AdminEmails,
	AdminOrderDetail,
	AdminOrders,
	AdminProductForm,
	AdminProducts,
	AdminReviews,
	AdminWaitlist,
	type AdminOrderListRow,
} from "../views/admin";
import { render, renderMessage } from "../views/render";
import { loginRedirect } from "./shop";

const IMAGE_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
const LIVE_MAX_FILE_BYTES = 90 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Solo ADMIN_EMAIL (correo verificado por Google en live). */
const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (!c.get("user")) return loginRedirect(c, c.req.path);
	if (!c.get("isAdmin")) return renderMessage(c, 403, "Acceso restringido", "Esta sección es solo para la administración de la tienda.");
	c.header("Cache-Control", "no-store");
	await next();
};

function maxFileBytes(c: Ctx) {
	return c.get("adapters").storage.name === "mock" ? MOCK_MAX_FILE_BYTES : LIVE_MAX_FILE_BYTES;
}

async function adminWriteAllowed(c: Ctx, form: FormData | null): Promise<string | null> {
	if (!(await checkCsrf(c, form))) return "Solicitud no válida (CSRF). Recarga la página.";
	if (!(await hit(c.env.MARKET_DB, RATE_RULES.adminWrite, c.get("user")!.id))) return "Demasiadas acciones seguidas. Espera un momento.";
	return null;
}

function isFile(v: File | string | null): v is File {
	return typeof v === "object" && v !== null && typeof (v as File).arrayBuffer === "function" && (v as File).size > 0;
}

interface SaveResult {
	errors: string[];
	values: Record<string, string>;
	productId?: string;
}

/** Valida y guarda (crea o edita) un producto desde el formulario multipart del admin. */
async function saveProduct(c: Ctx, existing: Product | null, form: FormData): Promise<SaveResult> {
	const db = c.env.MARKET_DB;
	const storage = c.get("adapters").storage;
	const str = (k: string) => {
		const v = form.get(k);
		return typeof v === "string" ? v : "";
	};
	const values = {
		title: str("title"),
		slug: str("slug"),
		kind: str("kind"),
		price: str("price"),
		summary: str("summary"),
		description: str("description"),
		download_limit: str("download_limit"),
		sort_order: str("sort_order"),
		active: str("active"),
		file_key: str("file_key"),
		file_name: str("file_name"),
		availability: str("availability"),
		category: str("category"),
		compare_at: str("compare_at"),
		tagline: str("tagline"),
		badge: str("badge"),
		accent: str("accent"),
		video_id: str("video_id"),
		sales_offset: str("sales_offset"),
		meta_title: str("meta_title"),
		meta_description: str("meta_description"),
		tags: str("tags"),
		highlights: str("highlights"),
		specs: str("specs"),
		faq: str("faq"),
	};
	const errors: string[] = [];
	const title = cleanLine(values.title, 140);
	if (!title) errors.push("El título es obligatorio (máx. 140 caracteres).");
	const slug = values.slug.trim();
	if (!isSlug(slug)) errors.push("El slug solo admite minúsculas, números y guiones (máx. 80).");
	const kind = values.kind === "free" ? "free" : values.kind === "paid" ? "paid" : null;
	if (!kind) errors.push("Tipo inválido.");
	let priceCents = 0;
	if (kind === "paid") {
		const p = parseUsdToCents(values.price);
		if (p === null || p < 50 || p > 1_000_000) errors.push("Precio inválido: usa un número como 77 o 77.50 (mínimo 0.50, máximo 10000).");
		else priceCents = p;
	}
	const summary = cleanLine(values.summary, 300);
	if (summary === null) errors.push("El resumen es demasiado largo (máx. 300).");
	const description = cleanText(values.description, 20000);
	if (description === null) errors.push("La descripción es demasiado larga (máx. 20000).");
	const downloadLimit = parseIntInRange(values.download_limit || "5", 1, 100);
	if (downloadLimit === null) errors.push("El límite de descargas debe estar entre 1 y 100.");
	const sortOrder = parseIntInRange(values.sort_order || "0", -1000, 1000);
	if (sortOrder === null) errors.push("El orden debe estar entre -1000 y 1000.");
	const wantsActive = values.active === "1";

	// ── Vitrina ──
	const availability = values.availability === "coming_soon" ? "coming_soon" : "available";
	const category = CATEGORIES.some((x) => x.slug === values.category) ? values.category : "";
	let compareAt: number | null = null;
	if (values.compare_at.trim()) {
		compareAt = parseUsdToCents(values.compare_at);
		if (compareAt === null || compareAt <= priceCents) errors.push("El precio anterior tachado debe ser un número mayor que el precio actual (o déjalo vacío).");
	}
	const tagline = cleanLine(values.tagline, 200);
	const badge = cleanLine(values.badge, 30);
	const metaTitle = cleanLine(values.meta_title, 70);
	const metaDescription = cleanLine(values.meta_description, 200);
	if (tagline === null || badge === null || metaTitle === null || metaDescription === null) errors.push("Algún texto de vitrina es demasiado largo.");
	const accent = values.accent.trim();
	if (accent && !HEX_COLOR_RE.test(accent)) errors.push("El color de acento debe tener la forma #rrggbb.");
	const videoId = values.video_id.trim();
	if (videoId && !YOUTUBE_ID_RE.test(videoId)) errors.push("El id de YouTube debe tener 11 caracteres (lo que va después de v= en el enlace).");
	const salesOffset = parseIntInRange(values.sales_offset || "0", 0, 1_000_000);
	if (salesOffset === null) errors.push("Las ventas fuera del market deben ser un número entre 0 y 1000000.");
	const tags = values.tags
		.split(",")
		.map((t) => cleanLine(t, 60) ?? "")
		.filter(Boolean)
		.slice(0, 20);
	const lines = (raw: string) => raw.replace(/\r\n?/g, "\n").split("\n").map((l) => cleanLine(l, 300) ?? "").filter(Boolean);
	const highlights = lines(values.highlights).slice(0, 12);
	const specs: ProductSpec[] = lines(values.specs)
		.map((l) => {
			const i = l.indexOf(":");
			return i > 0 ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : null;
		})
		.filter((x): x is ProductSpec => !!x && !!x.label && !!x.value)
		.slice(0, 16);
	const faq: ProductFaq[] = values.faq
		.replace(/\r\n?/g, "\n")
		.split(/\n{2,}/)
		.map((block) => {
			const [q, ...rest] = block.split("\n").map((l) => l.trim());
			const a = cleanLine(rest.join(" "), 1200);
			const qq = cleanLine(q ?? "", 200);
			return qq && a ? { q: qq, a } : null;
		})
		.filter((x): x is ProductFaq => !!x)
		.slice(0, 15);

	const productId = existing?.id ?? crypto.randomUUID();
	let fileKey = existing?.file_key ?? null;
	let fileName = existing?.file_name ?? null;
	let fileSize = existing?.file_size ?? null;

	const upload = form.get("file");
	const manualKey = values.file_key.trim();
	if (isFile(upload)) {
		if (upload.size > maxFileBytes(c)) errors.push(`El archivo pesa más de ${Math.floor(maxFileBytes(c) / 1024 / 1024 * 10) / 10} MB.`);
	} else if (manualKey) {
		if (!/^[A-Za-z0-9/_.-]{1,300}$/.test(manualKey) || manualKey.includes("..") || manualKey.startsWith("images/")) {
			errors.push("La clave del archivo solo admite letras, números, / _ . - (y no puede empezar por images/).");
		} else {
			const head = await storage.head(manualKey);
			if (!head) errors.push(`No existe «${manualKey}» en el almacén ${storage.name === "r2" ? "R2" : "de la maqueta"}.`);
			else {
				fileKey = manualKey;
				fileSize = head.size;
				fileName = safeFileName(values.file_name || manualKey.split("/").pop());
			}
		}
	}

	const image = form.get("image");
	const imageAlt = cleanLine(form.get("image_alt") ?? "", 200);
	if (isFile(image)) {
		if (!IMAGE_EXT[image.type]) errors.push("La imagen debe ser PNG, JPG, WebP o GIF.");
		if (image.size > Math.min(MAX_IMAGE_BYTES, maxFileBytes(c))) errors.push("La imagen es demasiado pesada.");
		if (!imageAlt) errors.push("Escribe el texto alternativo de la imagen (accesibilidad).");
	}
	if (wantsActive && availability === "available" && !fileKey && !isFile(upload)) {
		errors.push("No se puede activar un producto disponible sin archivo entregable. Súbelo primero, guárdalo inactivo o márcalo como «Próximamente».");
	}
	if (errors.length > 0) return { errors, values };

	// Subidas (solo con el formulario ya válido).
	if (isFile(upload)) {
		const name = safeFileName(upload.name);
		fileKey = `products/${productId}/${Date.now()}-${name}`;
		await storage.put(fileKey, upload.stream(), { contentType: upload.type || "application/octet-stream", size: upload.size });
		fileName = safeFileName(values.file_name || name);
		fileSize = upload.size;
	}
	const removed = new Set(form.getAll("remove_image").map(String));
	let images: ProductImage[] = (existing?.images ?? []).filter((_, i) => !removed.has(String(i)));
	if (isFile(image)) {
		const key = `images/${productId}/${crypto.randomUUID()}.${IMAGE_EXT[image.type]}`;
		await storage.put(key, image.stream(), { contentType: image.type, size: image.size });
		images = [...images, { src: `/market/media/${key}`, alt: imageAlt! }];
	}
	const now = Date.now();
	const merch = [
		tagline,
		category,
		JSON.stringify(tags),
		badge,
		accent,
		metaTitle,
		metaDescription,
		JSON.stringify(highlights),
		JSON.stringify(specs),
		JSON.stringify(faq),
		videoId,
		kind === "paid" ? compareAt : null,
		availability,
		salesOffset,
	];
	try {
		if (existing) {
			await db
				.prepare(
					`UPDATE products SET slug = ?2, title = ?3, summary = ?4, description = ?5, price_cents = ?6, kind = ?7, images = ?8,
					   file_key = ?9, file_name = ?10, file_size = ?11, download_limit = ?12, active = ?13, sort_order = ?14, updated_at = ?15,
					   tagline = ?16, category = ?17, tags = ?18, badge = ?19, accent = ?20, meta_title = ?21, meta_description = ?22,
					   highlights = ?23, specs = ?24, faq = ?25, video_id = ?26, compare_at_cents = ?27, availability = ?28, sales_offset = ?29
					 WHERE id = ?1`,
				)
				.bind(productId, slug, title, summary, description, priceCents, kind, JSON.stringify(images), fileKey, fileName, fileSize, downloadLimit, wantsActive ? 1 : 0, sortOrder, now, ...merch)
				.run();
		} else {
			await db
				.prepare(
					`INSERT INTO products (id, slug, title, summary, description, price_cents, currency, kind, images, file_key, file_name, file_size,
					   download_limit, active, sort_order, created_at, updated_at,
					   tagline, category, tags, badge, accent, meta_title, meta_description, highlights, specs, faq, video_id, compare_at_cents, availability, sales_offset)
					 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'usd', ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?15,
					   ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29)`,
				)
				.bind(productId, slug, title, summary, description, priceCents, kind, JSON.stringify(images), fileKey, fileName, fileSize, downloadLimit, wantsActive ? 1 : 0, sortOrder, now, ...merch)
				.run();
		}
	} catch (err) {
		if (String(err).includes("UNIQUE")) return { errors: [`Ya existe un producto con el slug «${slug}».`], values };
		throw err;
	}
	return { errors: [], values, productId };
}

export function registerAdmin(app: Hono<AppEnv>) {
	app.use("/market/admin", requireAdmin);
	app.use("/market/admin/*", requireAdmin);

	app.get("/market/admin", async (c) => {
		const [products, waitlist] = await Promise.all([listAllProducts(c.env.MARKET_DB), waitlistCounts(c.env.MARKET_DB)]);
		const notice = c.req.query("ok") ? "Cambios guardados." : null;
		return render(
			c,
			{ title: "Administración", path: "/market/admin", noindex: true },
			<AdminProducts products={products} csrf={c.get("csrf")} notice={notice} storageName={c.get("adapters").storage.name} waitlist={waitlist} />,
		);
	});

	app.get("/market/admin/resenas", async (c) => {
		const rows = await listAllReviews(c.env.MARKET_DB);
		const notice = c.req.query("ok") ? "Reseña actualizada." : null;
		return render(c, { title: "Reseñas", path: "/market/admin/resenas", noindex: true }, <AdminReviews rows={rows} csrf={c.get("csrf")} notice={notice} />);
	});

	app.post("/market/admin/resenas/:id/:accion{ocultar|publicar}", async (c) => {
		const form = await c.req.formData().catch(() => null);
		const denied = await adminWriteAllowed(c, form);
		if (denied) return renderMessage(c, 403, "Solicitud no válida", denied);
		const id = c.req.param("id");
		if (!isId(id)) return c.notFound();
		await setReviewStatus(c.env.MARKET_DB, id, c.req.param("accion") === "ocultar" ? "hidden" : "published");
		return c.redirect("/market/admin/resenas?ok=1", 303);
	});

	app.get("/market/admin/lista-espera", async (c) => {
		const rows = await listWaitlist(c.env.MARKET_DB);
		return render(c, { title: "Lista de espera", path: "/market/admin/lista-espera", noindex: true }, <AdminWaitlist rows={rows} />);
	});

	const formPage = (c: Ctx, product: Product | null, errors: string[], values: Record<string, string> | undefined, fileInfo: { size: number; contentType: string } | null) =>
		render(
			c,
			{ title: product ? `Editar ${product.title}` : "Nuevo producto", path: c.req.path, noindex: true },
			<AdminProductForm product={product} csrf={c.get("csrf")} errors={errors} values={values} maxUploadMb={Math.floor((maxFileBytes(c) / 1024 / 1024) * 10) / 10} fileInfo={fileInfo} />,
			errors.length ? 400 : 200,
		);

	app.get("/market/admin/productos/nuevo", (c) => formPage(c, null, [], undefined, null));

	app.post("/market/admin/productos/nuevo", async (c) => {
		const tooBig = Number.parseInt(c.req.header("content-length") ?? "0", 10) > LIVE_MAX_FILE_BYTES + 10 * 1024 * 1024;
		if (tooBig) return renderMessage(c, 413, "Archivo demasiado grande", "Usa el comando del HANDOFF.md para subir archivos grandes.");
		const form = await c.req.formData().catch(() => null);
		const denied = await adminWriteAllowed(c, form);
		if (denied || !form) return renderMessage(c, 403, "Solicitud no válida", denied ?? "Formulario ilegible.");
		const res = await saveProduct(c, null, form);
		if (res.errors.length) return formPage(c, null, res.errors, res.values, null);
		return c.redirect("/market/admin?ok=1", 303);
	});

	app.get("/market/admin/productos/:id", async (c) => {
		const id = c.req.param("id");
		const product = isId(id) ? await getProductById(c.env.MARKET_DB, id) : null;
		if (!product) return renderMessage(c, 404, "Producto no encontrado", "Vuelve al listado.", { href: "/market/admin", label: "Volver" });
		const fileInfo = product.file_key ? await c.get("adapters").storage.head(product.file_key) : null;
		return formPage(c, product, [], undefined, fileInfo);
	});

	app.post("/market/admin/productos/:id", async (c) => {
		const id = c.req.param("id");
		const product = isId(id) ? await getProductById(c.env.MARKET_DB, id) : null;
		if (!product) return renderMessage(c, 404, "Producto no encontrado", "Vuelve al listado.", { href: "/market/admin", label: "Volver" });
		const tooBig = Number.parseInt(c.req.header("content-length") ?? "0", 10) > LIVE_MAX_FILE_BYTES + 10 * 1024 * 1024;
		if (tooBig) return renderMessage(c, 413, "Archivo demasiado grande", "Usa el comando del HANDOFF.md para subir archivos grandes.");
		const form = await c.req.formData().catch(() => null);
		const denied = await adminWriteAllowed(c, form);
		if (denied || !form) return renderMessage(c, 403, "Solicitud no válida", denied ?? "Formulario ilegible.");
		const res = await saveProduct(c, product, form);
		if (res.errors.length) return formPage(c, product, res.errors, res.values, null);
		return c.redirect("/market/admin?ok=1", 303);
	});

	app.post("/market/admin/productos/:id/:accion{activar|desactivar}", async (c) => {
		const form = await c.req.formData().catch(() => null);
		const denied = await adminWriteAllowed(c, form);
		if (denied) return renderMessage(c, 403, "Solicitud no válida", denied);
		const id = c.req.param("id");
		const product = isId(id) ? await getProductById(c.env.MARKET_DB, id) : null;
		if (!product) return renderMessage(c, 404, "Producto no encontrado", "Vuelve al listado.", { href: "/market/admin", label: "Volver" });
		const activate = c.req.param("accion") === "activar";
		if (activate && !product.file_key && product.availability !== "coming_soon") {
			return renderMessage(c, 409, "Falta el archivo", "No se puede activar un producto sin archivo entregable. Súbelo desde «Editar».", {
				href: `/market/admin/productos/${product.id}`,
				label: "Editar producto",
			});
		}
		await c.env.MARKET_DB.prepare("UPDATE products SET active = ?2, updated_at = ?3 WHERE id = ?1").bind(product.id, activate ? 1 : 0, Date.now()).run();
		return c.redirect("/market/admin?ok=1", 303);
	});

	app.get("/market/admin/pedidos", async (c) => {
		const estado = c.req.query("estado");
		const filter = estado && ["paid", "free", "pending", "review", "expired", "refunded"].includes(estado) ? estado : null;
		const { results } = await c.env.MARKET_DB.prepare(
			`SELECT o.*, p.title AS product_title FROM orders o JOIN products p ON p.id = o.product_id
			 WHERE ?1 IS NULL OR o.status = ?1 ORDER BY o.created_at DESC LIMIT 200`,
		)
			.bind(filter)
			.all<AdminOrderListRow>();
		return render(c, { title: "Pedidos", path: "/market/admin/pedidos", noindex: true }, <AdminOrders orders={results} filter={filter} />);
	});

	app.get("/market/admin/pedidos/:id", async (c) => {
		const id = c.req.param("id");
		const db = c.env.MARKET_DB;
		const order = isId(id) ? await getOrder(db, id) : null;
		if (!order) return renderMessage(c, 404, "Pedido no encontrado", "Vuelve al listado.", { href: "/market/admin/pedidos", label: "Volver" });
		const [product, entitlement, downloads, emails] = await Promise.all([
			db.prepare("SELECT title FROM products WHERE id = ?1").bind(order.product_id).first<{ title: string }>(),
			db.prepare("SELECT * FROM entitlements WHERE order_id = ?1").bind(order.id).first<EntitlementRow>(),
			db
				.prepare("SELECT d.via, d.created_at FROM downloads d JOIN entitlements e ON e.id = d.entitlement_id WHERE e.order_id = ?1 ORDER BY d.created_at DESC")
				.bind(order.id)
				.all<{ via: string; created_at: number }>(),
			db.prepare("SELECT * FROM email_outbox WHERE order_id = ?1 ORDER BY created_at").bind(order.id).all<OutboxRow>(),
		]);
		const notice = c.req.query("ok") ? "Hecho." : null;
		return render(
			c,
			{ title: "Pedido", path: c.req.path, noindex: true },
			<AdminOrderDetail
				order={order}
				productTitle={product?.title ?? "?"}
				entitlement={entitlement}
				downloads={downloads.results}
				emails={emails.results}
				csrf={c.get("csrf")}
				notice={notice}
			/>,
		);
	});

	app.post("/market/admin/pedidos/:id/restablecer-descargas", async (c) => {
		const form = await c.req.formData().catch(() => null);
		const denied = await adminWriteAllowed(c, form);
		if (denied) return renderMessage(c, 403, "Solicitud no válida", denied);
		const id = c.req.param("id");
		if (!isId(id)) return c.notFound();
		await c.env.MARKET_DB.prepare("UPDATE entitlements SET download_count = 0 WHERE order_id = ?1 AND revoked_at IS NULL").bind(id).run();
		return c.redirect(`/market/admin/pedidos/${id}?ok=1`, 303);
	});

	app.get("/market/admin/correos", async (c) => {
		const { results } = await c.env.MARKET_DB.prepare("SELECT * FROM email_outbox ORDER BY created_at DESC LIMIT 200").all<OutboxRow>();
		const notice = c.req.query("ok") ? "Reintento programado." : null;
		return render(c, { title: "Correos", path: "/market/admin/correos", noindex: true }, <AdminEmails rows={results} csrf={c.get("csrf")} notice={notice} />);
	});

	app.post("/market/admin/correos/:id/reintentar", async (c) => {
		const form = await c.req.formData().catch(() => null);
		const denied = await adminWriteAllowed(c, form);
		if (denied) return renderMessage(c, 403, "Solicitud no válida", denied);
		const id = c.req.param("id");
		if (!isId(id)) return c.notFound();
		await retryEmail(c.env.MARKET_DB, id);
		c.executionCtx.waitUntil(sendOne(deps(c), id).catch((err) => console.error("[correo] reintento manual falló:", err)));
		return c.redirect("/market/admin/correos?ok=1", 303);
	});
}
