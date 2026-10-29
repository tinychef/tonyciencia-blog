import type { Child } from "hono/jsx";
import { getCookie } from "hono/cookie";
import { raw } from "hono/html";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Ctx } from "../context";
import { Layout, type PageMeta } from "./layout";

/** Respeta el tema elegido en el sitio (cookie "scheme" del blog); oscuro por defecto, como el sitio. */
function themeFrom(c: Ctx): "light" | "dark" {
	return getCookie(c, "scheme") === "light" ? "light" : "dark";
}

export function render(c: Ctx, meta: PageMeta, body: Child, status: ContentfulStatusCode = 200) {
	return c.html(
		<>
			{raw("<!doctype html>")}
			<Layout
			meta={meta}
			config={c.get("config")}
			user={c.get("user")}
			isAdmin={c.get("isAdmin")}
			csrf={c.get("csrf")}
			theme={themeFrom(c)}
		>
				{body}
			</Layout>
		</>,
		status,
	);
}

/** Página de mensaje simple (errores, avisos). */
export function renderMessage(
	c: Ctx,
	status: ContentfulStatusCode,
	title: string,
	message: string,
	action?: { href: string; label: string },
) {
	return render(
		c,
		{ title, path: c.req.path, noindex: true },
		<div class="mk-narrow mk-stack">
			<p class="tc-eyebrow">{status >= 400 ? `Error ${status}` : "Aviso"}</p>
			<h1 style="font-size: var(--font-size-2xl)">{title}</h1>
			<p class="mk-lead">{message}</p>
			<p>
				<a class="tc-btn tc-btn--secondary" href={action?.href ?? "/market"}>
					{action?.label ?? "Volver al catálogo"}
				</a>
			</p>
		</div>,
		status,
	);
}

/** Texto plano del admin → bloques: "## Título", listas con "- ", párrafos separados por línea en blanco. */
export function Description({ text }: { text: string }) {
	const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
	return (
		<>
			{blocks.map((b) => {
				if (b.startsWith("## ")) return <h2>{b.slice(3)}</h2>;
				const lines = b.split("\n");
				if (lines.every((l) => /^[-•]\s+/.test(l))) {
					return (
						<ul>
							{lines.map((l) => (
								<li>{l.replace(/^[-•]\s+/, "")}</li>
							))}
						</ul>
					);
				}
				return (
					<p>
						{lines.map((l, i) => (
							<>
								{i > 0 && <br />}
								{l}
							</>
						))}
					</p>
				);
			})}
		</>
	);
}
