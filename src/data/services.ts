// Servicios (ES) que muestra la home. Cada uno vive en su propio sitio.

export interface Service {
	id: string;
	name: string;
	/** Una línea: qué resuelve. */
	summary: string;
	href: string;
}

export const services: Service[] = [
	{
		id: "ads-performance",
		name: "ADS Performance",
		summary: "Pauta en Meta, Google y TikTok con agente de IA y CRM.",
		href: "https://adsperformance.tonyciencia.com",
	},
	{
		id: "merkhify",
		name: "Merkhify",
		summary: "Agente de ventas con IA en WhatsApp, 24/7.",
		href: "https://merkhify.com",
	},
	{
		id: "anuncios-infinitos",
		name: "Anuncios Infinitos",
		summary: "Estrategia y creativos para tus anuncios, generados con IA.",
		href: "https://adsinfinitos.tonyciencia.com",
	},
];
