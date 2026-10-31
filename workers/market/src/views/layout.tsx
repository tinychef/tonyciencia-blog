import type { Child, FC } from "hono/jsx";
import { raw } from "hono/html";
import type { Config } from "../config";
import type { User } from "../services/repo";
import type { WelcomeOffer } from "../services/welcome";
import { formatPrice } from "../lib/money";

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
	ogType?: "website" | "product";
	/** Datos estructurados (schema.org) — se emiten como JSON-LD. */
	jsonLd?: object[];
	/** Para og:product (precio en centavos). */
	priceCents?: number;
	currency?: string;
}

export interface LayoutProps {
	meta: PageMeta;
	config: Config;
	user: User | null;
	isAdmin: boolean;
	csrf: string | null;
	theme: "light" | "dark";
	welcome: WelcomeOffer | null;
	children?: Child;
}

export const CsrfField: FC<{ csrf: string | null }> = ({ csrf }) => (csrf ? <input type="hidden" name="csrf" value={csrf} /> : null);

/** JSON-LD seguro dentro de <script>: escapa "<" para que ningún texto pueda cerrar la etiqueta. */
function jsonLdScript(data: object) {
	return raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`);
}

const STATIC_VERSION = "2";

export const Layout: FC<LayoutProps> = ({ meta, config, user, isAdmin, csrf, theme, welcome, children }) => {
	const fullTitle = meta.fullTitle ?? (meta.title === "Market Tony" ? "Market Tony — Tony Ciencia" : `${meta.title} — Market Tony`);
	const canonical = new URL(meta.path, config.origin).toString();
	const image = new URL(meta.image ?? "/market/static/products/anuncios-infinitos/cover.webp", config.origin).toString();
	const is = (p: string) => (meta.path === p ? "page" : undefined);
	const siteHref = config.mode === "live" ? "/" : "https://tonyciencia.com/";
	const offerText = welcome
		? welcome.percentOff
			? `${welcome.percentOff} % de descuento`
			: welcome.amountOffCents
				? `${formatPrice(welcome.amountOffCents)} de descuento`
				: "un descuento"
		: "";
	return (
		<html lang="es" class={theme}>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{fullTitle}</title>
				{meta.description && <meta name="description" content={meta.description} />}
				<meta name="robots" content={meta.noindex || config.mode === "mock" ? "noindex, nofollow" : "index, follow, max-image-preview:large"} />
				<link rel="canonical" href={canonical} />
				<meta property="og:type" content={meta.ogType ?? "website"} />
				<meta property="og:title" content={meta.title} />
				{meta.description && <meta property="og:description" content={meta.description} />}
				<meta property="og:url" content={canonical} />
				<meta property="og:image" content={image} />
				<meta property="og:image:width" content="1600" />
				<meta property="og:image:height" content="1000" />
				<meta property="og:site_name" content="Tony Ciencia" />
				<meta property="og:locale" content="es_ES" />
				{meta.priceCents !== undefined && <meta property="product:price:amount" content={(meta.priceCents / 100).toFixed(2)} />}
				{meta.priceCents !== undefined && <meta property="product:price:currency" content={(meta.currency ?? "usd").toUpperCase()} />}
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:site" content="@tonyciencia" />
				<meta name="twitter:title" content={meta.title} />
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
					Saltar al contenido
				</a>
				{config.mode === "mock" && (
					<div class="mk-mockbar" role="note">
						MODO MAQUETA — login, pagos y correos son simulados; no se cobra nada. <a href="/dev/correos">Ver correos enviados</a>
					</div>
				)}
				{welcome && (
					<div class="mk-announce">
						<span>
							🎁 {offerText} en tu primera compra con el código{" "}
							<button type="button" class="mk-code-btn" data-copy={welcome.code} aria-label={`Copiar el código ${welcome.code}`}>
								{welcome.code}
							</button>
						</span>
					</div>
				)}
				<header class="mk-header" data-header>
					<nav class="mk-nav" aria-label="Principal">
						<a href="/market" class="mk-brand" aria-label="Market Tony — inicio de la tienda">
							<img src="/market/static/site/logo-blanco.webp" alt="Tony Ciencia" class="logo-dark" width="32" height="32" />
							<img src="/market/static/site/logo-negro.webp" alt="Tony Ciencia" class="logo-light" width="32" height="32" />
							<span class="mk-brand-tag">Market</span>
						</a>
						<div class="mk-links">
							<a href="/market#catalogo" aria-current={is("/market")} class="mk-hide-sm">
								Catálogo
							</a>
							<a href="/market/agentes-para-empresas" aria-current={is("/market/agentes-para-empresas")} class="mk-hide-sm">
								Agentes para empresas
							</a>
							<a href={siteHref} class="mk-hide-sm">
								Blog
							</a>
							{isAdmin && (
								<a href="/market/admin" aria-current={meta.path.startsWith("/market/admin") ? "page" : undefined} class="mk-hide-sm">
									Admin
								</a>
							)}
							{user ? (
								<a href="/market/mis-compras" aria-current={is("/market/mis-compras")} class="mk-pill-link">
									Mis compras
								</a>
							) : (
								<a href={`/market/entrar?next=${encodeURIComponent(meta.path)}`} aria-current={is("/market/entrar")} class="mk-pill-link">
									Entrar
								</a>
							)}
							{user && (
								<form method="post" action="/market/salir" class="mk-hide-sm">
									<CsrfField csrf={csrf} />
									<button type="submit" class="mk-linkbtn">
										Salir
									</button>
								</form>
							)}
							{/* Menú móvil: <details> funciona sin JS; market.js lo cierra con Escape, al tocar fuera o al navegar. */}
							<details class="mk-menu" data-menu>
								<summary aria-label="Abrir menú">
									<span class="mk-burger" aria-hidden="true">
										<i></i>
										<i></i>
										<i></i>
									</span>
								</summary>
								<div class="mk-menu-panel">
									<div class="mk-menu-head">
										<span>Menú</span>
										<button type="button" class="mk-menu-close" data-menu-close aria-label="Cerrar menú">
											✕
										</button>
									</div>
									<a href="/market#catalogo">Catálogo</a>
									<a href="/market/agentes-para-empresas">Agentes para empresas</a>
									{user ? <a href="/market/mis-compras">Mis compras</a> : <a href={`/market/entrar?next=${encodeURIComponent(meta.path)}`}>Entrar</a>}
									{isAdmin && <a href="/market/admin">Admin</a>}
									<a href={siteHref}>← Volver al blog</a>
									{user && (
										<form method="post" action="/market/salir">
											<CsrfField csrf={csrf} />
											<button type="submit" class="mk-linkbtn">
												Salir de mi cuenta
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
							<a href="/market" class="mk-brand" aria-label="Market Tony">
								<img src="/market/static/site/logo-blanco.webp" alt="Tony Ciencia" class="logo-dark" width="32" height="32" loading="lazy" />
								<img src="/market/static/site/logo-negro.webp" alt="Tony Ciencia" class="logo-light" width="32" height="32" loading="lazy" />
								<span class="mk-brand-tag">Market</span>
							</a>
							<p>Herramientas de IA en español para crear anuncios, videos y automatizaciones. Pago único, descarga inmediata.</p>
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
						<nav aria-label="Tienda">
							<b>Tienda</b>
							<a href="/market#catalogo">Catálogo</a>
							<a href="/market/agentes-para-empresas">Agentes para empresas</a>
							<a href="/market/mis-compras">Mis compras</a>
						</nav>
						<nav aria-label="Ayuda">
							<b>Ayuda</b>
							<a href="mailto:business@tonyciencia.com">Soporte</a>
							<a href="/market/legal/reembolsos">Reembolsos</a>
							<a href={config.mode === "live" ? "/contacto" : "https://tonyciencia.com/contacto"}>Contacto</a>
						</nav>
						<nav aria-label="Legal">
							<b>Legal</b>
							<a href="/market/legal/terminos">Términos</a>
							<a href="/market/legal/privacidad">Privacidad</a>
							<a href={siteHref}>Tony Ciencia</a>
						</nav>
					</div>
					<div class="mk-footer-bottom">
						<span class="mk-pay">
							<span>🔒 Pagos con Stripe</span>
							<span>Visa · Mastercard · Amex · Apple Pay · Google Pay</span>
						</span>
						<p>
							Vendido por Tony Ciencia LLC · 8206 Louisiana Blvd NE, Ste A #6812, Albuquerque, NM 87113, EE. UU. Precios en dólares
							estadounidenses (USD).
						</p>
					</div>
				</footer>
				{welcome && (
					<div class="mk-pop" data-welcome hidden>
						<div class="mk-pop-backdrop" data-pop-close></div>
						<div class="mk-pop-card" role="dialog" aria-modal="true" aria-labelledby="mk-pop-title">
							<button type="button" class="mk-pop-x" data-pop-close aria-label="Cerrar">
								✕
							</button>
							<div class="mk-pop-gift" aria-hidden="true">
								🎁
							</div>
							<p class="mk-kicker">Bienvenido a Market Tony</p>
							<h2 id="mk-pop-title">Llévate {offerText} en tu primera compra</h2>
							<p class="mk-muted">Usa este código al pagar. Se aplica en el checkout seguro de Stripe.</p>
							<button type="button" class="mk-pop-code" data-copy={welcome.code}>
								<span>{welcome.code}</span>
								<small data-copy-label>Copiar</small>
							</button>
							<a href="/market#catalogo" class="tc-btn tc-btn--primary mk-btn-block" data-pop-close>
								Ver productos
							</a>
						</div>
					</div>
				)}
				<div class="mk-toast" role="status" aria-live="polite" data-toast></div>
				<script src={`/market/static/market.js?v=${STATIC_VERSION}`} defer></script>
			</body>
		</html>
	);
};
