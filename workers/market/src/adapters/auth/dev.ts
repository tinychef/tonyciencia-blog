import { signToken, verifyToken } from "../../lib/crypto";
import { normalizeEmail, cleanLine } from "../../lib/validate";
import { AuthError, type AuthIdentity, type AuthProvider, type LoginState } from "../types";

/**
 * Login de MAQUETA. La pantalla /market/auth/dev emite un "code" firmado con la identidad
 * falsa elegida, y el callback lo canjea igual que haría con Google.
 * Solo se instancia con MODE=mock (ver adapters/index.ts).
 */
export class DevAuthProvider implements AuthProvider {
	readonly name = "dev" as const;

	constructor(
		private readonly secret: string,
		private readonly origin: string,
	) {}

	async authorizationUrl(login: LoginState): Promise<string> {
		const u = new URL("/market/auth/dev", this.origin);
		u.searchParams.set("state", login.state);
		return u.toString();
	}

	/** Lo llama el formulario de la pantalla de desarrollo. */
	async issueCode(identity: AuthIdentity, state: string): Promise<string> {
		return signToken(this.secret, "dev-auth-code", {
			email: identity.email,
			name: identity.name,
			state,
			exp: Math.floor(Date.now() / 1000) + 120,
		});
	}

	async exchangeCode(code: string, login: LoginState): Promise<AuthIdentity> {
		const payload = await verifyToken<{ email: string; name: string; state: string }>(this.secret, "dev-auth-code", code);
		if (!payload || payload.state !== login.state) throw new AuthError("code de maqueta inválido o vencido");
		const email = normalizeEmail(payload.email);
		const name = cleanLine(payload.name, 80);
		if (!email || name === null) throw new AuthError("identidad de maqueta inválida");
		return { email, name };
	}
}
