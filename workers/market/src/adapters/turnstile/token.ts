/** Un token de Turnstile válido es texto de 1 a 2048 caracteres (límite de Cloudflare). */
export function isTokenShape(token: unknown): token is string {
	return typeof token === "string" && token.length > 0 && token.length <= 2048;
}
