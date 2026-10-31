import type { FC } from "hono/jsx";
import {
	CATEGORIES,
	badgesFor,
	categoryLabel,
	discountPercent,
	isBuyable,
	priceWithPercentOff,
	ratingText,
	salesText,
	type Badge,
} from "../lib/catalog";
import { formatPrice } from "../lib/money";
import type { Product, ReviewRow, ShopProduct } from "../services/repo";
import type { WelcomeOffer } from "../services/welcome";
import { CsrfField } from "./layout";
import { Description } from "./render";

// ── Piezas comunes ───────────────────────────────────────────────────

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
			<span class="mk-price">{formatPrice(product.price_cents, product.currency)}</span>
		</span>
	);

const BadgeList: FC<{ badges: Badge[] }> = ({ badges }) =>
	badges.length ? (
		<span class="mk-badges">
			{badges.map((b) => (
				<span class={`mk-chip mk-chip--${b.tone}`}>{b.label}</span>
			))}
		</span>
	) : null;

/** Precio de tarjeta / ficha: actual, tachado real (si existe) y precio con el cupón de bienvenida. */
export const PriceBlock: FC<{ product: Product; welcome: WelcomeOffer | null; size?: "sm" | "lg" }> = ({ product, welcome, size = "sm" }) => {
	if (product.kind === "free") return <span class={`mk-pricebox mk-pricebox--${size}`}><span class="mk-price-now">Gratis</span></span>;
	const off = discountPercent(product);
	const soon = product.availability === "coming_soon";
	const couponPrice = !soon && welcome?.percentOff ? priceWithPercentOff(product.price_cents, welcome.percentOff) : null;
	return (
		<span class={`mk-pricebox mk-pricebox--${size}`}>
			{soon && <span class="mk-price-label">Precio previsto</span>}
			<span class="mk-price-row">
				<span class="mk-price-now">{formatPrice(product.price_cents, product.currency).replace(` ${product.currency.toUpperCase()}`, "")}</span>
				<span class="mk-price-cur">{product.currency.toUpperCase()}</span>
				{off !== null && product.compare_at_cents && (
					<>
						<s class="mk-price-was">{formatPrice(product.compare_at_cents, product.currency).replace(` ${product.currency.toUpperCase()}`, "")}</s>
						<span class="mk-chip mk-chip--off">−{off}%</span>
					</>
				)}
			</span>
			{couponPrice !== null && (
				<span class="mk-price-coupon">
					{formatPrice(couponPrice, product.currency)} con <b>{welcome!.code}</b>
				</span>
			)}
		</span>
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

export const ProductCard: FC<{ p: ShopProduct; maxSales: number; welcome: WelcomeOffer | null; eager?: boolean; hidden?: boolean }> = ({ p, maxSales, welcome, eager, hidden }) => {
	const cover = p.images[0];
	const search = [p.title, p.tagline, p.summary, ...p.tags, categoryLabel(p.category) ?? ""].join(" ").toLowerCase();
	return (
		<li class="mk-pcard-wrap" data-cat={p.category || "otros"} data-search={search} data-reveal hidden={hidden ? true : undefined}>
			<article class="mk-pcard" style={p.accent ? `--accent: ${p.accent}` : undefined} data-tilt>
				<div class="mk-pcard-media">
					{cover ? <img src={cover.src} alt={cover.alt} loading={eager ? "eager" : "lazy"} width="800" height="500" /> : null}
					<span class="mk-pcard-shine" aria-hidden="true"></span>
					<BadgeList badges={badgesFor(p, maxSales)} />
				</div>
				<div class="mk-pcard-body">
					{categoryLabel(p.category) && <p class="mk-pcard-cat">{categoryLabel(p.category)}</p>}
					<h3 class="mk-pcard-title">
						<a href={productUrl(p.slug)} class="mk-stretch">
							{p.title}
						</a>
					</h3>
					<p class="mk-pcard-tag">{p.tagline || p.summary}</p>
					<Meta p={p} />
					<div class="mk-pcard-foot">
						<PriceBlock product={p} welcome={welcome} />
						<span class="mk-pcard-cta" aria-hidden="true">
							{p.availability === "coming_soon" ? "Avísame" : "Ver"} <span class="mk-arrow">→</span>
						</span>
					</div>
				</div>
			</article>
		</li>
	);
};

const Check = () => (
	<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M20 6 9 17l-5-5" />
	</svg>
);

const TRUST = [
	{ icon: "⚡", title: "Descarga inmediata", text: "En tu correo y en Mis compras apenas se confirma el pago." },
	{ icon: "🔒", title: "Pago seguro con Stripe", text: "No vemos ni guardamos los datos de tu tarjeta." },
	{ icon: "↩", title: "Reembolso en 14 días", text: "Si aún no lo descargaste.", href: "/market/legal/reembolsos" },
	{ icon: "💬", title: "Soporte en español", text: "Te responde una persona: business@tonyciencia.com" },
];

export const TrustStrip: FC<{ compact?: boolean }> = ({ compact }) => (
	<ul class={`mk-trust ${compact ? "mk-trust--compact" : ""}`}>
		{TRUST.map((t) => (
			<li>
				<span class="mk-trust-ic" aria-hidden="true">
					{t.icon}
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

export interface CatalogProps {
	products: ShopProduct[];
	welcome: WelcomeOffer | null;
	category: string | null;
	query: string;
}

const MARQUEE = ["Claude Code", "Codex", "n8n", "Meta Ads", "Google Ads", "TikTok", "LinkedIn", "Instagram", "WhatsApp", "HighLevel", "Stripe", "Cursor", "Gemini"];

export const Catalog: FC<CatalogProps> = ({ products, welcome, category, query }) => {
	const maxSales = Math.max(0, ...products.map((p) => p.stats.sales));
	const showcase = products.filter((p) => p.images[0]).slice(0, 3);
	const q = query.trim().toLowerCase();
	const visible = (p: ShopProduct) => (!category || p.category === category) && (!q || [p.title, p.tagline, p.summary, ...p.tags].join(" ").toLowerCase().includes(q));
	const shown = products.filter(visible);
	const used = new Set(products.map((p) => p.category));
	const cats = CATEGORIES.filter((c) => used.has(c.slug));
	return (
		<>
			<section class="mk-hero2">
				<div class="mk-hero2-glow" aria-hidden="true"></div>
				<div class="tc-shell mk-hero2-grid">
					<div class="mk-hero2-copy" data-reveal>
						<p class="mk-kicker">
							<span class="mk-dot" aria-hidden="true"></span> Market Tony · Tienda de Tony Ciencia
						</p>
						<h1>
							Herramientas de IA <span class="mk-grad">que trabajan por ti</span>
						</h1>
						<p class="mk-lead">
							Agentes, skills y plantillas para crear anuncios, videos y automatizaciones con Claude Code, Codex y n8n. En español, pago
							único y descarga inmediata.
						</p>
						<div class="mk-hero2-cta">
							<a href="#catalogo" class="tc-btn tc-btn--primary mk-btn-glow">
								Ver productos
							</a>
							<a href="/market/agentes-para-empresas" class="tc-btn tc-btn--secondary">
								Agentes a medida para empresas
							</a>
						</div>
						<TrustStrip compact />
					</div>
					<div class="mk-hero2-stack" aria-hidden="true" data-parallax>
						{showcase.map((p, i) => (
							<a href={productUrl(p.slug)} class={`mk-stack-card mk-stack-card--${i + 1}`} tabindex={-1} style={p.accent ? `--accent: ${p.accent}` : undefined}>
								<img src={p.images[0]!.src} alt="" width="800" height="500" loading={i === 0 ? "eager" : "lazy"} />
								<span class="mk-stack-price">
									{p.availability === "coming_soon" ? "Próximamente" : formatPrice(p.price_cents, p.currency)}
								</span>
							</a>
						))}
					</div>
				</div>
			</section>

			<div class="mk-marquee" aria-label="Funciona con">
				<div class="mk-marquee-track">
					{[...MARQUEE, ...MARQUEE].map((m, i) => (
						<span aria-hidden={i >= MARQUEE.length ? "true" : undefined}>{m}</span>
					))}
				</div>
			</div>

			<section class="tc-shell mk-section" id="catalogo" aria-labelledby="catalogo-titulo">
				<div class="mk-section-head">
					<div>
						<p class="mk-kicker">Catálogo</p>
						<h2 id="catalogo-titulo">Elige tu próxima herramienta</h2>
					</div>
					<form class="mk-search" method="get" action="/market#catalogo" role="search">
						<label class="mk-visually-hidden" for="mk-q">
							Buscar productos
						</label>
						<input id="mk-q" type="search" name="q" value={query} placeholder="Buscar: videos, anuncios, n8n…" autocomplete="off" maxlength={60} data-filter-input />
						{category && <input type="hidden" name="categoria" value={category} />}
					</form>
				</div>
				<nav class="mk-cats" aria-label="Categorías">
					<a href="/market#catalogo" class="mk-cat" aria-current={!category ? "true" : undefined} data-cat-filter="">
						Todos <span>{products.length}</span>
					</a>
					{cats.map((c) => (
						<a href={`/market?categoria=${c.slug}#catalogo`} class="mk-cat" aria-current={category === c.slug ? "true" : undefined} data-cat-filter={c.slug}>
							{c.label} <span>{products.filter((p) => p.category === c.slug).length}</span>
						</a>
					))}
				</nav>
				{products.length === 0 ? (
					<p class="mk-alert">Todavía no hay productos publicados. Vuelve pronto.</p>
				) : (
					<>
						<ul class="mk-pgrid" data-filter-grid>
							{/* El filtro del servidor (sin JS) oculta lo que no coincide; market.js filtra al escribir. */}
							{products.map((p, i) => (
								<ProductCard p={p} maxSales={maxSales} welcome={welcome} eager={i < 2} hidden={!visible(p)} />
							))}
						</ul>
						<p class="mk-empty" data-filter-empty hidden={shown.length > 0 ? true : undefined}>
							No encontramos productos con esa búsqueda. <a href="/market#catalogo">Ver todos</a>
						</p>
					</>
				)}
			</section>

			<section class="tc-shell mk-section">
				<a href="/market/agentes-para-empresas" class="mk-service-banner" data-reveal>
					<div>
						<p class="mk-kicker">Servicio a medida</p>
						<h2>¿Prefieres que lo construyamos por ti?</h2>
						<p>
							Diseñamos y entregamos agentes de IA para tu empresa: ventas por WhatsApp, atención, agenda y automatizaciones conectadas a tu
							CRM. Reserva un diagnóstico y ve los horarios disponibles antes de pagar.
						</p>
						<span class="tc-btn tc-btn--primary">Ver el servicio →</span>
					</div>
					<img src="/market/static/products/agentes-para-empresas/mascota.webp" alt="" width="260" height="260" loading="lazy" class="mk-float" />
				</a>
			</section>

			<section class="tc-shell mk-section" aria-labelledby="porque-titulo">
				<div class="mk-section-head">
					<div>
						<p class="mk-kicker">Por qué Market Tony</p>
						<h2 id="porque-titulo">Herramientas prácticas para tu negocio</h2>
					</div>
				</div>
				<div class="mk-why">
					<div data-reveal>
						<b>Enfocadas en un trabajo concreto</b>
						<p>Cada producto resuelve una tarea puntual de marketing: anuncios, video, contenido o automatización.</p>
					</div>
					<div data-reveal>
						<b>Pago único, sin suscripciones</b>
						<p>Lo compras una vez y es tuyo. Las herramientas de IA que uses aparte (Claude, Codex) tienen su propio costo.</p>
					</div>
					<div data-reveal>
						<b>En español y paso a paso</b>
						<p>Guías, instrucciones y soporte en español. Si algo no funciona, te ayudamos por correo.</p>
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
					{STORE_FAQ.map((f) => (
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

export const STORE_FAQ = [
	{ q: "¿Cómo recibo lo que compro?", a: "Apenas se confirma el pago, el producto aparece en «Mis compras» y te llega un correo con tu enlace de descarga personal." },
	{ q: "¿Necesito una cuenta?", a: "Entras con tu cuenta de Google, sin contraseñas. Solo guardamos tu correo y tu nombre." },
	{ q: "¿Es un pago único?", a: "Sí. No hay suscripciones. Algunas herramientas necesitan servicios externos (por ejemplo Claude Code o Codex), que se pagan aparte con su proveedor." },
	{ q: "¿Puedo pedir un reembolso?", a: "Sí, dentro de los 14 días posteriores a la compra si todavía no descargaste el producto, o si el archivo está dañado. Detalles en la política de reembolsos." },
	{ q: "¿Qué significa «Próximamente»?", a: "Son herramientas en desarrollo. No se pueden comprar todavía: deja tu correo en «Avísame» y te escribimos el día del lanzamiento." },
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

const BuyActions: FC<ProductViewProps> = ({ product, loggedIn, owned, csrf, mode, welcome, userEmail }) => {
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
	if (!loggedIn) {
		return (
			<>
				<LoginButton
					next={path}
					mode={mode}
					label={mode === "live" ? (product.kind === "free" ? "Entrar con Google para descargar" : "Entrar con Google para comprar") : undefined}
				/>
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
				Comprar por {formatPrice(product.price_cents, product.currency)}
			</button>
			<p class="mk-muted">
				{mode === "live" ? "Pago seguro con Stripe." : "Pago SIMULADO (modo maqueta)."} Recibes el enlace de descarga en tu correo y en Mis
				compras. Al comprar aceptas los <a href="/market/legal/terminos">Términos</a> y la <a href="/market/legal/reembolsos">Política de reembolsos</a>.
			</p>
		</form>
	);
};

const RatingSummary: FC<{ product: ShopProduct; breakdown: Record<number, number> }> = ({ product, breakdown }) => {
	const { ratingAvg, ratingCount } = product.stats;
	if (!ratingCount || ratingAvg === null) {
		return (
			<p class="mk-muted">
				Aún no hay reseñas. Las reseñas solo las pueden dejar personas que compraron el producto, desde <a href="/market/mis-compras">Mis compras</a>.
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
						<span>{n} ★</span>
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

export const ProductPage: FC<ProductViewProps> = (props) => {
	const { product, flash, notice, reviews, breakdown, related, maxSales, welcome } = props;
	const cat = categoryLabel(product.category);
	const soon = product.availability === "coming_soon";
	const images = product.images;
	return (
		<div class="mk-product-page" style={product.accent ? `--accent: ${product.accent}` : undefined}>
			<div class="mk-product-glow" aria-hidden="true"></div>
			<div class="tc-shell">
				<nav class="mk-crumbs" aria-label="Ruta">
					<a href="/market">Market</a>
					<span aria-hidden="true">/</span>
					{cat ? <a href={`/market?categoria=${product.category}#catalogo`}>{cat}</a> : <span>Producto</span>}
					<span aria-hidden="true">/</span>
					<span aria-current="page">{product.title.split(":")[0]}</span>
				</nav>
				{flash && <p class="mk-alert mk-alert--warn">{flash}</p>}
				{notice && <p class="mk-alert mk-alert--ok">{notice}</p>}
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
									<a href={`#imagen-${i + 1}`} class={`mk-thumb ${i === 0 ? "is-active" : ""}`} data-thumb={String(i)} role="tab" aria-selected={i === 0 ? "true" : "false"} aria-label={`Ver imagen ${i + 1}`}>
										<img src={img.src} alt="" width="160" height="100" loading="lazy" />
									</a>
								))}
							</div>
						)}
					</div>

					<div class="mk-info">
						<div class="mk-info-sticky">
							<BadgeList badges={badgesFor(product, maxSales)} />
							<h1>{product.title}</h1>
							{product.tagline && <p class="mk-tagline">{product.tagline}</p>}
							<div class="mk-info-meta">
								{product.stats.ratingCount > 0 && product.stats.ratingAvg !== null ? (
									<a href="#resenas" class="mk-meta-rating">
										<Stars value={product.stats.ratingAvg} /> <b>{ratingText(product.stats.ratingAvg)}</b>
										<span class="mk-muted">({product.stats.ratingCount} {product.stats.ratingCount === 1 ? "reseña" : "reseñas"})</span>
									</a>
								) : null}
								{product.stats.sales > 0 && <span class="mk-meta-sales">{salesText(product.stats.sales)}</span>}
								<span class="mk-muted">{soon ? "En desarrollo" : product.kind === "free" ? "Recurso gratis" : "Producto digital · Descarga inmediata"}</span>
							</div>
							<div class="tc-card mk-buybox2" id="comprar">
								<PriceBlock product={product} welcome={welcome} size="lg" />
								<BuyActions {...props} />
							</div>
							{!soon && <TrustStrip compact />}
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
										<span class="mk-yt-play" aria-hidden="true">▶</span>
									</a>
								</div>
							</section>
						)}
						<section class="mk-block mk-description" id="descripcion" aria-label="Descripción">
							<h2 class="mk-block-title">Descripción</h2>
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
									<dt>Vendido por</dt>
									<dd>Tony Ciencia LLC</dd>
								</dl>
							</section>
						)}
						{product.tags.length > 0 && (
							<div class="mk-tags">
								{product.tags.map((t) => (
									<a href={`/market?q=${encodeURIComponent(t)}#catalogo`} class="mk-tag">
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
								<h2 id="rel-t">También te puede interesar</h2>
							</div>
						</div>
						<ul class="mk-pgrid mk-pgrid--3">
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
					<span class="mk-buybar-price">
						{soon ? "Próximamente" : product.kind === "free" ? "Gratis" : formatPrice(product.price_cents, product.currency)}
					</span>
					<a href="#comprar" class="tc-btn tc-btn--primary">
						{soon ? "Avísame" : product.kind === "free" ? "Descargar" : isBuyable(product) ? "Comprar" : "Ver"}
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
