import type { Hono, MiddlewareHandler } from "hono";
import type { AppEnv } from "../context";
import { isId } from "../lib/validate";
import { DevEmailView, DevInbox, type DevEmailRow } from "../views/dev";
import { render } from "../views/render";

/** Herramientas de desarrollo: solo existen con MODE=mock. En live responden 404. */
const mockOnly: MiddlewareHandler<AppEnv> = async (c, next) => {
	if (c.get("config").mode !== "mock") return c.notFound();
	c.header("Cache-Control", "no-store");
	await next();
};

export function registerDev(app: Hono<AppEnv>) {
	app.use("/dev", mockOnly);
	app.use("/dev/*", mockOnly);

	app.get("/dev", (c) => c.redirect("/dev/correos", 302));

	app.get("/dev/correos", async (c) => {
		const { results } = await c.env.MARKET_DB.prepare(
			"SELECT id, to_email, from_email, reply_to, subject, text, created_at FROM dev_emails ORDER BY created_at DESC LIMIT 200",
		).all<DevEmailRow>();
		return render(c, { title: "Correos (maqueta)", path: "/dev/correos", noindex: true }, <DevInbox rows={results} />);
	});

	app.get("/dev/correos/:id", async (c) => {
		const id = c.req.param("id");
		const row = isId(id)
			? await c.env.MARKET_DB.prepare("SELECT id, to_email, from_email, reply_to, subject, text, created_at FROM dev_emails WHERE id = ?1")
					.bind(id)
					.first<DevEmailRow>()
			: null;
		if (!row) return c.notFound();
		return render(c, { title: row.subject, path: "/dev/correos", noindex: true }, <DevEmailView row={row} />);
	});

	/** HTML del correo, aislado en un iframe sandbox (sin scripts). */
	app.get("/dev/correos/:id/html", async (c) => {
		const id = c.req.param("id");
		const row = isId(id) ? await c.env.MARKET_DB.prepare("SELECT html FROM dev_emails WHERE id = ?1").bind(id).first<{ html: string }>() : null;
		if (!row) return c.notFound();
		c.header("Content-Security-Policy", "sandbox; default-src 'none'; img-src * data:; style-src 'unsafe-inline'; frame-ancestors 'self'");
		c.header("X-Frame-Options", "SAMEORIGIN");
		return c.html(row.html);
	});
}
