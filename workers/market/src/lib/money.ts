/** 7700 → "$77 USD"; 7750 → "$77.50 USD". */
export function formatPrice(cents: number, currency = "usd"): string {
	const whole = cents % 100 === 0;
	const n = (cents / 100).toLocaleString("en-US", {
		minimumFractionDigits: whole ? 0 : 2,
		maximumFractionDigits: 2,
	});
	return `$${n} ${currency.toUpperCase()}`;
}

/** 7750 → "77.50" (para inputs del admin). */
export function centsToInput(cents: number): string {
	return (cents / 100).toFixed(2);
}
