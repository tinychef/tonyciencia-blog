# PROJECT CONTEXT — leer antes de escribir código

## Stack
- Framework: Astro 6.0.1 + React 19.2.4
- CMS: EmDash 0.3.0 (Cloudflare D1 + Workers)
- Deploy: Cloudflare Workers → cms.tonyciencia.com
- Package manager: pnpm

## Identidad Tony Ciencia
- Fundador: Antonio Duque (Tony Ciencia LLC)
- Canal YouTube: https://www.youtube.com/@tonyciencia
- Servicios: Curso n8n · Mentoría 1:1 · Agencia IA Full-Stack
- Misión: Enseñar IA y automatización a emprendedores hispanohablantes
- Años activo: 5+ (desde 2021), LATAM + España + USA

## Branding
- Color fondo: #0d0f14 (dark), #ffffff (light)
- Color primario/acento: #7c3aed (purple)
- Color secundario: #06b6d4 (cyan)
- Color success: #10b981 (green)
- Fuente títulos: Syne (--font-display)
- Fuente cuerpo: Manrope (--font-sans)
- Fuente mono: JetBrains Mono (--font-mono)
- Estilo: dark-first, glassmorphism sutil, gradientes purple→cyan

## Reglas de diseño
- NUNCA usar Inter, Roboto ni Space Grotesk
- SIEMPRE usar CSS variables para colores y fuentes
- Animaciones: CSS keyframes puro (sin JS pesado)
- Imágenes: <Image /> de Astro
- Lighthouse target: 95+

## Herramientas afiliadas activas (17 programas PartnerStack)
Pipedrive, monday.com, Apollo.io, Close CRM, Brevo, Emergent, Murf AI,
ActiveCampaign, Kit, GetResponse, AdCreative.ai, ClickUp, ElevenLabs,
Wati.io, Gamma, n8n
→ Datos completos: agent-partnerstack/partnerstack_programas.csv

## Comandos
pnpm dev      → localhost:4321
pnpm deploy   → CF Workers producción
pnpm seed     → poblar DB local

## Blog Template SEO 2026
→ Ver schema completo en: .claude/BLOG_TEMPLATE.md
- Posts en EmDash CMS (D1), NO en archivos .md locales
- Panel admin: cms.tonyciencia.com/admin
- 5 categorías: claude-code, n8n, automatizacion, herramientas-ia, marketing-ia

