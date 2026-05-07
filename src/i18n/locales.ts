/**
 * i18n — Locale helpers for Tony Ciencia bilingual site
 */

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";

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

/** Build a path for a given locale, mirroring the current path. */
export function getLocalePath(pathname: string, targetLocale: Locale): string {
	// Strip current /en/ prefix if present
	const stripped = pathname.replace(/^\/en(\/|$)/, "/");

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

const dictionaries: Record<Locale, typeof es> = { es, en };

/** Get a translation function for a given locale. */
export function useTranslations(locale: Locale) {
	const dict = dictionaries[locale];
	return function t(key: keyof typeof es): string {
		return dict[key] || es[key] || key;
	};
}
