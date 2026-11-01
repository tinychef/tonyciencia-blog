# Diagnóstico de Market Tony (celular y escritorio) — 2026-11-01

Mediciones propias sobre producción (`https://tonyciencia.com/market`) el 2026-11-01 con Playwright (Chromium):
celular 390×844 a 2x con user agent de iPhone, escritorio 1440×900, popup del cupón desactivado. Lighthouse 12.8.2
móvil sobre el catálogo. Capturas en `capturas-actuales/` (las de página completa van reducidas para pesar menos de
600 KB). Ordenado por impacto en ventas: lo que impide comprar, después lo que impide entender y al final la estética.

## Resumen de mediciones

| Página (celular 390) | Ancho real | Alto | Primer producto | Precio | Botón de compra |
|---|---|---|---|---|---|
| Catálogo `/market/` | 390 | 9.382 px (11,1 pantallas) | 750 px | — | — |
| Ficha Anuncios Infinitos | **918** | 10.381 px | — | 1.181 px | 1.307 px |
| Ficha SpecReel | **576** | 18.213 px | — | 999 px | 1.125 px |
| Ficha SpecReel Stick | 390 | 9.173 px | — | — | — |
| Ficha PageSpeed Forensics | 390 | 9.866 px | — | 872 px | 987 px |
| Ficha CutPilot | 390 | 9.767 px | — | 872 px | 1.017 px |
| Ficha Motor creativo | 390 | 10.399 px | — | — | — |

Lighthouse móvil del catálogo: rendimiento **98**, accesibilidad **100**; FCP 1,8 s, LCP 2,1 s (la imagen del
destacado), TBT 50 ms, CLS 0. El rendimiento **no** es el problema; el problema es de diseño y de mensaje.

## 1. Las dos fichas con oferta se desbordan a lo ancho en celular (impide comprar)

- `producto/anuncios-infinitos`: el documento mide **918 px** de ancho en una pantalla de 390. Chrome móvil achica
  toda la página para que entre, así que el texto se ve diminuto y la portada sale cortada
  (`capturas-actuales/movil-anuncios-pliegue.png`, `movil-anuncios-completa-desborde.jpg`).
- `producto/specreel`: **576 px**. Las otras cuatro fichas miden 390 (no se desbordan).
- Causa encontrada en el código: en `workers/market/public/market/static/market.css` línea 359,
  `@media (max-width: 920px) { .mk-product2 { grid-template-columns: 1fr; } }`. `1fr` equivale a
  `minmax(auto, 1fr)`, así que la columna crece hasta el ancho mínimo de su contenido; la tira de miniaturas
  (`.mk-thumbs`) de Anuncios Infinitos tiene 8 imágenes y la de SpecReel 5, y empujan la columna a 902 y 560 px.
  Arreglo de una línea: `minmax(0, 1fr)` (como ya hace la regla de escritorio de la línea 358).
- Coincide con lo medido por el dueño (918 px).

## 2. El precio y el botón de compra quedan fuera del primer pantallazo de la ficha

- En celular, el titular de la ficha empieza en 606 px y el precio en 872 px (PageSpeed y CutPilot); en SpecReel el
  botón está en 1.125 px y en Anuncios en 1.307 px. El primer pantallazo (844 px) muestra cabecera, migas, galería y
  miniaturas, pero no el precio ni el botón (`capturas-actuales/movil-pagespeed-pliegue.png`).
- La barra de compra fija (`.mk-buybar`) existe, pero no está visible en el primer pantallazo.
- Referencia: la ficha de Gumroad en celular muestra precio y botón «Buy this» fijos abajo desde el primer pantallazo
  (observado el 2026-11-01 en `justinpt.gumroad.com/l/iftra`).

## 3. Anuncios Infinitos promete algo que su propia ficha niega (confianza)

- La tarjeta y la ficha dicen «2 en 1: Agente de anuncios + Extensión de Chrome».
- La misma ficha, en Preguntas frecuentes: «¿Incluye una extensión de Chrome? No. El paquete trae el agente, la app
  local y las guías.» y «Qué trae el ZIP» no menciona extensión.
- Es un dato de catálogo (columna `compat` → `includes`), no de diseño: corregirlo es tarea del `ecommerce-manager`
  por migración. Las maquetas ya muestran «Agente + app local».

## 4. El catálogo en celular empieza con 750 px de texto y repite productos

- Antes del primer producto: aviso del cupón en dos líneas (83 px), cabecera (65 px), sobretítulo de dos líneas,
  titular, bajada, buscador, cuatro «Populares» en líneas separadas y tres líneas de confianza. El primer producto
  aparece a **750 px** (coincide con lo medido por el dueño).
- Hay 6 productos pero **9 tarjetas**: SpecReel aparece 3 veces (destacado del hero, sección Ofertas y catálogo) y
  Anuncios Infinitos 2 veces (Ofertas y catálogo). Eso, más los bloques de categorías, servicio,
  «Por qué Market Tony», confianza y preguntas, lleva el catálogo a **9.382 px** (11 pantallas) en celular y 4.948 px
  en escritorio (`capturas-actuales/movil-catalogo-completa.jpg`).
- 69 textos visibles de menos de 14 px en el catálogo en celular (etiquetas, ahorro, «Sugerido», compatibilidades).

## 5. Las portadas no se leen dentro de la tarjeta y no cuentan el dolor (impide entender)

Las portadas actuales (1600×1000) son mini landings: sobretítulo, titular, párrafo, chips y un panel con terminal o
interfaz. En la tarjeta de celular se ven a **356 px de ancho, o sea al 22 %**
(`capturas-actuales/portadas-actuales-a-tamano-tarjeta.png`). Altura aproximada de las mayúsculas a ese tamaño
(tamaño de letra del diseño × 0,2225 × 0,73):

| Portada | Titular | Mayúsculas en la tarjeta | Párrafo (26 px) | Chips (19 px) |
|---|---|---|---|---|
| Anuncios Infinitos | «250+ PROMPTS DE ANUNCIOS» 146 px | ~24 px | 5,8 px de letra | 4,2 px |
| SpecReel | **«Ask your agent. Get the video.»** (en inglés) 94 px | ~15 px | ilegible | ilegible |
| SpecReel Stick | «Tu idea, en muñequitos de palo.» 104 px | ~17 px | ilegible | ilegible |
| PageSpeed Forensics | «Encuentra los puntos que faltan.» 96 px | ~16 px | ilegible | ilegible |
| CutPilot | «Tu grabación cruda, editada en tu PC.» 90 px | ~15 px | ilegible | ilegible |
| Motor creativo | «13 agentes creativos en español.» 108 px | ~18 px | ilegible | ilegible |

- Solo el titular pasa el mínimo de 14 px de la heurística de la skill; todo lo demás (60–70 % del lienzo) es ruido
  a ese tamaño. Ninguna nombra el dolor del comprador de forma legible salvo Anuncios Infinitos.
- SpecReel está en inglés en una tienda en español (y su ficha también: la descripción completa está en inglés).
- PageSpeed Forensics: lo que se ve grande es «2067 ms», una cifra de traza técnica que no es el dolor del comprador
  (el puntaje). El dolor real ya está escrito en su ficha: «por qué tu web saca 85 en PageSpeed móvil y 100 en tu PC».
- Motor creativo comunica una característica (13 agentes), no qué le resuelve a quien compra.

## 6. Imágenes vacías en la captura de página completa (no es un error para el comprador)

- Comprobado: en una captura de página completa **sin desplazar**, 5 imágenes salen vacías (SpecReel Stick,
  PageSpeed, CutPilot, Motor y la mascota del servicio): tienen `loading="lazy"` y Chrome solo las pide cuando quedan
  a cierta distancia de la pantalla (`capturas-actuales/movil-catalogo-completa-sin-desplazar.jpg`). Con desplazamiento
  real cargan las 6 (`movil-catalogo-completa.jpg`). La tarjeta vacía que vio el dueño es el mismo efecto.
- Para un comprador que desplaza no pasa; sí afecta a herramientas de captura. Prioridad baja. En la propuesta solo la
  primera portada visible va sin `lazy`.

## 7. Peso de las portadas

- Portadas actuales en WebP: 49–84 KB cada una, servidas a 1600 px para huecos de 356 px. Lighthouse marca
  «uses-responsive-images» con 100 KiB de ahorro posible. Se resuelve con `srcset` 800w/1600w, no con el diseño.
