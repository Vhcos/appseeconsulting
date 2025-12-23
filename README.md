This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# SEEConsulting · Roadmap Estratégico como Servicio

Este repo contiene la app `appseeconsulting`, una plataforma para **diseñar, ejecutar y reportar** el roadmap estratégico de una empresa, basada en la metodología SEE (Anexos A–H + Informe Final).

La idea: pasar de *“presentaciones sueltas y excels”* a un **hub vivo de estrategia y ejecución**, inspirado en herramientas como ClearPoint Strategy, pero aterrizado a empresas reales en LatAm (minería, servicios B2B, obra pública, etc.).

---

## 1. Visión del producto

**SEEConsulting** debe ser:

- Un **wizard estratégico completo**: desde el diagnóstico inicial hasta el informe final y la gobernanza.
- Un **hub de seguimiento**: con tablas vivas de iniciativas, riesgos, decisiones, roadmap 20 semanas, etc.
- Estéticamente **simple y bello**: limpio, claro, sin “enterprise feo”. Que dé ganas de usarlo.

> TL;DR: *“ClearPoint para empresas LatAm, con un wizard tipo consultoría real y un informe final decente.”*

---

## 2. Referentes

Nos inspiramos en:

- **ClearPoint Strategy**  
  - Referente principal de **hub de estrategia + reporting** (Balanced Scorecard (Cuadro de Mando Integral), objetivos, métricas, iniciativas, dashboards).
  - Foco fuerte en reportes para comités y directorio.

- **Jibility**  
  - Referente de **wizard paso a paso** para construir roadmaps estratégicos.
  - 6 pasos claros, visuales, fáciles de entender.

SEEConsulting mezcla lo mejor de ambos:

- La **estructura y reporting** tipo ClearPoint.
- La **experiencia guiada y simple** tipo Jibility.
- Contenido y anexos propios (A–H + Informe ADD) como “motor intelectual”.

---

## 3. Flujo maestro (wizard SEE)

El proceso completo se modela como un wizard de **9 pasos**.  
Esto es la **columna vertebral del producto**:

1. **Step 0 – Ficha de engagement (contexto)**  
   - Empresa, rubro, metas 12/36 meses, sponsor, equipo.
   - Sale de la intro del Informe y el contexto del cliente.

2. **Step 1 – Data Room (Anexo A)**  
   - Checklist de documentos clave (Estados de Resultado, contratos, organigrama, KPIs (Indicadores Clave de Desempeño), etc.).
   - Estado: disponible / pendiente / comentario.
   - Output: % de completitud + semáforo de preparación.

3. **Step 2 – Diagnóstico 360 (encuesta + entrevistas)**  
   - Resultados de encuesta interna (aunque inicialmente sea embed o resumen).
   - Entrevistas por rol/área.
   - Output: lista de brechas clave por área.

4. **Step 3 – Visión, Misión y Objetivos estratégicos**  
   - Formularios guiados para visión, misión y 3–5 objetivos medibles.
   - Output: “Marco estratégico” listo para el Informe.

5. **Step 4 – FODA con evidencia**  
   - Fortalezas, Oportunidades, Debilidades, Amenazas conectadas con el diagnóstico.
   - Output: FODA resumen alineado a las brechas.

6. **Step 5 – BSC / KPI (Cuadro de mando)**  
   - Perspectivas BSC (Finanzas, Clientes, Procesos, Personas/HSEC).
   - Para cada objetivo: KPI con fórmula, meta, frecuencia, fuente y dueño.
   - Output: tabla de Balanced Scorecard y primeros semáforos.

7. **Step 6 – Portafolio de iniciativas**  
   - Iniciativas con: código, título, objetivo/KPI asociado, impacto, esfuerzo, riesgo, costo, sponsor, dueño.
   - Output: portafolio priorizado (inicialmente por campos; más adelante, matriz visual).

8. **Step 7 – Roadmap 20 semanas**  
   - Calendario de 20 semanas con hitos por iniciativa.
   - Quick wins al inicio, dependencias básicas.
   - Output: vista de roadmap 20w (tabla + timeline simple).

9. **Step 8 – Gobernanza, riesgos, decisiones y action log**  
   - Definición de comités y cadencias (semanal / quincenal / mensual).
   - RACI (Responsible, Accountable, Consulted, Informed) por iniciativa o frente.
   - Registro de riesgos, decisiones y action items.

10. **Step 9 – Informe final y “modo ejecución”**  
    - Generación del Informe tipo ADD: contexto, diagnóstico, marco estratégico, BSC, portafolio, roadmap, gobernanza.
    - Acceso permanente a las tablas vivas para seguimiento.

> **Regla de oro:** todo lo que hoy está en Anexos A–H + Informe ADD debe tener **un lugar claro** dentro de estos pasos.

---

## 4. Estado actual del producto

Hoy (rama `feat/bootstrap-2025-12-17`) ya existe:

- Infraestructura básica:
  - Next.js 16 (App Router + Turbopack).
  - Prisma + PostgreSQL.
  - Internacionalización (`es`/`en`).
- Modelo de datos:
  - `Engagement`, `Kpi`, `Initiative`, `Risk`, `Decision`, `RoadmapWeek`, `ActionItem`, `RaciRow`,
    `UnitEconomicsRow`, `AccountPlanRow`, etc.
- Módulo de **Tablas (Anexos)**:
  - Iniciativas
  - Riesgos
  - Decisiones
  - Roadmap 20 semanas (pendiente fix)
  - Action items
  - RACI
  - Unit economics
  - Account plan

Lo que **NO** existe aún en la app:

- Steps 0–5 del wizard:
  - Ficha completa de engagement.
  - Data Room como checklist.
  - Encuesta interna y entrevistas estructuradas.
  - Visión/Misión/Objetivos.
  - FODA.
  - Wizard para construir el BSC (no solo la tabla).

- Step 9 (Informe final) en serio:
  - Solo hay un preview básico de reporte.

---

## 5. Principios de diseño y estética (desde el día 1)

Para no terminar con una app fea:

### 5.1. Estilo visual

- **Minimalista y limpio**:
  - Mucho blanco (o fondo muy claro).
  - Tipografía legible y moderna.
- **Jerarquía clara**:
  - Título grande de la página.
  - Subtítulo corto explicando “qué se hace aquí”.
  - Luego la tabla o formulario.
- **Colores**:
  - Paleta corta (2–3 colores principales).
  - Colores suaves para fondos; colores fuertes solo para:
    - Botones primarios.
    - Semáforos / estados (rojo, ámbar, verde).
- **Componentes coherentes**:
  - Un solo estilo de botón (primario/secundario).
  - Inputs con mismo padding, borde, radio, tamaño de fuente.

### 5.2. UX (experiencia de usuario)

- Cada pantalla debe responder **tres preguntas**:
  1. ¿Qué es este paso? (título + 1–2 líneas).
  2. ¿Qué tengo que hacer ahora? (lista corta o bullets).
  3. ¿Qué pasa después de esto? (1 línea: “esto alimenta X en el informe”).

- El wizard debe mostrar SIEMPRE una **barra de fases**:
  - `Kickoff → Diagnóstico → Estrategia → Portafolio → Roadmap → Gobernanza → Informe`.
  - Destacar la fase actual.

- Cuidado con los textos:
  - Evitar jerga innecesaria.
  - Siempre que haya un acrónimo, definirlo la primera vez:
    - Ej: OKR (Objectives and Key Results – Objetivos y Resultados Clave),
      KPI (Key Performance Indicator – Indicador Clave de Desempeño),
      BSC (Balanced Scorecard – Cuadro de Mando Integral), etc.

---

## 6. Roadmap de desarrollo (alto nivel)

### Fase 1 – De tablas sueltas a wizard con esqueleto

1. Agregar **barra de fases** en el layout del wizard.
2. Crear Step 0 (Ficha engagement).
3. Crear Step 1 (Data Room).
4. Crear Step 3 (Visión/Misión/Objetivos) en versión mínima.
5. Conectar el header del Report con la info de Steps 0–3.

### Fase 2 – Diagnóstico y BSC

6. Implementar Step 2 (Diagnóstico 360) como mínimos campos de brechas.
7. Implementar Step 4 (FODA) y Step 5 (BSC/KPI) reutilizando tablas existentes.
8. Mejorar UI de tablas (nombres claros, tooltips, traducciones).

### Fase 3 – Roadmap, gobernanza e Informe

9. Terminar Roadmap 20w (tabla + vista timeline básica).
10. Unificar RACI, action log, riesgos y decisiones en Step 8 (Gobernanza).
11. Generar primera versión de Informe Final (PDF básico pero ordenado).

---

## 7. Convenciones generales

- **Tecnología base**:
  - Next.js 16 (App Router).
  - Prisma + PostgreSQL.
  - `next-intl` para `es` y `en`.
- **Rutas del wizard** (idea):  
  - `/[locale]/wizard/[engagementId]/step-0-engagement`  
  - `/[locale]/wizard/[engagementId]/step-1-data-room`  
  - …  
  - `/[locale]/wizard/[engagementId]/step-9-report`
- **Naming de UI**:
  - Siempre en español primero, con inglés entre paréntesis si hace falta:
    - “Cuadro de Mando (Balanced Scorecard)”
    - “Indicadores (KPI – Key Performance Indicators)”

---

## 8. Mantra del proyecto

> 1. Primero el **camino** (wizard A–F).  
> 2. Después las tablas y reportes.  
> 3. Y siempre, que se vea **simple y bonito**, aunque falten features.

Este README es la brújula.  
Si alguna decisión futura contradice esto, la revisamos antes de escribir código.
# appseeconsulting — Complemento README (Panel/Reporte/Operación)

## Estado actual
El wizard tiene dos experiencias complementarias:

### Wizard (cliente)
- Step 3: `app/[locale]/wizard/[engagementId]/step-3-estrategia`
  - Visión / Misión / Objetivos (máx 5)
- Step 4: `app/[locale]/wizard/[engagementId]/step-4-foda`
  - FODA (Fortalezas/Debilidades/Oportunidades/Amenazas)
  - “Apoyo rápido desde Riesgos” (lista sugerida)

### Soporte consultor (modo tabla + guía + video)
- Strategy table: `app/[locale]/wizard/[engagementId]/tables/strategy`
- SWOT table: `app/[locale]/wizard/[engagementId]/tables/swot`

Ambos modos escriben a la misma fuente de verdad (ver sección “Data model”).

---

## Data model (fuente de verdad)
Hoy la estrategia y el FODA se guardan en **Engagement**:

- Strategy (Step-3)
  - `strategyVision: String?`
  - `strategyMission: String?`
  - `strategyObjectives: String?` (1 por línea, máx 5)

- SWOT (Step-4)
  - `swotStrengths: String?`
  - `swotWeaknesses: String?`
  - `swotOpportunities: String?`
  - `swotThreats: String?`

> Nota: existe el modelo `EngagementStrategy`, pero **no es la fuente de verdad actual**. Evitar duplicar almacenamiento.

---

## Help videos
Archivo: `lib/see/helpVideos.ts`

- `getHelpVideo(key, locale)` devuelve título/ayuda/eta por idioma.
- Helpers:
  - `youtubeWatchUrl(youtubeId)`
  - `youtubeEmbedUrl(youtubeId)`

Keys usados:
- `strategy`
- `swot`
- `account-plan`
- `unit-economics`
- `actions`

Si `youtubeId` no existe, se muestra “Video aún no cargado”.

---

## Próxima etapa
### Etapa 1: Panel + Informe (web)
Objetivo: páginas que consuman datos reales Prisma y presenten:
- estado del wizard
- highlights ejecutivos
- top riesgos, KPIs, iniciativas, acciones
- informe imprimible en web (estilo “print-friendly”)

Rutas sugeridas:
- `app/[locale]/wizard/[engagementId]/dashboard/page.tsx`
- `app/[locale]/wizard/[engagementId]/report/page.tsx`

### Etapa 2: Operación periódica
- check-in por período (semanal/mensual) para:
  - registrar `KpiValue` por KPI y período
  - actualizar iniciativas (progreso, evidencias, bloqueos)
  - generar resumen de período (vs período anterior)

---

## Comandos útiles
- Prisma:
  - `npx prisma generate`
  - `npx prisma migrate dev`
  - **Evitar** `migrate reset` si hay data que importa.

---

## Troubleshooting

### zsh: no matches found (rutas con corchetes)
En zsh, rutas que incluyen `[` `]` deben ir entre comillas:
- ✅ `"app/[locale]/wizard/[engagementId]/tables/strategy"`
- ❌ `app/[locale]/wizard/[engagementId]/tables/strategy`

### Prisma drift
Si Prisma avisa “Drift detected”, significa que la DB no calza con el historial de migraciones.
Recomendación: revisar migraciones y aplicar la corrección; **no resetear DB** sin una decisión explícita.

### Keys duplicadas en React
Si aparece `Encountered two children with the same key`, revisar `.map()` usando keys únicas (usar `id` o `label+index` si no hay id).

---
