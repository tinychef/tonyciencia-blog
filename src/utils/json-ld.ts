/**
 * JSON seguro para incrustar en <script type="application/ld+json">.
 *
 * JSON.stringify no escapa "<": un título o una pregunta frecuente con "</script><script>…" cerraría el bloque y
 * ejecutaría código en tonyciencia.com, que es el MISMO origen que el market (admin incluido). Se escapan "<", ">",
 * "&" y los separadores U+2028/U+2029 como secuencias \uXXXX: el JSON resultante es idéntico para quien lo lee.
 */
export function jsonLd(value: unknown): string {
	return JSON.stringify(value)
		.replace(/</g, "\\u003c")
		.replace(/>/g, "\\u003e")
		.replace(/&/g, "\\u0026")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
}
