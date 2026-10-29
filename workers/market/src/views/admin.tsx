import type { FC } from "hono/jsx";
import { centsToInput, formatPrice } from "../lib/money";
import type { OutboxRow } from "../services/outbox";
import type { EntitlementRow, OrderRow, Product } from "../services/repo";
import { CsrfField } from "./layout";

const fmtDate = (ms: number | null) => (ms ? new Date(ms).toISOString().replace("T", " ").slice(0, 16) + " UTC" : "—");
const Status: FC<{ s: string }> = ({ s }) => <span class={`mk-status mk-status--${s}`}>{s}</span>;

export const AdminNav: FC<{ current: "productos" | "pedidos" | "correos" }> = ({ current }) => (
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
	</nav>
);

export const AdminProducts: FC<{ products: Product[]; csrf: string | null; notice: string | null; storageName: string }> = ({
	products,
	csrf,
	notice,
	storageName,
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
							<td>{p.file_key ? <code>{p.file_key}</code> : <span class="mk-status mk-status--failed">sin archivo</span>}</td>
							<td>{p.active ? <span class="mk-status mk-status--paid">activo</span> : <span class="mk-status mk-status--expired">inactivo</span>}</td>
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
					<span>Activo (visible y a la venta)</span>
				</label>

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
