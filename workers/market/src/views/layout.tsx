import type { Child, FC } from "hono/jsx";
import type { Config } from "../config";
import type { User } from "../services/repo";

export interface PageMeta {
	title: string;
	description?: string;
	/** Ruta actual, para marcar el enlace activo. */
	path: string;
	noindex?: boolean;
	/** Solo la página de "confirmando pago" se recarga sola. */
	refreshSeconds?: number;
}

export interface LayoutProps {
	meta: PageMeta;
	config: Config;
	user: User | null;
	isAdmin: boolean;
	csrf: string | null;
	theme: "light" | "dark";
	children?: Child;
}

export const CsrfField: FC<{ csrf: string | null }> = ({ csrf }) => (csrf ? <input type="hidden" name="csrf" value={csrf} /> : null);

const CartIcon = () => (
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
		<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
		<line x1="3" y1="6" x2="21" y2="6" />
		<path d="M16 10a4 4 0 0 1-8 0" />
	</svg>
);

/** Botón flotante — idéntico al del sitio (src/components/MarketFab.astro). */
export const MarketFab: FC<{ current: boolean }> = ({ current }) => (
	<>
		<div class="market-fab-spacer" aria-hidden="true"></div>
		<a href="/market" class="market-fab" aria-current={current ? "page" : undefined}>
			<CartIcon />
			<span>Market Tony</span>
		</a>
	</>
);

export const Layout: FC<LayoutProps> = ({ meta, config, user, isAdmin, csrf, theme, children }) => {
	const fullTitle = meta.title === "Market Tony" ? "Market Tony — Tony Ciencia" : `${meta.title} — Market Tony`;
	const canonical = new URL(meta.path, config.origin).toString();
	const is = (p: string) => (meta.path === p ? "page" : undefined);
	return (
		<html lang="es" class={theme}>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{fullTitle}</title>
				{meta.description && <meta name="description" content={meta.description} />}
				<meta name="robots" content={meta.noindex || config.mode === "mock" ? "noindex, nofollow" : "index, follow"} />
				<link rel="canonical" href={canonical} />
				<meta property="og:type" content="website" />
				<meta property="og:title" content={meta.title} />
				{meta.description && <meta property="og:description" content={meta.description} />}
				<meta property="og:url" content={canonical} />
				<meta property="og:site_name" content="Tony Ciencia" />
				<meta property="og:locale" content="es_ES" />
				<meta name="color-scheme" content={theme === "light" ? "light" : "dark"} />
				{meta.refreshSeconds ? <meta http-equiv="refresh" content={String(meta.refreshSeconds)} /> : null}
				<link rel="icon" href="/market/static/site/favicon.ico" sizes="any" />
				<link rel="icon" href="/market/static/site/favicon-32x32.png" type="image/png" sizes="32x32" />
				<link rel="apple-touch-icon" href="/market/static/site/apple-touch-icon.png" />
				<link rel="stylesheet" href="/market/static/site/theme.css" />
				<link rel="stylesheet" href="/market/static/market.css" />
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
				<header class="mk-header">
					<nav class="mk-nav" aria-label="Principal">
						<a href="/market" class="mk-brand" aria-label="Market Tony — inicio de la tienda">
							<img src="/market/static/site/logo-blanco.webp" alt="Tony Ciencia" class="logo-dark" width="124" height="32" />
							<img src="/market/static/site/logo-negro.webp" alt="Tony Ciencia" class="logo-light" width="124" height="32" />
							<span class="mk-brand-tag">Market</span>
						</a>
						<div class="mk-links">
							<a href="/market" aria-current={is("/market")} class="mk-hide-sm">
								Catálogo
							</a>
							{user && (
								<a href="/market/mis-compras" aria-current={is("/market/mis-compras")}>
									Mis compras
								</a>
							)}
							{isAdmin && (
								<a href="/market/admin" aria-current={meta.path.startsWith("/market/admin") ? "page" : undefined}>
									Admin
								</a>
							)}
							{user ? (
								<form method="post" action="/market/salir">
									<CsrfField csrf={csrf} />
									<button type="submit" class="mk-linkbtn">
										Salir
									</button>
								</form>
							) : (
								<a href={`/market/entrar?next=${encodeURIComponent(meta.path)}`} aria-current={is("/market/entrar")}>
									Entrar
								</a>
							)}
							<a href={config.mode === "live" ? "/" : "https://tonyciencia.com/"} class="mk-hide-sm">
								← Sitio
							</a>
						</div>
					</nav>
				</header>
				<main id="contenido" class="mk-main">
					{children}
				</main>
				<footer class="mk-footer">
					<div class="mk-footer-inner">
						<nav aria-label="Legal">
							<a href="/market/legal/terminos">Términos</a>
							<a href="/market/legal/privacidad">Privacidad</a>
							<a href="/market/legal/reembolsos">Reembolsos</a>
							<a href="mailto:business@tonyciencia.com">Soporte</a>
						</nav>
						<p>
							Vendido por Tony Ciencia LLC · 8206 Louisiana Blvd NE, Ste A #6812, Albuquerque, NM 87113, EE. UU. Precios en dólares
							estadounidenses (USD).
						</p>
					</div>
				</footer>
				<MarketFab current={meta.path === "/market"} />
			</body>
		</html>
	);
};
