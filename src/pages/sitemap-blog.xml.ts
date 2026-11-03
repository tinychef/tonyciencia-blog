/**
 * Sitemap de TODOS los artículos del blog (español e inglés), con sus traducciones enlazadas por hreflang.
 *
 * Por qué existe: el sitemap del CMS (/sitemap-posts.xml) solo lista los posts que están en D1. Los que se publican
 * desde content/posts/**.json y se sirven con el respaldo estático (src/utils/static-posts.ts) quedaban fuera: el
 * 2026-11-01 faltaban 15 artículos publicados. Este sitemap une las dos fuentes (D1 manda si el slug está en ambas).
 * Declarado en public/robots.txt.
 */
import type { APIRoute } from "astro";
import { getEmDashCollection } from "emdash";
import { postSlug } from "../utils/post-slug";
import { getStaticPosts } from "../utils/static-posts";
import { POST_REDIRECTS } from "../utils/post-redirects";

type Lang = "es" | "en";
interface Item {
	slug: string;
	lang: Lang;
	lastmod: Date;
	/** Slug del post en español del que este es traducción (solo en inglés). */
	translationOf?: string;
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pathFor = (lang: Lang, slug: string) => (lang === "en" ? `/en/posts/${slug}` : `/posts/${slug}`);

async function collect(lang: Lang, now: number): Promise<Map<string, Item>> {
	const out = new Map<string, Item>();
	// Respaldo estático primero; D1 lo pisa si el mismo slug también está en la base.
	for (const p of getStaticPosts(lang)) {
		const at = p.data.publishedAt;
		if (!(at instanceof Date) || Number.isNaN(at.getTime()) || at.getTime() > now) continue;
		out.set(p.id, { slug: p.id, lang, lastmod: p.data.updatedAt ?? at, translationOf: p.data.translation_of || undefined });
	}
	try {
		const { entries } = await getEmDashCollection("posts", { orderBy: { published_at: "desc" }, limit: 1000, locale: lang });
		for (const e of entries) {
			const at: Date | undefined = e.data.publishedAt;
			if (!at || at.getTime() > now) continue;
			const slug = postSlug(e.id);
			const updated: Date | undefined = e.data.updatedAt;
			out.set(slug, {
				slug,
				lang,
				lastmod: updated && updated.getTime() <= now ? updated : at,
				translationOf: (e.data as { translation_of?: string }).translation_of || out.get(slug)?.translationOf,
			});
		}
	} catch {
		// Si el CMS no responde, el sitemap sale igual con los posts estáticos.
	}
	for (const slug of Object.keys(POST_REDIRECTS[lang])) out.delete(slug);
	return out;
}

export const GET: APIRoute = async ({ site, url }) => {
	const origin = (site?.toString() || url.origin).replace(/\/$/, "");
	const now = Date.now();
	const [es, en] = await Promise.all([collect("es", now), collect("en", now)]);

	// Pares de traducción: un post en inglés con translation_of = slug de un post en español publicado.
	const enOf = new Map<string, string>();
	for (const p of en.values()) if (p.translationOf && es.has(p.translationOf)) enOf.set(p.translationOf, p.slug);

	const alternates = (esSlug: string, enSlug: string) =>
		[
			`<xhtml:link rel="alternate" hreflang="es" href="${xml(origin + pathFor("es", esSlug))}"/>`,
			`<xhtml:link rel="alternate" hreflang="en" href="${xml(origin + pathFor("en", enSlug))}"/>`,
			`<xhtml:link rel="alternate" hreflang="x-default" href="${xml(origin + pathFor("es", esSlug))}"/>`,
		].join("");

	const urls: string[] = [];
	for (const p of [...es.values(), ...en.values()].sort((a, b) => b.lastmod.getTime() - a.lastmod.getTime())) {
		let alt = "";
		if (p.lang === "es" && enOf.has(p.slug)) alt = alternates(p.slug, enOf.get(p.slug)!);
		if (p.lang === "en" && p.translationOf && enOf.get(p.translationOf) === p.slug) alt = alternates(p.translationOf, p.slug);
		urls.push(`<url><loc>${xml(origin + pathFor(p.lang, p.slug))}</loc><lastmod>${p.lastmod.toISOString().slice(0, 10)}</lastmod>${alt}</url>`);
	}

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>`;
	return new Response(body, {
		headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
	});
};
