# Base de afiliados

El agente `content-affiliate-manager` y los scripts `pnpm aff:find` / `pnpm post:check`
solo aceptan enlaces de afiliado que estén en esta base. Hoy la base se compone de dos fuentes:

| Fuente | Qué es | Quién la edita |
|---|---|---|
| `src/data/partners.generated.ts` | 139 partners activos exportados de PartnerStack/Impact/Awin. También alimenta `/herramientas` y el carrusel de la home. | Se **regenera**, no se edita a mano: `pnpm run generate:partners <ruta-al-json>` |
| `content/affiliates/extra.json` | Programas que no están en ese export (acuerdos directos, Amazon, cupones, cambios puntuales). Empieza vacío: `[]`. | A mano, o pidiéndoselo al agente con el enlace exacto |

Un enlace "con pinta de afiliado" (redes `*.pxf.io`, `*.sjv.io`, `partnerlinks.io`, `awin1.com`,
subdominios `try.`/`get.`/`join.` con token, parámetros `fpr`, `via`, `aff`…) que no esté en
ninguna de las dos fuentes hace fallar `pnpm post:check`. Así el agente no puede inventar enlaces.

## Formato de `extra.json`

Un array de objetos. Esquema completo en [`extra.schema.json`](extra.schema.json).

```json
[
  {
    "name": "Ejemplo Pro",
    "category": "Video, Podcast y Streaming",
    "affiliateLink": "https://ejemplo.partnerlinks.io/abc123xyz9",
    "website": "https://ejemplo.com",
    "platform": "PartnerStack",
    "commission": "30% recurrente 12 meses",
    "cookieDays": 90,
    "priority": 8,
    "notes": "No mencionar precios en la URL de destino. Cupón TONY10 vigente hasta 2026-12-31.",
    "disallowedTopics": ["criptomonedas", "apuestas"]
  }
]
```

| Campo | Obligatorio | Uso |
|---|---|---|
| `name` | sí | Nombre visible. Si coincide (sin tildes ni mayúsculas) con un partner generado, **lo reemplaza**. |
| `category` | sí (salvo `disabled`) | Usa una existente (`pnpm aff:find --list-categories`). |
| `affiliateLink` | sí (salvo `disabled`) | El enlace de seguimiento exacto. El validador acepta parámetros extra (p. ej. `?u=` de Impact para deep links), pero no que falte ninguno de los del enlace original. |
| `website` | no | Sitio oficial: el agente verifica ahí precios y funciones. |
| `platform` | no | PartnerStack, Impact, Awin, Directo… (por defecto "Directo"). |
| `commission`, `cookieDays` | no | Informativos; ayudan a priorizar. Nunca se publican. |
| `priority` | no | 0–10. A igualdad de encaje con el tema, el agente elige el de mayor prioridad. |
| `notes` | no | Reglas del anunciante, ángulos, cupones vigentes. |
| `disallowedTopics` | no | Temas vetados; el validador falla si aparecen en título, excerpt o keywords. |
| `disabled` | no | `true` retira un partner generado (programa cerrado, cuenta suspendida). |

## Cómo reemplazar la base completa

Cuando tengas la base nueva:

1. **Si viene del mismo exportador de PartnerStack** (JSON agrupado por categoría con
   `name`, `affiliate_link`, `website`, `logo_url`, `platform`, `status`):
   `pnpm run generate:partners <ruta-al-json>` reescribe `src/data/partners.generated.ts`
   (y con él `/herramientas`). Luego `pnpm run cache:partner-icons` si hay logos nuevos.
2. **Si es otra fuente** (hoja de cálculo, CSV, otra red): conviértela a objetos con el esquema de
   arriba y guárdala en `content/affiliates/extra.json`. Para retirar partners viejos sin tocar el
   archivo generado, añade `{ "name": "<nombre exacto>", "disabled": true }`.
3. Comprueba: `pnpm aff:find --list-categories` y `pnpm aff:find --check <url>`.
4. Revalida los posts que usan enlaces retirados: `pnpm post:check content/posts/es/*.json`.

> Nota: algunos posts antiguos usan enlaces que no están en la base actual (p. ej. el de FocuSee usa
> un enlace corto de iMobie distinto al de `partners.generated.ts`, y los de ActiveCampaign usan otro
> token de PartnerStack). Si siguen siendo tuyos y válidos, agrégalos a `extra.json`.
