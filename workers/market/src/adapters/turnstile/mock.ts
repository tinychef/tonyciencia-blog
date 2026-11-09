import type { TurnstileResult, TurnstileVerifier } from "../types";
import { isTokenShape } from "./token";

/** Token que la maqueta rechaza (para probar el camino de fallo). */
export const MOCK_TURNSTILE_FAIL = "maqueta-falla";

/**
 * Turnstile de MAQUETA: no llama a Cloudflare. Exige que llegue un token (como en producción) y acepta cualquiera
 * salvo MOCK_TURNSTILE_FAIL, así el widget real en localhost también funciona con `pnpm dev`.
 */
export class MockTurnstileVerifier implements TurnstileVerifier {
	readonly name = "mock" as const;

	async verify(token: unknown): Promise<TurnstileResult> {
		if (!isTokenShape(token)) return { ok: false, reason: "missing-input-response" };
		if (token === MOCK_TURNSTILE_FAIL) return { ok: false, reason: "invalid-input-response" };
		return { ok: true };
	}
}
