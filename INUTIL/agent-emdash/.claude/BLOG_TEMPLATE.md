# BLOG TEMPLATE — Tony Ciencia SEO 2026
# Usar este schema para TODOS los posts creados en EmDash CMS
# Última actualización: 2026-04-13

## FRONTMATTER OBLIGATORIO

```yaml
---
title: "Título con keyword primaria — máx 60 chars"
metaTitle: "Título SEO optimizado | Tony Ciencia"
metaDescription: "Descripción con keyword + propuesta de valor — máx 155 chars"
pubDate: YYYY-MM-DD
updatedDate: YYYY-MM-DD
slug: "keyword-primaria-sin-fecha"
category: "claude-code" | "n8n" | "automatizacion" | "herramientas-ia" | "marketing-ia"
tags: ["tag1", "tag2", "tag3"]   # máx 4 tags
heroImage: "./images/[slug]-hero.webp"
draft: false
author: "Antonio Duque"
authorUrl: "https://tonyciencia.com/about-2/"
canonical: "https://cms.tonyciencia.com/blog/[slug]"
schema:
  type: "Article"
  speakable: true
---
```

## ESTRUCTURA DEL POST (invariable)

```markdown
[HERO IMAGE — ancho completo]

# H1: Título exacto (keyword primaria al inicio)

> **En este artículo:** resumen en 2-3 líneas de qué aprenderá el lector.
> Para quién es: emprendedores, makers y equipos que usan IA.

---

## ¿Qué es [tema]?
Párrafo corto, directo. Máx 40-50 palabras, una sola idea clara.
Optimizado para AI Overviews de Google 2026.

## Por qué importa en [año]
Contexto y relevancia. 2-3 párrafos con datos o ejemplos reales.

## Cómo funciona / Paso a paso

### Paso 1: [acción concreta]
### Paso 2: [acción concreta]
### Paso 3: [acción concreta]

## Errores comunes
Lista breve. Formato pregunta-respuesta cuando sea posible.

## Conclusión y siguiente paso
- Resumen en 3 bullets
- CTA: enlace al canal de YouTube o servicio relacionado

---
**¿Quieres aprender esto en video?** → [Ver en YouTube](https://youtube.com/@tonyciencia)
**¿Necesitas implementarlo en tu negocio?** → [Habla con Tony](https://tonyciencia.com/contact/)
```

## CATEGORÍAS VÁLIDAS
| Slug | Temas |
|------|-------|
| `claude-code` | Claude Code, Claude API, agentes IA, Anthropic |
| `n8n` | n8n workflows, automatización visual, integraciones |
| `automatizacion` | Make, Zapier, automatización general, productividad |
| `herramientas-ia` | ChatGPT, Cursor, Windsurf, herramientas IA en general |
| `marketing-ia` | Marketing digital con IA, contenido, ads, SEO |

## REGLAS SEO 2026
- H1 único por página, keyword primaria en las primeras 3 palabras
- H2/H3 redactados como preguntas (optimización AI Overviews)
- Párrafos de máx 3 oraciones
- 1 enlace interno por cada 300 palabras hacia post de la misma categoría
- Imágenes: .webp, alt text descriptivo con keyword, lazy loading
- Sin keyword stuffing — densidad natural, sinónimos y términos relacionados
- Speakable schema activado (voz y AI assistants)
- URL canónica siempre definida

## SLUGS DE EJEMPLO (bien formados)
✅ `claude-code-para-principiantes`
✅ `automatizar-email-con-n8n`
✅ `herramientas-ia-para-agencias`
❌ `2026-04-13-mi-post-numero-1`
❌ `post-automatizacion-herramientas-ia-n8n-2026`

## NOTAS EMDASH CMS
- El contenido se almacena en Cloudflare D1 (no en archivos .md locales)
- Crear posts desde: cms.tonyciencia.com/admin (panel EmDash)
- O via CLI: `pnpm emdash seed` para poblar con datos de prueba
- DB local: agent-emdash/data.db (SQLite)
- DB producción: D1 binding "DB" → tonyciencia-emdash (bb25e9b1-d598-4cff-aa2a-1dac5907218f)
