"use client";

import React, { useEffect, useMemo, useRef } from "react";
import Reveal from "reveal.js";
import "reveal.js/dist/reveal.css";
// Usamos un tema base nulo para controlar todo con Tailwind
import "reveal.js/dist/theme/black.css"; 

// ============================
// TYPES
// ============================
type ObjSummaryRow = {
  objetivo_id: string;
  track_dominante: string;
  kpis: number;
  iniciativas: number;
  hitos: number;
};

type PeriodStatsRow = {
  periodo: string;
  iniciativas_unicas: number;
  hitos: number;
};

type FocusRow = {
  roadmap_id: string;
  objetivo_id: string;
  iniciativa_id: string;
  kpi_id: string;
  kpi_principal: string;
  hito: string;
  entregable: string;
  responsable: string;
  dependencias: string;
};

type RoleRow = {
  id: string;
  iniciativa: string;
  horizonte: string;
  kpi_principal: string;
  kpi_id: string;
  responsable: string;
  objetivo_id: string;
  track: string;
};

const DATE = "2026-01-20";

// ============================
// DATA
// ============================
const OBJ_SUMMARY: ObjSummaryRow[] = [
  { "objetivo_id": "OBJ-1 Liderazgo en Chile (3 años)", "track_dominante": "Cliente", "kpis": 4, "iniciativas": 2, "hitos": 1 },
  { "objetivo_id": "OBJ-2 Escalar sin desorden", "track_dominante": "Finanzas", "kpis": 7, "iniciativas": 5, "hitos": 4 },
  { "objetivo_id": "OBJ-3 Data como ventaja competitiva", "track_dominante": "Tecnología/Data", "kpis": 3, "iniciativas": 3, "hitos": 3 },
  { "objetivo_id": "OBJ-4 Seguridad y estándar operacional", "track_dominante": "Operaciones", "kpis": 4, "iniciativas": 3, "hitos": 4 },
  { "objetivo_id": "OBJ-5 Acelerar con alianzas y M&A;", "track_dominante": "Estrategia", "kpis": 1, "iniciativas": 1, "hitos": 1 },
  { "objetivo_id": "OBJ-6 Abrir nuevos mercados con foco", "track_dominante": "Comercial", "kpis": 2, "iniciativas": 4, "hitos": 4 },
  { "objetivo_id": "OBJ-7 Capturar una parte grande del mercado (faenas clave)", "track_dominante": "Comercial", "kpis": 2, "iniciativas": 4, "hitos": 3 },
  { "objetivo_id": "OBJ-8 Desarrollo de producto e innovación (agua, polvo y performance)", "track_dominante": "Producto/Innovación", "kpis": 3, "iniciativas": 3, "hitos": 4 },
  { "objetivo_id": "OBJ-9 Talento y capacidades para crecer e innovar", "track_dominante": "Personas", "kpis": 3, "iniciativas": 5, "hitos": 2 }
];

const PERIOD_STATS: PeriodStatsRow[] = [
  { "periodo": "2026-H1", "iniciativas_unicas": 12, "hitos": 13 },
  { "periodo": "2026-H2", "iniciativas_unicas": 8, "hitos": 8 },
  { "periodo": "2027-H1", "iniciativas_unicas": 2, "hitos": 2 },
  { "periodo": "2027-H2", "iniciativas_unicas": 1, "hitos": 1 },
  { "periodo": "2028-H1", "iniciativas_unicas": 2, "hitos": 2 },
  { "periodo": "2028-H2", "iniciativas_unicas": 0, "hitos": 0 }
];

const FOCUS_2026_H1: FocusRow[] = [
  { "roadmap_id": "R-1", "objetivo_id": "OBJ-1", "iniciativa_id": "I-12a", "kpi_id": "K-1", "kpi_principal": "NPS (Recomendación)", "hito": "Implementar I-12a", "entregable": "Rutina de cuenta + cierre de loop", "responsable": "Gerencia/Comercial", "dependencias": "-" },
  { "roadmap_id": "R-2", "objetivo_id": "OBJ-2", "iniciativa_id": "I-03", "kpi_id": "K-11", "kpi_principal": "Cobertura roles críticos", "hito": "Implementar I-03", "entregable": "Gobernanza: comités, agendas, action log", "responsable": "Gerencia", "dependencias": "-" },
  { "roadmap_id": "R-3", "objetivo_id": "OBJ-2", "iniciativa_id": "I-06b", "kpi_id": "K-8", "kpi_principal": "EE.PP. cursados/mes", "hito": "Implementar I-06b", "entregable": "Calendario EE.PP. + checklist", "responsable": "Finanzas", "dependencias": "-" },
  { "roadmap_id": "R-4", "objetivo_id": "OBJ-2", "iniciativa_id": "I-06c", "kpi_id": "K-10", "kpi_principal": "Ciclo caja / DSO", "hito": "Implementar I-06c", "entregable": "Caja 13 semanas + política cobro", "responsable": "Finanzas", "dependencias": "-" },
  { "roadmap_id": "R-6", "objetivo_id": "OBJ-3", "iniciativa_id": "I-08", "kpi_id": "K-15", "kpi_principal": "Cobertura Data Pack", "hito": "Implementar I-08", "entregable": "Data Pack Ejecutivo V1", "responsable": "Datos/Innovación", "dependencias": "-" },
  { "roadmap_id": "R-7", "objetivo_id": "OBJ-4", "iniciativa_id": "I-10", "kpi_id": "K-9", "kpi_principal": "Cumplimiento polvo", "hito": "Implementar I-10", "entregable": "SOPs + Carpeta HSEC Auditable", "responsable": "Operaciones", "dependencias": "-" },
  { "roadmap_id": "R-8", "objetivo_id": "OBJ-6", "iniciativa_id": "I-13", "kpi_id": "K-16", "kpi_principal": "Pipeline ponderado", "hito": "Implementar I-13", "entregable": "Pipeline y ritual comercial", "responsable": "Comercial", "dependencias": "-" }
];

const FOCUS_2026_H2: FocusRow[] = [
  { "roadmap_id": "R-9", "objetivo_id": "OBJ-6", "iniciativa_id": "I-14", "kpi_id": "K-17", "kpi_principal": "Tasa conversión %", "hito": "Implementar I-14", "entregable": "Estándar propuestas + pricing", "responsable": "Comercial", "dependencias": "-" },
  { "roadmap_id": "R-10", "objetivo_id": "OBJ-7", "iniciativa_id": "I-15", "kpi_id": "K-18", "kpi_principal": "Participación faenas foco", "hito": "Implementar I-15", "entregable": "Account Plans (cuentas foco)", "responsable": "Comercial/GG", "dependencias": "-" },
  { "roadmap_id": "R-11", "objetivo_id": "OBJ-8", "iniciativa_id": "I-16", "kpi_id": "K-24", "kpi_principal": "Upgrades validados", "hito": "Implementar I-16", "entregable": "Roadmap backlog + releases", "responsable": "Innovación", "dependencias": "-" },
  { "roadmap_id": "R-12", "objetivo_id": "OBJ-9", "iniciativa_id": "I-20", "kpi_id": "K-3", "kpi_principal": "Crecimiento ingresos", "hito": "Implementar I-20", "entregable": "Contratación Director Comercial", "responsable": "Gerencia/P&C", "dependencias": "-" },
  { "roadmap_id": "R-13", "objetivo_id": "OBJ-9", "iniciativa_id": "I-18b", "kpi_id": "K-27", "kpi_principal": "% eval. desempeño", "hito": "Implementar I-18b", "entregable": "Sistema desempeño + roles críticos", "responsable": "Gerencia/P&C", "dependencias": "-" },
  { "roadmap_id": "R-14", "objetivo_id": "OBJ-3", "iniciativa_id": "I-09", "kpi_id": "K-14", "kpi_principal": "SLA D+1 datos", "hito": "Implementar I-09", "entregable": "SLA D+1 automatizado", "responsable": "Datos", "dependencias": "-" }
];

const ROLES_HABILITANTES: RoleRow[] = [
  { "id": "I-22", "iniciativa": "Ops Norte (FTE)", "horizonte": "2026", "kpi_principal": "Cumplimiento polvo", "kpi_id": "K-9", "responsable": "Operaciones", "objetivo_id": "OBJ-4", "track": "Operaciones" },
  { "id": "I-21", "iniciativa": "Tech & Data (FTE)", "horizonte": "2026", "kpi_principal": "Upgrades validados", "kpi_id": "K-24", "responsable": "Innovación", "objetivo_id": "OBJ-8", "track": "Producto" },
  { "id": "I-20", "iniciativa": "Director Comercial", "horizonte": "2026", "kpi_principal": "Ingresos LTM", "kpi_id": "K-3", "responsable": "Gerencia", "objetivo_id": "OBJ-9", "track": "Personas" },
  { "id": "I-20b", "iniciativa": "KAM Senior", "horizonte": "2027", "kpi_principal": "Plan cuentas foco", "kpi_id": "K-21", "responsable": "Comercial", "objetivo_id": "OBJ-9", "track": "Personas" },
  { "id": "I-20c", "iniciativa": "Growth Latam", "horizonte": "2028", "kpi_principal": "Ingresos Expansión", "kpi_id": "K-3", "responsable": "Comercial", "objetivo_id": "OBJ-9", "track": "Personas" }
];

// ============================
// UI COMPONENTS
// ============================
function SlideHeader({ kicker, title, subtitle }: { kicker?: string; title: string; subtitle?: string; }) {
  return (
    <div className="mb-10 text-left">
      {kicker && (
        <div className="mb-4 inline-block bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full px-4 py-1 border border-cyan-500/30">
          <span className="text-xs font-bold tracking-[0.2em] text-cyan-300 uppercase glow-text">{kicker}</span>
        </div>
      )}
      <h2 className="text-5xl font-bold leading-tight text-white mb-3 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xl text-slate-400 font-light max-w-4xl border-l-2 border-cyan-500/50 pl-4 mt-4">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function GlassCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-xl p-6 shadow-2xl hover:bg-white/[0.05] transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">{children}</span>;
}

function MetricTable({ headers, rows }: { headers: string[]; rows: (string | number | React.ReactNode)[][]; }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg backdrop-blur-sm bg-[#0f172a]/40">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-white/[0.05] border-b border-white/10">
            {headers.map((h, i) => (
              <th key={i} className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors group">
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-4 text-sm text-slate-200 group-hover:text-white transition-colors align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function StrategicPresentation() {
  const deckDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!deckDiv.current) return;
    const deck = new Reveal(deckDiv.current, {
      embedded: true,
      hash: true,
      controls: true,
      progress: true,
      center: true,
      transition: "slide",
      backgroundTransition: "zoom",
      controlsLayout: "bottom-right",
      width: 1280,
      height: 720,
    });
    deck.initialize();
    return () => { try { deck.destroy(); } catch {} };
  }, []);

  // --- Calculations ---
  const maxInis = useMemo(() => Math.max(...PERIOD_STATS.map((p) => p.iniciativas_unicas), 1), []);
  const periodRows = useMemo(() => PERIOD_STATS.map((p) => {
    const pct = Math.round((p.iniciativas_unicas / maxInis) * 100);
    return [
      <span className="font-mono text-cyan-300 font-bold">{p.periodo}</span>,
      <div className="flex items-center gap-4 w-full">
        <div className="h-2 w-full max-w-[300px] bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-slate-400 font-mono">{p.iniciativas_unicas}</span>
      </div>,
      <span className="text-white font-bold">{p.hitos}</span>
    ];
  }), [maxInis]);

  const objRows = OBJ_SUMMARY.map(o => [
    <span className="font-bold text-white bg-white/10 px-2 py-1 rounded text-xs">{o.objetivo_id}</span>,
    o.track_dominante,
    <span className="text-slate-300">{o.kpis}</span>,
    <span className="text-slate-300">{o.iniciativas}</span>,
    <span className="text-cyan-300 font-bold">{o.hitos}</span>
  ]);

  const renderFocusRows = (arr: FocusRow[]) => arr.map(r => [
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
        <span className="text-cyan-400">{r.iniciativa_id}</span> <span>•</span> <span>{r.roadmap_id}</span>
      </div>
      <span className="font-bold text-white text-base leading-tight">{r.hito}</span>
      <span className="text-xs text-slate-400 mt-1">{r.entregable}</span>
    </div>,
    <div className="flex flex-col">
      <span className="text-xs font-mono bg-blue-900/40 text-blue-200 px-2 py-1 rounded w-fit mb-1">{r.kpi_id}</span>
      <span className="text-sm text-slate-300 leading-tight">{r.kpi_principal}</span>
    </div>,
    <div className="text-xs text-slate-400">
      <div className="text-slate-200 font-semibold">{r.responsable}</div>
      {r.dependencias !== "No especificado" && r.dependencias !== "-" && (
         <div className="text-red-400/80 mt-1">Dep: {r.dependencias}</div>
      )}
    </div>
  ]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#020617] text-slate-200 selection:bg-cyan-500/30">
      {/* GLOBAL STYLES & FONTS */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        
        .reveal { font-family: 'Outfit', sans-serif !important; color: #e2e8f0 !important; }
        .reveal h1, .reveal h2, .reveal h3, .reveal h4 { font-family: 'Outfit', sans-serif !important; text-transform: none !important; }
        .reveal .controls { color: #22d3ee !important; }
        .reveal .progress { color: #22d3ee !important; background: rgba(255,255,255,0.1) !important; }
        .reveal .progress span { background: #22d3ee !important; box-shadow: 0 0 10px rgba(34,211,238,0.7); }
        
        /* Background Dynamic */
        .bg-spotlight {
          background: radial-gradient(circle at 50% 0%, #1e293b 0%, #020617 70%);
        }
        .glow-text { text-shadow: 0 0 10px rgba(34, 211, 238, 0.4); }
      `}</style>

      {/* BACKGROUND ELEMENTS */}
      <div className="absolute inset-0 bg-spotlight pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />

      <div className="reveal" ref={deckDiv}>
        <div className="slides">

          {/* 1) PORTADA */}
          <section data-auto-animate>
            <div className="flex flex-col items-center justify-center h-full text-center px-10">
              <div className="mb-6 flex items-center gap-3 animate-pulse">
                 <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]"></span>
                 <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">Estrategia Oficial</span>
              </div>
              
              <h1 className="text-7xl font-extrabold tracking-tight text-white mb-6 drop-shadow-2xl">
                Roadmap <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">2026–2028</span>
              </h1>
              
              <p className="text-xl text-slate-400 font-light max-w-2xl mx-auto leading-relaxed mb-12">
                De la Ejecución Táctica a la Gobernanza Estratégica y  <strong className="text-white">escala sistémica</strong>. <br/>
                Definición de estándares, prioridades y gobernanza.
              </p>

              <div className="grid grid-cols-3 gap-6 w-full max-w-4xl text-left">
                <GlassCard className="fragment fade-up">
                   <div className="text-cyan-400 text-2xl mb-2">🎯</div>
                   <h4 className="font-bold text-white mb-1">Objetivos Claros</h4>
                   <p className="text-sm text-slate-400">9 Objetivos conectados a resultados.</p>
                </GlassCard>
                <GlassCard className="fragment fade-up">
                   <div className="text-blue-400 text-2xl mb-2">📊</div>
                   <h4 className="font-bold text-white mb-1">KPIs ""</h4>
                   <p className="text-sm text-slate-400">Métricas que mueven la aguja.</p>
                </GlassCard>
                <GlassCard className="fragment fade-up">
                   <div className="text-purple-400 text-2xl mb-2">🚀</div>
                   <h4 className="font-bold text-white mb-1">Ejecución</h4>
                   <p className="text-sm text-slate-400">Rituales y responsables definidos.</p>
                </GlassCard>
              </div>
              
              <div className="mt-12 text-xs font-mono text-slate-600">
                ACTUALIZADO: {DATE} | CONFIDENCIAL
              </div>
            </div>
          </section>

          {/* 2) AGENDA */}
          <section>
            <div className="px-10 h-full flex flex-col justify-center">
              <SlideHeader kicker="Estructura" title="Agenda Ejecutiva" subtitle="Foco en validación de estándares y mandato de implementación." />
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Bloque 1: Estrategia</h4>
                  <div className="flex items-start gap-4 p-4 border-l-2 border-cyan-500/30 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                    <span className="text-2xl font-bold text-cyan-500/50">01</span>
                    <div>
                      <h4 className="font-bold text-white">Vista Directorio</h4>
                      <p className="text-sm text-slate-400">Alinear la dirección a 3 años.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4 border-l-2 border-cyan-500/30 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                    <span className="text-2xl font-bold text-cyan-500/50">02</span>
                    <div>
                      <h4 className="font-bold text-white">Mapa de Conexión</h4>
                      <p className="text-sm text-slate-400">Lógica: Objetivo → KPI → Iniciativa.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Bloque 2: Táctica</h4>
                   <div className="flex items-start gap-4 p-4 border-l-2 border-blue-500/30 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                    <span className="text-2xl font-bold text-blue-500/50">03</span>
                    <div>
                      <h4 className="font-bold text-white">Foco 2026</h4>
                      <p className="text-sm text-slate-400">Top priorities y asignación de recursos.</p>
                    </div>
                  </div>
                   <div className="flex items-start gap-4 p-4 border-l-2 border-purple-500/30 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                    <span className="text-2xl font-bold text-purple-500/50">04</span>
                    <div>
                      <h4 className="font-bold text-white">Gobernanza</h4>
                      <p className="text-sm text-slate-400">Rituales de seguimiento y reporte.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3) VISTA DIRECTORIO (Resumen) */}
          <section>
            <div className="px-10 py-10 h-full overflow-y-auto">
              <SlideHeader kicker="Visión Macro" title="Vista Directorio" subtitle="Los grandes hitos que definen nuestra transformación 2026-2028." />
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                {/* 2026 */}
                <GlassCard className="border-t-4 border-t-cyan-500">
                  <h3 className="text-2xl font-bold text-white mb-1">2026</h3>
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-4">Fundación</div>
                  <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex gap-2"><span className="text-cyan-500">▹</span> Asegurar continuidad.</li>
                    <li className="flex gap-2"><span className="text-cyan-500">▹</span> Disciplina comercial instalada.</li>
                    <li className="flex gap-2"><span className="text-cyan-500">▹</span> Roadmap producto V1.</li>
                    <li className="flex gap-2"><span className="text-cyan-500">▹</span> SLA D+1 en datos.</li>
                  </ul>
                </GlassCard>

                {/* 2027 */}
                <GlassCard className="border-t-4 border-t-blue-500 opacity-80">
                  <h3 className="text-2xl font-bold text-white mb-1">2027</h3>
                  <div className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">Escala</div>
                  <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex gap-2"><span className="text-blue-500">▹</span> Escalar cobertura cuentas foco.</li>
                    <li className="flex gap-2"><span className="text-blue-500">▹</span> Paquetizar valor (Data Packs).</li>
                    <li className="flex gap-2"><span className="text-blue-500">▹</span> Rol KAM Senior activo.</li>
                  </ul>
                </GlassCard>

                {/* 2028 */}
                <GlassCard className="border-t-4 border-t-purple-500 opacity-60">
                   <h3 className="text-2xl font-bold text-white mb-1">2028</h3>
                   <div className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-4">Consolidación</div>
                   <ul className="space-y-3 text-sm text-slate-300">
                    <li className="flex gap-2"><span className="text-purple-500">▹</span> Ambición: $20MM USD.</li>
                    <li className="flex gap-2"><span className="text-purple-500">▹</span> Portafolio estable + Innovación.</li>
                    <li className="flex gap-2"><span className="text-purple-500">▹</span> Data como ventaja competitiva.</li>
                  </ul>
                </GlassCard>
                
                {/* Lateral Resumen */}
                 <div className="flex flex-col justify-center pl-4 border-l border-white/10">
                    <div className="mb-6">
                      <div className="text-xs text-slate-500 uppercase">Foco Financiero</div>
                      <div className="text-xl font-bold text-white">Caja & Ebitda</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase">Foco Talento</div>
                      <div className="text-xl font-bold text-white">Roles Críticos</div>
                    </div>
                 </div>
              </div>
            </div>
          </section>

          {/* 4) MAPA DE CONEXIÓN */}
          <section>
            <div className="px-10 py-10">
              <SlideHeader kicker="Arquitectura" title="Mapa de Conexión" subtitle="Validación lógica: Cómo los objetivos bajan a la realidad." />
              <MetricTable 
                headers={["OBJ ID", "Track Principal", "KPIs", "Iniciativas", "Hitos Roadmap"]} 
                rows={objRows} 
              />
            </div>
          </section>

          {/* 5) CARGA DE TRABAJO */}
          <section>
             <div className="px-10 py-10 flex flex-col h-full justify-center">
               <SlideHeader kicker="Esfuerzo" title="Densidad del Roadmap" subtitle="Distribución de iniciativas e hitos por semestre." />
               
               <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-7">
                    <MetricTable 
                      headers={["Periodo", "Iniciativas Únicas (Barra de carga)", "Hitos Totales"]} 
                      rows={periodRows}
                    />
                  </div>
                  <div className="col-span-5 flex flex-col justify-center">
                    <GlassCard>
                       <h4 className="text-lg font-bold text-white mb-2">Insights</h4>
                       <p className="text-slate-300 mb-5 leading-relaxed">
                         La carga está fuertemente concentrada en <Highlight>2026</Highlight>. Esto es deliberado: es el año de construcción de cimientos.
                       </p>
                       <div className="text-xs font-mono text-slate-500 bg-black/20 p-2 rounded">
                         Recomendación: Validar capacidad de ejecución del equipo actual antes de aprobar.
                       </div>
                    </GlassCard>
                  </div>
               </div>
             </div>
          </section>

          {/* 6) FOCO 2026 H1 */}
          <section>
            <div className="px-10 py-10 h-full overflow-y-auto">
              <SlideHeader kicker="Prioridad Inmediata" title="Foco 2026-H1" subtitle="Los entregables que debemos activar en el primer semestre." />
              <MetricTable 
                headers={["Iniciativa / Hito", "KPI Principal", "Responsable / Dep"]}
                rows={renderFocusRows(FOCUS_2026_H1)}
              />
            </div>
          </section>

          {/* 7) ROLES HABILITANTES */}
          <section>
             <div className="px-10 py-10">
               <SlideHeader kicker="Equipo" title="Roles Habilitantes" subtitle="Sin estas personas, el roadmap se pone en riesgo." />
               
               <div className="grid grid-cols-3 gap-6">
                  {ROLES_HABILITANTES.filter(r => r.horizonte === "2026").map((role, i) => (
                    <GlassCard key={i} className="relative group border-t-4 border-t-cyan-500">
                      <div className="absolute top-4 right-4 text-xs font-mono text-slate-500">{role.id}</div>
                      <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-2">{role.track}</div>
                      <h3 className="text-xl font-bold text-white mb-4 leading-tight">{role.iniciativa}</h3>
                      <div className="bg-white/5 rounded p-3">
                         <div className="text-xs text-slate-500 uppercase">Impacta a KPI:</div>
                         <div className="text-sm font-semibold text-white">{role.kpi_principal}</div>
                      </div>
                    </GlassCard>
                  ))}
               </div>
               
               <div className="mt-8 pt-8 border-t border-white/10">
                 <h5 className="text-sm font-bold uppercase text-slate-500 mb-4">Pipeline de Talento Futuro (2027-2028)</h5>
                 <div className="flex gap-4">
                    {ROLES_HABILITANTES.filter(r => r.horizonte !== "2026").map((r, i) => (
                      <div key={i} className="bg-white/5 rounded-full px-6 py-2 border border-white/10 text-sm text-slate-300 flex items-center gap-3">
                        <span className="font-mono text-slate-500">{r.horizonte}</span>
                        <span className="font-bold text-white">{r.iniciativa}</span>
                      </div>
                    ))}
                 </div>
               </div>
             </div>
          </section>

          {/* 8) GOBERNANZA & CIERRE */}
          <section>
            <div className="px-10 h-full flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-12 items-center">
                <div>
                   <SlideHeader kicker="Siguiente Paso" title="Modelo de Gobierno" subtitle="Cómo garantizamos que esto ocurra." />
                   
                   <div className="space-y-6">
                      <div className="flex gap-4 fragment fade-up">
                        <div className="h-12 w-12 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xl border border-cyan-500/50">1</div>
                        <div>
                          <h4 className="text-lg font-bold text-white">Ritual Semanal</h4>
                          <p className="text-slate-400 text-sm">30 min. Avance, bloqueos, next steps.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 fragment fade-up">
                        <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xl border border-blue-500/50">2</div>
                        <div>
                          <h4 className="text-lg font-bold text-white">Ritual Mensual</h4>
                          <p className="text-slate-400 text-sm">60 min. Revisión KPIs y ajuste de prioridades.</p>
                        </div>
                      </div>
                      <div className="flex gap-4 fragment fade-up">
                        <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl border border-purple-500/50">3</div>
                        <div>
                          <h4 className="text-lg font-bold text-white">Escalamiento</h4>
                          <p className="text-slate-400 text-sm">Regla clara: Bloqueo no resuelto = Escalamiento inmediato.</p>
                        </div>
                      </div>
                   </div>
                </div>

                <GlassCard className="text-center py-12 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                   <h3 className="text-3xl font-bold text-white mb-6">¿Aprobamos el Plan?</h3>
                   <div className="space-y-3 text-left max-w-xs mx-auto mb-8">
                     <label className="flex items-center gap-3 text-slate-300">
                       <input type="checkbox" checked readOnly className="accent-cyan-500 h-5 w-5" /> Aprobar forma de trabajo
                     </label>
                     <label className="flex items-center gap-3 text-slate-300">
                       <input type="checkbox" checked readOnly className="accent-cyan-500 h-5 w-5" /> Iniciativas Prioritarias 2026
                     </label>
                     <label className="flex items-center gap-3 text-slate-300">
                       <input type="checkbox" checked readOnly className="accent-cyan-500 h-5 w-5" /> Validar con los Responsables
                     </label>
                   </div>
                   <button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all">
                     Confirmar Estrategia
                   </button>
                </GlassCard>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}