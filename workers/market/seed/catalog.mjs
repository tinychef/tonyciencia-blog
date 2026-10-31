// Catálogo v2 de Market Tony: datos de vitrina (SEO, "qué incluye", ficha técnica, preguntas), portadas
// nuevas y los productos "Próximamente". Fuente única para:
//   - scripts/gen-catalog-migration.mjs → migrations/0003_catalogo_v2.sql (producción/staging)
//   - scripts/seed.mjs                  → D1 local y vista previa (maqueta)
//
// Reglas:
//   - Nada de cifras inventadas: ni reseñas, ni ventas, ni precios "antes" que no existieron.
//     Las estrellas y las ventas que muestra la tienda salen de la BD (reseñas de compradores y pedidos pagados).
//   - Los productos "Próximamente" no se pueden comprar: solo lista de espera.

const img = (slug, file, alt) => ({ src: `/market/static/products/${slug}/${file}`, alt });

/** Portadas y pantallas nuevas. En producción se anteponen a las imágenes que ya subió el dueño. */
export const COVERS = {
	"anuncios-infinitos": [
		img("anuncios-infinitos", "cover.webp", "Anuncios Infinitos: 250+ prompts de anuncios para Meta, Google, TikTok y LinkedIn"),
		img("anuncios-infinitos", "screen-1.webp", "Sesión con Tony, el agente: investigación de tu negocio y puntaje de preparación"),
		img("anuncios-infinitos", "screen-2.webp", "Entregables de Anuncios Infinitos: carpetas de prompts por categoría, estrategia y plan"),
	],
	specreel: [
		img("specreel", "cover.webp", "SpecReel: pide un video a tu agente y recibe un MP4 3D narrado, compatible con Claude Code y Codex"),
		img("specreel", "screen-1.webp", "SpecReel: 16 movimientos de cámara y 8 transiciones anclados a cada palabra"),
		img("specreel", "screen-2.webp", "SpecReel: kit de marca y salida en 9:16, 1:1, 4:5 y 16:9"),
	],
};

export const MERCH = {
	"anuncios-infinitos": {
		tagline: "Tu estratega de publicidad con IA: investiga tu negocio y te entrega 250+ prompts de anuncios, cada uno con su razón.",
		category: "anuncios",
		tags: ["prompts de anuncios", "anuncios con IA", "Meta Ads", "Google Ads", "TikTok Ads", "LinkedIn Ads", "agente de IA en español"],
		accent: "#f5e400",
		meta_title: "Prompts de anuncios con IA: 250+ para Meta, Google y TikTok",
		meta_description:
			"Anuncios Infinitos: agente de IA en español que investiga tu negocio y tu competencia y te entrega 250+ prompts de anuncios con estrategia para Meta, Google, TikTok y LinkedIn. Pago único.",
		highlights: [
			"Investigación real de tu marca y de tu competencia, con herramientas de verdad (no inventada)",
			"250+ prompts: mínimo 5 categorías × 50 prompts, en archivos separados",
			"Textos completos de cada anuncio: gancho, cuerpo y llamado a la acción",
			"Estrategia de campañas, inversión y métricas, más un Puntaje de Preparación de 0 a 100",
			"App local para usarlo sin terminal y 3 guías en PDF",
			"Pago único: lo usas con todos tus negocios o clientes, todos los meses",
		],
		specs: [
			{ label: "Formato", value: "ZIP: agente (22 archivos de skills), app local y 3 guías en PDF" },
			{ label: "Idioma", value: "Español" },
			{ label: "Funciona con", value: "Claude Code, Cursor, Codex, Antigravity o Gemini" },
			{ label: "Plataformas de anuncios", value: "Meta, Google, TikTok y LinkedIn" },
			{ label: "Requisitos", value: "Node.js (gratis) y una herramienta de IA compatible" },
			{ label: "Licencia", value: "Pago único, sin suscripción" },
		],
		faq: [
			{ q: "¿Necesito saber programar?", a: "No. Abres la app o tu herramienta de IA y conversas con Tony, el agente." },
			{ q: "¿Genera las imágenes y los videos?", a: "No. Escribe los prompts y los textos. Los conviertes en imagen o video con el generador que ya uses (por ejemplo Nano Banana o Google Flow), con tu cuenta." },
			{ q: "¿Funciona sin las claves de Firecrawl, Apify y Serper?", a: "Sí, pero investiga menos. Las tres son gratuitas y se configuran en unos 5 minutos con botones." },
			{ q: "¿Garantiza ventas?", a: "No. Entrega estrategia, prompts y textos. El resultado depende de tu oferta, tu presupuesto y tu ejecución." },
			{ q: "¿Sirve para cualquier negocio?", a: "Está pensado para negocios de habla hispana que pautan en Meta, Google, TikTok o LinkedIn. Tony te pregunta lo que necesita antes de proponer nada." },
		],
	},
	specreel: {
		tagline: "Pide un video a tu agente y recibe un MP4 3D narrado, con subtítulos, música y cámara de cine.",
		category: "video",
		tags: ["videos con Claude Code", "videos con Codex", "videos 3D con IA", "video explicativo con IA", "video de producto con IA", "subtítulos karaoke"],
		badge: "Versión 2.0",
		accent: "#e8e8e8",
		meta_title: "SpecReel: crea videos 3D con Claude Code y Codex",
		meta_description:
			"Skill para Claude Code y Codex que convierte cualquier tema en un video 3D narrado, con subtítulos, música y cámara de cine. Corre en tu computador. Pago único y actualizaciones 2.x gratis.",
		highlights: [
			"Escribes una instrucción; recibes un MP4 terminado con subtítulos karaoke y archivo .srt",
			"Cámara de cine: 16 movimientos y 8 transiciones anclados a cada palabra",
			"Kit de marca desde tu logo o tus colores HEX, con contraste revisado",
			"Voces locales gratis o de estudio (Fish Audio, ElevenLabs) con tu propia clave",
			"9:16, 1:1, 4:5 y 16:9 — Windows, macOS y Linux",
			"Pago único con actualizaciones 2.x gratis",
		],
		specs: [
			{ label: "Versión", value: "2.0" },
			{ label: "Formato", value: "ZIP con la skill, el motor 3D, recetas de escena, ejemplos y documentación" },
			{ label: "Funciona con", value: "Claude Code y Codex" },
			{ label: "Sistemas", value: "Windows 10/11, macOS y Linux" },
			{ label: "Salida", value: "MP4 H.264 a 30 fps en 9:16, 1:1, 4:5 o 16:9, con .srt" },
			{ label: "Documentación", value: "Inglés y español" },
			{ label: "Licencia", value: "1 creador, uso comercial y para clientes incluido" },
		],
		faq: [
			{ q: "¿Necesito saber programar?", a: "No para empezar. Describes el video en lenguaje natural y el agente escribe y corrige el código de las escenas. Durante la instalación corres algunos comandos en la terminal." },
			{ q: "¿Hay un costo por video?", a: "No por parte de SpecReel. Con una voz local solo pagas el uso de tu agente; las voces en la nube te cobran directamente." },
			{ q: "¿Funciona en Mac?", a: "Sí. Windows, macOS y Linux se detectan solos y un comando instala las dependencias. Apple Silicon renderiza rápido." },
			{ q: "¿Puedo usar los videos comercialmente?", a: "Sí, para tu marca y para clientes. Revisa la licencia de la voz que elijas; el Doctor avisa de los modelos no comerciales." },
			{ q: "¿Y si no me funciona?", a: "Tienes 14 días: si no logras renderizar el demo incluido en un sistema compatible después de que intentemos ayudarte, te devolvemos el dinero." },
		],
	},
};

/** Productos próximos: visibles con lista de espera, sin archivo y sin botón de compra. */
export const COMING_SOON = [
	{
		id: "8b3c5d7e-2f40-4b6c-9d8e-0f1a2b3c4d01",
		slug: "cutpilot",
		title: "CutPilot: edita videos con Claude Code y Codex",
		summary: "Skill para Claude Code y Codex que edita tus grabaciones: quita silencios y muletillas, agrega subtítulos y saca reels verticales. Próximamente.",
		price_cents: 2990,
		sort_order: 50,
		tagline: "Le pasas tu grabación cruda; tu agente te devuelve el video editado, los subtítulos y los reels.",
		category: "video",
		tags: ["editar videos con Claude", "editar videos con IA", "Claude Code video", "cortar silencios automáticamente", "subtítulos automáticos", "reels verticales con IA"],
		accent: "#9b5cff",
		meta_title: "Edita videos con Claude Code y Codex — CutPilot",
		meta_description:
			"¿Quieres editar videos con Claude? CutPilot es una skill para Claude Code y Codex que quita silencios, agrega subtítulos y crea reels verticales desde tu grabación. Únete a la lista de espera.",
		highlights: [
			"Quita silencios, muletillas y tomas repetidas, con tu aprobación antes del render",
			"Subtítulos animados en tu estilo, en el video y en archivo .srt",
			"Reels verticales 9:16 con el encuadre centrado en quien habla",
			"Capítulos, título y descripción para YouTube",
			"Todo local con ffmpeg y Whisper: sin créditos por minuto",
		],
		specs: [
			{ label: "Estado", value: "En desarrollo — lista de espera abierta" },
			{ label: "Funcionará con", value: "Claude Code y Codex" },
			{ label: "Motor", value: "ffmpeg y Whisper, en tu computador" },
			{ label: "Salida prevista", value: "MP4 editado, reels 9:16, .srt y textos para YouTube" },
		],
		faq: [
			{ q: "¿Se puede editar videos con Claude?", a: "Sí. Claude Code y Codex pueden manejar herramientas como ffmpeg y Whisper desde tu computador. CutPilot les da el método: transcribir, proponer cortes, subtitular y exportar." },
			{ q: "¿Cuándo sale?", a: "Está en desarrollo. Si te unes a la lista de espera te escribimos el día del lanzamiento." },
			{ q: "¿Tengo que pagar para unirme a la lista?", a: "No. Solo dejas tu correo y te avisamos. No hay compromiso de compra." },
		],
		description: [
			"CutPilot es una skill para Claude Code y Codex que edita tus grabaciones por ti. Le pasas el video crudo y tu agente lo transcribe palabra por palabra, propone los cortes, agrega subtítulos y te entrega el video final y los reels verticales.",
			"## Lo que hará",
			"- Quitar silencios, muletillas y tomas repetidas, con tu aprobación antes del render.\n- Subtítulos animados en tu estilo, quemados en el video y en archivo .srt.\n- Reels verticales 9:16 con el encuadre centrado en quien habla.\n- Capítulos, título y descripción para YouTube.\n- Todo local con ffmpeg y Whisper: sin créditos por minuto y sin subir tus videos a otra plataforma.",
			"## Cómo editar videos con Claude Code, en 3 pasos",
			"- Abres tu agente en la carpeta del video y le pides: edita grabacion.mp4.\n- Revisas la lista de cortes y el estilo de subtítulos que te propone.\n- Apruebas y recibes el video editado, los reels y los textos.",
			"## Para quién es",
			"Creadores, coaches, agencias y equipos de marketing que graban mucho y editan poco: tutoriales, podcasts, clases, webinars y videos para redes.",
			"## Importante",
			"Producto en desarrollo: las funciones y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis y no te compromete a comprar.",
		].join("\n\n"),
	},
	{
		id: "8b3c5d7e-2f40-4b6c-9d8e-0f1a2b3c4d02",
		slug: "kit-n8n-agentes-ia",
		title: "Kit n8n de Agentes IA: 12 automatizaciones para captar y atender clientes",
		summary: "12 flujos de n8n con IA listos para importar: agente de WhatsApp que agenda, leads de Google Maps y Meta Ads, pagos de Stripe al CRM y más. Próximamente.",
		price_cents: 4700,
		sort_order: 60,
		tagline: "Importas el flujo, conectas tus cuentas y tienes un agente que capta, responde y da seguimiento.",
		category: "automatizacion",
		tags: ["plantillas n8n", "automatizaciones n8n", "agente de IA para WhatsApp", "n8n WhatsApp", "n8n HighLevel", "workflows n8n en español"],
		accent: "#ff6d5a",
		meta_title: "12 plantillas de n8n con IA para captar y atender clientes",
		meta_description:
			"Kit de 12 automatizaciones de n8n con IA listas para importar: agente de WhatsApp que agenda citas, leads de Google Maps y Meta Ads, webhooks de Stripe al CRM. En español. Lista de espera abierta.",
		highlights: [
			"Agente de WhatsApp que responde, califica y agenda en tu calendario",
			"Leads desde Google Maps, formularios y Meta Ads directo a tu CRM",
			"Pagos de Stripe y PayPal a tu CRM por webhook",
			"Seguimiento, reseñas y reactivación automáticos",
			"Video-guía en español para cada flujo",
		],
		specs: [
			{ label: "Estado", value: "En desarrollo — lista de espera abierta" },
			{ label: "Contenido previsto", value: "12 workflows .json + 12 video-guías" },
			{ label: "Funcionará con", value: "n8n (nube o autoalojado)" },
			{ label: "Integraciones", value: "WhatsApp, HighLevel, Google Sheets, Google Calendar, Stripe, Meta Ads" },
		],
		faq: [
			{ q: "¿Sirve con n8n en la nube y autoalojado?", a: "Sí, esa es la idea: los flujos se importan en cualquier instalación de n8n reciente." },
			{ q: "¿Cuándo sale?", a: "Está en desarrollo. Únete a la lista de espera y te avisamos el día del lanzamiento." },
			{ q: "¿Tengo que pagar para unirme a la lista?", a: "No. Solo dejas tu correo; no hay compromiso de compra." },
		],
		description: [
			"El Kit n8n de Agentes IA reúne 12 automatizaciones probadas para captar y atender clientes con inteligencia artificial. Importas el archivo, conectas tus cuentas siguiendo la video-guía y lo pones a trabajar.",
			"## Los flujos",
			"- Agente de WhatsApp que responde, califica y agenda citas.\n- Leads desde Google Maps para prospección.\n- Leads de Meta Ads con respuesta en menos de un minuto.\n- Pagos de Stripe y PayPal a tu CRM por webhook.\n- Formulario a seguimiento automático.\n- Pedido de reseñas después de la venta.\n- Noticias por RSS a Google Sheets.\n- Notas de voz convertidas en tareas.\n- Respuestas de correo con IA.\n- Recuperación de carritos y citas perdidas.\n- Reporte semanal automático.\n- Onboarding de clientes.",
			"## Para quién es",
			"Dueños de negocio, agencias y freelancers que ya usan o quieren usar n8n y no quieren armar cada flujo desde cero.",
			"## Importante",
			"Producto en desarrollo: la lista de flujos y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis.",
		].join("\n\n"),
	},
	{
		id: "8b3c5d7e-2f40-4b6c-9d8e-0f1a2b3c4d03",
		slug: "carruseles-infinitos",
		title: "Carruseles Infinitos: crea carruseles de Instagram y LinkedIn con Claude",
		summary: "Skill para Claude Code y Codex que escribe, diseña y exporta carruseles de Instagram y LinkedIn en tu estilo. De la familia de Anuncios Infinitos. Próximamente.",
		price_cents: 1990,
		sort_order: 70,
		tagline: "Tú das el tema; tu agente escribe, diseña y exporta el carrusel en tu estilo.",
		category: "contenido",
		tags: ["carruseles con IA", "carruseles de Instagram", "carruseles de LinkedIn", "crear carruseles con Claude", "contenido para redes con IA"],
		accent: "#ff3d8b",
		meta_title: "Crea carruseles de Instagram y LinkedIn con Claude",
		meta_description:
			"Carruseles Infinitos: skill para Claude Code y Codex que escribe, diseña y exporta carruseles de Instagram y LinkedIn en tu estilo, en PNG y PDF. Únete a la lista de espera.",
		highlights: [
			"Gancho, desarrollo y cierre con llamado a la acción, en tu tono de marca",
			"8 estilos de diseño con tus colores y tu logo",
			"Exporta PNG 1080×1350 y PDF listo para LinkedIn",
			"Escribe también el texto del post",
			"Todo en español",
		],
		specs: [
			{ label: "Estado", value: "En desarrollo — lista de espera abierta" },
			{ label: "Funcionará con", value: "Claude Code y Codex" },
			{ label: "Formatos previstos", value: "4:5, 1:1 y 9:16 · PNG y PDF" },
			{ label: "Idioma", value: "Español" },
		],
		faq: [
			{ q: "¿En qué se diferencia de una plantilla de Canva?", a: "El agente escribe el contenido a partir de tu tema y lo diseña con tu marca; no partes de una plantilla en blanco." },
			{ q: "¿Cuándo sale?", a: "Está en desarrollo. Únete a la lista de espera y te avisamos el día del lanzamiento." },
			{ q: "¿Tengo que pagar para unirme a la lista?", a: "No. Solo dejas tu correo; no hay compromiso de compra." },
		],
		description: [
			"Carruseles Infinitos es una skill para Claude Code y Codex que convierte un tema en un carrusel completo para Instagram o LinkedIn: escribe el gancho, desarrolla las ideas, cierra con un llamado a la acción y lo diseña con tu marca.",
			"## Lo que hará",
			"- Escribir carruseles de 5 a 10 slides en tu tono de marca.\n- Diseñarlos en 8 estilos con tus colores y tu logo.\n- Exportar PNG 1080×1350 y un PDF listo para LinkedIn.\n- Escribir el texto del post que acompaña al carrusel.",
			"## Para quién es",
			"Marcas personales, creadores y agencias que publican seguido en Instagram y LinkedIn y quieren producir más sin perder su estilo.",
			"## Importante",
			"Producto en desarrollo: las funciones y el precio pueden cambiar antes del lanzamiento. Unirte a la lista de espera es gratis.",
		].join("\n\n"),
	},
];

/** Imágenes de los productos próximos. */
export const COMING_SOON_IMAGES = {
	cutpilot: [
		img("cutpilot", "cover.webp", "CutPilot: edita videos con Claude Code — editor con cortes, subtítulos y reel vertical"),
		img("cutpilot", "screen-1.webp", "CutPilot: de 18 minutos de grabación cruda a 11 minutos editados"),
		img("cutpilot", "screen-2.webp", "CutPilot: video largo, 5 reels verticales, capítulos y subtítulos desde una grabación"),
	],
	"kit-n8n-agentes-ia": [
		img("kit-n8n-agentes-ia", "cover.webp", "Kit n8n de Agentes IA: flujo de WhatsApp con agente de IA que agenda citas"),
		img("kit-n8n-agentes-ia", "screen-1.webp", "Los 12 flujos de n8n incluidos en el kit"),
		img("kit-n8n-agentes-ia", "screen-2.webp", "Flujo de n8n: del lead de Meta Ads a la cita agendada"),
	],
	"carruseles-infinitos": [
		img("carruseles-infinitos", "cover.webp", "Carruseles Infinitos: carruseles de Instagram y LinkedIn hechos por tu agente"),
		img("carruseles-infinitos", "screen-1.webp", "Carruseles Infinitos: un tema, diez slides listos para exportar"),
		img("carruseles-infinitos", "screen-2.webp", "Carruseles Infinitos: ocho estilos de diseño"),
	],
};

// ── SQL ──────────────────────────────────────────────────────────────

export const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

const MERCH_COLUMNS = ["tagline", "category", "tags", "badge", "accent", "meta_title", "meta_description", "highlights", "specs", "faq"];
const asColumnValue = (key, value) => (Array.isArray(value) ? JSON.stringify(value) : (value ?? ""));

/**
 * Rellena la vitrina de un producto existente SIN pisar lo que el dueño ya editó:
 * cada columna se escribe solo si sigue vacía.
 */
export function merchUpdateSql(slug, merch) {
	const sets = MERCH_COLUMNS.filter((k) => merch[k] !== undefined).map((k) => {
		const empty = k === "tags" || k === "highlights" || k === "specs" || k === "faq" ? "'[]'" : "''";
		return `${k} = CASE WHEN ${k} = ${empty} THEN ${q(asColumnValue(k, merch[k]))} ELSE ${k} END`;
	});
	return `UPDATE products SET ${sets.join(",\n  ")}\nWHERE slug = ${q(slug)};`;
}

/**
 * Antepone las portadas nuevas a las imágenes del producto (las que subió el dueño se conservan detrás).
 * Idempotente: si la portada nueva ya está, no hace nada.
 */
export function prependImagesSql(slug, images) {
	const first = images[0].src;
	return `UPDATE products SET images = (
  SELECT json_group_array(json(v)) FROM (
    SELECT value AS v, 0 AS g, CAST(key AS INTEGER) AS k FROM json_each(${q(JSON.stringify(images))})
    UNION ALL
    SELECT value, 1, CAST(key AS INTEGER) FROM json_each(products.images)
    ORDER BY g, k
  )
)
WHERE slug = ${q(slug)} AND json_valid(images) AND instr(images, ${q(first)}) = 0;`;
}

export function comingSoonInsertSql(p, now) {
	const images = JSON.stringify(COMING_SOON_IMAGES[p.slug] ?? []);
	const cols = {
		id: p.id, slug: p.slug, title: p.title, summary: p.summary, description: p.description, price_cents: p.price_cents, currency: "usd", kind: "paid",
		images, file_key: null, file_name: null, download_limit: 5, active: 1, sort_order: p.sort_order, created_at: now, updated_at: now,
		tagline: p.tagline, category: p.category, tags: JSON.stringify(p.tags), badge: p.badge ?? "", accent: p.accent, meta_title: p.meta_title,
		meta_description: p.meta_description, highlights: JSON.stringify(p.highlights), specs: JSON.stringify(p.specs), faq: JSON.stringify(p.faq),
		availability: "coming_soon",
	};
	return `INSERT INTO products (${Object.keys(cols).join(", ")})\nVALUES (${Object.values(cols).map(q).join(", ")})\nON CONFLICT(slug) DO NOTHING;`;
}
