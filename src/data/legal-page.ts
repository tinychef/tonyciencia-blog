import { getEmDashEntry, decodeSlug } from "emdash";
import type { AstroGlobal } from "astro";
import { getLegalDoc, type LegalDoc } from "./legal";

export type LegalResolution =
	| { kind: "redirect" }
	| { kind: "page"; slug: string; doc?: LegalDoc; cmsPage?: any };

/** Repo (src/data/legal.ts) primero; EmDash/D1 solo para slugs que no estén ahí. */
export async function resolveLegalPage(Astro: AstroGlobal, locale: "es" | "en"): Promise<LegalResolution> {
	const slug = decodeSlug(Astro.params.slug);
	if (!slug) return { kind: "redirect" };

	const doc = getLegalDoc(slug, locale);
	if (doc) {
		Astro.cache.set({ maxAge: 3600 });
		return { kind: "page", slug, doc };
	}

	const { entry, cacheHint } = await getEmDashEntry("legal_pages", slug);
	if (!entry) return { kind: "redirect" };
	Astro.cache.set(cacheHint);
	return { kind: "page", slug, cmsPage: entry };
}
