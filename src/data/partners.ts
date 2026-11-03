/**
 * Socios que se MUESTRAN en el sitio (portada y /herramientas). La base completa se genera en partners.generated.ts
 * (no se edita a mano); aquí se ocultan los enlaces comprobados como muertos y se limpian los nombres legales.
 * PortableTextLink sigue usando la base completa para marcar enlaces de afiliado dentro de los artículos.
 */
import { partners as all, type Partner } from "./partners.generated";

export type { Partner };

/** Enlaces de afiliado que fallaban el 2026-11-03 (auditoría QA). Se vuelven a mostrar al reemplazarlos en la base. */
const DEAD_LINKS = new Set([
	"https://try.lindy.ai/gkd3o3sgd7d2", // «Link Not Found» en Dub
	"https://partners.dryground.ai/vqh9n364qwmn", // el dominio no existe
	"https://logomeai.partnerlinks.io/wkor99fg7w1n", // termina en 404
	"https://www.awin1.com/awclick.php?mid=117365&id=2061927", // Hostinger CL: programa cerrado en Awin
]);

/** «Miro - Affiliate», «n8n GmbH», «AiSDR, Inc.» → «Miro», «n8n», «AiSDR». */
export function displayName(name: string): string {
	return name
		.replace(/\s*[-–]\s*Affiliate\s*$/i, "")
		.replace(/,?\s+(Inc\.?|GmbH|LLC|Ltd\.?|S\.?A\.?S?\.?|SL)\s*$/i, "")
		.trim();
}

export const partners: Partner[] = all.filter((p) => !DEAD_LINKS.has(p.affiliateLink)).map((p) => ({ ...p, name: displayName(p.name) }));
