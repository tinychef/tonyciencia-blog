// Textos legales — fuente de verdad versionada en el repo (ES + EN).
// Las páginas /legal/[slug] y /en/legal/[slug] leen de aquí primero y solo
// caen a D1 (EmDash) para slugs que no estén definidos en este archivo.
//
// Al cambiar algo sustancial, actualizar LEGAL_UPDATED.
// Las condiciones comerciales concretas (duración, cancelación, reembolsos,
// garantías) viven en la propuesta/contrato de cada servicio, no aquí.

export const LEGAL_UPDATED = "2026-10-07";

const COMPANY = "Tony Ciencia LLC";
const EMAIL = "business@tonyciencia.com";

export interface LegalSection {
	heading: string;
	paragraphs?: string[];
	list?: string[];
}

export interface LegalDoc {
	slug: string;
	locale: "es" | "en";
	title: string;
	intro: string;
	sections: LegalSection[];
}

const es: LegalDoc[] = [
	{
		slug: "privacidad",
		locale: "es",
		title: "Política de Privacidad",
		intro: `Esta política explica qué datos personales recopila ${COMPANY} ("Tony Ciencia", "nosotros") cuando visitas tonyciencia.com y sus subdominios —incluidos adsperformance.tonyciencia.com y adsinfinitos.tonyciencia.com—, para qué los usamos y qué derechos tienes.`,
		sections: [
			{
				heading: "Responsable",
				paragraphs: [
					`${COMPANY}, con domicilio en Albuquerque, Nuevo México, Estados Unidos. Para cualquier consulta sobre privacidad escríbenos a ${EMAIL}.`,
				],
			},
			{
				heading: "Datos que recopilamos",
				list: [
					"Datos que nos entregas: nombre, email, empresa, teléfono y el contenido de tu mensaje cuando usas un formulario, solicitas recursos, cotizas un servicio o nos escribes por WhatsApp o email.",
					"Datos de clientes: datos de contacto y facturación de la empresa cuando contratas un servicio. Los datos de tarjeta los procesa directamente el proveedor de pagos; no los almacenamos.",
					"Datos técnicos: dirección IP, tipo de navegador y dispositivo, y páginas visitadas, que se procesan para servir el sitio, protegerlo contra abuso y medir su uso de forma agregada.",
					"Cookies y tecnologías similares, según se describe en nuestra Política de Cookies.",
				],
			},
			{
				heading: "Para qué usamos tus datos",
				list: [
					"Responder tus consultas y preparar propuestas o cotizaciones.",
					"Enviarte los recursos que solicitaste y comunicaciones relacionadas. Puedes darte de baja en cualquier momento.",
					"Prestar, facturar y dar soporte a los servicios contratados.",
					"Mantener la seguridad del sitio y prevenir fraude o abuso.",
					"Medir y mejorar el sitio y nuestras campañas, solo con tu consentimiento cuando se usan cookies de analítica o publicidad.",
					"Cumplir obligaciones legales, contables y fiscales.",
				],
			},
			{
				heading: "Con quién compartimos datos",
				paragraphs: [
					"No vendemos tus datos personales. Los compartimos solo con proveedores que nos prestan servicios y que los tratan por nuestra cuenta:",
				],
				list: [
					"Cloudflare: alojamiento, almacenamiento, seguridad y analítica sin cookies.",
					"HighLevel: CRM y gestión de comunicaciones con prospectos y clientes.",
					"Meta (WhatsApp): mensajería, cuando nos contactas por ese canal.",
					"Google y Meta: medición publicitaria, solo si aceptas las cookies correspondientes.",
					"Procesadores de pago y entidades bancarias: cobros y facturación.",
				],
			},
			{
				heading: "Transferencias internacionales",
				paragraphs: [
					"Operamos desde Estados Unidos y nuestros proveedores pueden tratar datos en países distintos al tuyo. Elegimos proveedores con estándares reconocidos de seguridad y protección de datos.",
				],
			},
			{
				heading: "Cuánto tiempo conservamos tus datos",
				list: [
					"Consultas y prospectos: hasta 24 meses desde el último contacto.",
					"Suscriptores de recursos: hasta que te des de baja.",
					"Clientes: mientras dure la relación comercial y durante el plazo que exijan las obligaciones legales y fiscales.",
				],
			},
			{
				heading: "Tus derechos",
				paragraphs: [
					`Puedes pedir acceso, rectificación, eliminación, oposición o portabilidad de tus datos, y retirar tu consentimiento en cualquier momento, escribiendo a ${EMAIL}. Respondemos en un plazo máximo de 30 días.`,
					"Según tu país de residencia —por ejemplo Chile (Ley 19.628), la Unión Europea (RGPD) o California (CCPA/CPRA)— también puedes presentar un reclamo ante la autoridad de protección de datos competente.",
				],
			},
			{
				heading: "Datos que tratamos en nombre de nuestros clientes",
				paragraphs: [
					"Cuando implementamos agentes de IA, CRM o automatizaciones que procesan datos de los clientes de una empresa, actuamos como encargados del tratamiento siguiendo sus instrucciones y lo acordado en el contrato. La empresa cliente es responsable de contar con la base legal y los consentimientos necesarios, incluido el opt-in para mensajería.",
				],
			},
			{
				heading: "Seguridad y menores de edad",
				paragraphs: [
					"Usamos conexiones cifradas (HTTPS), acceso restringido y proveedores con controles de seguridad. Ningún sistema es 100% infalible, pero respondemos con diligencia ante cualquier incidente.",
					"Este sitio está dirigido a empresas y profesionales. No recopilamos a sabiendas datos de menores de 18 años.",
				],
			},
			{
				heading: "Cambios",
				paragraphs: [
					"Podemos actualizar esta política. Publicaremos aquí la versión vigente con su fecha de actualización.",
				],
			},
		],
	},
	{
		slug: "terminos",
		locale: "es",
		title: "Términos y Condiciones",
		intro: `Estos términos regulan el uso de tonyciencia.com y sus subdominios, y el marco general de los servicios que presta ${COMPANY}. Al usar el sitio o contratar un servicio, los aceptas.`,
		sections: [
			{
				heading: "Uso del sitio",
				paragraphs: [
					"Puedes navegar, leer y compartir nuestro contenido con fines personales o profesionales, citando la fuente. No está permitido copiarlo de forma masiva, usarlo para entrenar sistemas sin autorización, intentar vulnerar la seguridad del sitio ni usarlo para actividades ilícitas.",
				],
			},
			{
				heading: "Propiedad intelectual",
				paragraphs: [
					"Los textos, diseños, plantillas, código y marcas de Tony Ciencia pertenecen a Tony Ciencia LLC o a sus licenciantes. Las marcas de terceros mencionadas pertenecen a sus respectivos titulares.",
				],
			},
			{
				heading: "Contratación de servicios",
				paragraphs: [
					"Cada servicio se contrata mediante una propuesta, orden de servicio o contrato que define alcance, precio, duración, renovación, cancelación y, cuando aplique, garantías. Si ese documento contradice estos términos, prevalece el documento específico.",
					"Los precios, calculadoras y cotizaciones publicados en el sitio son referenciales y no constituyen una oferta vinculante hasta que los confirmemos por escrito. Salvo indicación contraria, los precios están en dólares estadounidenses (USD) y no incluyen impuestos ni comisiones bancarias.",
				],
			},
			{
				heading: "Pagos",
				paragraphs: [
					"Facturamos desde Tony Ciencia LLC por los medios indicados en cada propuesta (transferencia ACH, wire internacional o tarjeta). El presupuesto publicitario lo paga el cliente directamente a cada plataforma (Meta, Google, TikTok u otras) y no forma parte de nuestros honorarios.",
				],
			},
			{
				heading: "Resultados y garantías",
				paragraphs: [
					"Trabajamos para lograr resultados medibles, pero estos dependen de factores fuera de nuestro control: presupuesto, oferta, mercado, políticas de las plataformas y gestión comercial del cliente. Cualquier garantía de rendimiento aplica únicamente en los términos, métricas y condiciones definidos por escrito en el contrato correspondiente.",
				],
			},
			{
				heading: "Obligaciones del cliente",
				list: [
					"Entregar información veraz y los accesos necesarios a tiempo.",
					"Contar con los derechos sobre las marcas, imágenes y contenidos que nos entregue.",
					"Ofrecer productos y servicios lícitos y cumplir las políticas de las plataformas publicitarias y de mensajería.",
					"Obtener los consentimientos de sus contactos para comunicaciones comerciales, incluido el opt-in de WhatsApp.",
				],
			},
			{
				heading: "Plataformas de terceros e inteligencia artificial",
				paragraphs: [
					"Nuestros servicios usan plataformas de terceros —como Meta, Google, TikTok, HighLevel, WhatsApp y proveedores de modelos de IA— que se rigen por sus propios términos. No respondemos por sus cambios, interrupciones, rechazos de anuncios ni suspensiones de cuentas.",
					"Los sistemas de IA pueden generar respuestas inexactas. Diseñamos reglas de supervisión y escalamiento, pero el cliente debe revisar los procesos críticos y las comunicaciones sensibles.",
				],
			},
			{
				heading: "Entregables y confidencialidad",
				paragraphs: [
					"Una vez pagado el total, el cliente es dueño de los creativos, configuraciones y contenidos producidos específicamente para él. Tony Ciencia conserva sus metodologías, plantillas, herramientas y conocimientos previos.",
					"Ambas partes tratarán como confidencial la información no pública que reciban de la otra.",
				],
			},
			{
				heading: "Limitación de responsabilidad",
				paragraphs: [
					"En la medida en que la ley lo permita, Tony Ciencia no responde por daños indirectos, lucro cesante ni pérdida de datos, y su responsabilidad total por un servicio se limita al monto pagado por ese servicio en los tres meses anteriores al hecho que la origine. Esto no limita los derechos irrenunciables que te reconozca la ley de tu país.",
				],
			},
			{
				heading: "Ley aplicable y cambios",
				paragraphs: [
					"Estos términos se rigen por las leyes del Estado de Nuevo México, Estados Unidos, sin perjuicio de las normas imperativas de protección al consumidor de tu país de residencia.",
					`Podemos actualizar estos términos; la versión vigente es la publicada en esta página. Consultas: ${EMAIL}.`,
				],
			},
		],
	},
	{
		slug: "cookies",
		locale: "es",
		title: "Política de Cookies",
		intro: "Las cookies son pequeños archivos que el sitio guarda en tu navegador. Usamos las mínimas necesarias y solo activamos las de medición y publicidad si las aceptas.",
		sections: [
			{
				heading: "Cookies necesarias",
				list: [
					"cookie_consent — guarda tu decisión sobre cookies. Duración: 12 meses.",
					"Cookies de seguridad de Cloudflare (por ejemplo __cf_bm) — protegen el sitio contra bots y abuso. Duración: minutos u horas.",
					"Cookies de sesión del panel de administración — solo para administradores del sitio.",
				],
			},
			{
				heading: "Cookies de preferencias",
				list: [
					"scheme — recuerda si elegiste el modo claro u oscuro. Se crea solo si cambias el tema. Duración: 12 meses.",
				],
			},
			{
				heading: "Cookies de analítica y publicidad (solo con tu consentimiento)",
				list: [
					"Google Analytics (_ga, _ga_*) — medición de visitas.",
					"Meta Pixel (_fbp) — medición de campañas publicitarias.",
				],
				paragraphs: [
					"Mientras no las aceptes, estas herramientas funcionan con el consentimiento denegado y no guardan cookies de seguimiento. Además usamos Cloudflare Web Analytics, que mide visitas de forma agregada sin usar cookies.",
				],
			},
			{
				heading: "Cómo gestionarlas",
				paragraphs: [
					"Puedes aceptar o rechazar las cookies opcionales en el aviso del sitio. Para cambiar tu decisión, borra las cookies de tonyciencia.com en tu navegador y el aviso volverá a aparecer. También puedes bloquearlas desde la configuración de tu navegador.",
				],
			},
		],
	},
	{
		slug: "aviso-legal",
		locale: "es",
		title: "Aviso Legal",
		intro: "Información sobre el titular de este sitio y las condiciones generales de su contenido.",
		sections: [
			{
				heading: "Titular",
				list: [
					`Razón social: ${COMPANY}`,
					"Domicilio: Albuquerque, Nuevo México, Estados Unidos",
					`Email: ${EMAIL}`,
					"Sitios: tonyciencia.com, adsperformance.tonyciencia.com, adsinfinitos.tonyciencia.com",
				],
			},
			{
				heading: "Marcas y alianzas",
				paragraphs: [
					"Tony Ciencia es miembro de Claude Partner Network. Claude y Anthropic son marcas de Anthropic, PBC. HighLevel, Meta, Google, TikTok y WhatsApp son marcas de sus respectivos titulares. Su mención no implica que estas empresas avalen el contenido de este sitio.",
				],
			},
			{
				heading: "Contenido y enlaces",
				paragraphs: [
					"El contenido de este sitio es informativo y puede cambiar sin previo aviso. Los enlaces a sitios de terceros se ofrecen por conveniencia; no controlamos su contenido ni sus políticas.",
				],
			},
		],
	},
	{
		slug: "afiliados",
		locale: "es",
		title: "Divulgación de Afiliados",
		intro: "Algunos enlaces de este sitio son enlaces de afiliado. Te lo decimos con claridad.",
		sections: [
			{
				heading: "Qué significa",
				paragraphs: [
					"Si compras o te registras a través de uno de esos enlaces, podemos recibir una comisión sin costo adicional para ti. Participamos en programas de afiliados de herramientas como HighLevel y en redes como PartnerStack e Impact.",
				],
			},
			{
				heading: "Cómo elegimos lo que recomendamos",
				paragraphs: [
					"Recomendamos herramientas que usamos, implementamos o evaluamos para casos reales. La comisión no cambia nuestra opinión, y señalamos cuando una herramienta no encaja con un caso de uso.",
				],
			},
			{
				heading: "Tu decisión",
				paragraphs: [
					"Antes de contratar una herramienta, revisa sus precios, términos y políticas vigentes, que pueden cambiar sin aviso.",
				],
			},
		],
	},
	{
		slug: "descargo",
		locale: "es",
		title: "Descargo General",
		intro: "Condiciones sobre el uso de la información publicada en este sitio.",
		sections: [
			{
				heading: "No es asesoría profesional",
				paragraphs: [
					"El contenido es educativo e informativo. No constituye asesoría legal, financiera, fiscal ni de inversión. Para decisiones específicas, consulta a un profesional.",
				],
			},
			{
				heading: "Resultados y métricas",
				paragraphs: [
					"Las métricas, casos y ejemplos de resultados que publicamos corresponden a situaciones concretas o a referencias de la industria. No garantizan resultados iguales: cada negocio depende de su oferta, presupuesto, mercado y ejecución.",
				],
			},
			{
				heading: "Exactitud y uso de IA",
				paragraphs: [
					"Procuramos que la información sea correcta y actual, pero las herramientas, precios y políticas de terceros cambian con frecuencia. Parte del contenido se elabora con asistencia de IA y es revisado por nuestro equipo.",
				],
			},
		],
	},
];

const en: LegalDoc[] = [
	{
		slug: "privacy",
		locale: "en",
		title: "Privacy Policy",
		intro: `This policy explains what personal data ${COMPANY} ("Tony Ciencia", "we") collects when you visit tonyciencia.com and its subdomains —including adsperformance.tonyciencia.com and adsinfinitos.tonyciencia.com—, how we use it, and your rights.`,
		sections: [
			{
				heading: "Controller",
				paragraphs: [
					`${COMPANY}, based in Albuquerque, New Mexico, United States. For any privacy question, email ${EMAIL}.`,
				],
			},
			{
				heading: "Data we collect",
				list: [
					"Data you give us: name, email, company, phone number and your message when you use a form, request resources, request a quote or contact us via WhatsApp or email.",
					"Client data: company contact and billing details when you hire a service. Card details are processed directly by the payment provider; we do not store them.",
					"Technical data: IP address, browser and device type, and pages visited, processed to serve the site, protect it from abuse and measure usage in aggregate.",
					"Cookies and similar technologies, as described in our Cookie Policy.",
				],
			},
			{
				heading: "How we use your data",
				list: [
					"To answer your inquiries and prepare proposals or quotes.",
					"To send the resources you requested and related communications. You can unsubscribe at any time.",
					"To deliver, bill and support the services you hire.",
					"To keep the site secure and prevent fraud or abuse.",
					"To measure and improve the site and our campaigns, only with your consent when analytics or advertising cookies are used.",
					"To meet legal, accounting and tax obligations.",
				],
			},
			{
				heading: "Who we share data with",
				paragraphs: [
					"We do not sell your personal data. We share it only with providers that process it on our behalf:",
				],
				list: [
					"Cloudflare: hosting, storage, security and cookieless analytics.",
					"HighLevel: CRM and communications with prospects and clients.",
					"Meta (WhatsApp): messaging, when you contact us through that channel.",
					"Google and Meta: advertising measurement, only if you accept the related cookies.",
					"Payment processors and banks: payments and invoicing.",
				],
			},
			{
				heading: "International transfers",
				paragraphs: [
					"We operate from the United States and our providers may process data outside your country. We choose providers with recognized security and data-protection standards.",
				],
			},
			{
				heading: "How long we keep data",
				list: [
					"Inquiries and prospects: up to 24 months after the last contact.",
					"Resource subscribers: until you unsubscribe.",
					"Clients: for the duration of the relationship and as long as legal and tax obligations require.",
				],
			},
			{
				heading: "Your rights",
				paragraphs: [
					`You can request access, correction, deletion, objection or portability of your data, and withdraw consent at any time, by emailing ${EMAIL}. We respond within 30 days.`,
					"Depending on where you live —for example Chile (Law 19.628), the European Union (GDPR) or California (CCPA/CPRA)— you may also file a complaint with the competent data-protection authority.",
				],
			},
			{
				heading: "Data we process for our clients",
				paragraphs: [
					"When we implement AI agents, CRMs or automations that process data about a company's own customers, we act as a processor following that company's instructions and our contract. The client company is responsible for having the legal basis and consents required, including messaging opt-in.",
				],
			},
			{
				heading: "Security and minors",
				paragraphs: [
					"We use encrypted connections (HTTPS), restricted access and providers with security controls. No system is infallible, but we respond diligently to any incident.",
					"This site is aimed at businesses and professionals. We do not knowingly collect data from anyone under 18.",
				],
			},
			{
				heading: "Changes",
				paragraphs: ["We may update this policy. The current version and its update date are always published here."],
			},
		],
	},
	{
		slug: "terms",
		locale: "en",
		title: "Terms & Conditions",
		intro: `These terms govern the use of tonyciencia.com and its subdomains, and the general framework of the services provided by ${COMPANY}. By using the site or hiring a service, you accept them.`,
		sections: [
			{
				heading: "Use of the site",
				paragraphs: [
					"You may browse, read and share our content for personal or professional purposes, crediting the source. You may not copy it in bulk, use it to train systems without permission, attempt to breach the site's security, or use it for unlawful purposes.",
				],
			},
			{
				heading: "Intellectual property",
				paragraphs: [
					"Tony Ciencia's texts, designs, templates, code and trademarks belong to Tony Ciencia LLC or its licensors. Third-party trademarks belong to their respective owners.",
				],
			},
			{
				heading: "Hiring services",
				paragraphs: [
					"Each service is hired through a proposal, service order or contract that defines scope, price, term, renewal, cancellation and, where applicable, guarantees. If that document conflicts with these terms, the specific document prevails.",
					"Prices, calculators and quotes published on the site are for reference and are not a binding offer until we confirm them in writing. Unless stated otherwise, prices are in US dollars (USD) and exclude taxes and bank fees.",
				],
			},
			{
				heading: "Payments",
				paragraphs: [
					"We invoice from Tony Ciencia LLC using the methods stated in each proposal (ACH transfer, international wire or card). Advertising budget is paid by the client directly to each platform (Meta, Google, TikTok or others) and is not part of our fees.",
				],
			},
			{
				heading: "Results and guarantees",
				paragraphs: [
					"We work toward measurable results, but they depend on factors outside our control: budget, offer, market, platform policies and the client's sales process. Any performance guarantee applies only under the terms, metrics and conditions set out in writing in the relevant contract.",
				],
			},
			{
				heading: "Client obligations",
				list: [
					"Provide accurate information and the required access on time.",
					"Hold the rights to the brands, images and content provided to us.",
					"Offer lawful products and services and comply with advertising and messaging platform policies.",
					"Obtain consent from their contacts for marketing communications, including WhatsApp opt-in.",
				],
			},
			{
				heading: "Third-party platforms and artificial intelligence",
				paragraphs: [
					"Our services rely on third-party platforms —such as Meta, Google, TikTok, HighLevel, WhatsApp and AI model providers— governed by their own terms. We are not responsible for their changes, outages, ad rejections or account suspensions.",
					"AI systems can produce inaccurate answers. We design supervision and escalation rules, but the client must review critical processes and sensitive communications.",
				],
			},
			{
				heading: "Deliverables and confidentiality",
				paragraphs: [
					"Once paid in full, the client owns the creatives, configurations and content produced specifically for them. Tony Ciencia retains its methodologies, templates, tools and prior know-how.",
					"Both parties will treat as confidential any non-public information received from the other.",
				],
			},
			{
				heading: "Limitation of liability",
				paragraphs: [
					"To the extent permitted by law, Tony Ciencia is not liable for indirect damages, lost profits or data loss, and its total liability for a service is limited to the amount paid for that service in the three months before the event giving rise to the claim. This does not limit any non-waivable rights granted by the law of your country.",
				],
			},
			{
				heading: "Governing law and changes",
				paragraphs: [
					"These terms are governed by the laws of the State of New Mexico, United States, without prejudice to mandatory consumer-protection rules of your country of residence.",
					`We may update these terms; the current version is the one published on this page. Questions: ${EMAIL}.`,
				],
			},
		],
	},
	{
		slug: "cookies-en",
		locale: "en",
		title: "Cookie Policy",
		intro: "Cookies are small files the site stores in your browser. We use the minimum necessary and only enable measurement and advertising cookies if you accept them.",
		sections: [
			{
				heading: "Necessary cookies",
				list: [
					"cookie_consent — stores your cookie choice. Duration: 12 months.",
					"Cloudflare security cookies (e.g. __cf_bm) — protect the site from bots and abuse. Duration: minutes to hours.",
					"Admin panel session cookies — site administrators only.",
				],
			},
			{
				heading: "Preference cookies",
				list: ["scheme — remembers whether you chose light or dark mode. Created only if you switch themes. Duration: 12 months."],
			},
			{
				heading: "Analytics and advertising cookies (only with your consent)",
				list: ["Google Analytics (_ga, _ga_*) — visit measurement.", "Meta Pixel (_fbp) — advertising campaign measurement."],
				paragraphs: [
					"Until you accept them, these tools run with consent denied and store no tracking cookies. We also use Cloudflare Web Analytics, which measures visits in aggregate without cookies.",
				],
			},
			{
				heading: "Managing cookies",
				paragraphs: [
					"You can accept or reject optional cookies in the site's notice. To change your choice, delete tonyciencia.com cookies in your browser and the notice will appear again. You can also block cookies in your browser settings.",
				],
			},
		],
	},
	{
		slug: "disclaimer",
		locale: "en",
		title: "Legal Notice",
		intro: "Information about the owner of this site and the general conditions of its content.",
		sections: [
			{
				heading: "Owner",
				list: [
					`Company: ${COMPANY}`,
					"Address: Albuquerque, New Mexico, United States",
					`Email: ${EMAIL}`,
					"Sites: tonyciencia.com, adsperformance.tonyciencia.com, adsinfinitos.tonyciencia.com",
				],
			},
			{
				heading: "Trademarks and partnerships",
				paragraphs: [
					"Tony Ciencia is a member of the Claude Partner Network. Claude and Anthropic are trademarks of Anthropic, PBC. HighLevel, Meta, Google, TikTok and WhatsApp are trademarks of their respective owners. Mentioning them does not imply that these companies endorse this site's content.",
				],
			},
			{
				heading: "Content and links",
				paragraphs: [
					"This site's content is informational and may change without notice. Links to third-party sites are provided for convenience; we do not control their content or policies.",
				],
			},
		],
	},
	{
		slug: "affiliate",
		locale: "en",
		title: "Affiliate Disclosure",
		intro: "Some links on this site are affiliate links. We say so clearly.",
		sections: [
			{
				heading: "What it means",
				paragraphs: [
					"If you buy or sign up through one of those links, we may earn a commission at no extra cost to you. We take part in affiliate programs of tools such as HighLevel and in networks such as PartnerStack and Impact.",
				],
			},
			{
				heading: "How we choose what we recommend",
				paragraphs: [
					"We recommend tools we use, implement or have evaluated for real use cases. Commissions do not change our opinion, and we point out when a tool is not a good fit.",
				],
			},
			{
				heading: "Your decision",
				paragraphs: ["Before buying a tool, review its current pricing, terms and policies, which may change without notice."],
			},
		],
	},
	{
		slug: "general-disclaimer",
		locale: "en",
		title: "General Disclaimer",
		intro: "Conditions for using the information published on this site.",
		sections: [
			{
				heading: "Not professional advice",
				paragraphs: [
					"Our content is educational and informational. It is not legal, financial, tax or investment advice. For specific decisions, consult a professional.",
				],
			},
			{
				heading: "Results and metrics",
				paragraphs: [
					"The metrics, case studies and result examples we publish reflect specific situations or industry benchmarks. They do not guarantee the same results: every business depends on its offer, budget, market and execution.",
				],
			},
			{
				heading: "Accuracy and use of AI",
				paragraphs: [
					"We aim to keep information accurate and current, but third-party tools, prices and policies change often. Some content is produced with AI assistance and reviewed by our team.",
				],
			},
		],
	},
];

export const legalDocs: LegalDoc[] = [...es, ...en];

export function getLegalDoc(slug: string, locale: "es" | "en"): LegalDoc | undefined {
	return legalDocs.find((doc) => doc.slug === slug && doc.locale === locale);
}
