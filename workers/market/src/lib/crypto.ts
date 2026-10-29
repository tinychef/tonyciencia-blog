const enc = new TextEncoder();
const dec = new TextDecoder();

export function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
	const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	let out = "";
	for (const b of u8) out += b.toString(16).padStart(2, "0");
	return out;
}

export function base64UrlEncode(input: ArrayBuffer | Uint8Array | string): string {
	const u8 = typeof input === "string" ? enc.encode(input) : input instanceof Uint8Array ? input : new Uint8Array(input);
	let bin = "";
	for (const b of u8) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(input: string): Uint8Array | null {
	if (!/^[A-Za-z0-9_-]*$/.test(input)) return null;
	const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
	try {
		const bin = atob(b64);
		const out = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
		return out;
	} catch {
		return null;
	}
}

export function randomToken(bytes = 32): string {
	const buf = new Uint8Array(bytes);
	crypto.getRandomValues(buf);
	return base64UrlEncode(buf);
}

export async function sha256Hex(data: string | Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", typeof data === "string" ? enc.encode(data) : data);
	return bytesToHex(digest);
}

export async function sha256Base64Url(data: string): Promise<string> {
	return base64UrlEncode(await crypto.subtle.digest("SHA-256", enc.encode(data)));
}

export async function hmacSha256(key: string | Uint8Array, data: string): Promise<Uint8Array> {
	const k = await crypto.subtle.importKey(
		"raw",
		typeof key === "string" ? enc.encode(key) : key,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	return new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** Comparación en tiempo constante (no filtra cuántos caracteres coinciden). */
export function timingSafeEqualStr(a: string, b: string): boolean {
	const ab = enc.encode(a);
	const bb = enc.encode(b);
	if (ab.length !== bb.length) return false;
	const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual?: (a: ArrayBufferView, b: ArrayBufferView) => boolean };
	if (typeof subtle.timingSafeEqual === "function") return subtle.timingSafeEqual(ab, bb);
	let diff = 0;
	for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
	return diff === 0;
}

/**
 * Token firmado con HMAC y propósito: `base64url(json).base64url(hmac)`.
 * El propósito evita que un token de un uso (p. ej. descarga) sirva para otro (p. ej. sesión).
 */
export async function signToken(secret: string, purpose: string, payload: Record<string, unknown>): Promise<string> {
	const body = base64UrlEncode(JSON.stringify(payload));
	const sig = base64UrlEncode(await hmacSha256(secret, `${purpose}.${body}`));
	return `${body}.${sig}`;
}

/** Devuelve el payload si la firma es válida y `exp` (segundos Unix) no pasó; si no, null. */
export async function verifyToken<T extends object>(
	secret: string,
	purpose: string,
	token: string,
	nowMs = Date.now(),
): Promise<T | null> {
	if (typeof token !== "string" || token.length > 4096) return null;
	const parts = token.split(".");
	if (parts.length !== 2) return null;
	const [body, sig] = parts as [string, string];
	const expected = base64UrlEncode(await hmacSha256(secret, `${purpose}.${body}`));
	if (!timingSafeEqualStr(expected, sig)) return null;
	const raw = base64UrlDecode(body);
	if (!raw) return null;
	let payload: unknown;
	try {
		payload = JSON.parse(dec.decode(raw));
	} catch {
		return null;
	}
	if (!payload || typeof payload !== "object") return null;
	const exp = (payload as { exp?: unknown }).exp;
	if (typeof exp !== "number" || exp * 1000 < nowMs) return null;
	return payload as T;
}
