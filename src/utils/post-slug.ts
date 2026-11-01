/**
 * Slug público de un post. Algunos posts en inglés del CMS se guardaron con el slug "en/<slug>"; la URL correcta es
 * /en/posts/<slug> (sin el prefijo), así que los enlaces se arman siempre con este helper.
 */
export function postSlug(id: string): string {
	return id.replace(/^(en|es)\//, "");
}
