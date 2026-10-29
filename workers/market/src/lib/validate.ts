/** Validación de todo lo que llega del navegador. Nada se usa sin pasar por aquí. */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isSlug(v: unknown): v is string {
	return typeof v === "string" && v.length >= 1 && v.length <= 80 && SLUG_RE.test(v);
}

export function isId(v: unknown): v is string {
	return typeof v === "string" && UUID_RE.test(v);
}

export function normalizeEmail(v: unknown): string | null {
	if (typeof v !== "string") return null;
	const e = v.trim().toLowerCase();
	if (e.length > 254 || !EMAIL_RE.test(e)) return null;
	return e;
}

/** Texto plano de una sola línea, sin caracteres de control. */
export function cleanLine(v: unknown, max: number): string | null {
	if (typeof v !== "string") return null;
	const s = v.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
	if (s.length > max) return null;
	return s;
}

/** Texto multilínea (descripciones). Conserva saltos de línea, quita otros controles. */
export function cleanText(v: unknown, max: number): string | null {
	if (typeof v !== "string") return null;
	const s = v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim();
	if (s.length > max) return null;
	return s;
}

/** "77", "77.5", "77.50" → 7750 centavos. Rechaza negativos, comas y notación científica. */
export function parseUsdToCents(v: unknown): number | null {
	if (typeof v !== "string") return null;
	const s = v.trim();
	if (!/^\d{1,5}(\.\d{1,2})?$/.test(s)) return null;
	const [whole, frac = ""] = s.split(".");
	return Number.parseInt(whole!, 10) * 100 + Number.parseInt(frac.padEnd(2, "0") || "0", 10);
}

export function parseIntInRange(v: unknown, min: number, max: number): number | null {
	if (typeof v !== "string" && typeof v !== "number") return null;
	const s = String(v).trim();
	if (!/^-?\d{1,7}$/.test(s)) return null;
	const n = Number.parseInt(s, 10);
	return n >= min && n <= max ? n : null;
}

/**
 * Destino de redirección tras login: solo rutas internas del market.
 * Evita redirecciones abiertas (`//evil.com`, `https://…`, `/\evil`).
 */
export function safeNextPath(v: unknown, fallback = "/market"): string {
	if (typeof v !== "string" || v.length > 300) return fallback;
	if (!(v === "/market" || v.startsWith("/market/") || v.startsWith("/market?"))) return fallback;
	if (v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return fallback;
	try {
		const u = new URL(v, "https://x.invalid");
		if (u.origin !== "https://x.invalid") return fallback;
		return u.pathname + u.search;
	} catch {
		return fallback;
	}
}

/** Nombre de archivo seguro para Content-Disposition y claves de almacenamiento. */
export function safeFileName(v: unknown, fallback = "descarga.bin"): string {
	if (typeof v !== "string") return fallback;
	const base = v.split(/[\\/]/).pop() ?? "";
	const clean = base
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^A-Za-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/^\.+/, "")
		.slice(0, 120);
	return clean || fallback;
}
