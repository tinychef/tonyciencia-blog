# Portadas finales de Market Tony — 2026-11-01

Dirección aprobada por el dueño: **estilo de la Dirección A** (fondo grafito `#0d0d0f`, Inter Tight grande, un solo
verde `#30d158`, dolor → solución) con la **fila de logos arriba** como en la Dirección B, y más drama (titulares
más grandes, el dolor tachado, prueba visual grande con un halo verde de un solo tono).

## Archivos

| Qué | Dónde |
|---|---|
| Fuente HTML de cada portada (solo se reemplazó la sección `data-out="cover"`; las pantallas `screen-1`/`screen-2` no se tocaron) | `workers/market/design/<slug>.html` |
| Generador de esas secciones (re-ejecutable, reemplaza entre `<!-- portada-final:inicio -->` y `<!-- portada-final:fin -->`) | `docs/ux/propuesta-2026-11-01/maquetas/portadas-finales.mjs` |
| Imágenes finales 1600×1000, WebP q82 | `workers/market/public/market/static/products/<slug>/cover.webp` |
| Portada animada de SpecReel Stick, 1600×1000, 35 cuadros a 10 fps (3,5 s en bucle), WebP q62 | `workers/market/public/market/static/products/specreel-stick/cover-animada.webp` |
| PNG de revisión: completa y a 358 px de ancho | `docs/ux/propuesta-2026-11-01/final/<slug>.png` y `<slug>-358.png` |
| Un cuadro de la portada animada | `docs/ux/propuesta-2026-11-01/final/specreel-stick-animada-cuadro-12.png` |
| Guiones de los 2 sketches nuevos de Stick (para volver a renderizarlos) | `docs/ux/propuesta-2026-11-01/final/sketches-stick/{ahorra,empieza}/` |
| Recursos de las portadas | `workers/market/design/assets/{logos,crafts,specreel,specreel-stick}/` |

Pesos: anuncios-infinitos 66 KB · specreel 66 KB · specreel-stick 55 KB · pagespeed-forensics 72 KB · cutpilot 58 KB ·
motor-creativo-claude-code 93 KB (todas ≤ 160 KB) · cover-animada 366 KB (≤ 450 KB).

### Cómo regenerarlas

```bash
node docs/ux/propuesta-2026-11-01/maquetas/portadas-finales.mjs          # parchea design/<slug>.html
cd workers/market
for s in anuncios-infinitos specreel specreel-stick pagespeed-forensics cutpilot motor-creativo-claude-code; do
  node scripts/render-covers.mjs $s --solo=cover,cover-animada
done
```

Cambios en `scripts/render-covers.mjs` (el flujo `pnpm render:covers` sigue igual):
- `--solo=<salidas>` renderiza solo esas secciones (así no se reescriben `screen-1`/`screen-2`). Ojo: sin `<slug>`
  aplica a **todos** los productos, también a los que no son de este encargo.
- Secciones con `data-anim="<cuadros>"` (+ `data-fps`, `data-width`, `data-quality`) se graban cuadro a cuadro con
  `window.__frame(i)` (determinista) y salen como WebP animado en bucle.
- Calidad WebP por defecto 82 (antes 86) para quedar bajo 160 KB; se puede fijar por sección con `data-quality`.
- `design/specreel.html`: la función `render()` del script 3D ahora salta los lienzos que ya no existen (estaban en la
  portada anterior). Sin eso, la página fallaba y no marcaba `__ready`.

## Legibilidad en la tarjeta (358 px de ancho, escala 0,224)

Medido con Playwright (alto real de la «H» de Inter Tight 800 a ese tamaño de letra):

| Portada | Tamaño del titular | % del alto | Mayúscula a 358 px |
|---|---|---|---|
| Anuncios Automáticos | 136 px («250+» a 230 px) | 13,6 % | 22,2 px |
| SpecReel | 150 px | 15,0 % | 24,6 px |
| SpecReel Stick | 128 px | 12,8 % | 21,0 px |
| PageSpeed Forensics | 128 px | 12,8 % | 21,0 px |
| CutPilot | 140 px | 14,0 % | 22,8 px |
| Motor creativo | 136 px | 13,6 % | 22,2 px |

Todas superan el mínimo de la skill (≥ 12 % del alto y ≥ 14 px de mayúscula en la tarjeta). Las notas al pie
(16–18 px) son ilegibles a 358 px a propósito: son la fuente/aclaración para quien ve la portada grande en la ficha.

## Fuente de cada texto, cifra y logo

Ficha = página de producción `https://tonyciencia.com/market/producto/<slug>`, leída el 2026-11-01.

### 1. Anuncios Automáticos (`anuncios-infinitos`)
- **Nombre «Anuncios Automáticos»**: pedido del dueño (el título en la base lo cambia la migración 0009 de otro agente).
- **Dolor «~~Anuncios de uno en uno.~~»**: ficha, «quieren dejar de producir anuncios de uno en uno».
- **«250+ prompts en una sesión.»**: ficha, «Mínimo 5 categorías de anuncio × 50 prompts = 250+ prompts» en «Qué
  recibes en tu primera sesión», y «En una sesión de 20 a 40 minutos te entrega…».
- **Tarjetas «×50» y «mín. 5 × 50 = 250+»**: misma línea de la ficha. Los nombres de las 5 categorías (Prueba social,
  Dolor y alivio, Autoridad, Urgencia, Antes y después) salen de la pantalla `screen-2` actual del producto
  (`design/anuncios-infinitos.html`); la portada lo dice: «Categorías de ejemplo».
- **«Agente + app local»**: ficha, «Qué trae el ZIP: El agente Tony… La app local…» y FAQ «¿Incluye una extensión de
  Chrome? No». No se escribió «extensión + agente» (la extensión no está en el ZIP de hoy).
- **Logos Claude (Claude Code), Codex (texto), Antigravity**: ficha, «Una herramienta de IA compatible: Claude Code,
  Cursor, Codex, Antigravity o Gemini» (sección «Qué necesitas» y «Detalles → Funciona con»).
- **Meta, Google Ads, TikTok (logos) y LinkedIn (texto)**: ficha, «Plataformas de anuncios: Meta, Google, TikTok y
  LinkedIn». Trazos de Simple Icons en `workers/market/src/lib/brands.ts`; LinkedIn en texto porque Simple Icons lo
  retiró.

### 2. SpecReel (`specreel`)
- **Dolor «~~Línea de tiempo.~~ ~~Créditos por minuto.~~»**: ficha, «No timeline editing. No per-minute video credits.»
- **«Video 3D con tu agente.»**: pedido del dueño; ficha, «Pide un video a tu agente y recibe un MP4 3D narrado…».
- **«MP4 3D narrado» / «subtítulos + .srt»**: ficha, «Escribes una instrucción; recibes un MP4 terminado con
  subtítulos karaoke y archivo .srt».
- **Miniaturas (cuadros reales, ninguno de la botella)**:
  - Centro, «Microneedling» (la cabeza): primer panel de `/home/user/specreel/examples/microneedling-capilar/poster.jpg`
    (279×496 px; el ejemplo no trae `preview.mp4`).
  - Izquierda, «Célula»: `examples/demo-celula/preview.mp4` a 7,5 s (mitocondria), extraído con ffmpeg.
  - Derecha, «Showreel»: `examples/showreel-en/preview.mp4` a 13,5 s (gráfica de barras 3D). El proceso de pago con
    íconos 3D (9,6 s del mismo video) es la alternativa si prefieres esa escena.
  - Los tres son ejemplos que vienen en el producto: ficha, «4 example productions… Showreel… Cell demo… Microneedling
    explainer». Nota en la portada: «Cuadros reales de 3 de los 4 ejemplos incluidos.»
- **Logos Claude (Claude Code) y Codex (texto)**: ficha, «Requirements: Claude Code or Codex» y FAQ «Does it work with
  both Claude Code and Codex? Yes.»; `/home/user/specreel/README.md` línea 1, «made by your coding agent (Claude Code &
  Codex)».

### 3. SpecReel Stick (`specreel-stick`)
- **Dolor «~~Grabarte en cámara.~~ Tu agente anima.»**: ficha, «quieren piezas cortas… sin grabarse en cámara» y
  «Tú apruebas el guion… y solo entonces anima» (método de la ficha: punto de control A y B).
- **«Tu idea en muñequitos de palo.»**: pedido del dueño; ficha, «Le cuentas la idea a tu agente y te devuelve un
  sketch de muñequitos de palo en MP4».
- **Tres miniaturas en tres escenarios distintos, todas renders reales del motor incluido**:
  1. «1 % mejor cada día» (escalones, banco, estilo noir rojo): cuadros de
     `/home/user/specreel-stick/examples/1-mejor-cada-dia/preview.mp4` (el ejemplo del ZIP).
  2. «Uno ahorra, otro gasta» (pila de cajas que crece, mostrador, kit de marca verde `#30d158` creado con
     `tools/brand.py from-colors`): sketch nuevo. Cifra del guion: 5 dólares al día × 365 = 1825.
  3. «El que empieza vs. el que espera» (pista con vallas y bandera, paleta clara `paper-ink` incluida): sketch nuevo.
     Cifra del guion: 1 intento por semana × 52 semanas = 52.
  - Los dos nuevos se hicieron sin IA, como dice el README («Change the story by editing the `SKIT` block in
    `src/scenes/s01_skit.js` and the lines in `narration/script.json`»): proyecto creado con
    `scripts/new_project.py` en `/tmp/…/scratchpad/stick/`, `tools/beats.py` y `node tools/render.js 0 999999 frames
    --scale 0.5` (471 cuadros cada uno). El repositorio del producto no se modificó. Los ejemplos de idea («uno ahorra
    y el otro gasta», «the one who starts vs. the one who waits») son los que citan la ficha y el README. Los guiones
    quedaron en `final/sketches-stick/`. Nota en la portada: «Renders reales del motor incluido: el sketch de ejemplo
    y 2 guiones nuevos (bloque SKIT).»
- **Portada animada**: las tres escenas en movimiento a la vez (escalones que suben, cajas que caen, salto de vallas),
  3,5 s en bucle. Recortes del recuadro del escenario de cada render, en sprites 7×5
  (`design/assets/specreel-stick/anim-{1,2,3}.webp`).
- **Logos Claude (Claude Code) y Codex (texto)**: ficha, «SpecReel Stick es una skill para Claude Code y Codex»;
  `/home/user/specreel-stick/README.md` línea 1, «(Claude Code & Codex)».

### 4. PageSpeed Forensics (`pagespeed-forensics`)
- **Círculos ANTES 50 · 100 · 100 · 100 → DESPUÉS 100 · 100 · 100 · 100** (Rendimiento, Accesibilidad, Prácticas
  recomendadas, SEO): **ejemplo pedido por el dueño, no un caso medido**. Etiqueta grande «Ejemplo» y nota: «Ejemplo
  ilustrativo, no un caso medido: la skill trabaja el Rendimiento y no garantiza un puntaje.» (ficha: «No garantiza un
  puntaje»). Colores de PageSpeed/Lighthouse: rojo `#ff4e42` (0–49), naranja `#ffa400` (50–89), verde `#0cce6b`
  (90–100); el 50 cae en naranja.
- **Dolor «¿Todo en 100… menos Rendimiento?»**: describe el escenario del ejemplo del dueño (no es una cifra de la ficha).
- **«Encuentra los puntos que faltan.»**: titular ya aprobado en la propuesta A; ficha, «Los puntos que faltan en móvil
  se esconden donde esas listas no miran».
- **Logo PageSpeed Insights**: Simple Icons, `workers/market/src/lib/brands.ts` (`pagespeed`); ficha, «Funciona con:
  … PageSpeed Insights». Nota: «PageSpeed Insights es marca de Google; sin afiliación.» (ficha: «Producto
  independiente, sin afiliación con Google»).
- **Logo Claude (Claude Code)**: ficha, «PageSpeed Forensics es una skill para Claude Code»;
  `/home/user/pagespeed-forensics/README.md` línea 5, «Skill para Claude Code».

### 5. CutPilot (`cutpilot`)
- **Dolor «~~«eh…», silencios y retomas.~~»**: ficha, «Quita muletillas, silencios, repeticiones y retomas».
- **«Tu video, ya editado.»**: pedido del dueño; ficha, «Dejas tu grabación en una carpeta y recibes el video limpio,
  subtitulado, con gráficos».
- **Línea de tiempo** (ilustración rotulada «no es una captura»: CutPilot no tiene línea de tiempo propia, entrega el
  video y un EDL):
  - Pistas Video y Audio con 3 cortes («eh…», «silencio», «retoma») sobre la forma de onda: ficha y
    `/home/user/estudio-video/README.md` línea 14, «muletillas, repeticiones, retomas y pausas largas, cortes con
    fundido de 30 ms».
  - Pista Subtítulos con palabra resaltada: ficha, «subtítulos palabra a palabra»; frase de ejemplo tomada de la
    portada anterior (`design/cutpilot.html`, «mi sistema tiene tres pasos»).
  - Pista Gráficos (Título, Logo, Cifra, Lista): ficha, «Claude planifica los gráficos: logos de marcas, cifras, listas
    de pasos, títulos de capítulo y zooms».
- **Formatos 16:9 · 9:16 · 1:1**: ficha, «Render en 16:9, 9:16 y 1:1».
- **Logo Claude (Claude Code)**: ficha, «Funciona con: Claude Code (opcional…)»; `/home/user/estudio-video/README.md`
  línea 5, «Claude Code (opcional) decide los cortes dudosos y el plan».

### 6. Motor creativo (`motor-creativo-claude-code`)
- **Dolor «~~Todos los MCP a la vez.~~»**: ficha, «suele terminar con todos los servidores MCP cargados a la vez».
- **«13 apps gratis. Un agente por app.»**: ficha, «Las 13 apps de storytold, que se descargan gratis desde sus
  releases oficiales» y «Aquí cada app tiene su propio subagente, y su MCP se conecta solo mientras ese agente
  trabaja».
- **13 íconos de las apps Craft**: `/home/user/artcraft-studio-engine/artcraft-workspace/studio/assets/icons/<app>-240.webp`
  (copiados a `design/assets/crafts/` con su `.json` de origen). Licencia MIT OR Apache-2.0, «Se usan solo para
  identificar cada app. Ninguno es la marca «A» de ArtCraft» (`THIRD_PARTY_NOTICES.md` del repo, §2). La portada no usa
  el nombre, wordmark ni la «A» de ArtCraft (marcas no libres, §1 del mismo archivo). Nota: «Sin afiliación con
  storytold ni con Anthropic» (ficha: «Este kit no está afiliado a storytold ni a Anthropic»).
- **Logo Claude (Claude Code)**: ficha y `/home/user/artcraft-studio-engine/README.md` línea 1, «Motor creativo para
  Claude Code».

### Logos de IA
- Claude y Antigravity: `/home/user/estudio-video/recursos/logos/{claude,antigravity}.svg`, de lobe-icons 1.95.1
  (MIT), copiados con su `.json` de fuente a `workers/market/design/assets/logos/`. Se usan sin recolorear.
- Codex: en texto, sin logo (Simple Icons lo retiró a pedido de la marca; `brands.ts`).
- **Grok: no aparece en ninguna portada** (ningún producto documenta que funcione con Grok).
- Cursor y Gemini también figuran en la ficha de Anuncios, pero no se agregaron para no saturar la fila (el dueño
  pidió Claude, Codex y Antigravity).

## Pendiente / preguntas para el dueño

1. **El diente**: no hay ningún video de un diente en `/home/user/specreel` (ejemplos: célula, botella, microneedling,
   showreel). No se inventó; si se produce uno con SpecReel, reemplaza a la «Célula» o al «Showreel».
2. **Cabeza de microneedling en baja resolución**: el ejemplo solo trae `poster.jpg` (paneles de 279×496 px). Se ve
   bien a tamaño de tarjeta, algo blanda a 1600 px. Para mejorarla habría que renderizar el cuadro con las
   herramientas del ejemplo (`node tools/render.js`), que no se probó aquí.
3. **Los 2 sketches nuevos de Stick** no vienen en el ZIP (que trae solo «1 % mejor cada día»). La portada lo dice. ¿Los
   agregamos como ejemplos al producto (están en `final/sketches-stick/`) o prefieres mostrar solo el ejemplo incluido?
4. **PageSpeed 50 → 100 es un «Ejemplo»**, no un caso real. Con un sitio medido (fecha y enlaces de pagespeed.web.dev
   antes y después) se cambia por «Caso real: <sitio>, <fecha>».
5. **Categorías de Anuncios**: los 5 nombres vienen de la pantalla actual del producto, no del repositorio del agente
   (no está en esta máquina). Confirma que son categorías reales del agente; si no, se cambian por «Categoría 1…5».
6. **Portada animada**: ¿dónde se usa? Hoy nada la muestra (la tienda usa `cover.webp`). Al cortar el bucle, los
   contadores de cada escena vuelven a empezar (corte seco cada 3,5 s).
7. El halo verde detrás de la prueba visual es un degradado de un solo tono (verde → transparente), no de colores; si
   prefieres cero degradados, se quita en una línea del CSS (`.pf-glow`).
