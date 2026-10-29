/** "Tony Ciencia <market@tonyciencia.com>" → { email, name } o solo el correo si no hay nombre. */
export function parseAddress(raw: string): { email: string; name: string } | string {
	const m = raw.match(/^\s*(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>\s*$/);
	if (m) {
		const name = m[1]!.replace(/^"|"$/g, "").trim();
		return name ? { email: m[2]!, name } : m[2]!;
	}
	return raw.trim();
}
