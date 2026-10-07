// Catálogo de servicios (ES) — fuente única para la home y /servicios.
// `id` es el ancla en /servicios (#id): no cambiarlo sin revisar enlaces externos.

export interface Service {
	id: string;
	name: string;
	/** Una línea: qué resuelve. Se muestra en la home. */
	summary: string;
	/** Lo que incluye, en frases cortas. Se muestra en /servicios. */
	includes: string[];
	cta: string;
}

export const services: Service[] = [
	{
		id: "automatizacion",
		name: "Automatizaciones",
		summary: "Tus sistemas conectados. Cero tareas repetitivas.",
		includes: [
			"Leads, CRM y formularios",
			"Workflows con n8n, APIs y webhooks",
			"WhatsApp, email y herramientas internas",
			"Reportes automáticos",
		],
		cta: "Automatizar procesos",
	},
	{
		id: "agentes-ia",
		name: "Agentes IA",
		summary: "Agentes que atienden, consultan y escalan con reglas claras.",
		includes: [
			"Soporte, ventas y operaciones",
			"Conectados a la información de tu negocio",
			"Reglas de tono, seguridad y escalamiento",
			"Pruebas controladas antes de producción",
		],
		cta: "Diseñar un agente",
	},
	{
		id: "mentoria",
		name: "Mentoría",
		summary: "Qué automatizar primero y cómo medir el impacto.",
		includes: [
			"Diagnóstico de procesos",
			"Priorización por impacto y costo",
			"Roadmap de implementación por fases",
			"Acompañamiento en decisiones técnicas",
		],
		cta: "Solicitar mentoría",
	},
];
