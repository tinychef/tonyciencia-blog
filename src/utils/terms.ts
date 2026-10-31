import { getStaticTags } from "./static-posts";

type TermLike = { slug: string; label?: string | null };

/**
 * Términos de un post SIN consultar D1: getEmDashCollection/getEmDashEntry ya los traen en `data.terms`
 * (una sola consulta en lote). Antes se llamaba getEntryTerms por cada post (N+1 consultas).
 */
export function postTerms(post: any, taxonomy: "tag" | "category"): Array<{ slug: string; label: string }> {
	const terms = (post?.data?.terms?.[taxonomy] ?? []) as TermLike[];
	return terms.map((t) => ({ slug: t.slug, label: t.label || t.slug }));
}

/** Etiquetas de un post: las de content/ (posts estáticos) o las del CMS. */
export function postTags(post: any): Array<{ slug: string; label: string }> {
	const fromStatic = getStaticTags(post);
	return fromStatic.length > 0 ? fromStatic : postTerms(post, "tag");
}
