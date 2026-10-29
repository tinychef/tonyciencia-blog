import { formatPrice } from "../lib/money";

export function esc(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface RenderedEmail {
	subject: string;
	html: string;
	text: string;
}

interface DeliveryData {
	kind: "paid" | "free";
	buyerName: string;
	productTitle: string;
	amountCents: number;
	currency: string;
	downloadUrl: string;
	libraryUrl: string;
	linkDays: number;
	downloadLimit: number;
	orderId: string;
}

function shell(title: string, inner: string): string {
	return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e5ea;border-radius:14px">
<tr><td style="padding:28px 28px 8px;font-size:13px;color:#6e6e73;letter-spacing:.02em">Market Tony · Tony Ciencia</td></tr>
<tr><td style="padding:0 28px 28px">${inner}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#6e6e73">Tony Ciencia LLC · 8206 Louisiana Blvd NE, Ste A #6812, Albuquerque, NM 87113, USA. Recibes este correo por una compra o descarga en tonyciencia.com/market.</p>
</td></tr></table></body></html>`;
}

/** Correo al cliente con el ENLACE firmado (nunca adjunto). */
export function deliveryEmail(d: DeliveryData): RenderedEmail {
	const paid = d.kind === "paid";
	const subject = paid ? `Tu compra: ${d.productTitle}` : `Tu descarga gratis: ${d.productTitle}`;
	const hello = d.buyerName ? `Hola, ${d.buyerName}:` : "Hola:";
	const lead = paid
		? `Gracias por tu compra de <strong>${esc(d.productTitle)}</strong> (${esc(formatPrice(d.amountCents, d.currency))}).`
		: `Aquí tienes <strong>${esc(d.productTitle)}</strong>, gratis.`;
	const html = shell(
		subject,
		`<h1 style="margin:8px 0 16px;font-size:22px;line-height:1.25">${esc(subject)}</h1>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6">${esc(hello)}</p>
<p style="margin:0 0 20px;font-size:16px;line-height:1.6">${lead}</p>
<p style="margin:0 0 24px"><a href="${esc(d.downloadUrl)}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">Descargar ${esc(d.productTitle)}</a></p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#515154">Este enlace es personal y vence en ${d.linkDays} días. Puedes descargar hasta ${d.downloadLimit} veces.</p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#515154">Cuando quieras, también puedes volver a descargarlo desde <a href="${esc(d.libraryUrl)}" style="color:#1d1d1f">Mis compras</a> iniciando sesión con Google.</p>
<p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#6e6e73">Referencia del pedido: ${esc(d.orderId)}</p>`,
	);
	const text = [
		subject,
		"",
		hello,
		"",
		paid ? `Gracias por tu compra de ${d.productTitle} (${formatPrice(d.amountCents, d.currency)}).` : `Aquí tienes ${d.productTitle}, gratis.`,
		"",
		`Descargar: ${d.downloadUrl}`,
		"",
		`Este enlace es personal y vence en ${d.linkDays} días. Puedes descargar hasta ${d.downloadLimit} veces.`,
		`También puedes volver a descargarlo desde Mis compras: ${d.libraryUrl}`,
		"",
		`Referencia del pedido: ${d.orderId}`,
		"Tony Ciencia LLC · tonyciencia.com",
	].join("\n");
	return { subject, html, text };
}

/** Copia para ADMIN_COPY_EMAIL: un mensaje aparte (no CCO) con el mismo contenido y un aviso arriba. */
export function adminCopyEmail(original: RenderedEmail, buyerEmail: string): RenderedEmail {
	const banner = `<div style="margin:0 0 16px;padding:12px 14px;border:1px solid #ffd60a;background:#fffbe6;border-radius:10px;font-size:13px;line-height:1.5;color:#1d1d1f">
<strong>Copia para administración.</strong> Este mensaje se envió a <strong>${esc(buyerEmail)}</strong>. No uses el botón de descarga: cuenta como una descarga del cliente.</div>`;
	return {
		subject: `[Copia admin] ${original.subject} — ${buyerEmail}`,
		html: original.html.replace(/(<tr><td style="padding:0 28px 28px">)/, `$1${banner}`),
		text: `[COPIA PARA ADMINISTRACIÓN] Enviado a: ${buyerEmail}\nNo uses el enlace de descarga: cuenta como una descarga del cliente.\n\n${original.text}`,
	};
}
