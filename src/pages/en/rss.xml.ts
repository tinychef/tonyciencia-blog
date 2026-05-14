import type { APIRoute } from "astro";
import { getEmDashCollection, getEntryTerms, getSiteSettings } from "emdash";
import { resolveBlogSiteIdentity } from "../../utils/site-identity";

export const GET: APIRoute = async ({ url }) => {
	const siteUrl = url.origin;
	const { siteTitle, siteTagline } = resolveBlogSiteIdentity(await getSiteSettings());

	const { entries: posts } = await getEmDashCollection("posts", {
		orderBy: { published_at: "desc" },
		limit: 20,
		locale: "en",
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
			const postUrl = `${siteUrl}/en/posts/${post.id}`;
			const categoryTags = categories
				.map((c) => `      <category>${escapeXml(c.label)}</category>`)
				.join("\n");
			const authorTag = bylines.length > 0
				? `      <dc:creator>${escapeXml(bylines[0].byline.displayName)}</dc:creator>`
				: `      <dc:creator>Tony Ciencia</dc:creator>`;

			return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${post.data.publishedAt!.toUTCString()}</pubDate>
      <description>${escapeXml(post.data.excerpt || "")}</description>
${authorTag}
${categoryTags}
    </item>`;
		})
		.join("\n");

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <description>${escapeXml(siteTagline)}</description>
    <link>${siteUrl}/en</link>
    <atom:link href="${siteUrl}/en/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`,
		{
			headers: {
				"Content-Type": "application/rss+xml; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			},
		},
	);
};

function escapeXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
