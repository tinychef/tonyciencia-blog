/**
 * Idiomas de la tienda: español (por defecto, /market/…) e inglés (/market/en/…).
 *
 * - Las fichas en inglés salen de la columna `i18n` (migración 0011): {"en": {title, tagline, …, image_alts}}. Lo que
 *   falte cae al español, nunca a un texto inventado.
 * - Las portadas en inglés viven junto a las españolas: products/<slug>/en/cover.webp (+ cover-animada.webp).
 * - Los textos de la interfaz se escriben en español en las vistas y se traducen con `t()` (la clave es el texto
 *   en español). Lo que no esté en EN se muestra en español: así una frase nueva nunca rompe la página.
 */
import { createContext, useContext } from "hono/jsx";
import type { Product } from "../services/repo";

export type Lang = "es" | "en";

export const LangContext = createContext<Lang>("es");
export const useLang = (): Lang => useContext(LangContext);

export const langFromPath = (path: string): Lang => (path === "/market/en" || path.startsWith("/market/en/") ? "en" : "es");

/** Raíz de la tienda en cada idioma (siempre con barra final: /market?… no llega al Worker en producción). */
export const storeRoot = (lang: Lang) => (lang === "en" ? "/market/en/" : "/market/");
export const productPath = (slug: string, lang: Lang) => (lang === "en" ? `/market/en/product/${slug}` : `/market/producto/${slug}`);

/** Productos con portada en inglés en public/market/static/products/<slug>/en/. */
export const EN_COVERS = new Set(["anuncios-infinitos", "specreel", "specreel-stick", "pagespeed-forensics", "cutpilot", "motor-creativo-claude-code"]);

export interface ProductLocale {
	title?: string;
	tagline?: string;
	summary?: string;
	meta_title?: string;
	meta_description?: string;
	description?: string;
	highlights?: string[];
	specs?: Array<{ label: string; value: string }>;
	faq?: Array<{ q: string; a: string }>;
	tags?: string[];
	image_alts?: string[];
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v : undefined);
const strArr = (v: unknown): string[] | undefined => (Array.isArray(v) && v.every((x) => typeof x === "string") && v.length ? (v as string[]) : undefined);

export function parseI18n(raw: string | null | undefined): { en?: ProductLocale } {
	try {
		const v = JSON.parse(raw || "{}") as Record<string, unknown>;
		const en = v && typeof v.en === "object" && v.en ? (v.en as Record<string, unknown>) : null;
		if (!en) return {};
		const specs = Array.isArray(en.specs) ? (en.specs as Array<{ label: unknown; value: unknown }>).filter((s) => str(s?.label) && str(s?.value)) : [];
		const faq = Array.isArray(en.faq) ? (en.faq as Array<{ q: unknown; a: unknown }>).filter((f) => str(f?.q) && str(f?.a)) : [];
		return {
			en: {
				title: str(en.title),
				tagline: str(en.tagline),
				summary: str(en.summary),
				meta_title: str(en.meta_title),
				meta_description: str(en.meta_description),
				description: str(en.description),
				highlights: strArr(en.highlights),
				specs: specs.length ? (specs as Array<{ label: string; value: string }>) : undefined,
				faq: faq.length ? (faq as Array<{ q: string; a: string }>) : undefined,
				tags: strArr(en.tags),
				image_alts: strArr(en.image_alts),
			},
		};
	} catch {
		return {};
	}
}

/** ¿Tiene la ficha versión en inglés? (para hreflang y el sitemap: solo se anuncia lo que existe). */
export const hasEnglish = (p: Pick<Product, "i18n">) => !!p.i18n.en?.title;

/** La ficha en el idioma pedido. En español no cambia nada. */
export function localize<T extends Product>(p: T, lang: Lang): T {
	if (lang === "es") return p;
	const en = p.i18n.en;
	if (!en) return p;
	const images = p.images.map((img, i) => {
		let src = img.src;
		if (i === 0 && EN_COVERS.has(p.slug) && src.endsWith(`/products/${p.slug}/cover.webp`)) src = src.replace(/cover\.webp$/, "en/cover.webp");
		return { src, alt: en.image_alts?.[i] ?? img.alt };
	});
	return {
		...p,
		title: en.title ?? p.title,
		tagline: en.tagline ?? p.tagline,
		summary: en.summary ?? p.summary,
		meta_title: en.meta_title ?? p.meta_title,
		meta_description: en.meta_description ?? p.meta_description,
		description: en.description ?? p.description,
		highlights: en.highlights ?? p.highlights,
		specs: en.specs ?? p.specs,
		faq: en.faq ?? p.faq,
		tags: en.tags ?? p.tags,
		images,
	};
}

/** Traducción de los textos de la interfaz. Clave = texto en español tal como aparece en la vista. */
const EN: Record<string, string> = {
	// Cabecera, pie y avisos
	"Saltar al contenido": "Skip to content",
	"Catálogo": "Catalog",
	"Ofertas": "Deals",
	"Agentes para empresas": "AI agents for business",
	"Blog": "Blog",
	"Mis compras": "My purchases",
	"Entrar": "Sign in",
	"Salir": "Sign out",
	"Salir de mi cuenta": "Sign out",
	"Menú": "Menu",
	"Abrir menú": "Open menu",
	"Cerrar menú": "Close menu",
	"Desde $0": "From $0",
	"Volver al blog": "Back to the blog",
	"Cambiar a tema claro u oscuro": "Switch between light and dark theme",
	"en tu 1.ª compra con": "off your first purchase with",
	"Herramientas de IA en español para crear anuncios, videos y automatizaciones. Pago único, descarga inmediata.":
		"Spanish-first AI tools for ads, video and automation. One-time payment, instant download.",
	"Tienda": "Store",
	"Ayuda": "Help",
	"Soporte": "Support",
	"Reembolsos": "Refunds",
	"Contacto": "Contact",
	"Legal": "Legal",
	"Términos": "Terms",
	"Privacidad": "Privacy",
	"Pagos seguros con": "Secure payments with",
	"Idioma": "Language",
	"Vendido por Tony Ciencia LLC · 8206 Louisiana Blvd NE, Ste A #6812, Albuquerque, NM 87113, EE. UU. Precios en dólares estadounidenses (USD).":
		"Sold by Tony Ciencia LLC · 8206 Louisiana Blvd NE, Ste A #6812, Albuquerque, NM 87113, USA. Prices in US dollars (USD).",
	// Popup del cupón de bienvenida
	"Cerrar": "Close",
	"1.ª compra": "1st purchase",
	"Copia el código y escríbelo al comprar. Se aplica en el checkout seguro de Stripe.":
		"Copy the code and enter it at checkout. It's applied at Stripe's secure checkout.",
	"Copiar": "Copy",
	"Ver productos": "See products",
	"Válido una vez por cuenta, en productos de precio fijo.": "Valid once per account, on fixed-price products.",
	"Cupón": "Coupon",
	// Páginas de error y avisos
	"Aviso": "Notice",
	"Volver al catálogo": "Back to the catalog",
	"Página no encontrada": "Page not found",
	"Producto no encontrado": "Product not found",
	"Revisa el enlace o vuelve al catálogo.": "Check the link or go back to the catalog.",
	"Revisa el enlace.": "Check the link.",
	"Este producto no existe o ya no está disponible.": "This product doesn't exist or is no longer available.",
	"Algo salió mal": "Something went wrong",
	"Ocurrió un error inesperado. Inténtalo de nuevo en unos minutos.": "An unexpected error occurred. Please try again in a few minutes.",
	"No pudimos iniciar el pago. Inténtalo de nuevo en unos minutos.": "We couldn't start the payment. Please try again in a few minutes.",
	"Ese cupón no es válido o ya no está disponible. Revisa el código o compra sin cupón.":
		"That coupon isn't valid or is no longer available. Check the code or buy without a coupon.",
	"Revisa tu correo: no parece válido.": "Check your email address: it doesn't look valid.",
	"No pudimos guardar tu reseña: elige de 1 a 5 estrellas y usa menos de 1500 caracteres.":
		"We couldn't save your review: pick 1 to 5 stars and use fewer than 1,500 characters.",
	"El cupón de bienvenida es solo para tu primera compra. ¡Gracias por volver! Puedes comprar sin cupón.":
		"The welcome coupon is only for your first purchase. Thanks for coming back! You can buy without a coupon.",
	"En «paga lo que quieras» tú eliges el precio, así que no se combinan cupones.":
		"With pay what you want you choose the price, so coupons can't be combined.",
	"Escribe un monto válido en dólares, por ejemplo 12 o 12.50.": "Enter a valid amount in dollars, for example 12 or 12.50.",
	"Escribe 0 para descargarlo gratis o un monto desde $0.50 USD.": "Enter 0 to download it for free, or an amount from $0.50 USD.",
	"Los pagos con tarjeta empiezan en $0.50 USD. Escribe 0 para descargarlo gratis o un monto desde $0.50.":
		"Card payments start at $0.50 USD. Enter 0 to download it for free, or an amount from $0.50.",
	"¡Listo! Te avisaremos por correo el día del lanzamiento.": "Done! We'll email you on launch day.",
	"¡Gracias por tu reseña!": "Thanks for your review!",
	// Lista de espera (productos «Próximamente»)
	"Avísame cuando salga": "Notify me when it launches",
	"tu@correo.com": "you@email.com",
	"Unirme a la lista de espera": "Join the waitlist",
	"Gratis y sin compromiso. Solo te escribimos para avisarte del lanzamiento.": "Free, no strings attached. We only email you to announce the launch.",
	// Catálogo
	"Mi stack de herramientas de IA": "My AI tool stack",
	"Productos": "Products",
	"Agentes y skills de IA en español para anuncios, video y SEO · pago único · descarga inmediata":
		"AI agents and skills for ads, video and SEO · one-time payment · instant download",
	"Todo": "All",
	"Disponibles ahora": "Available now",
	"Filtros rápidos": "Quick filters",
	"Buscar en el catálogo": "Search the catalog",
	"Buscar en el catálogo…": "Search the catalog…",
	"Categoría": "Category",
	"Todas las categorías": "All categories",
	"Ordenar por": "Sort by",
	"Destacados": "Featured",
	"Precio: menor a mayor": "Price: low to high",
	"Precio: mayor a menor": "Price: high to low",
	"Más nuevos": "Newest",
	"Mejor valorados": "Top rated",
	"Aplicar": "Apply",
	"producto": "product",
	"productos": "products",
	"Todavía no hay productos publicados. Vuelve pronto.": "No products yet. Check back soon.",
	"No encontramos productos con esos filtros.": "No products match those filters.",
	"Ver todos": "See all",
	"Servicio a medida": "Done-for-you service",
	"¿Prefieres que lo construyamos por ti?": "Rather have us build it for you?",
	"Diseñamos y entregamos agentes de IA para tu empresa: ventas por WhatsApp, atención, agenda y automatizaciones conectadas a tu CRM. Reserva un diagnóstico y ve los horarios disponibles antes de pagar.":
		"We design and deliver AI agents for your business: WhatsApp sales, support, scheduling and automations connected to your CRM. Book a discovery session and see open slots before you pay.",
	"Ver el servicio": "See the service",
	"Por qué Market Tony": "Why Market Tony",
	"Herramientas prácticas, compra sin riesgo": "Practical tools, risk-free purchase",
	"Enfocadas en un trabajo concreto": "Built for one specific job",
	"Cada producto resuelve una tarea puntual: anuncios, video, SEO técnico o automatización. Las fichas dicen qué hace y qué no.":
		"Each product solves one task: ads, video, technical SEO or automation. Every page says what it does and what it doesn't.",
	"Pago único o tú eliges el precio": "One-time payment or pay what you want",
	"Sin suscripciones. Algunos productos son «paga lo que quieras»: desde $0. Las herramientas de IA que uses aparte tienen su propio costo.":
		"No subscriptions. Some products are pay-what-you-want, from $0. The AI tools you use alongside them have their own cost.",
	"En español y con soporte": "Spanish-first, with real support",
	"Guías e instrucciones en español. Si algo no funciona, te responde una persona por correo.":
		"Guides are written in Spanish (some products include English docs). If something breaks, a real person answers your email.",
	"Preguntas frecuentes": "FAQ",
	"Antes de comprar": "Before you buy",
	// Tarjeta y precio
	"Producto digital": "Digital product",
	"Ver oferta": "See deal",
	"Elegir precio": "Name your price",
	"Ver": "View",
	"Avísame": "Notify me",
	"Paga lo que quieras": "Pay what you want",
	"Próximamente": "Coming soon",
	"Más vendido": "Bestseller",
	"sugerido": "suggested",
	"precio previsto": "planned price",
	"Funciona con": "Works with",
	"Las marcas pertenecen a sus titulares; se muestran solo para indicar compatibilidad.":
		"Trademarks belong to their owners and are shown only to indicate compatibility.",
	// Confianza
	"Descarga inmediata": "Instant download",
	"En tu correo y en Mis compras apenas se confirma el pago.": "In your inbox and in My purchases as soon as payment clears.",
	"Pago seguro con Stripe": "Secure checkout with Stripe",
	"No vemos ni guardamos los datos de tu tarjeta.": "We never see or store your card details.",
	"Reembolso en 14 días": "14-day refund",
	"Si aún no lo descargaste.": "If you haven't downloaded it yet.",
	"Soporte en español": "Human support",
	"Te responde una persona: business@tonyciencia.com": "A real person replies: business@tonyciencia.com",
	// Ficha
	"Ruta": "Breadcrumb",
	"Imagen anterior": "Previous image",
	"Imagen siguiente": "Next image",
	"Imágenes del producto": "Product images",
	"Secciones del producto": "Product sections",
	"Descripción": "Description",
	"Detalles": "Details",
	"Preguntas": "Questions",
	"Reseñas": "Reviews",
	"Detalles del producto": "Product details",
	"Precio": "Price",
	"Entrega": "Delivery",
	"Descarga digital inmediata": "Instant digital download",
	"Vendido por": "Sold by",
	"Sigue explorando": "Keep exploring",
	"Completa tu kit": "Complete your kit",
	"Ver todo el catálogo": "See the full catalog",
	"Comprar": "Buy",
	"Descargar": "Download",
	"Producto digital · Descarga inmediata": "Digital product · Instant download",
	"Recurso gratis": "Free resource",
	"En desarrollo": "In development",
	"Pago único · sin suscripción": "One-time payment · no subscription",
	"Tú pones el precio": "You name the price",
	"Tú eliges el precio": "You choose the price",
	"Desde": "From",
	"Sugerido": "Suggested",
	"Precio previsto": "Planned price",
	"Lista de espera abierta": "Waitlist open",
	"Ahorras": "You save",
	"Oferta · antes": "Deal · was",
	"en tu 1.ª compra": "on your first purchase",
	"con": "with",
	"Montos rápidos": "Quick amounts",
	"Continuar con": "Continue with",
	"Entrar con Google para comprar": "Sign in with Google to buy",
	"Entrar con Google para descargar": "Sign in with Google to download",
	"Entrar con Google para elegir tu precio": "Sign in with Google to choose your price",
	"Continuar con Google": "Continue with Google",
	"Sin contraseñas: entras con tu cuenta de Google. Solo guardamos tu correo y tu nombre.":
		"No passwords: sign in with your Google account. We only store your email and name.",
	"Entras con tu cuenta de Google, sin contraseña. Después puedes cambiar el monto.": "Sign in with Google, no password. You can change the amount afterwards.",
	"¿Tienes un cupón?": "Have a coupon?",
	"Código de cupón": "Coupon code",
	"Código (opcional)": "Code (optional)",
	"El descuento se aplica al pagar con Stripe.": "The discount is applied at Stripe checkout.",
	"Comprar ahora": "Buy now",
	"Pago seguro con Stripe.": "Secure checkout with Stripe.",
	"Ya es tuyo.": "It's yours.",
	"Puedes descargarlo cuando quieras desde Mis compras.": "Download it anytime from My purchases.",
	"Ir a Mis compras": "Go to My purchases",
	"Descargar gratis": "Download for free",
	"Aún no hay reseñas. Las reseñas solo las pueden dejar personas que tienen el producto, desde":
		"No reviews yet. Only people who own the product can leave one, from",
	"Compra verificada": "Verified purchase",
	"Comprador verificado": "Verified buyer",
	"reseña": "review",
	"reseñas": "reviews",
	"de compradores verificados": "from verified buyers",
	"Pagos con tarjeta desde $0.50 hasta": "Card payments from $0.50 up to",
	"Escribe 0 para descargarlo gratis, o apoya al creador con lo que quieras.": "Enter 0 to download it for free, or support the creator with any amount.",
	"Mínimo": "Minimum",
	"Quiero recibir novedades y recursos de Tony Ciencia por correo (opcional).": "Send me news and resources from Tony Ciencia by email (optional).",
	"Precio anterior": "Previous price",
	"Producto": "Product",
	// Piezas incluidas (columna compat.includes)
	"Agente de anuncios": "Ad agent",
	"App local": "Local app",
	"Editor de video": "Video editor",
	"Panel de Chrome": "Chrome panel",
	"13 agentes creativos": "13 creative agents",
	"Extensión de Chrome": "Chrome extension",
};

export function t(lang: Lang, es: string): string {
	return lang === "en" ? (EN[es] ?? es) : es;
}

/** En un componente: const tr = useT(); tr("Catálogo"). */
export const useT = () => {
	const lang = useLang();
	return (es: string) => t(lang, es);
};

/** «1 venta» / «12 sales». */
export function salesLabel(lang: Lang, n: number): string {
	if (lang === "en") return n === 1 ? "1 sale" : `${n.toLocaleString("en-US")} sales`;
	return n === 1 ? "1 venta" : `${n.toLocaleString("es")} ventas`;
}

const CATEGORY_EN: Record<string, string> = {
	anuncios: "AI advertising",
	video: "AI video",
	automatizacion: "Automation",
	contenido: "Content & social",
	"seo-web": "SEO & web speed",
	diseno: "Design & creative",
	agentes: "AI agents",
};
export const categoryLabelIn = (lang: Lang, slug: string, es: string | null) => (lang === "en" ? (CATEGORY_EN[slug] ?? es) : es);

/** Etiqueta manual del admin (columna `badge`): por ahora solo «Versión X» tiene traducción automática. */
export const badgeLabelIn = (lang: Lang, label: string) => (lang === "en" ? label.replace(/^Versión(?=\s)/, "Version") : label);

/** «10 % de descuento» / «10% off», para el cupón de bienvenida. Vacío si no hay cifra. */
export function offerPhrase(lang: Lang, offer: { percentOff: number | null; amountOffText: string | null }): string {
	if (offer.percentOff) return lang === "en" ? `${offer.percentOff}% off` : `${offer.percentOff} % de descuento`;
	if (offer.amountOffText) return lang === "en" ? `${offer.amountOffText} off` : `${offer.amountOffText} de descuento`;
	return "";
}
