import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { MiddlewareHandler } from "hono";
import type { AppEnv, Ctx } from "../context";
import { base64UrlEncode, hmacSha256, randomToken, sha256Hex, signToken, timingSafeEqualStr, verifyToken } from "./crypto";
import type { User } from "../services/repo";
import type { LoginState } from "../adapters/types";

export const SESSION_COOKIE = "tcm_session";
export const LOGIN_COOKIE = "tcm_login";
const SESSION_DAYS = 30;

/** HttpOnly + SameSite=Lax siempre; Secure siempre salvo en http://localhost (desarrollo). */
function cookieBase(c: Ctx) {
	const secure = c.get("config").origin.startsWith("https://");
	return { httpOnly: true, secure, sameSite: "Lax" as const };
}

export async function createSession(c: Ctx, userId: string): Promise<void> {
	const token = randomToken(32);
	const id = await sha256Hex(token);
	const now = Date.now();
	await c.env.MARKET_DB.prepare("INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)")
		.bind(id, userId, now, now + SESSION_DAYS * 86400_000)
		.run();
	setCookie(c, SESSION_COOKIE, token, { ...cookieBase(c), path: "/market", maxAge: SESSION_DAYS * 86400 });
}

export async function destroySession(c: Ctx): Promise<void> {
	const sid = c.get("sessionId");
	if (sid) await c.env.MARKET_DB.prepare("DELETE FROM sessions WHERE id = ?1").bind(sid).run();
	deleteCookie(c, SESSION_COOKIE, { ...cookieBase(c), path: "/market" });
}

async function csrfFor(secret: string, sessionId: string): Promise<string> {
	return base64UrlEncode(await hmacSha256(secret, `csrf.${sessionId}`));
}

/** Carga la sesión (si hay) y deja user/csrf/isAdmin en el contexto. */
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
	c.set("user", null);
	c.set("sessionId", null);
	c.set("csrf", null);
	c.set("isAdmin", false);
	c.set("welcome", null);
	const token = getCookie(c, SESSION_COOKIE);
	if (token && token.length >= 20 && token.length <= 100) {
		const sid = await sha256Hex(token);
		const user = await c.env.MARKET_DB.prepare(
			`SELECT u.id, u.email, u.name, u.marketing_opt_in, u.marketing_opt_in_at, u.created_at
			 FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ?1 AND s.expires_at > ?2`,
		)
			.bind(sid, Date.now())
			.first<User>();
		if (user) {
			const config = c.get("config");
			c.set("user", user);
			c.set("sessionId", sid);
			c.set("csrf", await csrfFor(config.sessionSecret, sid));
			c.set("isAdmin", user.email === config.adminEmail);
		}
	}
	await next();
};

/**
 * Protección CSRF para POST: el Origin (o Referer) debe ser el del sitio y, si hay sesión,
 * el formulario debe traer el token CSRF ligado a esa sesión.
 */
export function checkOrigin(c: Ctx): boolean {
	const origin = c.get("config").origin;
	const o = c.req.header("origin");
	if (o) return o === origin;
	const ref = c.req.header("referer");
	return !!ref && (ref === origin || ref.startsWith(`${origin}/`));
}

export async function checkCsrf(c: Ctx, form: FormData | null): Promise<boolean> {
	if (!checkOrigin(c)) return false;
	const expected = c.get("csrf");
	if (!expected) return true;
	const got = form?.get("csrf");
	return typeof got === "string" && timingSafeEqualStr(expected, got);
}

// ── Estado del login (state + nonce + PKCE) en cookie firmada de 10 minutos ──

export async function startLoginState(c: Ctx, next: string): Promise<LoginState> {
	const login: LoginState = { state: randomToken(16), nonce: randomToken(16), verifier: randomToken(48), next };
	const token = await signToken(c.get("config").sessionSecret, "login", { ...login, exp: Math.floor(Date.now() / 1000) + 600 });
	setCookie(c, LOGIN_COOKIE, token, { ...cookieBase(c), path: "/market/auth", maxAge: 600 });
	return login;
}

export async function readLoginState(c: Ctx): Promise<LoginState | null> {
	const token = getCookie(c, LOGIN_COOKIE);
	if (!token) return null;
	const payload = await verifyToken<LoginState & { exp: number }>(c.get("config").sessionSecret, "login", token);
	return payload ? { state: payload.state, nonce: payload.nonce, verifier: payload.verifier, next: payload.next } : null;
}

export function clearLoginState(c: Ctx): void {
	deleteCookie(c, LOGIN_COOKIE, { ...cookieBase(c), path: "/market/auth" });
}
