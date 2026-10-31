import type { FC } from "hono/jsx";
import type { MockCheckoutRow } from "../adapters/payments/mock";
import { formatPrice } from "../lib/money";
import type { LibraryItem, OrderRow, User } from "../services/repo";
import { CsrfField } from "./layout";
import { LoginButton } from "./shop";

export const LoginPage: FC<{ next: string; mode: "mock" | "live"; error: string | null }> = ({ next, mode, error }) => (
	<div class="mk-narrow mk-stack">
		<p class="tc-eyebrow">Market Tony</p>
		<h1 style="font-size: var(--font-size-2xl)">Entrar</h1>
		{error && <p class="mk-alert mk-alert--error">{error}</p>}
		<p class="mk-lead">Entra con tu cuenta de Google para comprar, descargar gratis y volver a tus descargas. Sin contraseñas.</p>
		<LoginButton next={next} mode={mode} />
		<p class="mk-muted">
			Solo guardamos tu correo y tu nombre. Más detalles en la <a href="/market/legal/privacidad">Política de privacidad</a>.
		</p>
	</div>
);

export const DevLoginPage: FC<{ state: string; adminEmail: string }> = ({ state, adminEmail }) => (
	<div class="mk-narrow mk-stack">
		<p class="tc-eyebrow">Solo modo maqueta</p>
		<h1 style="font-size: var(--font-size-2xl)">Login de desarrollo</h1>
		<p class="mk-alert mk-alert--warn">
			Esta pantalla reemplaza a Google en modo maqueta. Elige cualquier correo: no se verifica nada. En producción esta página no
			existe.
		</p>
		<form method="post" action="/market/auth/dev" class="mk-form">
			<input type="hidden" name="state" value={state} />
			<div class="mk-field">
				<label for="dev-email">Correo</label>
				<input id="dev-email" type="email" name="email" required maxlength={254} value="comprador@maqueta.test" autocomplete="off" />
			</div>
			<div class="mk-field">
				<label for="dev-name">Nombre</label>
				<input id="dev-name" type="text" name="name" maxlength={80} value="Comprador de prueba" autocomplete="off" />
			</div>
			<button type="submit" class="tc-btn tc-btn--primary">
				Entrar como este usuario
			</button>
		</form>
		<form method="post" action="/market/auth/dev">
			<input type="hidden" name="state" value={state} />
			<input type="hidden" name="email" value={adminEmail} />
			<input type="hidden" name="name" value="Admin de prueba" />
			<button type="submit" class="tc-btn tc-btn--secondary">
				Entrar como admin ({adminEmail})
			</button>
		</form>
	</div>
);

export interface LibraryProps {
	user: User;
	items: LibraryItem[];
	csrf: string | null;
	highlight: string | null;
	notice: string | null;
}

export const LibraryPage: FC<LibraryProps> = ({ user, items, csrf, highlight, notice }) => (
	<div class="mk-narrow" style="max-width: 760px">
		<p class="tc-eyebrow">{user.email}</p>
		<h1 style="font-size: var(--font-size-2xl); margin: var(--spacing-2) 0 var(--spacing-6)">Mis compras</h1>
		{notice && <p class="mk-alert mk-alert--ok">{notice}</p>}
		{items.length === 0 ? (
			<p class="mk-alert">
				Aún no tienes productos. <a href="/market">Ver el catálogo</a>.
			</p>
		) : (
			<ul class="mk-list">
				{items.map((it) => {
					const left = Math.max(0, it.download_limit - it.download_count);
					const unavailable = !!it.revoked_at || !it.file_key;
					return (
						<li class="tc-card mk-item" id={`acceso-${it.entitlement_id}`} style={highlight === it.entitlement_id ? "border-color: var(--color-success)" : undefined}>
							<div>
								<h2>{it.title}</h2>
								<p class="mk-muted">
									{it.kind === "free" ? "Gratis" : formatPrice(it.amount_cents, it.currency)} · {new Date(it.created_at).toLocaleDateString("es")} ·{" "}
									{it.revoked_at ? "Acceso revocado" : `Te quedan ${left} de ${it.download_limit} descargas`}
								</p>
							</div>
							{unavailable ? (
								<span class="mk-muted">{it.revoked_at ? "No disponible" : "Archivo pendiente"}</span>
							) : (
								<form method="post" action={`/market/descargas/${it.entitlement_id}`}>
									<CsrfField csrf={csrf} />
									<button type="submit" class="tc-btn tc-btn--primary" disabled={left === 0}>
										Descargar
									</button>
								</form>
							)}
							{!it.revoked_at && (
								<details class="mk-review-form" id={`resena-${it.slug}`}>
									<summary>{it.my_rating ? `Tu reseña: ${"★".repeat(it.my_rating)}${"☆".repeat(5 - it.my_rating)} · Editar` : "★ Dejar una reseña"}</summary>
									<form method="post" action={`/market/producto/${it.slug}/resena`} class="mk-form">
										<CsrfField csrf={csrf} />
										<fieldset class="mk-rate">
											<legend>Tu calificación</legend>
											{[5, 4, 3, 2, 1].map((n) => (
												<>
													<input type="radio" id={`r-${it.entitlement_id}-${n}`} name="rating" value={String(n)} required checked={it.my_rating === n} />
													<label for={`r-${it.entitlement_id}-${n}`} title={`${n} de 5`}>
														★<span class="mk-visually-hidden">{n} de 5</span>
													</label>
												</>
											))}
										</fieldset>
										<div class="mk-field">
											<label for={`b-${it.entitlement_id}`}>Tu opinión (opcional)</label>
											<textarea id={`b-${it.entitlement_id}`} name="body" maxlength={1500} rows={3} placeholder="¿Qué te pareció? ¿Para qué lo usaste?">
												{it.my_review ?? ""}
											</textarea>
											<span class="mk-hint">Se publica con tu nombre y la inicial de tu apellido, como «Compra verificada».</span>
										</div>
										<div>
											<button type="submit" class="tc-btn tc-btn--secondary">
												Publicar reseña
											</button>
										</div>
									</form>
								</details>
							)}
						</li>
					);
				})}
			</ul>
		)}

		<h2 class="mk-h2">Correos de novedades</h2>
		<form method="post" action="/market/mis-compras/preferencias" class="tc-card mk-buybox mk-form" style="margin-top: 0">
			<CsrfField csrf={csrf} />
			<label class="mk-check">
				<input type="checkbox" name="marketing" value="1" checked={user.marketing_opt_in === 1} />
				<span>Quiero recibir por correo novedades y recursos de Tony Ciencia (opcional).</span>
			</label>
			<div>
				<button type="submit" class="tc-btn tc-btn--secondary">
					Guardar preferencia
				</button>
			</div>
			<p class="mk-muted">Los correos de tus compras y descargas te llegan siempre, sin importar esta casilla.</p>
		</form>
	</div>
);

export const PaymentStatusPage: FC<{ order: OrderRow; productTitle: string }> = ({ order, productTitle }) => {
	if (order.status === "paid") {
		return (
			<div class="mk-narrow mk-stack">
				<p class="tc-eyebrow">Pago confirmado</p>
				<h1 style="font-size: var(--font-size-2xl)">¡Gracias por tu compra!</h1>
				<p class="mk-lead">
					Ya tienes <strong>{productTitle}</strong>. Te enviamos el enlace de descarga a {order.customer_email}.
				</p>
				<a class="tc-btn tc-btn--primary" href="/market/mis-compras">
					Ir a Mis compras y descargar
				</a>
			</div>
		);
	}
	if (order.status === "pending") {
		return (
			<div class="mk-narrow mk-stack">
				<p class="tc-eyebrow">Un momento</p>
				<h1 style="font-size: var(--font-size-2xl)">Estamos confirmando tu pago…</h1>
				<p class="mk-lead">Esta página se actualiza sola. Si tarda, revisa tu correo o entra a Mis compras en unos minutos.</p>
				<a class="tc-btn tc-btn--secondary" href="/market/mis-compras">
					Ir a Mis compras
				</a>
			</div>
		);
	}
	return (
		<div class="mk-narrow mk-stack">
			<p class="tc-eyebrow">Estado del pedido</p>
			<h1 style="font-size: var(--font-size-2xl)">{order.status === "review" ? "Tu pago está en revisión" : "Este pago no se completó"}</h1>
			<p class="mk-lead">
				{order.status === "review"
					? "Recibimos tu pago pero necesitamos revisarlo. Te escribiremos pronto."
					: "No se realizó ningún cobro. Puedes intentarlo de nuevo cuando quieras."}
			</p>
			<a class="tc-btn tc-btn--secondary" href="/market">
				Volver al catálogo
			</a>
		</div>
	);
};

export const MockPayPage: FC<{ session: MockCheckoutRow; csrf: string | null }> = ({ session, csrf }) => (
	<div class="mk-narrow mk-stack">
		<p class="tc-eyebrow">Checkout simulado</p>
		<h1 style="font-size: var(--font-size-2xl)">Pago de prueba</h1>
		<p class="mk-alert mk-alert--warn">
			<strong>PAGO SIMULADO.</strong> No se cobra nada. Al pagar se genera un evento con la forma exacta de Stripe, firmado con el mismo
			esquema, y se entrega al mismo webhook que usará Stripe en producción.
		</p>
		<div class="tc-card mk-mockpay">
			<dl>
				<dt>Producto</dt>
				<dd>{session.product_title}</dd>
				<dt>Total</dt>
				<dd>{formatPrice(session.amount_cents, session.currency)}</dd>
				<dt>Correo</dt>
				<dd>{session.customer_email}</dd>
				<dt>Sesión</dt>
				<dd>
					<code class="mk-code">{session.id}</code>
				</dd>
				<dt>Estado</dt>
				<dd>{session.status}</dd>
			</dl>
			{session.status === "open" ? (
				<div class="mk-actions">
					<form method="post" action={`/market/maqueta/pago/${session.id}`}>
						<CsrfField csrf={csrf} />
						<input type="hidden" name="resultado" value="paid" />
						<button type="submit" class="tc-btn tc-btn--primary">
							Pagar {formatPrice(session.amount_cents, session.currency)} (simulado)
						</button>
					</form>
					<form method="post" action={`/market/maqueta/pago/${session.id}`}>
						<CsrfField csrf={csrf} />
						<input type="hidden" name="resultado" value="expired" />
						<button type="submit" class="tc-btn tc-btn--secondary">
							Simular pago vencido
						</button>
					</form>
					<a href={session.cancel_url} class="mk-muted">
						Cancelar
					</a>
				</div>
			) : (
				<div class="mk-actions">
					<form method="post" action={`/market/maqueta/pago/${session.id}/repetir`}>
						<CsrfField csrf={csrf} />
						<button type="submit" class="tc-btn tc-btn--secondary">
							Reenviar el mismo evento (prueba de idempotencia)
						</button>
					</form>
					<a href={session.success_url} class="tc-btn tc-btn--primary">
						Ir a la página de éxito
					</a>
				</div>
			)}
		</div>
	</div>
);

export const EmailDownloadPage: FC<{ entitlementId: string; token: string; title: string; left: number; limit: number }> = ({
	entitlementId,
	token,
	title,
	left,
	limit,
}) => (
	<div class="mk-narrow mk-stack">
		<p class="tc-eyebrow">Tu descarga</p>
		<h1 style="font-size: var(--font-size-2xl)">{title}</h1>
		<p class="mk-lead">
			Te quedan {left} de {limit} descargas. El enlace de descarga se genera al pulsar el botón y dura unos minutos.
		</p>
		<form method="post" action={`/market/descargas/${entitlementId}`}>
			<input type="hidden" name="t" value={token} />
			<button type="submit" class="tc-btn tc-btn--primary" disabled={left === 0}>
				Descargar ahora
			</button>
		</form>
		<p class="mk-muted">
			¿Prefieres tenerlo todo junto? Entra a <a href="/market/mis-compras">Mis compras</a> con tu cuenta de Google.
		</p>
	</div>
);
