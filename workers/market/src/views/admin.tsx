import type { FC } from "hono/jsx";
import { centsToInput, formatPrice } from "../lib/money";
import type { OutboxRow } from "../services/outbox";
import { CATEGORIES } from "../lib/catalog";
import type { AdminReviewRow, EntitlementRow, OrderRow, Product, WaitlistRow } from "../services/repo";
import { CsrfField } from "./layout";

const fmtDate = (ms: number | null) => (ms ? new Date(ms).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "—");
const Status: FC<{ s: string }> = ({ s }) => <span class={`mk-status mk-status--${s}`}>{s}</span>;

export const AdminNav: FC<{ current: "productos" | "pedidos" | "correos" | "resenas" | "lista" }> = ({ current }) => (
	<nav class="mk-admin-nav" aria-label="Administración">
		<a href="/market/admin" aria-current={current === "productos" ? "page" : undefined}>
			Productos
		</a>
		<a href="/market/admin/pedidos" aria-current={current === "pedidos" ? "page" : undefined}>
			Pedidos
		</a>
		<a href="/market/admin/correos" aria-current={current === "correos" ? "page" : undefined}>
			Correos
		</a>
		<a href="/market/admin/resenas" aria-current={current === "resenas" ? "page" : undefined}>
			Reseñas
		</a>
		<a href="/market/admin/lista-espera" aria-current={current === "lista" ? "page" : undefined}>
			Lista de espera
		</a>
	</nav>
);

export const AdminProducts: FC<{ products: Product[]; csrf: string | null; notice: string | null; storageName: string; waitlist?: Record<string, number> }> = ({
	products,
	csrf,
	notice,
	storageName,
	waitlist = {},
}) => (
	<div class="tc-shell">
		<h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-6)">Administración</h1>
		<AdminNav current="productos" />
		{notice && <p class="mk-alert mk-alert--ok">{notice}</p>}
		<div class="mk-actions" style="margin-bottom: var(--spacing-5)">
			<a class="tc-btn tc-btn--primary" href="/market/admin/productos/nuevo">
				Nuevo producto
			</a>
			<span class="mk-muted">Almacén de archivos activo: {storageName === "r2" ? "R2 (privado)" : "maqueta (solo archivos de prueba)"}</span>
		</div>
		<div class="mk-table-wrap">
			<table class="mk-table">
				<thead>
					<tr>
						<th>Producto</th>
						<th>Tipo</th>
						<th>Precio</th>
						<th>Archivo</th>
						<th>Estado</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{products.map((p) => (
						<tr>
							<td>
								<strong>{p.title}</strong>
								<br />
								<code>{p.slug}</code>
							</td>
							<td>{p.kind === "paid" ? "Pago" : "Gratis"}</td>
							<td>{p.kind === "paid" ? formatPrice(p.price_cents, p.currency) : "—"}</td>
							<td>
								{p.file_key ? (
									<code>{p.file_key}</code>
								) : p.availability === "coming_soon" ? (
									<span class="mk-muted">no hace falta (próximamente)</span>
								) : (
									<span class="mk-status mk-status--failed">sin archivo</span>
								)}
							</td>
							<td>
								{p.active ? <span class="mk-status mk-status--paid">activo</span> : <span class="mk-status mk-status--expired">inactivo</span>}
								{p.availability === "coming_soon" && (
									<>
										<br />
										<span class="mk-status mk-status--pending">próximamente</span> · {waitlist[p.id] ?? 0} en lista
									</>
								)}
							</td>
							<td>
								<div class="mk-actions">
									<a href={`/market/admin/productos/${p.id}`}>Editar</a>
									<form method="post" action={`/market/admin/productos/${p.id}/${p.active ? "desactivar" : "activar"}`} class="mk-inline-form">
										<CsrfField csrf={csrf} />
										<button type="submit" class="mk-linkbtn">
											{p.active ? "Desactivar" : "Activar"}
										</button>
									</form>
									{p.active ? <a href={`/market/producto/${p.slug}`}>Ver</a> : null}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
);

export interface ProductFormProps {
	product: Product | null;
	csrf: string | null;
	errors: string[];
	values?: Partial<Record<string, string>>;
	maxUploadMb: number;
	fileInfo: { size: number; contentType: string } | null;
}

export const AdminProductForm: FC<ProductFormProps> = ({ product, csrf, errors, values, maxUploadMb, fileInfo }) => {
	const v = (k: string, fallback: string) => values?.[k] ?? fallback;
	const action = product ? `/market/admin/productos/${product.id}` : "/market/admin/productos/nuevo";
	return (
		<div class="tc-shell" style="max-width: 860px">
			<h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-6)">{product ? `Editar: ${product.title}` : "Nuevo producto"}</h1>
			<AdminNav current="productos" />
			{errors.length > 0 && (
				<div class="mk-alert mk-alert--error" role="alert">
					<strong>Revisa el formulario:</strong>
					<ul style="padding-left: 1.2rem; margin-top: 6px">
						{errors.map((e) => (
							<li>{e}</li>
						))}
					</ul>
				</div>
			)}
			<form method="post" action={action} enctype="multipart/form-data" class="mk-form">
				<CsrfField csrf={csrf} />
				<div class="mk-field">
					<label for="f-title">Título</label>
					<input id="f-title" type="text" name="title" required maxlength={140} value={v("title", product?.title ?? "")} />
				</div>
				<div class="mk-form-row">
					<div class="mk-field">
						<label for="f-slug">Slug (URL)</label>
						<input id="f-slug" type="text" name="slug" required maxlength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={v("slug", product?.slug ?? "")} />
						<span class="mk-hint">Minúsculas, números y guiones. Queda en /market/producto/slug</span>
					</div>
					<div class="mk-field">
						<label for="f-kind">Tipo</label>
						<select id="f-kind" name="kind">
							<option value="paid" selected={v("kind", product?.kind ?? "paid") === "paid"}>
								De pago
							</option>
							<option value="free" selected={v("kind", product?.kind ?? "paid") === "free"}>
								Gratis
							</option>
						</select>
					</div>
					<div class="mk-field">
						<label for="f-price">Precio (USD)</label>
						<input id="f-price" type="text" inputmode="decimal" name="price" maxlength={9} value={v("price", product ? centsToInput(product.price_cents) : "")} />
						<span class="mk-hint">Ej.: 77 o 77.50. Ignorado si es gratis. Mínimo 0.50.</span>
					</div>
				</div>
				<div class="mk-field">
					<label for="f-summary">Resumen (catálogo)</label>
					<input id="f-summary" type="text" name="summary" maxlength={300} value={v("summary", product?.summary ?? "")} />
				</div>
				<div class="mk-field">
					<label for="f-desc">Descripción</label>
					<textarea id="f-desc" name="description" maxlength={20000}>
						{v("description", product?.description ?? "")}
					</textarea>
					<span class="mk-hint">Párrafos separados por una línea en blanco. «## » al inicio = subtítulo. Líneas con «- » = lista.</span>
				</div>
				<div class="mk-form-row">
					<div class="mk-field">
						<label for="f-limit">Límite de descargas por compra</label>
						<input id="f-limit" type="number" name="download_limit" min={1} max={100} value={v("download_limit", String(product?.download_limit ?? 5))} />
					</div>
					<div class="mk-field">
						<label for="f-order">Orden en el catálogo</label>
						<input id="f-order" type="number" name="sort_order" min={-1000} max={1000} value={v("sort_order", String(product?.sort_order ?? 0))} />
					</div>
				</div>
				<label class="mk-check">
					<input type="checkbox" name="active" value="1" checked={v("active", product?.active ? "1" : "") === "1"} />
					<span>Activo (visible en la tienda)</span>
				</label>

				<fieldset class="mk-fieldset">
					<legend>Vitrina, precio y SEO</legend>
					<div class="mk-form-row">
						<div class="mk-field">
							<label for="f-avail">Disponibilidad</label>
							<select id="f-avail" name="availability">
								<option value="available" selected={v("availability", product?.availability ?? "available") === "available"}>
									Disponible (se puede comprar)
								</option>
								<option value="coming_soon" selected={v("availability", product?.availability ?? "available") === "coming_soon"}>
									Próximamente (solo lista de espera)
								</option>
							</select>
						</div>
						<div class="mk-field">
							<label for="f-cat">Categoría</label>
							<select id="f-cat" name="category">
								<option value="">— Sin categoría —</option>
								{CATEGORIES.map((cat) => (
									<option value={cat.slug} selected={v("category", product?.category ?? "") === cat.slug}>
										{cat.label}
									</option>
								))}
							</select>
						</div>
						<div class="mk-field">
							<label for="f-compare">Precio anterior tachado (USD, opcional)</label>
							<input id="f-compare" type="text" inputmode="decimal" name="compare_at" maxlength={9} value={v("compare_at", product?.compare_at_cents ? centsToInput(product.compare_at_cents) : "")} />
							<span class="mk-hint">Solo si de verdad se vendió a ese precio. Debe ser mayor que el precio actual.</span>
						</div>
					</div>
					<div class="mk-field">
						<label for="f-tagline">Frase corta (bajo el título)</label>
						<input id="f-tagline" type="text" name="tagline" maxlength={200} value={v("tagline", product?.tagline ?? "")} />
					</div>
					<div class="mk-form-row">
						<div class="mk-field">
							<label for="f-badge">Etiqueta manual (opcional)</label>
							<input id="f-badge" type="text" name="badge" maxlength={30} value={v("badge", product?.badge ?? "")} placeholder="Versión 2.0" />
							<span class="mk-hint">«Nuevo», «Más vendido» y «Próximamente» se ponen solas con datos reales.</span>
						</div>
						<div class="mk-field">
							<label for="f-accent">Color de acento</label>
							<input id="f-accent" type="text" name="accent" maxlength={7} pattern="#[0-9a-fA-F]{6}" value={v("accent", product?.accent ?? "")} placeholder="#f5e400" />
						</div>
						<div class="mk-field">
							<label for="f-video">Video de YouTube (id, opcional)</label>
							<input id="f-video" type="text" name="video_id" maxlength={11} value={v("video_id", product?.video_id ?? "")} placeholder="dQw4w9WgXcQ" />
						</div>
						<div class="mk-field">
							<label for="f-offset">Ventas fuera del market</label>
							<input id="f-offset" type="number" name="sales_offset" min={0} max={1000000} value={v("sales_offset", String(product?.sales_offset ?? 0))} />
							<span class="mk-hint">Solo ventas reales hechas en otra plataforma. Se suman a las pagadas aquí.</span>
						</div>
					</div>
					<div class="mk-field">
						<label for="f-mtitle">Meta título (Google)</label>
						<input id="f-mtitle" type="text" name="meta_title" maxlength={70} value={v("meta_title", product?.meta_title ?? "")} />
						<span class="mk-hint">Hasta ~60 caracteres. Vacío = título del producto.</span>
					</div>
					<div class="mk-field">
						<label for="f-mdesc">Meta descripción (Google)</label>
						<input id="f-mdesc" type="text" name="meta_description" maxlength={200} value={v("meta_description", product?.meta_description ?? "")} />
						<span class="mk-hint">Hasta ~160 caracteres. Vacío = resumen.</span>
					</div>
					<div class="mk-field">
						<label for="f-tags">Palabras clave (separadas por coma)</label>
						<input id="f-tags" type="text" name="tags" maxlength={600} value={v("tags", product?.tags.join(", ") ?? "")} placeholder="editar videos con Claude, subtítulos automáticos" />
					</div>
					<div class="mk-field">
						<label for="f-hl">Qué incluye (una línea por punto)</label>
						<textarea id="f-hl" name="highlights" maxlength={3000} style="min-height: 120px">
							{v("highlights", product?.highlights.join("\n") ?? "")}
						</textarea>
					</div>
					<div class="mk-field">
						<label for="f-specs">Detalles del producto (una línea por dato: «Etiqueta: valor»)</label>
						<textarea id="f-specs" name="specs" maxlength={3000} style="min-height: 120px">
							{v("specs", product?.specs.map((x) => `${x.label}: ${x.value}`).join("\n") ?? "")}
						</textarea>
					</div>
					<div class="mk-field">
						<label for="f-faq">Preguntas frecuentes (pregunta en una línea, respuesta en la siguiente; línea en blanco entre preguntas)</label>
						<textarea id="f-faq" name="faq" maxlength={8000} style="min-height: 160px">
							{v("faq", product?.faq.map((x) => `${x.q}\n${x.a}`).join("\n\n") ?? "")}
						</textarea>
					</div>
				</fieldset>

				<fieldset class="mk-fieldset">
					<legend>Archivo entregable (privado)</legend>
					{product?.file_key ? (
						<p class="mk-muted">
							Actual: <code>{product.file_key}</code> → se descarga como <code>{product.file_name}</code>
							{fileInfo ? ` · ${(fileInfo.size / 1024).toFixed(0)} KB` : " · ⚠ no se encuentra en el almacén"}
						</p>
					) : (
						<p class="mk-muted">Todavía no tiene archivo: nadie podrá descargarlo hasta que lo subas.</p>
					)}
					<div class="mk-field">
						<label for="f-file">Subir archivo (reemplaza el actual)</label>
						<input id="f-file" type="file" name="file" />
						<span class="mk-hint">Hasta {maxUploadMb} MB por este formulario. Para archivos más grandes usa el comando del HANDOFF.md y escribe la clave abajo.</span>
					</div>
					<div class="mk-form-row">
						<div class="mk-field">
							<label for="f-key">…o clave existente en el bucket</label>
							<input id="f-key" type="text" name="file_key" maxlength={300} value={v("file_key", "")} placeholder="products/slug/archivo.zip" />
						</div>
						<div class="mk-field">
							<label for="f-fname">Nombre de descarga</label>
							<input id="f-fname" type="text" name="file_name" maxlength={120} value={v("file_name", "")} placeholder="anuncios-infinitos.zip" />
						</div>
					</div>
				</fieldset>

				<fieldset class="mk-fieldset">
					<legend>Imágenes</legend>
					{product?.images.length ? (
						product.images.map((img, i) => (
							<label class="mk-check">
								<input type="checkbox" name="remove_image" value={String(i)} />
								<span>
									Quitar <code>{img.src}</code> ({img.alt})
								</span>
							</label>
						))
					) : (
						<p class="mk-muted">Sin imágenes.</p>
					)}
					<div class="mk-form-row">
						<div class="mk-field">
							<label for="f-img">Agregar imagen (PNG, JPG, WebP o GIF)</label>
							<input id="f-img" type="file" name="image" accept="image/png,image/jpeg,image/webp,image/gif" />
						</div>
						<div class="mk-field">
							<label for="f-alt">Texto alternativo de la imagen</label>
							<input id="f-alt" type="text" name="image_alt" maxlength={200} />
						</div>
					</div>
				</fieldset>

				<div class="mk-actions">
					<button type="submit" class="tc-btn tc-btn--primary">
						Guardar
					</button>
					<a href="/market/admin">Cancelar</a>
				</div>
			</form>
		</div>
	);
};

export interface AdminOrderListRow extends OrderRow {
	product_title: string;
}

export const AdminOrders: FC<{ orders: AdminOrderListRow[]; filter: string | null }> = ({ orders, filter }) => (
	<div class="tc-shell">
		<h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-6)">Pedidos</h1>
		<AdminNav current="pedidos" />
		<p class="mk-actions" style="margin-bottom: var(--spacing-5)">
			{["todos", "paid", "free", "pending", "review", "expired", "refunded"].map((s) => (
				<a href={s === "todos" ? "/market/admin/pedidos" : `/market/admin/pedidos?estado=${s}`} aria-current={(filter ?? "todos") === s ? "page" : undefined}>
					{s}
				</a>
			))}
		</p>
		<div class="mk-table-wrap">
			<table class="mk-table">
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Cliente</th>
						<th>Producto</th>
						<th>Monto</th>
						<th>Estado</th>
						<th>Proveedor</th>
					</tr>
				</thead>
				<tbody>
					{orders.length === 0 && (
						<tr>
							<td colspan={6}>Sin pedidos.</td>
						</tr>
					)}
					{orders.map((o) => (
						<tr>
							<td>
								<a href={`/market/admin/pedidos/${o.id}`}>{fmtDate(o.created_at)}</a>
							</td>
							<td>{o.customer_email}</td>
							<td>{o.product_title}</td>
							<td>{o.kind === "free" ? "Gratis" : formatPrice(o.amount_cents, o.currency)}</td>
							<td>
								<Status s={o.status} />
							</td>
							<td>
								{o.provider}
								{o.provider_session_id ? (
									<>
										<br />
										<code>{o.provider_session_id}</code>
									</>
								) : null}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
);

export const EmailTable: FC<{ rows: OutboxRow[]; csrf: string | null }> = ({ rows, csrf }) => (
	<div class="mk-table-wrap">
		<table class="mk-table">
			<thead>
				<tr>
					<th>Creado</th>
					<th>Tipo</th>
					<th>Para</th>
					<th>Asunto</th>
					<th>Estado</th>
					<th>Intentos</th>
					<th>Último error</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{rows.length === 0 && (
					<tr>
						<td colspan={8}>Sin correos.</td>
					</tr>
				)}
				{rows.map((r) => (
					<tr>
						<td>{fmtDate(r.created_at)}</td>
						<td>{r.kind}</td>
						<td>{r.to_email}</td>
						<td>{r.subject}</td>
						<td>
							<Status s={r.status} />
							{r.provider ? <span class="mk-muted"> · {r.provider}</span> : null}
						</td>
						<td>{r.attempts}</td>
						<td>
							<code>{r.last_error ?? ""}</code>
						</td>
						<td>
							{r.status === "failed" || r.status === "dead" ? (
								<form method="post" action={`/market/admin/correos/${r.id}/reintentar`} class="mk-inline-form">
									<CsrfField csrf={csrf} />
									<button type="submit" class="mk-linkbtn">
										Reintentar
									</button>
								</form>
							) : null}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	</div>
);

export const AdminEmails: FC<{ rows: OutboxRow[]; csrf: string | null; notice: string | null }> = ({ rows, csrf, notice }) => (
	<div class="tc-shell">
		<h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-6)">Correos</h1>
		<AdminNav current="correos" />
		{notice && <p class="mk-alert mk-alert--ok">{notice}</p>}
		<p class="mk-muted" style="margin-bottom: var(--spacing-5)">
			Cola de envío. Los fallos se reintentan solos cada 5 minutos con espera creciente; los marcados «dead» necesitan revisión.
		</p>
		<EmailTable rows={rows} csrf={csrf} />
	</div>
);

export interface OrderDetailProps {
	order: OrderRow;
	productTitle: string;
	entitlement: EntitlementRow | null;
	downloads: Array<{ via: string; created_at: number }>;
	emails: OutboxRow[];
	csrf: string | null;
	notice: string | null;
}

export const AdminOrderDetail: FC<OrderDetailProps> = ({ order, productTitle, entitlement, downloads, emails, csrf, notice }) => (
	<div class="tc-shell">
		<h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-6)">Pedido</h1>
		<AdminNav current="pedidos" />
		{notice && <p class="mk-alert mk-alert--ok">{notice}</p>}
		<div class="tc-card mk-mockpay">
			<dl>
				<dt>Id</dt>
				<dd>
					<code class="mk-code">{order.id}</code>
				</dd>
				<dt>Producto</dt>
				<dd>{productTitle}</dd>
				<dt>Cliente</dt>
				<dd>{order.customer_email}</dd>
				<dt>Monto</dt>
				<dd>{order.kind === "free" ? "Gratis" : formatPrice(order.amount_cents, order.currency)}</dd>
				<dt>Estado</dt>
				<dd>
					<Status s={order.status} />
				</dd>
				<dt>Proveedor</dt>
				<dd>
					{order.provider} <code class="mk-code">{order.provider_session_id ?? ""}</code> <code class="mk-code">{order.provider_payment_id ?? ""}</code>
				</dd>
				<dt>Creado / pagado</dt>
				<dd>
					{fmtDate(order.created_at)} / {fmtDate(order.paid_at)}
				</dd>
				{order.note && (
					<>
						<dt>Nota</dt>
						<dd>{order.note}</dd>
					</>
				)}
				<dt>Descargas</dt>
				<dd>
					{entitlement
						? `${entitlement.download_count} de ${entitlement.download_limit}${entitlement.revoked_at ? " · acceso revocado" : ""}`
						: "sin acceso"}
				</dd>
			</dl>
			{entitlement && !entitlement.revoked_at && (
				<div class="mk-actions">
					<form method="post" action={`/market/admin/pedidos/${order.id}/restablecer-descargas`}>
						<CsrfField csrf={csrf} />
						<button type="submit" class="tc-btn tc-btn--secondary">
							Restablecer contador de descargas
						</button>
					</form>
				</div>
			)}
		</div>
		<h2 class="mk-h2">Historial de descargas</h2>
		{downloads.length === 0 ? (
			<p class="mk-muted">Sin descargas.</p>
		) : (
			<ul class="mk-muted" style="padding-left: 1.2rem">
				{downloads.map((d) => (
					<li>
						{fmtDate(d.created_at)} · {d.via === "email" ? "desde el correo" : "desde el sitio"}
					</li>
				))}
			</ul>
		)}
		<h2 class="mk-h2">Correos</h2>
		<EmailTable rows={emails} csrf={csrf} />
	</div>
);

export const AdminReviews: FC<{ rows: AdminReviewRow[]; csrf: string | null; notice: string | null }> = ({ rows, csrf, notice }) => (
	<div class="tc-shell">
		<h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-6)">Reseñas</h1>
		<AdminNav current="resenas" />
		{notice && <p class="mk-alert mk-alert--ok">{notice}</p>}
		<p class="mk-muted" style="margin-bottom: var(--spacing-5)">
			Solo pueden reseñar personas con acceso vigente al producto. Ocultar una reseña la saca de la tienda y del promedio de estrellas.
		</p>
		<div class="mk-table-wrap">
			<table class="mk-table">
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Producto</th>
						<th>Persona</th>
						<th>★</th>
						<th>Texto</th>
						<th>Estado</th>
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 && (
						<tr>
							<td colspan={6}>Todavía no hay reseñas.</td>
						</tr>
					)}
					{rows.map((r) => (
						<tr>
							<td>{fmtDate(r.created_at)}</td>
							<td>{r.product_title}</td>
							<td>
								{r.display_name}
								<br />
								<code>{r.email}</code>
							</td>
							<td>{r.rating}</td>
							<td style="max-width: 360px">{r.body || "—"}</td>
							<td>
								<form method="post" action={`/market/admin/resenas/${r.id}/${r.status === "published" ? "ocultar" : "publicar"}`} class="mk-inline-form">
									<CsrfField csrf={csrf} />
									<Status s={r.status === "published" ? "paid" : "expired"} /> {r.status === "published" ? "publicada" : "oculta"} ·{" "}
									<button type="submit" class="mk-linkbtn">
										{r.status === "published" ? "Ocultar" : "Publicar"}
									</button>
								</form>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
);

export const AdminWaitlist: FC<{ rows: WaitlistRow[] }> = ({ rows }) => (
	<div class="tc-shell">
		<h1 style="font-size: var(--font-size-2xl); margin-bottom: var(--spacing-6)">Lista de espera</h1>
		<AdminNav current="lista" />
		<p class="mk-muted" style="margin-bottom: var(--spacing-5)">
			Correos que pidieron aviso de un producto próximo. Úsalos solo para avisar de ese lanzamiento.
		</p>
		<div class="mk-table-wrap">
			<table class="mk-table">
				<thead>
					<tr>
						<th>Producto</th>
						<th>Correo</th>
						<th>Fecha</th>
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 && (
						<tr>
							<td colspan={3}>Todavía nadie se anotó.</td>
						</tr>
					)}
					{rows.map((r) => (
						<tr>
							<td>{r.product_title}</td>
							<td>
								<code>{r.email}</code>
							</td>
							<td>{fmtDate(r.created_at)}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
);
