import { base64UrlDecode, sha256Base64Url } from "../../lib/crypto";
import { cleanLine, normalizeEmail } from "../../lib/validate";
import { AuthError, type AuthIdentity, type AuthProvider, type LoginState } from "../types";

/**
 * Google OAuth 2.0 / OpenID Connect — flujo "authorization code" con PKCE, state y nonce.
 *
 * ⚠ LIVE SIN PROBAR contra Google (no hay credenciales en este entorno). La lógica de
 * validación de claims sí tiene pruebas unitarias con respuestas simuladas.
 */
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export class GoogleAuthProvider implements AuthProvider {
	readonly name = "google" as const;

	constructor(
		private readonly clientId: string,
		private readonly clientSecret: string,
		private readonly fetchImpl: typeof fetch = fetch,
	) {}

	async authorizationUrl(login: LoginState, redirectUri: string): Promise<string> {
		const u = new URL(AUTH_ENDPOINT);
		u.searchParams.set("client_id", this.clientId);
		u.searchParams.set("redirect_uri", redirectUri);
		u.searchParams.set("response_type", "code");
		// Solo correo y nombre: no se piden otros permisos.
		u.searchParams.set("scope", "openid email profile");
		u.searchParams.set("state", login.state);
		u.searchParams.set("nonce", login.nonce);
		u.searchParams.set("code_challenge", await sha256Base64Url(login.verifier));
		u.searchParams.set("code_challenge_method", "S256");
		u.searchParams.set("prompt", "select_account");
		return u.toString();
	}

	async exchangeCode(code: string, login: LoginState, redirectUri: string): Promise<AuthIdentity> {
		const res = await this.fetchImpl(TOKEN_ENDPOINT, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: this.clientId,
				client_secret: this.clientSecret,
				redirect_uri: redirectUri,
				grant_type: "authorization_code",
				code_verifier: login.verifier,
			}),
		});
		if (!res.ok) {
			throw new AuthError(`Google token endpoint respondió ${res.status}: ${(await res.text()).slice(0, 300)}`);
		}
		const data = (await res.json()) as { id_token?: unknown };
		if (typeof data.id_token !== "string") throw new AuthError("Google no devolvió id_token");
		return identityFromIdToken(data.id_token, this.clientId, login.nonce);
	}
}

/**
 * Valida los claims del id_token. La firma no se verifica porque el token llega directo del
 * token endpoint de Google por TLS (OpenID Connect Core §3.1.3.7, punto 6).
 */
export function identityFromIdToken(idToken: string, clientId: string, nonce: string, nowMs = Date.now()): AuthIdentity {
	const parts = idToken.split(".");
	const raw = parts.length === 3 ? base64UrlDecode(parts[1]!) : null;
	if (!raw) throw new AuthError("id_token mal formado");
	let claims: Record<string, unknown>;
	try {
		claims = JSON.parse(new TextDecoder().decode(raw)) as Record<string, unknown>;
	} catch {
		throw new AuthError("id_token ilegible");
	}
	if (!ISSUERS.has(String(claims.iss))) throw new AuthError("iss inválido");
	const aud = claims.aud;
	if (!(aud === clientId || (Array.isArray(aud) && aud.includes(clientId)))) throw new AuthError("aud inválido");
	if (typeof claims.exp !== "number" || claims.exp * 1000 < nowMs) throw new AuthError("id_token vencido");
	if (claims.nonce !== nonce) throw new AuthError("nonce inválido");
	if (claims.email_verified !== true && claims.email_verified !== "true") {
		throw new AuthError("correo no verificado", "Tu cuenta de Google no tiene el correo verificado.");
	}
	const email = normalizeEmail(claims.email);
	if (!email) throw new AuthError("id_token sin correo");
	const name = cleanLine(claims.name ?? claims.given_name ?? "", 80) ?? "";
	return { email, name: name || email.split("@")[0]! };
}
