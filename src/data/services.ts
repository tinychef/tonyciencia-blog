// Servicios de Tony Ciencia. Cada uno vive en su propio sitio; la home los
// resume en una línea y /servicios (/en/services) los presenta completos.

type Locale = "es" | "en";
type Localized<T> = Record<Locale, T>;

export interface Service {
	id: string;
	name: string;
	href: string;
	/** Una línea: qué resuelve. Home. */
	summary: Localized<string>;
	/** Para quién es. /servicios */
	audience: Localized<string>;
	/** Qué incluye, en frases cortas. /servicios */
	includes: Localized<string[]>;
	cta: Localized<string>;
}

export const services: Service[] = [
	{
		id: "ads-performance",
		name: "ADS Performance",
		href: "https://adsperformance.tonyciencia.com",
		summary: {
			es: "Pauta en Meta, Google y TikTok con agente de IA y CRM.",
			en: "Meta, Google and TikTok ads with an AI agent and CRM.",
		},
		audience: {
			es: "Empresas B2B y e-commerce que quieren más clientes, no más clics.",
			en: "B2B and e-commerce companies that want more customers, not more clicks.",
		},
		includes: {
			es: [
				"Pauta omnicanal en Meta, Google y TikTok",
				"Tracking server-side con Conversions API",
				"CRM HighLevel con pipelines y seguimiento automático",
				"Estrategia de crecimiento a 6 meses",
			],
			en: [
				"Omnichannel ads on Meta, Google and TikTok",
				"Server-side tracking with Conversions API",
				"HighLevel CRM with pipelines and automated follow-up",
				"6-month growth strategy",
			],
		},
		cta: { es: "Cotizar mi sistema", en: "Get a quote" },
	},
	{
		id: "merkhify",
		name: "Merkhify",
		href: "https://merkhify.com",
		summary: {
			es: "Agente de ventas con IA en WhatsApp, 24/7.",
			en: "AI sales agent on WhatsApp, 24/7.",
		},
		audience: {
			es: "Negocios que reciben mensajes todo el día y no pueden responder a tiempo.",
			en: "Businesses that get messages all day and can't reply in time.",
		},
		includes: {
			es: [
				"Responde en WhatsApp, Instagram y Messenger",
				"Entiende audios, fotos y documentos",
				"Califica, agenda y vende por ti",
				"Conectado a tu HighLevel",
			],
			en: [
				"Replies on WhatsApp, Instagram and Messenger",
				"Understands voice notes, photos and documents",
				"Qualifies, books and sells for you",
				"Connected to your HighLevel",
			],
		},
		cta: { es: "Conocer Merkhify", en: "Discover Merkhify" },
	},
	{
		id: "anuncios-infinitos",
		name: "Anuncios Infinitos",
		href: "https://adsinfinitos.tonyciencia.com",
		summary: {
			es: "Estrategia y creativos para tus anuncios, generados con IA.",
			en: "Ad strategy and creatives, generated with AI.",
		},
		audience: {
			es: "Marcas y equipos que necesitan campañas nuevas en minutos.",
			en: "Brands and teams that need new campaigns in minutes.",
		},
		includes: {
			es: [
				"Análisis de tu marca y tu competencia",
				"Estrategia para Meta, Google, TikTok y más",
				"Creativos y copys listos para lanzar",
			],
			en: [
				"Analysis of your brand and competitors",
				"Strategy for Meta, Google, TikTok and more",
				"Launch-ready creatives and copy",
			],
		},
		cta: { es: "Probar Anuncios Infinitos", en: "Try Anuncios Infinitos" },
	},
];
