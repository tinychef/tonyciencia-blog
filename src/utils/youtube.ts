// Último video del canal de YouTube de Tony Ciencia, leído del feed RSS público.
// Nunca frena la página: resultado en memoria del isolate (1 h), caché del borde solo para respuestas OK,
// tope de 600 ms y, si falla, el último video conocido (y reintento a los 5 minutos).

const CHANNEL_ID = "UCAsrc2rS1SHu4V1W9gMjnmg";
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@tonyciencia";

export interface LatestVideo {
	id: string;
	title: string;
}

/** Último video conocido al 31-10-2026 (respaldo). */
const FALLBACK: LatestVideo = {
	id: "Ig6JmjY29f8",
	title: "Probé REA con Claude Code 3 días seguidos ¿vale la pena? #ClaudeCode #IA",
};

const OK_TTL_MS = 60 * 60_000;
const RETRY_MS = 5 * 60_000;
const TIMEOUT_MS = 600;

let memo: { video: LatestVideo; until: number } | null = null;

const decode = (s: string) =>
	s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

export async function getLatestVideo(): Promise<LatestVideo> {
	const now = Date.now();
	if (memo && now < memo.until) return memo.video;
	try {
		const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
			// Caché del borde de Cloudflare: guarda solo las respuestas buenas; los errores no se cachean.
			cf: { cacheTtlByStatus: { "200-299": 3600, "300-599": 0 } },
		} as RequestInit);
		if (res.ok) {
			const m = (await res.text()).match(/<entry>[\s\S]*?<yt:videoId>([\w-]{11})<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>/);
			if (m) {
				memo = { video: { id: m[1]!, title: decode(m[2]!) }, until: now + OK_TTL_MS };
				return memo.video;
			}
		}
	} catch {
		/* tiempo agotado o red caída: se usa el respaldo */
	}
	memo = { video: memo?.video ?? FALLBACK, until: now + RETRY_MS };
	return memo.video;
}
