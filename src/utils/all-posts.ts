/**
 * Todos los artículos publicados de un idioma: los del CMS (D1) y los de content/posts/{es,en}/*.json que se
 * sirven con el respaldo estático. Si un slug está en los dos, manda el CMS. Excluye los duplicados redirigidos
 * (post-redirects.ts) y los de fecha futura.
 *
 * Antes el RSS y el buscador solo leían el CMS: los artículos que viven en JSON no aparecían (auditoría 2026-11-03,
 * p. ej. /search?q=citable sin resultados y /rss.xml con 13 de 37).
 */
import { getEmDashCollection } from "emdash";
import { postSlug } from "./post-slug";
import { POST_REDIRECTS } from "./post-redirects";
import { getStaticPosts } from "./static-posts";

export type AnyPost = { id: string; data: Record<string, any> };

export async function getAllPosts(lang: "es" | "en", now = Date.now()): Promise<AnyPost[]> {
	const out = new Map<string, AnyPost>();
	for (const p of getStaticPosts(lang) as unknown as AnyPost[]) out.set(postSlug(p.id), { ...p, id: postSlug(p.id) });
	try {
		const { entries } = await getEmDashCollection("posts", { orderBy: { published_at: "desc" }, limit: 1000, locale: lang });
		for (const e of entries as unknown as AnyPost[]) {
			// Con locale "es" EmDash también devuelve artículos sin idioma guardado (los de WordPress); los en inglés no van.
			if (lang === "es" && e.data.locale === "en") continue;
			if (lang === "en" && (e.data.locale ?? "en") !== "en") continue;
			const slug = postSlug(e.id);
			out.set(slug, { ...e, id: slug });
		}
	} catch {
		// Si el CMS no responde, salen los artículos estáticos.
	}
	return [...out.values()]
		.filter((p) => {
			const at: Date | undefined = p.data.publishedAt;
			return at instanceof Date && !Number.isNaN(at.getTime()) && at.getTime() <= now && !POST_REDIRECTS[lang][p.id];
		})
		.sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());
}
