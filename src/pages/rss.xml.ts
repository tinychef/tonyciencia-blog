import type { APIRoute } from "astro";
import { getEmDashCollection, getEntryTerms, getSiteSettings } from "emdash";

import { resolveBlogSiteIdentity } from "../utils/site-identity";

export const GET: APIRoute = async ({ site, url }) => {
	const siteUrl = site?.toString() || url.origin;
	const { siteTitle, siteTagline } = resolveBlogSiteIdentity(await getSiteSettings());

	const { entries: posts } = await getEmDashCollection("posts", {
		orderBy: { published_at: "desc" },
		limit: 20,
		locale: "es",
	});

	const itemsWithMeta = await Promise.all(
		posts
			.filter((p) => p.data.publishedAt)
			.map(async (post) => {
				const categories = await getEntryTerms("posts", post.data.id, "category");
				const bylines: Array<{ byline: { displayName: string } }> = post.data.bylines ?? [];
				return { post, categories, bylines };
			})
	);

	const items = itemsWithMeta
		.map(({ post, categories, bylines }) => {
			const pubDate = post.data.publishedAt!.toUTCString();
			const postUrl = `${siteUrl}/posts/${post.id}`;
			const title = escapeXml(post.data.title || "Untitled");
			const description = escapeXml(post.data.excerpt || "");

			const categoryTags = categories
				.map((c) => `      <category>${escapeXml(c.label)}</category>`)
				.join("\n");

			const authorTag = bylines.length > 0
				? `      <dc:creator>${escapeXml(bylines[0].byline.displayName)}</dc:creator>`
				: `      <dc:creator>Tony Ciencia</dc:creator>`;

			return `    <item>
      <title>${title}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
${authorTag}
${categoryTags}
    </item>`;
		})
		.join("\n");

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <description>${escapeXml(siteTagline)}</description>
    <link>${siteUrl}</link>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <language>es</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

	return new Response(rss, {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600",
		},
	});
};

const XML_ESCAPE_PATTERNS = [
	[/&/g, "&amp;"],
	[/</g, "&lt;"],
	[/>/g, "&gt;"],
	[/"/g, "&quot;"],
	[/'/g, "&apos;"],
] as const;

function escapeXml(str: string): string {
	let result = str;
	for (const [pattern, replacement] of XML_ESCAPE_PATTERNS) {
		result = result.replace(pattern, replacement);
	}
	return result;
}
