import type { Child, FC } from "hono/jsx";
import { raw } from "hono/html";
import type { Config } from "../config";
import type { User } from "../services/repo";
import type { WelcomeOffer } from "../services/welcome";
import { formatPrice } from "../lib/money";
import { BrandLogo, Icon } from "./icons";
import { offerPhrase, storeRoot, t, type Lang } from "../lib/i18n";

export interface PageMeta {
	title: string;
	description?: string;
	/** Ruta actual, para marcar el enlace activo y armar el canonical. */
	path: string;
	noindex?: boolean;
	/** Solo la página de "confirmando pago" se recarga sola. */
	refreshSeconds?: number;
	/** Título completo para <title> (si no, se arma con el sufijo de la tienda). */
	fullTitle?: string;
	/** Imagen para compartir (ruta del sitio o URL absoluta). */
	image?: string;
	/** Texto alternativo de la imagen para compartir (og:image:alt). Si falta, el título. */
	imageAlt?: string;
	ogType?: "website" | "product";
	/** Datos estructurados (schema.org) — se emiten como JSON-LD. */
	jsonLd?: object[];
	/** Para og:product (precio en centavos). */
	priceCents?: number;
	currency?: string;
	/** Versiones de la misma página en cada idioma (hreflang y el selector ES/EN). */
	alternates?: { es: string; en: string };
	/** Eventos de comercio electrónico de GA4 que market.js empuja al dataLayer (src/lib/analytics.ts). */
	dataLayer?: object[];
}

export interface LayoutProps {
	meta: PageMeta;
	config: Config;
	user: User | null;
	isAdmin: boolean;
	csrf: string | null;
	theme: "light" | "dark";
	welcome: WelcomeOffer | null;
	lang?: Lang;
	children?: Child;
}

export const CsrfField: FC<{ csrf: string | null }> = ({ csrf }) => (csrf ? <input type="hidden" name="csrf" value={csrf} /> : null);

/** JSON seguro dentro de <script>: escapa "<" para que ningún texto pueda cerrar la etiqueta. */
const safeJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

function jsonLdScript(data: object) {
	return raw(`<script type="application/ld+json">${safeJson(data)}</script>`);
}

/**
 * Datos para el dataLayer: solo datos (type="application/json" no se ejecuta y la CSP no lo bloquea).
 * Los lee y empuja market.js; sin GTM no salen del navegador.
 */
function dataLayerScript(events: object[]) {
	return raw(`<script type="application/json" data-dl>${safeJson(events)}</script>`);
}

const STATIC_VERSION = "13";

export const Layout: FC<LayoutProps> = ({ meta, config, user, isAdmin, csrf, theme, welcome, lang = "es", children }) => {
	const tr = (es: string) => t(lang, es);
	const root = storeRoot(lang);
	const other: Lang = lang === "en" ? "es" : "en";
	const otherHref = meta.alternates ? meta.alternates[other] : storeRoot(other);
	const fullTitle = meta.fullTitle ?? (meta.title === "Market Tony" ? "Market Tony — Tony Ciencia" : `${meta.title} — Market Tony`);
	const canonical = new URL(meta.path, config.origin).toString();
	const image = new URL(meta.image ?? "/market/static/products/anuncios-infinitos/cover.webp", config.origin).toString();
	// og:title: el título completo cuando la página no tiene uno propio (el catálogo se llamaba solo «Market Tony»).
	const ogTitle = meta.title === "Market Tony" && meta.fullTitle ? meta.fullTitle : meta.title;
	const is = (p: string) => (meta.path === p ? "page" : undefined);
	const siteHref = config.mode === "live" ? "/" : "https://tonyciencia.com/";
	const offerText = welcome
		? offerPhrase(lang, { percentOff: welcome.percentOff, amountOffText: welcome.amountOffCents ? formatPrice(welcome.amountOffCents) : null })
		: "";
	const popTitle =
		lang === "en"
			? offerText
				? `Get ${offerText} your first purchase!`
				: "Get a discount on your first purchase!"
			: `¡Obtén ${offerText ? `un ${offerText}` : "un descuento"} en tu primera compra!`;
	const popTabLabel =
		lang === "en"
			? `See the coupon: ${offerText || "a discount"} your first purchase`
			: `Ver el cupón de ${offerText || "descuento"} en tu primera compra`;
	return (
		// data-gtm: market.js carga Google Tag Manager solo si el entorno tiene GTM_ID (src/config.ts).
		<html lang={lang} class={theme} data-gtm={config.gtmId ?? undefined}>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{fullTitle}</title>
				{meta.description && <meta name="description" content={meta.description} />}
				<meta name="robots" content={meta.noindex || config.mode === "mock" ? "noindex, nofollow" : "index, follow, max-image-preview:large"} />
				<link rel="canonical" href={canonical} />
				<meta property="og:type" content={meta.ogType ?? "website"} />
				<meta property="og:title" content={ogTitle} />
				{meta.description && <meta property="og:description" content={meta.description} />}
				<meta property="og:url" content={canonical} />
				<meta property="og:image" content={image} />
				<meta property="og:image:width" content="1600" />
				<meta property="og:image:height" content="1000" />
				<meta property="og:image:alt" content={meta.imageAlt || ogTitle} />
				<meta property="og:site_name" content="Tony Ciencia" />
				<meta property="og:locale" content={lang === "en" ? "en_US" : "es_ES"} />
				{meta.alternates && <meta property="og:locale:alternate" content={lang === "en" ? "es_ES" : "en_US"} />}
				{meta.alternates && <link rel="alternate" hreflang="es" href={new URL(meta.alternates.es, config.origin).toString()} />}
				{meta.alternates && <link rel="alternate" hreflang="en" href={new URL(meta.alternates.en, config.origin).toString()} />}
				{meta.alternates && <link rel="alternate" hreflang="x-default" href={new URL(meta.alternates.es, config.origin).toString()} />}
				{meta.priceCents !== undefined && <meta property="product:price:amount" content={(meta.priceCents / 100).toFixed(2)} />}
				{meta.priceCents !== undefined && <meta property="product:price:currency" content={(meta.currency ?? "usd").toUpperCase()} />}
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:site" content="@tonyciencia" />
				<meta name="twitter:title" content={ogTitle} />
				{meta.description && <meta name="twitter:description" content={meta.description} />}
				<meta name="twitter:image" content={image} />
				<meta name="color-scheme" content={theme === "light" ? "light" : "dark"} />
				<meta name="theme-color" content={theme === "light" ? "#ffffff" : "#0a0a0b"} />
				{meta.refreshSeconds ? <meta http-equiv="refresh" content={String(meta.refreshSeconds)} /> : null}
				<link rel="icon" href="/market/static/site/favicon.ico" sizes="any" />
				<link rel="icon" href="/market/static/site/favicon-32x32.png" type="image/png" sizes="32x32" />
				<link rel="apple-touch-icon" href="/market/static/site/apple-touch-icon.png" />
				<link rel="stylesheet" href="/market/static/site/theme.css" />
				<link rel="stylesheet" href={`/market/static/market.css?v=${STATIC_VERSION}`} />
				{(meta.jsonLd ?? []).map((d) => jsonLdScript(d))}
			</head>
			<body>
				<a href="#contenido" class="mk-skip">
					{tr("Saltar al contenido")}
				</a>
				{config.mode === "mock" && (
					<div class="mk-mockbar" role="note">
						MODO MAQUETA — login, pagos y correos son simulados; no se cobra nada. <a href="/dev/correos">Ver correos enviados</a>
					</div>
				)}
				{welcome && (
					<div class="mk-announce">
						<span>
							<Icon name="gift" size={15} /> {welcome.percentOff ? `${welcome.percentOff} %` : lang === "en" ? "Discount" : "Descuento"} {tr("en tu 1.ª compra con")}{" "}
							<button type="button" class="mk-code-btn" data-copy={welcome.code} aria-label={`${lang === "en" ? "Copy the code" : "Copiar el código"} ${welcome.code}`}>
								{welcome.code}
							</button>
						</span>
					</div>
				)}
				<header class="mk-header" data-header>
					<nav class="mk-nav" aria-label="Principal">
						<a href={root} class="mk-brand" aria-label={lang === "en" ? "Market Tony — store home" : "Market Tony — inicio de la tienda"}>
							<img src="/market/static/site/logo-blanco.webp" alt="Tony Ciencia" class="logo-dark" width="32" height="32" />
							<img src="/market/static/site/logo-negro.webp" alt="Tony Ciencia" class="logo-light" width="32" height="32" />
							<span class="mk-brand-tag">Market</span>
						</a>
						<div class="mk-links">
							<a href={`${root}#catalogo`} aria-current={is(root)} class="mk-hide-sm">
								{tr("Catálogo")}
							</a>
							<a href={`${root}?filtro=ofertas#catalogo`} class="mk-hide-sm mk3-nav-sale">
								{tr("Ofertas")}
							</a>
							<a href="/market/agentes-para-empresas" aria-current={is("/market/agentes-para-empresas")} class="mk-hide-sm">
								{tr("Agentes para empresas")}
							</a>
							<a href={siteHref} class="mk-hide-sm">
								Blog
							</a>
							{isAdmin && (
								<a href="/market/admin" aria-current={meta.path.startsWith("/market/admin") ? "page" : undefined} class="mk-hide-sm">
									Admin
								</a>
							)}
							<a href={otherHref} class="mk-lang" hreflang={other} lang={other} aria-label={lang === "en" ? "Ver en español" : "View in English"}>
								<span aria-hidden="true" class={lang === "es" ? "is-on" : undefined}>ES</span>
								<span aria-hidden="true" class={lang === "en" ? "is-on" : undefined}>EN</span>
							</a>
							<button type="button" class="mk-theme" data-theme-toggle aria-label={tr("Cambiar a tema claro u oscuro")} aria-pressed={theme === "dark" ? "true" : "false"}>
								<Icon name="sun" size={18} class="mk-theme-sun" />
								<Icon name="moon" size={18} class="mk-theme-moon" />
							</button>
							{user ? (
								<a href="/market/mis-compras" aria-current={is("/market/mis-compras")} class="mk-pill-link">
									{tr("Mis compras")}
								</a>
							) : (
								<a href={`/market/entrar?next=${encodeURIComponent(meta.path)}`} aria-current={is("/market/entrar")} class="mk-pill-link">
									{tr("Entrar")}
								</a>
							)}
							{user && (
								<form method="post" action="/market/salir" class="mk-hide-sm">
									<CsrfField csrf={csrf} />
									<button type="submit" class="mk-linkbtn">
										{tr("Salir")}
									</button>
								</form>
							)}
							{/* Menú móvil: <details> funciona sin JS; market.js lo cierra con Escape, al tocar fuera o al navegar. */}
							<details class="mk-menu" data-menu>
								<summary aria-label={tr("Abrir menú")}>
									<span class="mk-burger" aria-hidden="true">
										<i></i>
										<i></i>
										<i></i>
									</span>
								</summary>
								<div class="mk-menu-panel">
									<div class="mk-menu-head">
										<span>{tr("Menú")}</span>
										<button type="button" class="mk-menu-close" data-menu-close aria-label={tr("Cerrar menú")}>
											<Icon name="close" size={18} />
										</button>
									</div>
									<a href={`${root}#catalogo`}>{tr("Catálogo")}</a>
									<a href={`${root}?filtro=ofertas#catalogo`}>{tr("Ofertas")}</a>
									<a href={`${root}?filtro=gratis#catalogo`}>{tr("Desde $0")}</a>
									<a href="/market/agentes-para-empresas">{tr("Agentes para empresas")}</a>
									{user ? <a href="/market/mis-compras">{tr("Mis compras")}</a> : <a href={`/market/entrar?next=${encodeURIComponent(meta.path)}`}>{tr("Entrar")}</a>}
									<a href={otherHref} hreflang={other} lang={other}>
										{lang === "en" ? "Ver en español" : "View in English"}
									</a>
									{isAdmin && <a href="/market/admin">Admin</a>}
									<a href={siteHref}>
										<Icon name="back" size={16} /> {tr("Volver al blog")}
									</a>
									{user && (
										<form method="post" action="/market/salir">
											<CsrfField csrf={csrf} />
											<button type="submit" class="mk-linkbtn">
												{tr("Salir de mi cuenta")}
											</button>
										</form>
									)}
								</div>
							</details>
						</div>
					</nav>
				</header>
				<main id="contenido" class="mk-main">
					{children}
				</main>
				<footer class="mk-footer">
					<div class="mk-footer-inner">
						<div class="mk-footer-brand">
							<a href={root} class="mk-brand" aria-label="Market Tony">
								<img src="/market/static/site/logo-blanco.webp" alt="Tony Ciencia" class="logo-dark" width="32" height="32" loading="lazy" />
								<img src="/market/static/site/logo-negro.webp" alt="Tony Ciencia" class="logo-light" width="32" height="32" loading="lazy" />
								<span class="mk-brand-tag">Market</span>
							</a>
							<p>{tr("Herramientas de IA en español para crear anuncios, videos y automatizaciones. Pago único, descarga inmediata.")}</p>
							<div class="mk-social">
								<a href="https://youtube.com/@tonyciencia" target="_blank" rel="noopener" aria-label="YouTube">
									YouTube
								</a>
								<a href="https://instagram.com/tonyciencia" target="_blank" rel="noopener" aria-label="Instagram">
									Instagram
								</a>
								<a href="https://x.com/tonyciencia" target="_blank" rel="noopener" aria-label="X">
									X
								</a>
							</div>
						</div>
						<nav aria-label={tr("Tienda")}>
							<b>{tr("Tienda")}</b>
							<a href={`${root}#catalogo`}>{tr("Catálogo")}</a>
							<a href="/market/agentes-para-empresas">{tr("Agentes para empresas")}</a>
							<a href="/market/mis-compras">{tr("Mis compras")}</a>
						</nav>
						<nav aria-label={tr("Ayuda")}>
							<b>{tr("Ayuda")}</b>
							<a href="mailto:business@tonyciencia.com">{tr("Soporte")}</a>
							<a href="/market/legal/reembolsos">{tr("Reembolsos")}</a>
							<a href={config.mode === "live" ? "/contacto" : "https://tonyciencia.com/contacto"}>{tr("Contacto")}</a>
						</nav>
						<nav aria-label="Legal">
							<b>Legal</b>
							<a href="/market/legal/terminos">{tr("Términos")}</a>
							<a href="/market/legal/privacidad">{tr("Privacidad")}</a>
							<a href={siteHref}>Tony Ciencia</a>
						</nav>
					</div>
					<div class="mk-footer-bottom">
						<span class="mk-pay">
							<span class="mk-pay-stripe">
								<Icon name="lock" size={14} /> {tr("Pagos seguros con")} <BrandLogo k="stripe" size={16} /> Stripe
							</span>
							<span>Visa · Mastercard · Amex · Apple Pay · Google Pay</span>
						</span>
						<p>
							{tr(
								"Vendido por Tony Ciencia LLC · 8206 Louisiana Blvd NE, Ste A #6812, Albuquerque, NM 87113, EE. UU. Precios en dólares estadounidenses (USD).",
							)}
						</p>
					</div>
				</footer>
				{welcome && (
					<>
						{/* Popup flotante y NO modal: no bloquea la página ni oscurece el fondo. market.js lo muestra una vez
						    (a los segundos o al bajar), y después queda una pestaña discreta para volver a abrirlo. */}
						<aside class="mk3-pop" data-welcome hidden aria-labelledby="mk-pop-title">
							<button type="button" class="mk3-pop-x" data-pop-close aria-label={tr("Cerrar")}>
								<Icon name="close" size={16} />
							</button>
							<div class="mk3-pop-badge" aria-hidden="true">
								{welcome.percentOff ? <b>−{welcome.percentOff}%</b> : <Icon name="gift" size={28} />}
								<span>{tr("1.ª compra")}</span>
							</div>
							<div class="mk3-pop-body">
								<h2 id="mk-pop-title">{popTitle}</h2>
								<p>{tr("Copia el código y escríbelo al comprar. Se aplica en el checkout seguro de Stripe.")}</p>
								<div class="mk3-pop-actions">
									<button type="button" class="mk-pop-code" data-copy={welcome.code} data-pop-used>
										<span>{welcome.code}</span>
										<small data-copy-label>{tr("Copiar")}</small>
									</button>
									<a href={`${root}#catalogo`} class="mk3-pop-link" data-pop-close>
										{tr("Ver productos")} <Icon name="arrow" size={15} />
									</a>
								</div>
								<p class="mk3-pop-fine">{tr("Válido una vez por cuenta, en productos de precio fijo.")}</p>
							</div>
						</aside>
						<button type="button" class="mk3-pop-tab" data-pop-open hidden aria-label={popTabLabel}>
							<Icon name="gift" size={15} /> {welcome.percentOff ? `${welcome.percentOff}% OFF` : tr("Cupón")}
						</button>
					</>
				)}
				<div class="mk-toast" role="status" aria-live="polite" data-toast></div>
				{meta.dataLayer?.length ? dataLayerScript(meta.dataLayer) : null}
				<script src={`/market/static/market.js?v=${STATIC_VERSION}`} defer></script>
			</body>
		</html>
	);
};
