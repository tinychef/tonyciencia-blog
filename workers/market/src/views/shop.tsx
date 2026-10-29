import type { FC } from "hono/jsx";
import { formatPrice } from "../lib/money";
import type { Product } from "../services/repo";
import { CsrfField } from "./layout";
import { Description } from "./render";

export const PriceBadge: FC<{ product: Product }> = ({ product }) =>
	product.kind === "free" ? (
		<span class="mk-badge mk-badge--free">Gratis</span>
	) : (
		<span class="mk-badge">
			<span class="mk-price">{formatPrice(product.price_cents, product.currency)}</span>
		</span>
	);

export const Catalog: FC<{ products: Product[] }> = ({ products }) => (
	<div class="tc-shell">
		<section class="mk-hero">
			<p class="tc-eyebrow">Tienda de Tony Ciencia</p>
			<h1>Market Tony</h1>
			<p class="mk-lead">
				Recursos digitales para implementar IA en tu marketing: agentes, prompts y plantillas listas para usar. Descarga inmediata
				después de la compra.
			</p>
		</section>
		{products.length === 0 ? (
			<p class="mk-alert">Todavía no hay productos publicados. Vuelve pronto.</p>
		) : (
			<ul class="mk-grid" style="list-style: none">
				{products.map((p) => (
					<li>
						<a href={`/market/producto/${p.slug}`} class="tc-card mk-card">
							<div class="mk-card-media">
								{p.images[0] ? (
									<img src={p.images[0].src} alt={p.images[0].alt} loading="lazy" width="800" height="500" />
								) : null}
							</div>
							<div class="mk-card-body">
								<PriceBadge product={p} />
								<h2>{p.title}</h2>
								<p>{p.summary}</p>
								<div class="mk-card-foot">
									<span class="mk-muted">{p.kind === "free" ? "Descarga gratis con Google" : "Producto digital · Descarga"}</span>
									<span aria-hidden="true">→</span>
								</div>
							</div>
						</a>
					</li>
				))}
			</ul>
		)}
	</div>
);

export interface ProductViewProps {
	product: Product;
	loggedIn: boolean;
	owned: boolean;
	csrf: string | null;
	mode: "mock" | "live";
	flash: string | null;
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

export const ProductPage: FC<ProductViewProps> = ({ product, loggedIn, owned, csrf, mode, flash }) => {
	const path = `/market/producto/${product.slug}`;
	return (
		<div class="tc-shell">
			{flash && <p class="mk-alert mk-alert--warn">{flash}</p>}
			<div class="mk-product">
				<div class="mk-gallery">
					{product.images.length > 0 ? (
						product.images.map((img, i) => <img src={img.src} alt={img.alt} width="1600" height="1000" loading={i === 0 ? "eager" : "lazy"} />)
					) : (
						<div class="mk-card-media tc-card" aria-hidden="true"></div>
					)}
				</div>
				<div>
					<p class="tc-eyebrow">{product.kind === "free" ? "Recurso gratis" : "Producto digital · Descarga inmediata"}</p>
					<h1>{product.title}</h1>
					<p class="mk-lead">{product.summary}</p>
					<div class="tc-card mk-buybox">
						<span class="mk-price">{product.kind === "free" ? "Gratis" : formatPrice(product.price_cents, product.currency)}</span>
						{owned ? (
							<>
								<p class="mk-alert mk-alert--ok" style="margin-bottom: var(--spacing-4)">
									<strong>Ya es tuyo.</strong> Puedes descargarlo cuando quieras desde Mis compras.
								</p>
								<a class="tc-btn tc-btn--primary mk-btn-block" href="/market/mis-compras">
									Ir a Mis compras
								</a>
							</>
						) : !loggedIn ? (
							<>
								<LoginButton
									next={path}
									mode={mode}
									label={
										mode === "live"
											? product.kind === "free"
												? "Entrar con Google para descargar"
												: "Entrar con Google para comprar"
											: undefined
									}
								/>
								<p class="mk-muted">Sin contraseñas: entras con tu cuenta de Google. Solo guardamos tu correo y tu nombre.</p>
							</>
						) : product.kind === "free" ? (
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
						) : (
							<form method="post" action={`${path}/comprar`}>
								<CsrfField csrf={csrf} />
								<button type="submit" class="tc-btn tc-btn--primary mk-btn-block">
									Comprar por {formatPrice(product.price_cents, product.currency)}
								</button>
								<p class="mk-muted">
									{mode === "live" ? "Pago seguro con Stripe." : "Pago SIMULADO (modo maqueta)."} Recibes el enlace de descarga en tu correo y en
									Mis compras. Al comprar aceptas los <a href="/market/legal/terminos">Términos</a> y la{" "}
									<a href="/market/legal/reembolsos">Política de reembolsos</a>.
								</p>
							</form>
						)}
					</div>
				</div>
			</div>
			{product.description && (
				<section class="mk-description" aria-label="Descripción">
					<Description text={product.description} />
				</section>
			)}
		</div>
	);
};
