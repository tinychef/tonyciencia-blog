import type { TurnstileResult, TurnstileVerifier } from "../types";
import { isTokenShape } from "./token";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
	success?: boolean;
	action?: string;
	hostname?: string;
	"error-codes"?: string[];
}

/**
 * Siteverify real de Cloudflare Turnstile. Falla cerrado: si Cloudflare no responde, responde mal, o el token es de
 * otra acción u otro sitio, el formulario no pasa. Los tokens son de un solo uso (un reenvío del mismo token falla).
 */
export class CloudflareTurnstileVerifier implements TurnstileVerifier {
	readonly name = "cloudflare" as const;

	constructor(
		private readonly secret: string,
		private readonly hostnames: ReadonlySet<string>,
	) {}

	async verify(token: unknown, expectedAction: string, remoteIp: string | null): Promise<TurnstileResult> {
		if (!isTokenShape(token)) return { ok: false, reason: "missing-input-response" };
		if (this.hostnames.size === 0) return { ok: false, reason: "no-hostnames" };
		const body = new URLSearchParams({ secret: this.secret, response: token });
		if (remoteIp) body.set("remoteip", remoteIp);
		let result: SiteverifyResponse;
		try {
			const res = await fetch(SITEVERIFY_URL, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body,
				signal: AbortSignal.timeout(10_000),
			});
			if (!res.ok) return { ok: false, reason: `siteverify-http-${res.status}` };
			result = (await res.json()) as SiteverifyResponse;
		} catch {
			return { ok: false, reason: "siteverify-unreachable" };
		}
		if (result.success !== true) return { ok: false, reason: (result["error-codes"] ?? []).join(",") || "not-success" };
		if (result.action !== expectedAction) return { ok: false, reason: "action-mismatch" };
		if (!result.hostname || !this.hostnames.has(result.hostname)) return { ok: false, reason: "hostname-mismatch" };
		return { ok: true };
	}
}
