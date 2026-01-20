"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

const EcosystemGraph = () => {
  const domNode = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!domNode.current) return;

    // --- PALETA DE COLORES ---
    const C_GG = "#0ea5e9";       // Azul Eléctrico
    const C_TECH = "#06b6d4";     // Cian
    const C_BIZ = "#94a3b8";      // Gris Azulado
    const C_PEOPLE = "#f97316";   // Naranja
    const C_SUP = "#475569";      // Gris Oscuro
    
    // Estilo Futuro (Ghost Node)
    const C_FUTURE_BG = "rgba(71, 85, 105, 0.2)"; 
    const C_FUTURE_BORDER = "rgba(71, 85, 105, 0.6)";

    // --- 1. NODOS ---
    const nodes = new DataSet([
      // --- NÚCLEO ---
      { 
        id: 1, 
        label: "GERENCIA GENERAL\nAgustín Cozzi", 
        title: "Visión, Cultura, Expansión", 
        color: C_GG, 
        size: 60, 
        shape: "dot", 
        font: { size: 20, color: "white", face: "arial", bold: true } 
      },
      
      // --- SOPORTES ---
      { id: 10, label: "Directorio", color: C_SUP, size: 20, shape: "dot", font: { color: "#ccc" } },
      
      // --- FUTURO (2027-28) ---
      { 
        id: 11, 
        label: "Dir. NUEVOS MERCADOS\n(Proyección 2027-28)", 
        title: "Futura expansión",
        color: { background: C_FUTURE_BG, border: C_FUTURE_BORDER }, 
        size: 25, 
        shape: "dot", 
        borderWidth: 2,
        font: { color: "#777" },
        shapeProperties: { borderDashes: [5, 5] }
      },
      { 
        id: 13, // Nuevo nodo KAM
        label: "KAM\n(Proyección 2027-28)", 
        title: "Gestión Cuentas Clave",
        color: { background: C_FUTURE_BG, border: C_FUTURE_BORDER }, 
        size: 25, 
        shape: "dot", 
        borderWidth: 2,
        font: { color: "#777" },
        shapeProperties: { borderDashes: [5, 5] }
      },

      // --- PRIMERA LÍNEA (Directores) ---
      { 
        id: 2, 
        label: "Dir. OPERACIONES\nAmanda Leyton", 
        color: C_TECH, 
        size: 45 
      },
      { 
        id: 3, 
        label: "Dir. FINANZAS\nYanireth Alfaro", 
        color: C_BIZ, 
        size: 45 
      },
      { 
        id: 4, 
        label: "Dir. PEOPLE\nMargarita Méndez", 
        color: C_PEOPLE, 
        size: 45 
      },
      { 
        id: 5, 
        label: "Dir. INNOVACIÓN\nCarlos López", 
        color: C_TECH, 
        size: 45 
      },
      { 
        id: 6, 
        label: "Dir. COMERCIAL\n(Por Contratar)", 
        title: "Hiring H1", 
        color: C_BIZ, 
        size: 45, 
        shape: "dot", 
        borderWidth: 3, 
        borderColor: "#fff"
      },

      // --- SEGUNDA LÍNEA (Hiring) ---
      { 
        id: 7, 
        label: "Dir. Ops Norte\n(Por Contratar)", 
        color: C_TECH, 
        size: 30, 
        shape: "dot", 
        borderWidth: 2, 
        borderColor: "#fff"
      },
      { 
        id: 8, 
        label: "Subdirector I&T\n(Por Contratar)", 
        color: C_TECH, 
        size: 30, 
        shape: "dot", 
        borderWidth: 2, 
        borderColor: "#fff"
      }
    ]);

    // --- 2. CONEXIONES (ARISTAS CON ID) ---
    const edges = new DataSet([
      // Jerarquía Principal
      { id: "e1", from: 10, to: 1, arrows: "to", color: { color: "#555" } }, // Directorio -> GG
      
      // Conexiones Futuras (Línea punteada larga)
      { id: "e2", from: 11, to: 1, arrows: "to", dashes: [10, 10], color: { color: "#444" } }, // Nuevos Mercados -> GG
      { id: "e3", from: 13, to: 6, arrows: "to", dashes: [10, 10], color: { color: "#444" } }, // KAM -> Comercial (Nuevo)

      // GG -> Directores
      { id: "e4", from: 1, to: 2, width: 2, color: { color: "#aaa" } }, 
      { id: "e5", from: 1, to: 3, width: 2, color: { color: "#aaa" } }, 
      { id: "e6", from: 1, to: 4, width: 2, color: { color: "#aaa" } }, 
      { id: "e7", from: 1, to: 5, width: 2, color: { color: "#aaa" } }, 
      { id: "e8", from: 1, to: 6, width: 2, color: { color: "#aaa" } }, 

      // Jerarquía Secundaria
      { id: "e9", from: 2, to: 7, width: 1, length: 180, color: { color: "#06b6d4" } }, // Ops -> Ops Norte
      { id: "e10", from: 5, to: 8, width: 1, length: 180, color: { color: "#06b6d4" } }, // Inn -> Sub I&T

      // Colaboración (Ecosistema)
      { id: "e11", from: 2, to: 5, dashes: true, color: { color: "#06b6d4" }, title: "Validación en Terreno" },
      { id: "e12", from: 2, to: 3, dashes: true, color: { color: "#94a3b8" }, title: "Estados de Pago" },
      { id: "e13", from: 6, to: 5, dashes: true, color: { color: "#06b6d4" }, title: "Oferta de Valor" },
      { id: "e14", from: 4, to: 2, dashes: true, color: { color: "#f97316" }, width: 1 },
      { id: "e15", from: 4, to: 6, dashes: true, color: { color: "#f97316" }, width: 1 }
    ]);

    const data = { nodes, edges };

    const options = {
      nodes: {
        shape: 'dot',
        shadow: true,
        font: { color: '#ffffff', multi: 'html' }
      },
      edges: {
        width: 2,
        shadow: true,
        smooth: { type: 'continuous' }
      },
      physics: {
        forceAtlas2Based: {
          gravitationalConstant: -200, 
          centralGravity: 0.005,
          springLength: 280, 
          springConstant: 0.05,
          avoidOverlap: 1
        },
        maxVelocity: 40,
        solver: 'forceAtlas2Based',
        timestep: 0.35,
        stabilization: { iterations: 150 }
      },
      interaction: { hover: true, tooltipDelay: 200 }
    };

    // @ts-ignore
    networkRef.current = new Network(domNode.current, data, options);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <div ref={domNode} className="w-full h-full" />
      
      <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg pointer-events-none text-white backdrop-blur-sm border border-gray-700 z-10">
        <h2 className="m-0 text-xl font-bold">CASIA 2026</h2>
        <p className="text-sm text-gray-300">Estructura Organizacional</p>
        <div className="mt-3 flex flex-col gap-2 text-xs text-gray-400">
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#0ea5e9]"></span> Gerencia</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span> Ops / Tech</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#94a3b8]"></span> Biz / Fin</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#f97316]"></span> People</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border-2 border-white bg-transparent"></span> Por Contratar</div>
           <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border border-dashed border-gray-500 bg-gray-800/50"></span> Futuro (2027+)</div>
        </div>
      </div>
    </div>
  );
};

export default EcosystemGraph;