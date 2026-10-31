// Último video del canal de YouTube de Tony Ciencia, leído del feed RSS público.
// Si YouTube tarda o falla, se usa el último video conocido: la página nunca se rompe por esto.

const CHANNEL_ID = "UCAsrc2rS1SHu4V1W9gMjnmg";
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@tonyciencia";

export interface LatestVideo {
	id: string;
	title: string;
}

/** Último video conocido al 31-10-2026 (respaldo). */
const FALLBACK: LatestVideo = {
	id: "iuQqYMeg47o",
	title: "Cómo Conectar STREAK a CLAUDE | Tutorial + Prompts Avanzados",
};

const decode = (s: string) =>
	s
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

export async function getLatestVideo(): Promise<LatestVideo> {
	try {
		const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, {
			signal: AbortSignal.timeout(1500),
			// Caché del borde de Cloudflare: como mucho una consulta por hora.
			cf: { cacheTtl: 3600, cacheEverything: true },
		} as RequestInit);
		if (!res.ok) return FALLBACK;
		const xml = await res.text();
		const m = xml.match(/<entry>[\s\S]*?<yt:videoId>([\w-]{11})<\/yt:videoId>[\s\S]*?<title>([^<]+)<\/title>/);
		return m ? { id: m[1]!, title: decode(m[2]!) } : FALLBACK;
	} catch {
		return FALLBACK;
	}
}
