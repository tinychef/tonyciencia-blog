import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
	site: "https://tonyciencia.com",
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	i18n: {
		defaultLocale: "es",
		locales: ["es", "en"],
		routing: {
			prefixDefaultLocale: false,
		},
	},
	integrations: [
		react(),
		sitemap({
			// Una URL por página: sin barra final (la portada inglesa es /en/) y sin el buscador, que robots.txt bloquea.
			filter: (page) => !/\/(en\/)?(search|category|tag)\/?$/.test(page),
			serialize: (item) => {
				const u = new URL(item.url);
				if (u.pathname !== "/" && u.pathname !== "/en/") u.pathname = u.pathname.replace(/\/+$/, "");
				item.url = u.href;
				for (const link of item.links ?? []) {
					const l = new URL(link.url);
					if (l.pathname !== "/" && l.pathname !== "/en/") l.pathname = l.pathname.replace(/\/+$/, "");
					link.url = l.href;
				}
				return item;
			},
			i18n: {
				defaultLocale: "es",
				locales: {
					es: "es",
					en: "en",
				},
			},
		}),
	],
	fonts: [
		{
			provider: fontProviders.google(),
			name: "Inter",
			cssVariable: "--font-sans",
			weights: [400, 500, 600, 700],
			fallbacks: ["sans-serif"],
		},
		{
			provider: fontProviders.google(),
			name: "JetBrains Mono",
			cssVariable: "--font-mono",
			weights: [500],
			fallbacks: ["monospace"],
		},
	],
	devToolbar: { enabled: false },
});
