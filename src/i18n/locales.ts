/**
 * i18n — Locale helpers for Tony Ciencia bilingual site
 */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

const EXACT_ROUTE_MAP = new Map<string, string>([
	["/", "/en"],
	["/about", "/en/about"],
	["/automatizacion", "/en/automation"],
	["/contacto", "/en/contact"],
	["/servicios", "/en/services"],
	["/recursos-ia", "/en/resources"],
	["/legal/privacidad", "/en/legal/privacy"],
	["/legal/terminos", "/en/legal/terms"],
	["/legal/cookies", "/en/legal/cookies-en"],
	["/legal/aviso-legal", "/en/legal/disclaimer"],
	["/legal/afiliados", "/en/legal/affiliate"],
	["/legal/descargo", "/en/legal/general-disclaimer"],
]);

const PREFIX_ROUTE_MAP = new Map<string, string>([
	["/posts", "/en/posts"],
	["/category", "/en/category"],
	["/tag", "/en/tag"],
	["/search", "/en/search"],
	["/inteligencia-artificial", "/en/inteligencia-artificial"],
	["/marketing-digital", "/en/marketing-digital"],
]);

/** Extract locale from a URL pathname. */
export function getLangFromUrl(url: URL): Locale {
	const seg = url.pathname.split("/")[1];
	if (seg === "en") return "en";
	return "es";
}

/** Get the alternate locale. */
export function getAlternateLocale(locale: Locale): Locale {
	return locale === "es" ? "en" : "es";
}

function trimTrailingSlash(pathname: string): string {
	if (pathname.length > 1 && pathname.endsWith("/")) {
		return pathname.slice(0, -1);
	}
	return pathname;
}

function reversePathMap(pathMap: Map<string, string>) {
	return new Map(Array.from(pathMap.entries(), ([from, to]) => [to, from]));
}

const REVERSE_EXACT_ROUTE_MAP = reversePathMap(EXACT_ROUTE_MAP);
const REVERSE_PREFIX_ROUTE_MAP = reversePathMap(PREFIX_ROUTE_MAP);

/** Build a path for a given locale, mirroring the current path. */
export function getLocalePath(pathname: string, targetLocale: Locale): string {
	const normalized = trimTrailingSlash(pathname || "/");

	if (targetLocale === "en") {
		if (EXACT_ROUTE_MAP.has(normalized)) return EXACT_ROUTE_MAP.get(normalized)!;

		for (const [from, to] of PREFIX_ROUTE_MAP) {
			if (normalized === from || normalized.startsWith(`${from}/`)) {
				return normalized.replace(from, to);
			}
		}
	}

	if (targetLocale === "es") {
		if (REVERSE_EXACT_ROUTE_MAP.has(normalized)) return REVERSE_EXACT_ROUTE_MAP.get(normalized)!;

		for (const [from, to] of REVERSE_PREFIX_ROUTE_MAP) {
			if (normalized === from || normalized.startsWith(`${from}/`)) {
				return normalized.replace(from, to);
			}
		}
	}

	const stripped = normalized.replace(/^\/en(\/|$)/, "/");

	if (targetLocale === "en") {
		return `/en${stripped === "/" ? "" : stripped}`;
	}
	return stripped || "/";
}

/** Get the menu name for a locale. */
export function getMenuName(locale: Locale): string {
	return locale === "es" ? "primary_es" : "primary_en";
}

/** Get the footer legal menu name for a locale. */
export function getLegalMenuName(locale: Locale): string {
	return locale === "es" ? "footer_legal_es" : "footer_legal_en";
}

import es from "./es";
import en from "./en";

type TranslationDict = Record<keyof typeof es, string>;

const dictionaries: Record<Locale, TranslationDict> = { es, en };

/** Get a translation function for a given locale. */
export function useTranslations(locale: Locale) {
	const dict = dictionaries[locale];
	return function t(key: keyof typeof es): string {
		if (dict[key]) return dict[key];
		if (es[key]) {
			if (import.meta.env.DEV) console.warn(`[i18n] Missing "${String(key)}" for locale "${locale}", falling back to ES`);
			return es[key];
		}
		if (import.meta.env.DEV) console.warn(`[i18n] Missing translation key: "${String(key)}"`);
		return key;
	};
}
