import type { FC } from "hono/jsx";

export interface DevEmailRow {
	id: string;
	to_email: string;
	from_email: string;
	reply_to: string | null;
	subject: string;
	text: string;
	created_at: number;
}

const fmt = (ms: number) => new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";

export const DevInbox: FC<{ rows: DevEmailRow[] }> = ({ rows }) => (
	<div class="tc-shell">
		<p class="tc-eyebrow">Solo modo maqueta</p>
		<h1 style="font-size: var(--font-size-2xl); margin: var(--spacing-2) 0 var(--spacing-4)">Correos enviados (maqueta)</h1>
		<p class="mk-muted" style="margin-bottom: var(--spacing-6)">
			En modo maqueta ningún correo sale a internet: se guardan aquí. Cada compra o descarga gratis genera dos mensajes: uno al cliente y
			una copia aparte a ADMIN_COPY_EMAIL.
		</p>
		<div class="mk-table-wrap">
			<table class="mk-table">
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Para</th>
						<th>Asunto</th>
					</tr>
				</thead>
				<tbody>
					{rows.length === 0 && (
						<tr>
							<td colspan={3}>Todavía no hay correos.</td>
						</tr>
					)}
					{rows.map((r) => (
						<tr>
							<td>{fmt(r.created_at)}</td>
							<td>{r.to_email}</td>
							<td>
								<a href={`/dev/correos/${r.id}`}>{r.subject}</a>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</div>
);

export const DevEmailView: FC<{ row: DevEmailRow }> = ({ row }) => (
	<div class="tc-shell">
		<p>
			<a href="/dev/correos">← Todos los correos</a>
		</p>
		<h1 style="font-size: var(--font-size-xl); margin: var(--spacing-4) 0">{row.subject}</h1>
		<div class="tc-card mk-mockpay" style="margin-bottom: var(--spacing-6)">
			<dl>
				<dt>De</dt>
				<dd>{row.from_email}</dd>
				<dt>Para</dt>
				<dd>{row.to_email}</dd>
				<dt>Responder a</dt>
				<dd>{row.reply_to ?? "—"}</dd>
				<dt>Fecha</dt>
				<dd>{fmt(row.created_at)}</dd>
			</dl>
		</div>
		<iframe class="mk-mail-frame" src={`/dev/correos/${row.id}/html`} title={`Vista HTML: ${row.subject}`} sandbox=""></iframe>
		<h2 class="mk-h2">Versión de texto</h2>
		<pre class="tc-card" style="padding: var(--spacing-5); white-space: pre-wrap; font-size: var(--font-size-sm)">
			{row.text}
		</pre>
	</div>
);
