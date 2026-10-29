import type { Hono } from "hono";
import { DevAuthProvider } from "../adapters/auth/dev";
import { AuthError } from "../adapters/types";
import { clientIp, type AppEnv } from "../context";
import { hit, RATE_RULES } from "../lib/ratelimit";
import { checkCsrf, clearLoginState, createSession, destroySession, readLoginState, startLoginState } from "../lib/session";
import { cleanLine, normalizeEmail, safeNextPath } from "../lib/validate";
import { upsertUser } from "../services/repo";
import { DevLoginPage, LoginPage } from "../views/account";
import { render, renderMessage } from "../views/render";

/**
 * Login. El flujo es el mismo en mock y live:
 *   /market/auth/start → proveedor (Google o pantalla de maqueta) → /market/auth/callback?code&state
 * Redirect URI que hay que registrar en Google: <SITE_URL>/market/auth/callback
 */
export function registerAuth(app: Hono<AppEnv>) {
	app.get("/market/entrar", (c) => {
		const next = safeNextPath(c.req.query("next"));
		if (c.get("user")) return c.redirect(next, 303);
		const error = c.req.query("error") ? "No pudimos completar el inicio de sesión. Inténtalo de nuevo." : null;
		return render(c, { title: "Entrar", path: "/market/entrar", noindex: true }, <LoginPage next={next} mode={c.get("config").mode} error={error} />);
	});

	app.get("/market/auth/start", async (c) => {
		if (!(await hit(c.env.MARKET_DB, RATE_RULES.login, clientIp(c)))) {
			return renderMessage(c, 429, "Demasiados intentos", "Espera un minuto antes de volver a intentar entrar.");
		}
		const config = c.get("config");
		const login = await startLoginState(c, safeNextPath(c.req.query("next")));
		const url = await c.get("adapters").auth.authorizationUrl(login, `${config.origin}/market/auth/callback`);
		return c.redirect(url, 302);
	});

	app.get("/market/auth/callback", async (c) => {
		if (!(await hit(c.env.MARKET_DB, RATE_RULES.login, clientIp(c)))) {
			return renderMessage(c, 429, "Demasiados intentos", "Espera un minuto antes de volver a intentar entrar.");
		}
		const config = c.get("config");
		const login = await readLoginState(c);
		clearLoginState(c);
		const state = c.req.query("state");
		const code = c.req.query("code");
		if (!login || !state || state !== login.state || !code || code.length > 4096) {
			return c.redirect("/market/entrar?error=estado", 303);
		}
		try {
			const identity = await c.get("adapters").auth.exchangeCode(code, login, `${config.origin}/market/auth/callback`);
			const user = await upsertUser(c.env.MARKET_DB, identity.email, identity.name);
			await createSession(c, user.id);
			return c.redirect(safeNextPath(login.next), 303);
		} catch (err) {
			console.error("[login] fallo en el callback:", err instanceof AuthError ? err.message : err);
			return c.redirect("/market/entrar?error=proveedor", 303);
		}
	});

	app.post("/market/salir", async (c) => {
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		await destroySession(c);
		return c.redirect("/market", 303);
	});

	// ── Pantalla de login de MAQUETA (404 en live) ──
	app.get("/market/auth/dev", (c) => {
		const auth = c.get("adapters").auth;
		if (!(auth instanceof DevAuthProvider)) return c.notFound();
		const state = c.req.query("state") ?? "";
		if (!/^[A-Za-z0-9_-]{10,64}$/.test(state)) return c.redirect("/market/entrar", 303);
		return render(
			c,
			{ title: "Login de desarrollo", path: "/market/auth/dev", noindex: true },
			<DevLoginPage state={state} adminEmail={c.get("config").adminEmail} />,
		);
	});

	app.post("/market/auth/dev", async (c) => {
		const auth = c.get("adapters").auth;
		if (!(auth instanceof DevAuthProvider)) return c.notFound();
		const form = await c.req.formData().catch(() => null);
		if (!(await checkCsrf(c, form))) return renderMessage(c, 403, "Solicitud no válida", "Recarga la página e inténtalo de nuevo.");
		const email = normalizeEmail(form?.get("email"));
		const name = cleanLine(form?.get("name") ?? "", 80);
		const state = form?.get("state");
		if (!email || name === null || typeof state !== "string" || !/^[A-Za-z0-9_-]{10,64}$/.test(state)) {
			return renderMessage(c, 400, "Datos no válidos", "Escribe un correo válido.", { href: "/market/entrar", label: "Volver" });
		}
		const code = await auth.issueCode({ email, name }, state);
		return c.redirect(`/market/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, 303);
	});
}
