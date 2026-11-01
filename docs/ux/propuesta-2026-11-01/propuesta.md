# Propuesta de rediseño de Market Tony — 2026-11-01 (para aprobar, nada implementado)

Diagnóstico con mediciones: [`diagnostico.md`](diagnostico.md). Maquetas HTML en `maquetas/` y su render en `png/`.
Para regenerar: `node docs/ux/propuesta-2026-11-01/maquetas/generar.mjs` y después `node docs/ux/propuesta-2026-11-01/maquetas/renderizar.mjs`
(usa el Playwright de `workers/market/` y Google Fonts para las portadas). Nada de esto toca `workers/market/src/` ni producción.

## Qué cambia en las dos direcciones (lo común)

1. **Catálogo centrado y sin repeticiones.** Una sola columna central (máx. 1120 px), titular corto, filtros en una
   fila de chips desplazable (Todo, Ofertas, Desde $0, Video, Anuncios, SEO, Agentes, Ordenar) y los 6 productos una
   sola vez. Se quitan el destacado del hero, la sección «Ofertas» duplicada, la rejilla de categorías y «Populares»:
   las ofertas se marcan en la propia tarjeta y con el chip «Ofertas». El buscador pasa a un ícono en la cabecera del
   celular (en escritorio queda a la vista).
2. **Primer producto a 273 px en celular** (hoy 750). La tarjeta completa de A (portada, nombre, precio y botón) entra
   en el primer pantallazo (`png/A-catalogo-movil-pliegue.png`); en B entran 4 productos completos (2 filas).
3. **Aviso del cupón en una línea** de 36 px (hoy 83 px en dos líneas).
4. **Ficha con precio y botón en el primer pantallazo** y barra fija de compra cuando el botón sale de la pantalla
   (patrón de Gumroad en celular, observado el 2026-11-01 en `justinpt.gumroad.com/l/iftra`). Orden: portada, nombre,
   una línea de qué resuelve, precio, botón; después «El problema / Lo que hace», «Cómo funciona», «Qué recibes»,
   «Funciona con», «Antes de comprar» (las limitaciones honestas) y preguntas.
5. **Sin desborde horizontal** en ninguna maqueta (medido: 390 px en celular y 1440 en escritorio). En producción el
   arreglo es `minmax(0, 1fr)` en `.mk-product2` (ver diagnóstico §1), independiente de la dirección que se elija.
6. **Portadas con un solo mensaje: dolor → solución**, 2 a 5 palabras grandes, logos de las herramientas con las que
   funciona y una prueba visual (el resultado, no la interfaz). Nada de párrafos ni chips dentro de la imagen: eso va
   en el texto HTML de la tarjeta, que se lee, se indexa y es accesible.

## Dirección A — «Dolor → solución» (recomendada)

Una frase: *la tarjeta grande que cuenta el problema y lo resuelve en un vistazo*. Inspiración: portadas de producto
de Gumroad (lienzo 16:9 o similar, mínimo 1280×720 según su ayuda) y la sobriedad de las tiendas de Lemon Squeezy.

- **Portada 1600×1000 (16:10)**, igual que hoy: no cambia la galería de la ficha ni los `width/height` existentes.
  Fondo grafito, blanco y un solo verde. Arriba el dolor en gris (frase del comprador), al medio el titular de 2–3
  líneas a 136 px (118 en CutPilot), abajo los logos; a la derecha la prueba visual.
- **Legibilidad medida en la tarjeta de 390 px** (portada a 356 px, escala 0,2225): mayúsculas del titular ≈ **22 px**
  (19 px en CutPilot), frente a 15–17 px de hoy; la línea del dolor queda en ~13 px de letra (secundaria, se repite en
  HTML). Supera el mínimo de 14 px de `references/reglas-tarjetas-y-portadas.md`.
- **Tarjeta**: portada sin nada encima; tipo de producto + insignia (Oferta −57 % / Paga lo que quieras); nombre;
  una línea de qué resuelve (2 líneas máx.); «Agente + app local» o «Editor + panel de Chrome» cuando aplica (atributo
  de categoría de Baymard); logos de compatibilidad; precio grande y botón de 44 px.
- **Catálogo**: 1 columna en celular, 3 en escritorio (cada tarjeta mide ~357 px en las dos: la portada se ve igual en
  todos lados). Alto del catálogo en celular **4.613 px** (hoy 9.382, −51 %); escritorio 2.415 px (hoy 4.948).
- **Por qué la recomiendo**: con 6 productos, cada uno merece una tarjeta grande que explique su dolor; el texto de la
  portada se lee al doble de tamaño que en B; mantiene el formato 16:10 (menos trabajo y una sola imagen por
  producto); y el comprador ve precio y botón sin abrir la ficha.
- **Riesgo**: 6 portadas oscuras seguidas pueden parecerse entre sí; lo compensan el titular y la prueba visual
  distinta de cada una. Si el catálogo pasa de ~12 productos, conviene la rejilla de B.

## Dirección B — «Vitrina cuadrada»

Una frase: *la vitrina compacta de Gumroad Discover: imagen cuadrada protagonista y precio en etiqueta*. Inspiración:
Gumroad Discover (miniaturas de 600×600 mostradas a 232 px en celular, medido el 2026-11-01 en
`gumroad.com/discover`), Framer Marketplace (2 columnas en celular) y el tema Dawn de Shopify.

- **Portada 1080×1080 (1:1)**, fondo claro, objeto grande arriba y 2–3 palabras abajo a 132 px. En la tarjeta de
  2 columnas (173 px) las mayúsculas quedan en ≈ **15 px** (justo sobre el mínimo).
- **Tarjeta mínima**: portada, nombre, tipo y precio en etiqueta (ofertas con precio anterior real tachado); sin
  botón, toda la tarjeta es el enlace. Lo demás vive en la ficha.
- **Catálogo**: 2 columnas en celular (6 productos en 2,8 pantallas, **2.390 px**), 3 en escritorio (2.261 px).
- **Costo**: cada producto necesitaría 2 imágenes (cuadrada para la tarjeta y 16:10 para la ficha) y el mensaje del
  dolor se reduce a 2–3 palabras; la línea de qué resuelve desaparece de la tarjeta.

## Textos de las portadas y de dónde salen (nada inventado)

| Producto | Dolor (A) | Titular (A) | Titular (B) | Fuente |
|---|---|---|---|---|
| Anuncios Infinitos | Deja de armar anuncios de uno en uno. | 250+ prompts en una sesión. | 250+ prompts de anuncios | Ficha: «Deja de armarlos de uno en uno» (portada actual), «En una sesión de 20 a 40 minutos…», «Mínimo 5 categorías × 50 prompts». Categorías (Prueba social, Dolor y alivio, Autoridad, Urgencia) de `screen-2` actual. |
| SpecReel | Sin línea de tiempo. Sin créditos por minuto. | Una instrucción. Un video 3D. | Videos 3D con tu agente | Ficha: «No timeline editing. No per-minute video credits.», «Escribes una instrucción; recibes un MP4 terminado». Imagen: fotograma de la portada actual. |
| SpecReel Stick | Tú apruebas el guion. Tu agente anima. | Tu idea, en muñequitos de palo. | Tu idea en muñequitos | Portada y `screen-1` actuales; fotograma real `design/assets/specreel-stick/beat-4-final.jpg` (ejemplo incluido). |
| PageSpeed Forensics | ¿100 en tu PC y 85 en PageSpeed móvil? | Encuentra los puntos que faltan. | Los puntos que faltan | Ficha: «por qué tu web saca 85 en PageSpeed móvil y 100 en tu PC». README: «Lighthouse en `localhost` dice 100 y PageSpeed dice 85». |
| CutPilot | Sin «eh», silencios ni retomas. | Tu grabación cruda, editada en tu PC. | Tu video, ya editado | Ficha: «Quita muletillas, silencios, repeticiones y retomas», «Render en 16:9, 9:16 y 1:1». El texto con tachados es una ilustración, rotulada así. |
| Motor creativo | Pide en español la pieza que necesitas. | Un agente la produce. | 13 agentes creativos | Bajada de la ficha. Pedido de ejemplo: `artcraft-workspace/router/test_route.py`. 13 categorías: lista de la ficha. |

Compatibilidades de las tarjetas: columna «Funciona con» de cada ficha. Codex, Windows y LinkedIn van como texto
porque Simple Icons retiró sus logos (`src/lib/brands.ts`).

## PageSpeed: círculos antes → después sin inventar

No hay un caso medido de un cliente. Propongo dos versiones y la decisión es del dueño:

- **V2, «dolor», recomendada hoy** (`png/A-portada-pagespeed.png`, `A-tarjeta-pagespeed-390.png`, `B-portada-pagespeed.png`):
  dos círculos con **85 en PageSpeed móvil ≠ 100 en tu PC (Lighthouse local)**, logos de PageSpeed Insights y
  Lighthouse. No promete un resultado: repite el escenario que la ficha y el README ya describen, y la nota de la
  portada lo dice («Escenario de la ficha y del README. Sin afiliación con Google.»).
- **V1, «antes → meta» con la etiqueta EJEMPLO** (`png/A-portada-pagespeed-v1.png`, `A-tarjeta-pagespeed-v1-ejemplo-390.png`):
  85 → 100 con «EJEMPLO · no es un caso medido» visible y la fuente escrita («de casi 90 a 100» del README, «cerca de
  85» de la ficha). Es más vendedora pero se acerca a una promesa que la ficha niega («No garantiza un puntaje»).
- **Con un caso real** (sitio, fecha, enlace a pagespeed.web.dev antes y después), V1 pasa a «Caso real: <sitio>,
  <fecha>» sin la etiqueta EJEMPLO. Es la que más convence y la única que permitiría decir «de X a Y».
- Colores: el 85 va en gris y el 100 en el verde de la tienda (no en naranja como PageSpeed) para respetar la paleta
  monocroma con un solo verde. Los logos son de Simple Icons (CC0), con «sin afiliación con Google».

## Anuncios Infinitos y la extensión de Chrome

Todas las maquetas dicen **«Agente + app local»**, que es lo que la ficha declara que trae el ZIP. No se preparó la
variante «si se agrega la extensión»: si el dueño decide incluirla, basta cambiar ese rótulo por «Agente + app local
+ extensión de Chrome» en la portada y en la tarjeta. Mientras tanto, hay que quitar «Extensión de Chrome» de la columna
`compat` (tarea del `ecommerce-manager`), porque hoy la tarjeta y la ficha lo anuncian y la propia ficha lo niega.

## Qué se espera ganar

Son hipótesis a medir, no promesas: (1) más clics del catálogo a la ficha al ver un producto completo en el primer
pantallazo y entender el dolor en la portada; (2) menos abandonos en las dos fichas con oferta al quitar el desborde;
(3) más clics en comprar al tener precio y botón en el primer pantallazo de la ficha. Para medirlo: clics catálogo →
ficha por producto y ficha → «Comprar/Elegir precio», 2 semanas antes y 2 después (no hay tráfico para una prueba A/B).

## Costo en rendimiento

- Portadas A en WebP q86 (como `render-covers.mjs`): 45–59 KB (hoy 49–84 KB). Portadas B: 21–40 KB, pero B suma una
  segunda imagen por producto.
- Agregar `srcset` 800w/1600w a las portadas (Lighthouse calcula 100 KiB de ahorro). Solo la primera portada visible
  sin `lazy` y con `fetchpriority="high"`; las demás `loading="lazy"` con `width` y `height` (sin saltos de diseño).
- Sin fuentes nuevas en la tienda (sigue `system-ui`); Inter Tight solo se usa al dibujar las portadas.
- Menos HTML: el catálogo pasa de 9 tarjetas + secciones a 6 tarjetas.

## Si se aprueba: qué habría que implementar (otro encargo)

1. `market.css`: `minmax(0, 1fr)` en `.mk-product2` (se puede hacer ya, sin esperar la dirección).
2. `shop.tsx` → `Catalog`: quitar destacado, Ofertas duplicadas, categorías y Populares; chips de filtro; nueva tarjeta.
3. `shop.tsx` → `ProductPage`: reordenar (precio y botón arriba), galería sin miniaturas que empujen el ancho, barra
   fija que aparece cuando el botón sale de la pantalla.
4. `design/<slug>.html`: reemplazar las portadas por las de la dirección elegida y renderizar con `pnpm render:covers`.
5. Datos (por migración, `ecommerce-manager`): quitar «Extensión de Chrome» de Anuncios Infinitos; traducir la
   descripción de SpecReel.

## Preguntas para el dueño

1. ¿Dirección **A** (tarjeta grande, recomendada) o **B** (vitrina cuadrada de 2 columnas)?
2. PageSpeed Forensics: ¿**V2** (85 en PageSpeed ≠ 100 en tu PC, sin promesa), **V1** (85 → 100 con «EJEMPLO»), o
   tienes un caso real medido (sitio, fecha y enlaces de PageSpeed antes y después) para mostrar «de X a Y»?
3. Anuncios Infinitos: ¿la extensión de Chrome se va a incluir? Si no, ¿autorizas quitarla ya de la tarjeta y la ficha?
4. Portadas en la paleta de la tienda (grafito + un verde) o ¿quieres conservar el color propio de cada producto
   (amarillo de Anuncios, rojo de Stick, ámbar de PageSpeed, azul de Motor) como reconocimiento?
5. ¿Apruebas cada titular de portada de la tabla de textos? En especial «Una instrucción. Un video 3D.» (SpecReel) y
   «Un agente la produce.» (Motor creativo).
6. ¿Quitamos del catálogo el destacado, la sección Ofertas, la rejilla de categorías y «Populares», como en las maquetas?
7. «Paga lo que quieras»: hoy se entra con Google antes de elegir el monto. La maqueta muestra los montos (Gratis,
   $9, $18, $45) antes de entrar. ¿Quieres ese cambio de flujo?
8. ¿Quitamos la insignia «Nuevo» mientras todos los productos sean nuevos (hoy no distingue a ninguno)?
9. La descripción de SpecReel está en inglés: ¿la traducimos?
10. El cupón TONYCIENCIA: ¿la franja de una línea en todas las páginas es suficiente, o prefieres mantener también el
    popup?
