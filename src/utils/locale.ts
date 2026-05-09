/**
 * EmDash stores `locale` as a system-level entry property (alongside id, slug, status)
 * but it is not included in the generated collection types. This helper extracts it
 * safely at runtime via a generic record cast.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEntryLocale(entry: any): string | undefined {
	return typeof entry?.locale === "string" ? entry.locale : undefined;
}
