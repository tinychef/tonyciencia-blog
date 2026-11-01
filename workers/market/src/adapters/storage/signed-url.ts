import { signToken, verifyToken } from "../../lib/crypto";

/**
 * URL de descarga firmada por el propio Worker: /market/archivo/<token>.
 * El token (HMAC con SESSION_SECRET, propósito "file") fija la clave, el nombre, el modo, el
 * vencimiento y la CUENTA que la pidió (`u`): /market/archivo solo entrega el archivo si la sesión
 * del navegador es de esa misma cuenta, así que copiar o reenviar la URL no sirve a nadie más.
 * El bucket sigue privado: el Worker lee del binding y transmite el archivo.
 */
export interface FileTokenPayload extends Record<string, unknown> {
	k: string;
	f: string;
	m: "mock" | "live";
	u: string;
	exp: number;
}

export async function createWorkerSignedUrl(
	secret: string,
	origin: string,
	mode: "mock" | "live",
	key: string,
	fileName: string,
	ttlSeconds: number,
	userId: string,
): Promise<string> {
	const token = await signToken(secret, "file", {
		k: key,
		f: fileName,
		m: mode,
		u: userId,
		exp: Math.floor(Date.now() / 1000) + ttlSeconds,
	} satisfies FileTokenPayload);
	return new URL(`/market/archivo/${token}`, origin).toString();
}

export async function verifyFileToken(secret: string, token: string): Promise<FileTokenPayload | null> {
	const payload = await verifyToken<FileTokenPayload>(secret, "file", token);
	// Los tokens sin cuenta (anteriores a este cambio) ya no valen.
	return payload && typeof payload.u === "string" && payload.u.length > 0 ? payload : null;
}
