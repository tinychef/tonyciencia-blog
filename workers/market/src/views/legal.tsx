import type { FC } from "hono/jsx";

/**
 * Textos legales BASE de Market Tony — BORRADOR para revisión del dueño (y, idealmente, de un abogado).
 * No son asesoría legal. Al cambiar algo sustancial, actualizar LEGAL_UPDATED.
 */
export const LEGAL_UPDATED = "29 de octubre de 2026";
const SELLER = "Tony Ciencia LLC";
const EMAIL = "business@tonyciencia.com";
const ADDRESS = "8206 Louisiana Blvd NE, Ste A #6812, Albuquerque, NM 87113, Estados Unidos";

interface Section {
	h: string;
	p?: string[];
	list?: string[];
}

interface LegalDoc {
	title: string;
	intro: string;
	sections: Section[];
}

export const LEGAL_DOCS: Record<"terminos" | "privacidad" | "reembolsos", LegalDoc> = {
	terminos: {
		title: "Términos y condiciones de Market Tony",
		intro: `Estos términos regulan las compras y descargas en Market Tony (tonyciencia.com/market). El vendedor es ${SELLER} ("Tony Ciencia", "nosotros"), con domicilio en ${ADDRESS}. Al comprar o descargar un producto aceptas estos términos.`,
		sections: [
			{
				h: "Qué vendemos",
				p: [
					"Productos digitales descargables: agentes y prompts de IA, plantillas, guías y recursos similares. No hay envíos físicos. Algunos productos son de pago y otros gratuitos.",
				],
			},
			{
				h: "Cuenta y acceso",
				p: [
					"Para comprar o descargar entras con tu cuenta de Google. No usamos contraseñas. Eres responsable de mantener segura tu cuenta de Google y de que el correo asociado sea correcto, porque es donde enviamos tus enlaces de descarga.",
				],
			},
			{
				h: "Precios y pago",
				p: [
					"Los precios se muestran en dólares estadounidenses (USD). El precio que pagas es el que figura en la tienda al momento de la compra; lo fija nuestro sistema, no el navegador.",
					"Los pagos los procesa un proveedor de pagos externo (actualmente Stripe). No recibimos ni guardamos los datos de tu tarjeta. Si corresponde aplicar impuestos, se mostrarán antes de que confirmes el pago.",
				],
			},
			{
				h: "Entrega",
				list: [
					"Cuando el pago se confirma, el producto aparece en «Mis compras» y te enviamos un correo con un enlace de descarga personal.",
					"Los enlaces de descarga son personales, vencen y tienen un número máximo de descargas por compra. Guarda una copia del archivo en tu equipo.",
					"Si no recibes el correo o el enlace no funciona, escríbenos a " + EMAIL + " y lo resolvemos.",
				],
			},
			{
				h: "Licencia de uso",
				p: [
					"Te otorgamos una licencia personal, no exclusiva e intransferible para usar el producto en tu propio negocio o en los proyectos de tus clientes. No puedes revender, redistribuir, compartir públicamente ni ofrecer el archivo (total o parcialmente) como producto propio, ni subirlo a sitios de descarga.",
				],
			},
			{
				h: "Sin garantía de resultados",
				p: [
					"Nuestros productos son herramientas de trabajo y formación. NO garantizamos resultados de ventas, ingresos, clientes, conversiones, alcance ni rendimiento publicitario. Los resultados dependen de tu oferta, tu mercado, tu presupuesto, tu ejecución y de plataformas de terceros (por ejemplo Meta, Google o TikTok) que no controlamos.",
					"Cualquier ejemplo o caso mencionado es ilustrativo y no representa resultados típicos ni prometidos.",
				],
			},
			{
				h: "Inteligencia artificial y plataformas de terceros",
				p: [
					"Los prompts y agentes producen contenido generado por IA que puede contener errores. Revisa todo antes de publicarlo. Eres responsable de que tus anuncios y contenidos cumplan las políticas de cada plataforma y las leyes aplicables (publicidad, consumo, datos personales, propiedad intelectual).",
				],
			},
			{
				h: "Propiedad intelectual",
				p: [`Los productos y su contenido son propiedad de ${SELLER} o de sus licenciantes y están protegidos por las leyes de propiedad intelectual.`],
			},
			{
				h: "Reembolsos",
				p: ["Las condiciones de reembolso están en la Política de reembolsos de Market Tony, que forma parte de estos términos."],
			},
			{
				h: "Limitación de responsabilidad",
				p: [
					"En la máxima medida permitida por la ley, nuestra responsabilidad total por cualquier reclamo relacionado con un producto se limita al importe que pagaste por ese producto. No respondemos por daños indirectos, lucro cesante ni pérdida de datos.",
				],
			},
			{
				h: "Ley aplicable y cambios",
				p: [
					"Estos términos se rigen por las leyes del Estado de Nuevo México, Estados Unidos, sin perjuicio de las normas imperativas de protección al consumidor de tu país de residencia.",
					"Podemos actualizar estos términos; la versión vigente es la publicada en esta página. Las compras ya hechas se rigen por la versión vigente al momento de la compra.",
				],
			},
		],
	},

	privacidad: {
		title: "Política de privacidad de Market Tony",
		intro: `Esta política explica qué datos trata ${SELLER} cuando usas Market Tony (tonyciencia.com/market). Complementa la política de privacidad general de tonyciencia.com.`,
		sections: [
			{
				h: "Responsable",
				p: [`${SELLER}, ${ADDRESS}. Contacto: ${EMAIL}.`],
			},
			{
				h: "Qué datos guardamos",
				list: [
					"De tu cuenta de Google: solo tu correo electrónico y tu nombre. No guardamos tu foto, tus contactos ni ningún otro dato de Google, y no tenemos acceso a tu contraseña.",
					"Tus pedidos y descargas: qué productos tienes, cuándo los obtuviste, el importe y cuántas veces descargaste cada uno.",
					"Tu decisión sobre correos de novedades (si marcaste la casilla y cuándo).",
					"Datos técnicos necesarios para seguridad, como la dirección IP, usados de forma temporal para limitar abusos.",
				],
			},
			{
				h: "Para qué los usamos",
				list: [
					"Darte acceso a tus productos y enviarte los enlaces de descarga (necesario para cumplir la compra).",
					"Enviarte correos de compra y de descarga. Una copia de cada uno de esos correos llega a nuestro buzón interno para soporte y control.",
					"Enviarte novedades y recursos SOLO si marcaste la casilla opcional. Sin esa casilla no te enviamos marketing. Puedes cambiar tu decisión en «Mis compras».",
					"Prevenir fraude y abuso, y cumplir obligaciones legales, contables y fiscales.",
				],
			},
			{
				h: "Con quién los compartimos",
				list: [
					"Google, para el inicio de sesión.",
					"Stripe, que procesa los pagos y recibe los datos de tu tarjeta directamente.",
					"Cloudflare (alojamiento, base de datos, archivos y envío de correo) y, si se usa como respaldo, Resend (envío de correo).",
					"Autoridades, solo cuando la ley lo exija. No vendemos tus datos.",
				],
			},
			{
				h: "Cuánto tiempo",
				p: [
					"Conservamos tu cuenta y tus compras mientras sigas teniendo acceso a tus productos y durante el tiempo que exijan las obligaciones contables y fiscales. Las sesiones vencen a los 30 días.",
				],
			},
			{
				h: "Tus derechos",
				p: [
					`Puedes pedir acceso, corrección o eliminación de tus datos, u oponerte a los correos de novedades, escribiendo a ${EMAIL}. Si eliminamos tu cuenta, perderás el acceso a tus descargas.`,
				],
			},
			{
				h: "Cookies",
				p: [
					"Market Tony usa solo cookies necesarias: una de sesión (para mantenerte conectado) y una temporal durante el inicio de sesión. Son HttpOnly y seguras. También leemos tu preferencia de tema claro/oscuro del sitio. No usamos cookies de publicidad en la tienda.",
				],
			},
		],
	},

	reembolsos: {
		title: "Política de reembolsos de Market Tony",
		intro: "Queremos que compres con tranquilidad y, a la vez, proteger productos digitales que se pueden copiar una vez descargados.",
		sections: [
			{
				h: "Cuándo hay reembolso",
				list: [
					"Si pides el reembolso dentro de los 14 días posteriores a la compra y todavía no descargaste el producto.",
					"Si el archivo está dañado o no corresponde a lo descrito y no podemos solucionarlo en un plazo razonable.",
					"Si se te cobró dos veces por el mismo producto.",
				],
			},
			{
				h: "Cuándo no hay reembolso",
				list: [
					"Una vez descargado el producto, salvo que esté defectuoso o no corresponda a la descripción.",
					"Por no obtener determinados resultados de ventas o publicidad: no garantizamos resultados (ver Términos).",
					"Los productos gratuitos no tienen cobro y por lo tanto no aplican reembolsos.",
				],
			},
			{
				h: "Cómo pedirlo",
				p: [
					`Escríbenos a ${EMAIL} desde el correo con el que compraste, indicando el producto y la referencia del pedido (está en el correo de compra). Respondemos en un máximo de 5 días hábiles.`,
					"Si se aprueba, el reembolso se hace al mismo medio de pago a través de Stripe; los plazos de acreditación dependen de tu banco. Al reembolsarse, el acceso de descarga de esa compra se desactiva.",
				],
			},
			{
				h: "Tus derechos como consumidor",
				p: ["Esta política no limita los derechos que te otorguen las leyes de protección al consumidor de tu país de residencia."],
			},
		],
	},
};

export const LegalPage: FC<{ doc: LegalDoc; showDraftNote: boolean }> = ({ doc, showDraftNote }) => (
	<article class="mk-narrow mk-legal" style="max-width: 760px">
		{showDraftNote && (
			<p class="mk-alert mk-alert--warn">
				<strong>Texto base pendiente de revisión.</strong> Este aviso solo se ve en modo maqueta.
			</p>
		)}
		<h1>{doc.title}</h1>
		<p class="mk-muted">Última actualización: {LEGAL_UPDATED}</p>
		<p style="margin-top: var(--spacing-6)">{doc.intro}</p>
		{doc.sections.map((s) => (
			<section>
				<h2>{s.h}</h2>
				{s.p?.map((t) => <p>{t}</p>)}
				{s.list && (
					<ul>
						{s.list.map((t) => (
							<li>{t}</li>
						))}
					</ul>
				)}
			</section>
		))}
	</article>
);
