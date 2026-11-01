import type { FC } from "hono/jsx";
import { CATEGORIES, badgesFor, categoryLabel, isBuyable, priceWithPercentOff, ratingText, salesText, type Badge } from "../lib/catalog";
import { formatPrice } from "../lib/money";
import { STRIPE_MAX_CENTS, canBeFree, fromPriceCents, isPwyw, pwywBounds, saleInfo } from "../lib/pricing";
import type { Product, ReviewRow, ShopProduct } from "../services/repo";
import type { WelcomeOffer } from "../services/welcome";
import { CsrfField } from "./layout";
import { BRANDS, type CompatItem } from "../lib/brands";
import { BrandLogo, CATEGORY_ICON, Icon, type IconName } from "./icons";
import { Description } from "./render";

// ── Piezas comunes ───────────────────────────────────────────────────

/** "$33.33" (sin la moneda: la moneda va aparte, más chica). */
const amount = (cents: number, currency = "usd") => formatPrice(cents, currency).replace(` ${currency.toUpperCase()}`, "");

/** Estrellas con relleno parcial (la cifra exacta va en aria-label). */
export const Stars: FC<{ value: number; class?: string }> = ({ value, class: cls }) => (
	<span class={`mk-stars ${cls ?? ""}`} role="img" aria-label={`${ratingText(value)} de 5 estrellas`}>
		<span class="mk-stars-fill" style={`width: ${Math.max(0, Math.min(5, value)) * 20}%`} aria-hidden="true"></span>
	</span>
);

export const PriceBadge: FC<{ product: Product }> = ({ product }) =>
	product.kind === "free" ? (
		<span class="mk-badge mk-badge--free">Gratis</span>
	) : (
		<span class="mk-badge">
			<span class="mk-price">{isPwyw(product) ? `Desde ${formatPrice(pwywBounds(product).min, product.currency)}` : formatPrice(product.price_cents, product.currency)}</span>
		</span>
	);

/** Etiquetas de la tarjeta: OFERTA (real), Paga lo que quieras / Gratis, y las automáticas (Nuevo, Más vendido, Próximamente). */
export function cardBadges(p: ShopProduct, maxSales: number): Badge[] {
	const out: Badge[] = [];
	const sale = saleInfo(p);
	if (sale && p.availability === "available") out.push({ label: `OFERTA −${sale.percent}%`, tone: "sale" });
	if (p.kind === "free") out.push({ label: "GRATIS", tone: "free" });
	else if (isPwyw(p) && p.availability === "available") out.push({ label: canBeFree(p) ? "Paga lo que quieras" : "Tú pones el precio", tone: "pwyw" });
	return [...out, ...badgesFor(p, maxSales)];
}

const BadgeList: FC<{ badges: Badge[]; class?: string }> = ({ badges, class: cls }) =>
	badges.length ? (
		<span class={`mk-badges ${cls ?? ""}`}>
			{badges.map((b) => (
				<span class={`mk-chip mk-chip--${b.tone}`}>{b.label}</span>
			))}
		</span>
	) : null;

/**
 * Precio de tarjeta / ficha. Jerarquía: precio actual grande → precio anterior REAL tachado → % y ahorro →
 * precio con el cupón de bienvenida (solo precio fijo). "Paga lo que quieras" muestra el mínimo y el sugerido.
 */
export const PriceBlock: FC<{ product: Product; welcome: WelcomeOffer | null; size?: "sm" | "lg" }> = ({ product, welcome, size = "sm" }) => {
	const cur = product.currency.toUpperCase();
	const soon = product.availability === "coming_soon";
	if (product.kind === "free") {
		return (
			<span class={`mk3-price mk3-price--${size}`}>
				<span class="mk3-price-row">
					<span class="mk3-price-now">Gratis</span>
				</span>
				<span class="mk3-price-note">Descarga inmediata</span>
			</span>
		);
	}
	if (isPwyw(product)) {
		const { min } = pwywBounds(product);
		return (
			<span class={`mk3-price mk3-price--${size}`}>
				<span class="mk3-price-label">{soon ? "Precio previsto" : "Tú pones el precio"}</span>
				<span class="mk3-price-row">
					<span class="mk3-price-from">Desde</span>
					<span class="mk3-price-now">{amount(min, product.currency)}</span>
					<span class="mk3-price-cur">{cur}</span>
				</span>
				<span class="mk3-price-note">Sugerido {formatPrice(product.price_cents, product.currency)}</span>
			</span>
		);
	}
	const sale = saleInfo(product);
	const couponPrice = size === "lg" && !soon && welcome?.percentOff ? priceWithPercentOff(product.price_cents, welcome.percentOff) : null;
	return (
		<span class={`mk3-price mk3-price--${size} ${sale && !soon ? "is-sale" : ""}`}>
			{soon && <span class="mk3-price-label">Precio previsto</span>}
			<span class="mk3-price-row">
				<span class="mk3-price-now">{amount(product.price_cents, product.currency)}</span>
				<span class="mk3-price-cur">{cur}</span>
				{sale && (
					<s class="mk3-price-was" aria-label={`Precio anterior ${formatPrice(sale.wasCents, product.currency)}`}>
						{amount(sale.wasCents, product.currency)}
					</s>
				)}
			</span>
			{sale && !soon ? (
				<span class="mk3-price-save">
					<span class="mk3-off">−{sale.percent}%</span> Ahorras {formatPrice(sale.saveCents, product.currency)}
				</span>
			) : (
				<span class="mk3-price-note">{soon ? "Lista de espera abierta" : "Pago único · sin suscripción"}</span>
			)}
			{couponPrice !== null && (
				<span class="mk3-price-coupon">
					{formatPrice(couponPrice, product.currency)} con <b>{welcome!.code}</b> en tu 1.ª compra
				</span>
			)}
		</span>
	);
};

/** Logos de compatibilidad (máx. `max`; el resto como «+N»). Marcas sin logo permitido van como texto. */
export const CompatRow: FC<{ items: CompatItem[]; max?: number; class?: string }> = ({ items, max = 5, class: cls }) => {
	if (!items.length) return null;
	const shown = items.slice(0, max);
	const rest = items.length - shown.length;
	return (
		<span class={`mk3-compat ${cls ?? ""}`} role="list" aria-label={`Funciona con: ${items.map((i) => i.label).join(", ")}`}>
			{shown.map((i) =>
				BRANDS[i.k]?.icon ? (
					<span class="mk3-compat-logo" role="listitem" title={i.label}>
						<BrandLogo k={i.k} size={15} />
						<span class="mk-visually-hidden">{i.label}</span>
					</span>
				) : (
					<span class="mk3-compat-text" role="listitem">
						{i.label}
					</span>
				),
			)}
			{rest > 0 && <span class="mk3-compat-more">+{rest}</span>}
		</span>
	);
};

/** Ícono de una pieza incluida: logo de la marca o, si es genérica (agente), un ícono de interfaz. */
const IncludeIcon: FC<{ item: CompatItem; size?: number }> = ({ item, size = 18 }) =>
	BRANDS[item.k]?.icon ? <BrandLogo k={item.k} size={size} /> : <Icon name={item.k === "agent" ? "bot" : "box"} size={size} />;

/** «2 en 1»: lo que viene dentro del producto, con sus logos. */
export const IncludesBox: FC<{ items: CompatItem[]; compact?: boolean }> = ({ items, compact }) => {
	if (items.length < 2) return null;
	return (
		<div class={`mk3-includes ${compact ? "mk3-includes--compact" : ""}`}>
			<span class="mk3-includes-badge">{items.length} en 1</span>
			<span class="mk3-includes-list">
				{items.map((it, i) => (
					<>
						{i > 0 && <span class="mk3-includes-plus" aria-hidden="true">+</span>}
						<span class="mk3-includes-item">
							<IncludeIcon item={it} size={compact ? 15 : 18} />
							<span class="mk3-includes-label">{it.label}</span>
						</span>
					</>
				))}
			</span>
		</div>
	);
};

const Meta: FC<{ p: ShopProduct }> = ({ p }) => {
	const hasRating = p.stats.ratingCount > 0 && p.stats.ratingAvg !== null;
	if (!hasRating && p.stats.sales === 0) return null;
	return (
		<span class="mk-meta">
			{hasRating && (
				<span class="mk-meta-rating">
					<Stars value={p.stats.ratingAvg!} />
					<b>{ratingText(p.stats.ratingAvg!)}</b>
					<span class="mk-muted">({p.stats.ratingCount})</span>
				</span>
			)}
			{p.stats.sales > 0 && <span class="mk-meta-sales">{salesText(p.stats.sales)}</span>}
		</span>
	);
};

const productUrl = (slug: string) => `/market/producto/${slug}`;

/** Texto de búsqueda de la tarjeta (filtro instantáneo de market.js). */
const searchText = (p: ShopProduct) => [p.title, p.tagline, p.summary, ...p.tags, categoryLabel(p.category) ?? ""].join(" ").toLowerCase();

/**
 * Productos con portada animada (WebP en bucle) junto a su cover.webp: public/market/static/products/<slug>/cover-animada.webp.
 * La tarjeta carga primero la portada fija (rápida, buena para el LCP) y market.js la cambia por la animada cuando la
 * tarjeta entra en pantalla, salvo con «reducir movimiento» o ahorro de datos.
 */
export const ANIMATED_COVERS = new Set(["anuncios-infinitos", "specreel", "specreel-stick", "pagespeed-forensics", "cutpilot", "motor-creativo-claude-code"]);

/** Nombre corto del producto (antes de los dos puntos), para tarjetas y migas. */
export const shortName = (title: string) => (title.split(":")[0] ?? title).trim();

/**
 * Etiqueta de precio con forma de flecha (precio actual) + precio anterior REAL tachado y % de ahorro.
 * «Paga lo que quieras» muestra el mínimo con «+» ($0+) y el sugerido. Nunca la palabra «Gratis»: el número.
 */
export const PriceTag: FC<{ product: Product }> = ({ product }) => {
	const soon = product.availability === "coming_soon";
	if (product.kind === "free") return <span class="mk5-price"><span class="mk5-tag">$0</span></span>;
	if (isPwyw(product)) {
		const { min } = pwywBounds(product);
		return (
			<span class="mk5-price">
				<span class="mk5-tag" aria-label={`Desde ${formatPrice(min, product.currency)}`}>
					{amount(min, product.currency)}+
				</span>
				<span class="mk5-note">sugerido {amount(product.price_cents, product.currency)}</span>
			</span>
		);
	}
	const sale = saleInfo(product);
	return (
		<span class="mk5-price">
			<span class="mk5-tag">{amount(product.price_cents, product.currency)}</span>
			{sale && !soon && (
				<>
					<s class="mk5-was" aria-label={`Precio anterior ${formatPrice(sale.wasCents, product.currency)}`}>
						{amount(sale.wasCents, product.currency)}
					</s>
					<span class="mk5-off">−{sale.percent} %</span>
				</>
			)}
			{soon && <span class="mk5-note">precio previsto</span>}
		</span>
	);
};

/** Una sola etiqueta en la tarjeta, la que más pesa en la decisión: oferta real > paga lo que quieras > próximamente > más vendido. */
function primaryBadge(p: ShopProduct, maxSales: number): Badge | null {
	const sale = saleInfo(p);
	if (sale && p.availability === "available") return { label: `Oferta −${sale.percent} %`, tone: "sale" };
	if (p.availability === "coming_soon") return { label: "Próximamente", tone: "soon" };
	if (isPwyw(p)) return { label: "Paga lo que quieras", tone: "pwyw" };
	return badgesFor(p, maxSales).find((b) => b.tone === "hot") ?? null;
}

export const ProductCard: FC<{ p: ShopProduct; maxSales: number; welcome: WelcomeOffer | null; eager?: boolean; hidden?: boolean }> = ({
	p,
	maxSales,
	eager,
	hidden,
}) => {
	const cover = p.images[0];
	const soon = p.availability === "coming_soon";
	const sale = saleInfo(p);
	const badge = primaryBadge(p, maxSales);
	const bundle = p.compat.includes.length >= 2 ? p.compat.includes : null;
	return (
		<li
			class="mk3-item"
			data-cat={p.category || "otros"}
			data-search={searchText(p)}
			data-price={String(fromPriceCents(p))}
			data-created={String(p.created_at)}
			data-sale={sale && !soon ? "1" : undefined}
			data-free={canBeFree(p) && !soon ? "1" : undefined}
			data-soon={soon ? "1" : undefined}
			hidden={hidden ? true : undefined}
		>
			<article class={`mk5-card ${soon ? "is-soon" : ""}`}>
				<div class="mk5-cover">
					{cover ? (
						<img
							src={cover.src}
							alt={cover.alt}
							width="800"
							height="500"
							loading={eager ? "eager" : "lazy"}
							fetchpriority={eager ? "high" : undefined}
							decoding={eager ? undefined : "async"}
							data-anim={ANIMATED_COVERS.has(p.slug) && cover.src.endsWith("/cover.webp") ? cover.src.replace(/cover\.webp$/, "cover-animada.webp") : undefined}
						/>
					) : (
						<span class="mk3-media-empty" aria-hidden="true"></span>
					)}
				</div>
				<div class="mk5-body">
					<div class="mk5-top">
						<p class="mk5-kind">{categoryLabel(p.category) ?? "Producto digital"}</p>
						{badge && <span class={`mk5-badge mk5-badge--${badge.tone}`}>{badge.label}</span>}
					</div>
					<h3 class="mk5-title">
						<a href={productUrl(p.slug)} class="mk-stretch">
							{shortName(p.title)}
						</a>
					</h3>
					<p class="mk5-line">{p.tagline || p.summary}</p>
					<Meta p={p} />
					<div class="mk5-tools">
						{bundle && (
							<span class="mk5-incl">
								<i aria-hidden="true"></i>
								{bundle.map((b) => b.label).join(" + ")}
							</span>
						)}
						<CompatRow items={p.compat.works} max={5} />
					</div>
					<div class="mk5-buy">
						<PriceTag product={p} />
						<span class="mk5-go" aria-hidden="true">
							{soon ? "Avísame" : sale ? "Ver oferta" : isPwyw(p) ? "Elegir precio" : "Ver"}
							<Icon name="arrow" size={16} />
						</span>
					</div>
				</div>
			</article>
		</li>
	);
};

const Check = () => <Icon name="check" size={18} />;

const TRUST: Array<{ icon: IconName; title: string; text: string; href?: string }> = [
	{ icon: "bolt", title: "Descarga inmediata", text: "En tu correo y en Mis compras apenas se confirma el pago." },
	{ icon: "lock", title: "Pago seguro con Stripe", text: "No vemos ni guardamos los datos de tu tarjeta." },
	{ icon: "refund", title: "Reembolso en 14 días", text: "Si aún no lo descargaste.", href: "/market/legal/reembolsos" },
	{ icon: "chat", title: "Soporte en español", text: "Te responde una persona: business@tonyciencia.com" },
];

export const TrustStrip: FC<{ compact?: boolean }> = ({ compact }) => (
	<ul class={`mk-trust ${compact ? "mk-trust--compact" : ""}`}>
		{TRUST.map((t) => (
			<li>
				<span class="mk-trust-ic">
					<Icon name={t.icon} size={18} />
				</span>
				<span>
					<b>{t.href ? <a href={t.href}>{t.title}</a> : t.title}</b>
					{!compact && <small>{t.text}</small>}
				</span>
			</li>
		))}
	</ul>
);

// ── Catálogo ─────────────────────────────────────────────────────────

export type CatalogSort = "destacados" | "precio-asc" | "precio-desc" | "nuevos" | "valorados";
export type CatalogFilter = "ofertas" | "gratis" | "disponibles" | null;

export interface CatalogProps {
	products: ShopProduct[];
	welcome: WelcomeOffer | null;
	category: string | null;
	query: string;
	sort?: CatalogSort;
	filter?: CatalogFilter;
}

const SORTS: Array<{ value: CatalogSort; label: string }> = [
	{ value: "destacados", label: "Destacados" },
	{ value: "precio-asc", label: "Precio: menor a mayor" },
	{ value: "precio-desc", label: "Precio: mayor a menor" },
	{ value: "nuevos", label: "Más nuevos" },
	{ value: "valorados", label: "Mejor valorados" },
];


/** Orden del servidor (sin JS). Disponibles siempre antes que "Próximamente". */
export function sortProducts(list: ShopProduct[], sort: CatalogSort): ShopProduct[] {
	const avail = (p: ShopProduct) => (p.availability === "coming_soon" ? 1 : 0);
	const by: Record<CatalogSort, (a: ShopProduct, b: ShopProduct) => number> = {
		destacados: () => 0,
		"precio-asc": (a, b) => fromPriceCents(a) - fromPriceCents(b),
		"precio-desc": (a, b) => fromPriceCents(b) - fromPriceCents(a),
		nuevos: (a, b) => b.created_at - a.created_at,
		valorados: (a, b) => (b.stats.ratingAvg ?? 0) - (a.stats.ratingAvg ?? 0) || b.stats.sales - a.stats.sales,
	};
	return [...list].sort((a, b) => avail(a) - avail(b) || by[sort](a, b));
}

export function matchesFilter(p: ShopProduct, filter: CatalogFilter): boolean {
	if (!filter) return true;
	if (filter === "ofertas") return !!saleInfo(p) && p.availability === "available";
	if (filter === "gratis") return canBeFree(p) && p.availability === "available";
	return p.availability === "available";
}

export const Catalog: FC<CatalogProps> = ({ products, welcome, category, query, sort = "destacados", filter = null }) => {
	const maxSales = Math.max(0, ...products.map((p) => p.stats.sales));
	const q = query.trim().toLowerCase();
	const visible = (p: ShopProduct) => (!category || p.category === category) && (!q || searchText(p).includes(q)) && matchesFilter(p, filter);
	const ordered = sortProducts(products, sort);
	const shown = ordered.filter(visible);
	const used = new Set(products.map((p) => p.category));
	const cats = CATEGORIES.filter((c) => used.has(c.slug));
	const deals = products
		.filter((p) => saleInfo(p) && p.availability === "available")
		.sort((a, b) => (saleInfo(b)?.percent ?? 0) - (saleInfo(a)?.percent ?? 0));
	const available = products.filter((p) => p.availability === "available").length;
	const freeCount = products.filter((p) => canBeFree(p) && p.availability === "available").length;
	const soonCount = products.length - available;
	const keep = (extra: Record<string, string | null>) => {
		const u = new URLSearchParams();
		const base: Record<string, string | null> = { categoria: category, q: query || null, orden: sort === "destacados" ? null : sort, filtro: filter };
		for (const [k, v] of Object.entries({ ...base, ...extra })) if (v) u.set(k, v);
		const s = u.toString();
		return `/market/${s ? `?${s}` : ""}#catalogo`;
	};
	return (
		<>
			<section class="tc-shell mk5-catalog" id="catalogo" aria-labelledby="catalogo-titulo">
				<div class="mk5-intro">
					<h1 id="catalogo-titulo">Mi stack de herramientas</h1>
					<p>Agentes y skills de IA en español para anuncios, video y SEO · pago único · descarga inmediata</p>
				</div>
				<form class="mk3-toolbar" method="get" action="/market/#catalogo" data-catalog-form>
					<label class="mk-visually-hidden" for="mk-q">
						Buscar en el catálogo
					</label>
					<input id="mk-q" class="mk3-toolbar-q" type="search" name="q" value={query} placeholder="Buscar en el catálogo…" autocomplete="off" maxlength={60} data-filter-input />
					<label class="mk-visually-hidden" for="mk-cat">
						Categoría
					</label>
					<select id="mk-cat" name="categoria" data-filter-cat>
						<option value="">Todas las categorías</option>
						{cats.map((c) => (
							<option value={c.slug} selected={category === c.slug}>
								{c.label}
							</option>
						))}
					</select>
					<label class="mk-visually-hidden" for="mk-sort">
						Ordenar por
					</label>
					<select id="mk-sort" name="orden" data-filter-sort>
						{SORTS.map((s) => (
							<option value={s.value} selected={sort === s.value}>
								{s.label}
							</option>
						))}
					</select>
					{filter && <input type="hidden" name="filtro" value={filter} />}
					<noscript>
						<button type="submit" class="tc-btn tc-btn--secondary">
							Aplicar
						</button>
					</noscript>
				</form>
				<nav class="mk3-pills" aria-label="Filtros rápidos">
					<a href={keep({ filtro: null, categoria: null })} class="mk3-pill" aria-current={!filter && !category ? "true" : undefined} data-quick="">
						Todo <small>{products.length}</small>
					</a>
					{deals.length > 0 && (
						<a href={keep({ filtro: "ofertas", categoria: null })} class="mk3-pill" aria-current={filter === "ofertas" ? "true" : undefined} data-quick="ofertas">
							Ofertas <small>{deals.length}</small>
						</a>
					)}
					{freeCount > 0 && (
						<a href={keep({ filtro: "gratis", categoria: null })} class="mk3-pill" aria-current={filter === "gratis" ? "true" : undefined} data-quick="gratis">
							Desde $0 <small>{freeCount}</small>
						</a>
					)}
					{soonCount > 0 && (
						<a href={keep({ filtro: "disponibles" })} class="mk3-pill" aria-current={filter === "disponibles" ? "true" : undefined} data-quick="disponibles">
							Disponibles ahora
						</a>
					)}
					{cats.length > 1 &&
						cats.map((c) => (
							<a href={keep({ categoria: c.slug, filtro: null })} class="mk3-pill" data-cat-filter={c.slug} aria-current={category === c.slug ? "true" : undefined}>
								{c.label} <small>{products.filter((p) => p.category === c.slug).length}</small>
							</a>
						))}
				</nav>
				<p class="mk-visually-hidden" data-filter-count>
					{shown.length} {shown.length === 1 ? "producto" : "productos"}
				</p>
				{products.length === 0 ? (
					<p class="mk-alert">Todavía no hay productos publicados. Vuelve pronto.</p>
				) : (
					<>
						<ul class="mk5-grid" data-filter-grid>
							{/* El filtro del servidor (sin JS) oculta lo que no coincide; market.js filtra y ordena al instante. */}
							{ordered.map((p, i) => (
								<ProductCard p={p} maxSales={maxSales} welcome={welcome} eager={i === 0} hidden={!visible(p)} />
							))}
						</ul>
						<p class="mk-empty" data-filter-empty hidden={shown.length > 0 ? true : undefined}>
							No encontramos productos con esos filtros. <a href="/market#catalogo">Ver todos</a>
						</p>
					</>
				)}
			</section>

			<section class="tc-shell mk-section">
				<a href="/market/agentes-para-empresas" class="mk-service-banner">
					<div>
						<p class="mk-kicker">Servicio a medida</p>
						<h2>¿Prefieres que lo construyamos por ti?</h2>
						<p>
							Diseñamos y entregamos agentes de IA para tu empresa: ventas por WhatsApp, atención, agenda y automatizaciones conectadas a tu
							CRM. Reserva un diagnóstico y ve los horarios disponibles antes de pagar.
						</p>
						<span class="tc-btn tc-btn--primary">
							Ver el servicio <Icon name="arrow" size={16} />
						</span>
					</div>
					<img src="/market/static/products/agentes-para-empresas/mascota.webp" alt="" width="260" height="260" loading="lazy" class="mk-float" />
				</a>
			</section>

			<section class="tc-shell mk-section" aria-labelledby="porque-titulo">
				<div class="mk-section-head">
					<div>
						<p class="mk-kicker">Por qué Market Tony</p>
						<h2 id="porque-titulo">Herramientas prácticas, compra sin riesgo</h2>
					</div>
				</div>
				<div class="mk-why">
					<div>
						<b>Enfocadas en un trabajo concreto</b>
						<p>Cada producto resuelve una tarea puntual: anuncios, video, SEO técnico o automatización. Las fichas dicen qué hace y qué no.</p>
					</div>
					<div>
						<b>Pago único o tú eliges el precio</b>
						<p>Sin suscripciones. Algunos productos son «paga lo que quieras»: desde $0. Las herramientas de IA que uses aparte tienen su propio costo.</p>
					</div>
					<div>
						<b>En español y con soporte</b>
						<p>Guías e instrucciones en español. Si algo no funciona, te responde una persona por correo.</p>
					</div>
				</div>
				<TrustStrip />
			</section>

			<section class="tc-shell mk-section mk-faq-wrap" aria-labelledby="faq-titulo">
				<div class="mk-section-head">
					<div>
						<p class="mk-kicker">Preguntas frecuentes</p>
						<h2 id="faq-titulo">Antes de comprar</h2>
					</div>
				</div>
				<div class="mk-faq">
					{storeFaq(soonCount > 0).map((f) => (
						<details>
							<summary>{f.q}</summary>
							<p>{f.a}</p>
						</details>
					))}
				</div>
			</section>
		</>
	);
};

const SOON_FAQ_Q = "¿Qué significa «Próximamente»?";

/** Preguntas del catálogo; la de «Próximamente» solo cuando hay productos en esa etapa. */
export const storeFaq = (hasSoon: boolean) => (hasSoon ? STORE_FAQ : STORE_FAQ.filter((f) => f.q !== SOON_FAQ_Q));

export const STORE_FAQ = [
	{ q: "¿Cómo recibo lo que compro?", a: "Apenas se confirma el pago, el producto aparece en «Mis compras» y te llega un correo con tu enlace de descarga personal." },
	{ q: "¿Necesito una cuenta?", a: "Entras con tu cuenta de Google, sin contraseñas. Solo guardamos tu correo y tu nombre." },
	{ q: "¿Es un pago único?", a: "Sí. No hay suscripciones. Algunas herramientas necesitan servicios externos (por ejemplo Claude Code o Codex), que se pagan aparte con su proveedor." },
	{
		q: "¿Qué significa «paga lo que quieras»?",
		a: "Tú eliges cuánto pagar, desde el mínimo que indica la ficha (a veces $0) hasta $999,999.99 USD, el máximo que permite Stripe. Con $0 lo descargas gratis; los pagos con tarjeta empiezan en $0.50.",
	},
	{ q: "¿Los precios tachados son reales?", a: "Sí. Solo tachamos un precio cuando el producto se vendió de verdad a ese precio antes de la oferta." },
	{ q: "¿Cómo funciona el cupón de bienvenida?", a: "Es un descuento para tu primera compra pagada en Market Tony, en productos de precio fijo. Escribe el código en la ficha antes de pagar; se aplica en el checkout seguro de Stripe." },
	{ q: "¿Puedo pedir un reembolso?", a: "Sí, dentro de los 14 días posteriores a la compra si todavía no descargaste el producto, o si el archivo está dañado. Detalles en la política de reembolsos." },
	{ q: SOON_FAQ_Q, a: "Son herramientas en desarrollo. No se pueden comprar todavía: deja tu correo en «Avísame» y te escribimos el día del lanzamiento." },
];

// ── Ficha de producto ────────────────────────────────────────────────

export interface ProductViewProps {
	product: ShopProduct;
	loggedIn: boolean;
	owned: boolean;
	csrf: string | null;
	mode: "mock" | "live";
	flash: string | null;
	notice: string | null;
	reviews: ReviewRow[];
	breakdown: Record<number, number>;
	related: ShopProduct[];
	maxSales: number;
	welcome: WelcomeOffer | null;
	userEmail: string | null;
	/** Monto elegido antes de entrar (?monto= en la URL), ya validado contra los límites del producto. */
	pwywInitial?: number | null;
}

const GoogleIcon = () => (
	<svg class="mk-google-icon" viewBox="0 0 48 48" aria-hidden="true">
		<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
		<path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
		<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
		<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
	</svg>
);

export const LoginButton: FC<{ next: string; mode: "mock" | "live"; label?: string }> = ({ next, mode, label }) => (
	<a class="tc-btn tc-btn--primary mk-btn-block" href={`/market/auth/start?next=${encodeURIComponent(next)}`}>
		{mode === "live" ? <GoogleIcon /> : null}
		{label ?? (mode === "live" ? "Continuar con Google" : "Entrar con usuario de prueba (maqueta)")}
	</a>
);

const PayNote: FC<{ mode: "mock" | "live" }> = ({ mode }) => (
	<p class="mk-muted mk3-paynote">
		{mode === "live" ? (
			<>
				<Icon name="lock" size={13} /> Pago seguro con Stripe.
			</>
		) : (
			"Pago SIMULADO (modo maqueta)."
		)} Recibes el enlace de descarga en tu correo y en Mis compras. Al
		comprar aceptas los <a href="/market/legal/terminos">Términos</a> y la <a href="/market/legal/reembolsos">Política de reembolsos</a>.
	</p>
);

/** Montos rápidos para "paga lo que quieras": 0 (si se puede), el sugerido y dos más. */
export function pwywPresets(p: Product): number[] {
	const { min, max } = pwywBounds(p);
	const s = Math.max(p.price_cents, min);
	const raw = [min === 0 ? 0 : min, s, Math.round((s * 2) / 100) * 100, Math.round((s * 5) / 100) * 100];
	return [...new Set(raw)].filter((v) => v >= min && v <= max).slice(0, 4);
}

const PwywForm: FC<{ product: Product; csrf: string | null; mode: "mock" | "live"; initial?: number | null }> = ({ product, csrf, mode, initial }) => {
	const path = productUrl(product.slug);
	const { min, max } = pwywBounds(product);
	const suggested = initial ?? Math.max(product.price_cents, min);
	return (
		<form method="post" action={`${path}/comprar`} class="mk3-pwyw" data-pwyw data-min={String(min)} data-max={String(max)}>
			<CsrfField csrf={csrf} />
			<label for="monto" class="mk3-pwyw-label">
				Tú eliges el precio
			</label>
			<div class="mk3-amount">
				<span aria-hidden="true">$</span>
				<input
					id="monto"
					name="monto"
					type="text"
					inputmode="decimal"
					autocomplete="off"
					maxlength={13}
					value={(suggested / 100).toFixed(suggested % 100 === 0 ? 0 : 2)}
					aria-describedby="monto-ayuda"
					required
					data-pwyw-input
				/>
				<span class="mk3-amount-cur">USD</span>
			</div>
			<div class="mk3-presets" role="group" aria-label="Montos rápidos">
				{pwywPresets(product).map((v) => (
					<button type="button" class="mk3-preset" data-amount={(v / 100).toFixed(v % 100 === 0 ? 0 : 2)}>
						{amount(v, product.currency)}
					</button>
				))}
			</div>
			<p class="mk-hint" id="monto-ayuda">
				{min === 0 ? "Escribe 0 para descargarlo gratis, o apoya al creador con lo que quieras. " : `Mínimo ${formatPrice(min, product.currency)}. `}
				Pagos con tarjeta desde $0.50 hasta {formatPrice(Math.min(max, STRIPE_MAX_CENTS), product.currency)}.
			</p>
			{min === 0 && (
				<label class="mk-check">
					<input type="checkbox" name="marketing" value="1" />
					<span>Quiero recibir novedades y recursos de Tony Ciencia por correo (opcional).</span>
				</label>
			)}
			<button type="submit" class="tc-btn tc-btn--primary mk-btn-block mk-btn-glow" data-pwyw-submit>
				Continuar con {formatPrice(suggested, product.currency)}
			</button>
			<PayNote mode={mode} />
		</form>
	);
};

const BuyActions: FC<ProductViewProps> = ({ product, loggedIn, owned, csrf, mode, welcome, userEmail, pwywInitial }) => {
	const path = productUrl(product.slug);
	if (product.availability === "coming_soon") {
		return (
			<form method="post" action={`${path}/avisame`} class="mk-form" data-waitlist>
				<CsrfField csrf={csrf} />
				<div class="mk-field">
					<label for="aviso-email">Avísame cuando salga</label>
					<input id="aviso-email" type="email" name="email" required maxlength={254} autocomplete="email" placeholder="tu@correo.com" value={userEmail ?? undefined} />
				</div>
				<button type="submit" class="tc-btn tc-btn--primary mk-btn-block mk-btn-glow">
					Unirme a la lista de espera
				</button>
				<p class="mk-muted">Gratis y sin compromiso. Solo te escribimos para avisarte del lanzamiento.</p>
			</form>
		);
	}
	if (owned) {
		return (
			<>
				<p class="mk-alert mk-alert--ok" style="margin-bottom: var(--spacing-4)">
					<strong>Ya es tuyo.</strong> Puedes descargarlo cuando quieras desde Mis compras.
				</p>
				<a class="tc-btn tc-btn--primary mk-btn-block" href="/market/mis-compras">
					Ir a Mis compras
				</a>
			</>
		);
	}
	if (!loggedIn && isPwyw(product)) {
		// Los montos se ven antes de entrar: el comprador elige y después inicia sesión con ese monto ya puesto.
		const login = (cents: number) => `/market/auth/start?next=${encodeURIComponent(`${path}?monto=${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}#comprar`)}`;
		const suggested = Math.max(product.price_cents, pwywBounds(product).min);
		return (
			<div class="mk3-pwyw">
				<p class="mk3-pwyw-label">Tú eliges el precio</p>
				<div class="mk3-presets" role="group" aria-label="Montos rápidos">
					{pwywPresets(product).map((v) => (
						<a class={`mk3-preset ${v === suggested ? "is-on" : ""}`} href={login(v)} aria-label={`Elegir ${formatPrice(v, product.currency)}`}>
							{amount(v, product.currency)}
						</a>
					))}
				</div>
				<LoginButton next={`${path}?monto=${(suggested / 100).toFixed(suggested % 100 === 0 ? 0 : 2)}#comprar`} mode={mode} label={mode === "live" ? `Continuar con ${amount(suggested, product.currency)}` : undefined} />
				<p class="mk-muted">Entras con tu cuenta de Google, sin contraseña. Después puedes cambiar el monto.</p>
			</div>
		);
	}
	if (!loggedIn) {
		const label = mode === "live" ? (product.kind === "free" ? "Entrar con Google para descargar" : isPwyw(product) ? "Entrar con Google para elegir tu precio" : "Entrar con Google para comprar") : undefined;
		return (
			<>
				<LoginButton next={`${path}#comprar`} mode={mode} label={label} />
				<p class="mk-muted">Sin contraseñas: entras con tu cuenta de Google. Solo guardamos tu correo y tu nombre.</p>
			</>
		);
	}
	if (product.kind === "free") {
		return (
			<form method="post" action={`${path}/obtener`} class="mk-form">
				<CsrfField csrf={csrf} />
				<label class="mk-check">
					<input type="checkbox" name="marketing" value="1" />
					<span>Quiero recibir por correo novedades y recursos de Tony Ciencia. Es opcional y puedes darte de baja cuando quieras.</span>
				</label>
				<button type="submit" class="tc-btn tc-btn--primary mk-btn-block">
					Descargar gratis
				</button>
				<p class="mk-muted">Lo descargas aquí mismo y además te enviamos el enlace por correo.</p>
			</form>
		);
	}
	if (isPwyw(product)) return <PwywForm product={product} csrf={csrf} mode={mode} initial={pwywInitial} />;
	return (
		<form method="post" action={`${path}/comprar`}>
			<CsrfField csrf={csrf} />
			<details class="mk-coupon" open={welcome ? true : undefined}>
				<summary>¿Tienes un cupón?</summary>
				<div class="mk-field">
					<label for="cupon" class="mk-visually-hidden">
						Código de cupón
					</label>
					<input
						id="cupon"
						type="text"
						name="cupon"
						maxlength={64}
						autocomplete="off"
						autocapitalize="characters"
						spellcheck={false}
						placeholder={welcome ? welcome.code : "Código (opcional)"}
						data-coupon-input
					/>
					<span class="mk-hint">{welcome ? `Usa ${welcome.code} en tu primera compra. ` : ""}El descuento se aplica al pagar con Stripe.</span>
				</div>
			</details>
			<button type="submit" class="tc-btn tc-btn--primary mk-btn-block mk-btn-glow">
				Comprar ahora · {formatPrice(product.price_cents, product.currency)}
			</button>
			<PayNote mode={mode} />
		</form>
	);
};

const RatingSummary: FC<{ product: ShopProduct; breakdown: Record<number, number> }> = ({ product, breakdown }) => {
	const { ratingAvg, ratingCount } = product.stats;
	if (!ratingCount || ratingAvg === null) {
		return (
			<p class="mk-muted">
				Aún no hay reseñas. Las reseñas solo las pueden dejar personas que tienen el producto, desde <a href="/market/mis-compras">Mis compras</a>.
			</p>
		);
	}
	return (
		<div class="mk-rating-sum">
			<div class="mk-rating-big">
				<b>{ratingText(ratingAvg)}</b>
				<Stars value={ratingAvg} />
				<span class="mk-muted">
					{ratingCount} {ratingCount === 1 ? "reseña" : "reseñas"} de compradores verificados
				</span>
			</div>
			<ul class="mk-bars">
				{[5, 4, 3, 2, 1].map((n) => (
					<li>
						<span class="mk-bar-n">
							{n}
							<span class="mk-star-sm" aria-hidden="true"></span>
						</span>
						<span class="mk-bar">
							<i style={`width: ${ratingCount ? Math.round(((breakdown[n] ?? 0) / ratingCount) * 100) : 0}%`}></i>
						</span>
						<span class="mk-muted">{breakdown[n] ?? 0}</span>
					</li>
				))}
			</ul>
		</div>
	);
};

/** Precio corto de la barra fija del celular. */
const BuybarPrice: FC<{ product: Product }> = ({ product }) => {
	if (product.availability === "coming_soon") return <span class="mk-buybar-price">Próximamente</span>;
	if (product.kind === "free") return <span class="mk-buybar-price">$0</span>;
	if (isPwyw(product)) return <span class="mk-buybar-price">Desde {amount(pwywBounds(product).min, product.currency)}</span>;
	const sale = saleInfo(product);
	return (
		<span class="mk-buybar-price">
			{formatPrice(product.price_cents, product.currency)}
			{sale && <s> {amount(sale.wasCents, product.currency)}</s>}
		</span>
	);
};

export const ProductPage: FC<ProductViewProps> = (props) => {
	const { product, flash, notice, reviews, breakdown, related, maxSales, welcome } = props;
	const cat = categoryLabel(product.category);
	const soon = product.availability === "coming_soon";
	const images = product.images;
	const sale = saleInfo(product);
	return (
		<div class="mk-product-page" style={product.accent ? `--accent: ${product.accent}` : undefined}>
			<div class="mk-product-glow" aria-hidden="true"></div>
			<div class="tc-shell">
				<nav class="mk-crumbs" aria-label="Ruta">
					<a href="/market">Market</a>
					<span aria-hidden="true">/</span>
					{cat ? <a href={`/market/?categoria=${product.category}#catalogo`}>{cat}</a> : <span>Producto</span>}
					<span aria-hidden="true">/</span>
					<span aria-current="page">{product.title.split(":")[0]}</span>
				</nav>
				{flash && (
					<p class="mk-alert mk-alert--warn" role="alert">
						{flash}
					</p>
				)}
				{notice && (
					<p class="mk-alert mk-alert--ok" role="status">
						{notice}
					</p>
				)}
				<div class="mk-product2">
					<div class="mk-gallery2" data-gallery>
						<div class="mk-gallery2-main">
							{images.length > 0 ? (
								images.map((img, i) => (
									<img
										src={img.src}
										alt={img.alt}
										width="1600"
										height="1000"
										loading={i === 0 ? "eager" : "lazy"}
										fetchpriority={i === 0 ? "high" : undefined}
										decoding={i === 0 ? undefined : "async"}
										data-slide={String(i)}
										class={i === 0 ? "is-active" : undefined}
										id={`imagen-${i + 1}`}
									/>
								))
							) : (
								<div class="mk-gallery2-empty" aria-hidden="true"></div>
							)}
							{images.length > 1 && (
								<>
									<button type="button" class="mk-gal-nav mk-gal-prev" aria-label="Imagen anterior" data-gal-prev>
										‹
									</button>
									<button type="button" class="mk-gal-nav mk-gal-next" aria-label="Imagen siguiente" data-gal-next>
										›
									</button>
								</>
							)}
						</div>
						{images.length > 1 && (
							<div class="mk-thumbs" role="tablist" aria-label="Imágenes del producto">
								{images.map((img, i) => (
									<a href={`#imagen-${i + 1}`} class={`mk-thumb ${i === 0 ? "is-active" : ""}`} data-thumb={String(i)} role="tab" aria-selected={i === 0 ? "true" : "false"} aria-label={`Ver imagen ${i + 1}: ${img.alt}`}>
										<img src={img.src} alt="" width="160" height="100" loading="lazy" decoding="async" />
									</a>
								))}
							</div>
						)}
					</div>

					<div class="mk-info">
						<div class="mk-info-sticky">
							<BadgeList badges={cardBadges(product, maxSales)} />
							<h1>
								{shortName(product.title)}
								{product.title.includes(":") && (
									<>
										<span class="mk-visually-hidden">: </span>
										<span class="mk5-h1-sub">{product.title.slice(product.title.indexOf(":") + 1).trim()}</span>
									</>
								)}
							</h1>
							{product.tagline && <p class="mk-tagline">{product.tagline}</p>}
							<div class="mk-info-meta">
								{product.stats.ratingCount > 0 && product.stats.ratingAvg !== null ? (
									<a href="#resenas" class="mk-meta-rating">
										<Stars value={product.stats.ratingAvg} /> <b>{ratingText(product.stats.ratingAvg)}</b>
										<span class="mk-muted">
											({product.stats.ratingCount} {product.stats.ratingCount === 1 ? "reseña" : "reseñas"})
										</span>
									</a>
								) : null}
								{product.stats.sales > 0 && <span class="mk-meta-sales">{salesText(product.stats.sales)}</span>}
								<span class="mk-muted">{soon ? "En desarrollo" : product.kind === "free" ? "Recurso gratis" : "Producto digital · Descarga inmediata"}</span>
							</div>
							<div class={`tc-card mk-buybox2 mk3-buybox ${sale && !soon ? "is-sale" : ""}`} id="comprar">
								{sale && !soon && <p class="mk3-buybox-flag">Oferta · antes {formatPrice(sale.wasCents, product.currency)}</p>}
								<PriceBlock product={product} welcome={welcome} size="lg" />
								<BuyActions {...props} />
							</div>
							{!soon && <TrustStrip compact />}
						</div>
					</div>
					<div class="mk-extra">
						{(product.compat.works.length > 0 || product.compat.includes.length >= 2) && (
							<div class="mk3-compat-box">
								<IncludesBox items={product.compat.includes} />
								{product.compat.works.length > 0 && (
									<>
										<p class="mk3-compat-title">Funciona con</p>
										<ul class="mk3-compat-list">
											{product.compat.works.map((it) => (
												<li>
													{BRANDS[it.k]?.icon ? <BrandLogo k={it.k} size={16} /> : <Icon name="check" size={14} />}
													{it.label}
												</li>
											))}
										</ul>
										<p class="mk3-compat-fine">Las marcas pertenecen a sus titulares; se muestran solo para indicar compatibilidad.</p>
									</>
								)}
							</div>
						)}
						{product.highlights.length > 0 && (
							<ul class="mk-highlights">
								{product.highlights.slice(0, 6).map((h) => (
									<li>
										<span class="mk-hl-ic">
											<Check />
										</span>
										{h}
									</li>
								))}
							</ul>
						)}
					</div>
				</div>

				<nav class="mk-tabs" aria-label="Secciones del producto">
					<a href="#descripcion">Descripción</a>
					{product.specs.length > 0 && <a href="#detalles">Detalles</a>}
					{product.faq.length > 0 && <a href="#preguntas">Preguntas</a>}
					{!soon && <a href="#resenas">Reseñas</a>}
				</nav>

				<div class="mk-detail-grid">
					<div>
						{product.video_id && (
							<section class="mk-block" aria-label="Video">
								<div class="mk-yt" data-yt={product.video_id}>
									<a href={`https://www.youtube.com/watch?v=${product.video_id}`} target="_blank" rel="noopener">
										<img src={`https://i.ytimg.com/vi/${product.video_id}/hqdefault.jpg`} alt={`Video de ${product.title}`} loading="lazy" width="480" height="360" />
										<span class="mk-yt-play" aria-hidden="true">
											▶
										</span>
									</a>
								</div>
							</section>
						)}
						<section class="mk-block mk-description" id="descripcion" aria-labelledby="descripcion-t">
							<h2 class="mk-block-title" id="descripcion-t">
								Descripción
							</h2>
							{product.description ? <Description text={product.description} /> : <p>{product.summary}</p>}
						</section>
						{product.faq.length > 0 && (
							<section class="mk-block" id="preguntas" aria-labelledby="preguntas-t">
								<h2 class="mk-block-title" id="preguntas-t">
									Preguntas frecuentes
								</h2>
								<div class="mk-faq">
									{product.faq.map((f) => (
										<details>
											<summary>{f.q}</summary>
											<p>{f.a}</p>
										</details>
									))}
								</div>
							</section>
						)}
						{!soon && (
							<section class="mk-block" id="resenas" aria-labelledby="resenas-t">
								<h2 class="mk-block-title" id="resenas-t">
									Reseñas
								</h2>
								<RatingSummary product={product} breakdown={breakdown} />
								{reviews.length > 0 && (
									<ul class="mk-reviews">
										{reviews.map((r) => (
											<li class="tc-card">
												<div class="mk-review-head">
													<Stars value={r.rating} />
													<b>{r.display_name || "Comprador verificado"}</b>
													<span class="mk-chip mk-chip--plain">Compra verificada</span>
													<span class="mk-muted">{new Date(r.created_at).toLocaleDateString("es", { year: "numeric", month: "short", day: "numeric" })}</span>
												</div>
												{r.body && <p>{r.body}</p>}
											</li>
										))}
									</ul>
								)}
							</section>
						)}
					</div>
					<aside>
						{product.specs.length > 0 && (
							<section class="tc-card mk-specs" id="detalles" aria-labelledby="detalles-t">
								<h2 class="mk-block-title" id="detalles-t">
									Detalles del producto
								</h2>
								<dl>
									{product.specs.map((s) => (
										<>
											<dt>{s.label}</dt>
											<dd>{s.value}</dd>
										</>
									))}
									<dt>Precio</dt>
									<dd>
										{product.kind === "free"
											? "Gratis"
											: isPwyw(product)
												? `Paga lo que quieras (desde ${formatPrice(pwywBounds(product).min, product.currency)})`
												: sale
													? `${formatPrice(product.price_cents, product.currency)} (antes ${formatPrice(sale.wasCents, product.currency)})`
													: formatPrice(product.price_cents, product.currency)}
									</dd>
									<dt>Entrega</dt>
									<dd>Descarga digital inmediata</dd>
									<dt>Vendido por</dt>
									<dd>Tony Ciencia LLC</dd>
								</dl>
							</section>
						)}
						{product.tags.length > 0 && (
							<div class="mk-tags">
								{product.tags.map((t) => (
									<a href={`/market/?q=${encodeURIComponent(t)}#catalogo`} class="mk-tag">
										{t}
									</a>
								))}
							</div>
						)}
					</aside>
				</div>

				{related.length > 0 && (
					<section class="mk-section" aria-labelledby="rel-t">
						<div class="mk-section-head">
							<div>
								<p class="mk-kicker">Sigue explorando</p>
								<h2 id="rel-t">Completa tu kit</h2>
							</div>
							<a href="/market#catalogo" class="mk-textlink">
								Ver todo el catálogo <Icon name="arrow" size={15} />
							</a>
						</div>
						<ul class="mk3-grid mk3-grid--3">
							{related.map((p) => (
								<ProductCard p={p} maxSales={maxSales} welcome={welcome} />
							))}
						</ul>
					</section>
				)}
			</div>

			<div class="mk-buybar" data-buybar>
				<div class="mk-buybar-inner">
					<span class="mk-buybar-title">{product.title.split(":")[0]}</span>
					<BuybarPrice product={product} />
					<a href="#comprar" class="tc-btn tc-btn--primary">
						{soon ? "Avísame" : product.kind === "free" ? "Descargar" : isPwyw(product) ? "Elegir precio" : isBuyable(product) ? "Comprar" : "Ver"}
					</a>
				</div>
			</div>
		</div>
	);
};

// ── Servicio: agentes de IA para empresas ────────────────────────────

export const SERVICE_FAQ = [
	{ q: "¿Qué pasa en la sesión de diagnóstico?", a: "Revisamos tu negocio, tus canales y tus procesos, y salimos con una propuesta concreta de qué agente construir primero, con alcance, tiempos y presupuesto." },
	{ q: "¿Por qué se paga la reserva?", a: "Para dedicarte una sesión completa y preparada. Ves los horarios disponibles, eliges el tuyo y pagas en el mismo paso." },
	{ q: "¿Con qué herramientas trabajan?", a: "WhatsApp, Instagram, Messenger, HighLevel, n8n, Google Workspace, Stripe y modelos de IA como Claude y GPT, según lo que ya uses." },
	{ q: "¿Trabajan con empresas fuera de Estados Unidos?", a: "Sí. Trabajamos en español con negocios de toda Latinoamérica, España y Estados Unidos, por videollamada." },
];

export const ServicePage: FC<{ bookingUrl: string | null; embedUrl: string | null }> = ({ bookingUrl, embedUrl }) => {
	const cta = bookingUrl ?? "mailto:business@tonyciencia.com?subject=Diagn%C3%B3stico%20de%20agentes%20de%20IA";
	const ext = !!bookingUrl;
	return (
		<div class="mk-service" style="--accent: #44b1ff">
			<section class="mk-hero2">
				<div class="mk-hero2-glow" aria-hidden="true"></div>
				<div class="tc-shell mk-hero2-grid">
					<div class="mk-hero2-copy" data-reveal>
						<p class="mk-kicker">
							<span class="mk-dot" aria-hidden="true"></span> Servicio a medida
						</p>
						<h1>
							Agentes de IA <span class="mk-grad">para tu empresa</span>, hechos a medida
						</h1>
						<p class="mk-lead">
							Diseñamos, construimos y entregamos agentes que venden, atienden y operan por ti: conectados a tu WhatsApp, tu CRM, tu calendario y
							tus sistemas. Empieza con una sesión de diagnóstico.
						</p>
						<div class="mk-hero2-cta">
							<a href={ext ? cta : "#reservar"} class="tc-btn tc-btn--primary mk-btn-glow" target={ext && !embedUrl ? "_blank" : undefined} rel={ext ? "noopener" : undefined}>
								Ver horarios y reservar
							</a>
							<a href="https://merkhify.com" class="tc-btn tc-btn--secondary" target="_blank" rel="noopener">
								Conoce Merkhify
							</a>
						</div>
					</div>
					<div class="mk-service-art" aria-hidden="true">
						<img src="/market/static/products/agentes-para-empresas/mascota.webp" alt="" width="420" height="420" class="mk-float" />
						<span class="mk-orbit-pill mk-orbit-pill--1">Responde en WhatsApp 24/7</span>
						<span class="mk-orbit-pill mk-orbit-pill--2">Agenda en tu calendario</span>
						<span class="mk-orbit-pill mk-orbit-pill--3">Conectado a tu CRM</span>
					</div>
				</div>
			</section>

			<section class="tc-shell mk-section" aria-labelledby="que-t">
				<div class="mk-section-head">
					<div>
						<p class="mk-kicker">Qué construimos</p>
						<h2 id="que-t">Agentes que trabajan dentro de tu negocio</h2>
					</div>
				</div>
				<div class="mk-why mk-why--4">
					<div data-reveal>
						<b>Agente de ventas</b>
						<p>Responde, califica y cierra en WhatsApp, Instagram y Messenger, las 24 horas. Entiende audios y fotos.</p>
					</div>
					<div data-reveal>
						<b>Agente de citas</b>
						<p>Ofrece horarios, agenda en tu calendario, confirma y recuerda. Menos ausencias, cero idas y vueltas.</p>
					</div>
					<div data-reveal>
						<b>Agente de soporte</b>
						<p>Contesta con tu información real (precios, políticas, catálogo) y pasa a una persona cuando hace falta.</p>
					</div>
					<div data-reveal>
						<b>Automatizaciones</b>
						<p>Flujos en n8n o HighLevel que mueven tus datos: leads, pagos, reportes y seguimiento.</p>
					</div>
				</div>
			</section>

			<section class="tc-shell mk-section" aria-labelledby="como-t">
				<div class="mk-section-head">
					<div>
						<p class="mk-kicker">Cómo trabajamos</p>
						<h2 id="como-t">De la idea al agente funcionando</h2>
					</div>
				</div>
				<ol class="mk-steps">
					<li data-reveal>
						<b>Diagnóstico</b>
						<span>Sesión por videollamada: entendemos tu negocio y elegimos el primer agente.</span>
					</li>
					<li data-reveal>
						<b>Propuesta</b>
						<span>Alcance, tiempos y presupuesto por escrito, sin letra chica.</span>
					</li>
					<li data-reveal>
						<b>Construcción</b>
						<span>Lo armamos con tus datos y lo probamos contigo antes de salir.</span>
					</li>
					<li data-reveal>
						<b>Entrega</b>
						<span>Lo dejamos funcionando, con capacitación para tu equipo.</span>
					</li>
				</ol>
			</section>

			<section class="tc-shell mk-section" id="reservar" aria-labelledby="reservar-t">
				<div class="mk-booking tc-card" data-reveal>
					<div>
						<p class="mk-kicker">Reserva</p>
						<h2 id="reservar-t">Agenda tu diagnóstico</h2>
						<p class="mk-lead">
							{ext
								? "Ves los horarios disponibles, eliges el tuyo y pagas la sesión al reservar. Recibes la invitación con el enlace de videollamada en tu correo."
								: "Escríbenos y te enviamos los horarios disponibles. La sesión se paga al confirmar la reserva."}
						</p>
						<a href={cta} class="tc-btn tc-btn--primary mk-btn-glow" target={ext ? "_blank" : undefined} rel={ext ? "noopener" : undefined}>
							{ext ? "Abrir el calendario de reservas" : "Pedir horarios por correo"}
						</a>
					</div>
					{embedUrl && <iframe src={embedUrl} title="Calendario de reservas" loading="lazy" class="mk-booking-frame"></iframe>}
				</div>
			</section>

			<section class="tc-shell mk-section mk-faq-wrap" aria-labelledby="sfaq-t">
				<div class="mk-section-head">
					<div>
						<p class="mk-kicker">Preguntas frecuentes</p>
						<h2 id="sfaq-t">Sobre el servicio</h2>
					</div>
				</div>
				<div class="mk-faq">
					{SERVICE_FAQ.map((f) => (
						<details>
							<summary>{f.q}</summary>
							<p>{f.a}</p>
						</details>
					))}
				</div>
			</section>
		</div>
	);
};
