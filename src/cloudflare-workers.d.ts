// Tipos mínimos del módulo del runtime de Cloudflare (los bindings se tipan donde se usan: src/pages/api/contacto.ts).
declare module "cloudflare:workers" {
	export const env: Record<string, unknown>;
}
