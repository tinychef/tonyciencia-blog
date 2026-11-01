# Política de afiliados y fuentes (resumen operativo)

Verificado el 2026-11-01 en las fuentes enlazadas. Si cambian, manda la fuente oficial.

## Aviso de afiliados (FTC — Endorsement Guides)
Fuente: https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking
- La relación de afiliado se divulga de forma **clara y visible** en el propio artículo. "The closer the disclosure is to
  your recommendation, the better."
- **No basta** un aviso al pie de la página, ni solo un enlace a una página legal ("A hyperlinked disclosure like that is
  easily avoidable"), ni un aviso único en la home.
- "affiliate link" a secas o un botón "comprar" no se consideran divulgación suficiente; sí un texto como
  "I get commissions for purchases made through links in this post".
- Regla del blog: frase de transparencia en los 3 primeros bloques, antes del primer enlace de afiliado, + enlace a
  `/legal/afiliados` (o `/en/legal/affiliate`). El validador lo exige.

Texto estándar (lo antepone `pnpm post:new` si falta):
> *Transparencia: este artículo contiene enlaces de afiliado. Si compras o te registras a través de ellos, Tony Ciencia
> puede recibir una comisión sin costo extra para ti. No cambia nuestra opinión: solo recomendamos herramientas que
> revisamos con fuentes oficiales. Más detalles.*

Productos propios (Market Tony): además, "es un producto de Tony Ciencia" junto a la recomendación.

## Enlaces pagados (Google Search)
Fuentes: https://developers.google.com/search/docs/essentials/spam-policies ·
https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links
- Comprar/vender enlaces no viola las políticas si se cualifican con `rel="sponsored"` o `rel="nofollow"`.
- El blog lo hace automáticamente: `src/components/PortableTextLink.astro` marca como
  `rel="sponsored nofollow noopener"` (y pestaña nueva) todo enlace cuyo host sea de la base de afiliados o de una red
  de afiliación. No hay que poner nada en el Markdown.

## Densidad y ubicación
- ≤ 1 enlace de afiliado cada ~250 palabras del cuerpo; ≤ 2 por partner; ninguno en encabezados ni en el FAQ.
- Primero el valor (qué hace, para quién, contras) y después el enlace. Nada de listas de enlaces sin contexto.
- Si una herramienta mejor para el lector **no** está en la base, recomiéndala igual sin enlace de afiliado.

## Qué cuenta como dato verificado
| Dato | Fuente válida | Formato en el texto |
|---|---|---|
| Precio / plan | Página de precios oficial | "US$24/mes (US$16/mes en pago anual), consultado el 1 nov 2026" |
| Función | Sitio, docs o changelog oficial | Sin superlativos que la fuente no diga |
| Lanzamiento / versión | Nota de prensa o blog oficial | Con fecha |
| Estadística | Estudio primario (quién, muestra, año) | "según el informe 2026 de Wyzowl (encuesta a N personas)" |
| Experiencia personal | Solo notas del dueño | Si no hay, no se escribe en primera persona |

Prohibido: inventar precios "antes", descuentos, testimonios, puntuaciones, cantidad de usuarios, resultados de pruebas,
capturas, cupones. Si falta un dato imprescindible: `[dato pendiente: …]` en el borrador y en el cuerpo del PR (el
validador no lo bloquea; el revisor humano sí).

## Contenido sintético
Si el artículo enseña a generar video realista con IA, menciona que YouTube exige declarar el contenido realista
alterado o sintético (https://support.google.com/youtube/answer/14328491) y que no hay que hacerlo para subtítulos,
guiones o mejoras estéticas menores.
