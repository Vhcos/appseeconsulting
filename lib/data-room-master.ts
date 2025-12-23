import { DataRoomArea } from "@prisma/client";

export type DataRoomMasterItem = {
  area: DataRoomArea;
  code: string;
  title: string;
  description: string;
};

/**
 * Plantilla maestra del Anexo A.2 (Checklist de insumos del Data Room).
 * Estas filas se copian por engagement cuando el usuario crea el checklist.
 */
export const DATA_ROOM_MASTER: DataRoomMasterItem[] = [
  // Gobierno y organización
  {
    area: "GOVERNANCE",
    code: "A.2.1",
    title: "Organigrama y roles",
    description:
      "Organigrama actual y descripción de roles clave (incluye subcontratos).",
  },
  {
    area: "GOVERNANCE",
    code: "A.2.2",
    title: "Actas de Directorio",
    description: "Actas o acuerdos del Directorio de los últimos 6–12 meses.",
  },
  {
    area: "GOVERNANCE",
    code: "A.2.3",
    title: "Stakeholders críticos",
    description:
      "Lista de stakeholders críticos (clientes, mandantes, contratistas, partners).",
  },

  // Comercial
  {
    area: "COMMERCIAL",
    code: "A.2.4",
    title: "Listado de contratos",
    description:
      "Cliente/faena, modalidad, alcance, monto, duración, renovación, margen estimado, competidor.",
  },
  {
    area: "COMMERCIAL",
    code: "A.2.5",
    title: "Pipeline comercial",
    description:
      "Oportunidad, etapa, probabilidad, decisores, fecha estimada, win/loss.",
  },
  {
    area: "COMMERCIAL",
    code: "A.2.6",
    title: "Propuestas ganadas y perdidas",
    description:
      "Tres propuestas ganadas y tres perdidas, idealmente con feedback del cliente.",
  },
  {
    area: "COMMERCIAL",
    code: "A.2.7",
    title: "Material comercial",
    description:
      "One-pager, presentaciones, casos de éxito y base de precios vigente.",
  },

  // Operaciones
  {
    area: "OPERATIONS",
    code: "A.2.8",
    title: "Plan de ejecución",
    description:
      "Plan semanal/mensual de ejecución: frentes de trabajo, dotación, equipos.",
  },
  {
    area: "OPERATIONS",
    code: "A.2.9",
    title: "Registro de fallas y retrabajos",
    description:
      "Registro de fallas, retrabajos y emergencias de los últimos 12 meses.",
  },
  {
    area: "OPERATIONS",
    code: "A.2.10",
    title: "Procedimientos operativos",
    description:
      "SOP (Standard Operating Procedure) u otros procedimientos si existen.",
  },
  {
    area: "OPERATIONS",
    code: "A.2.11",
    title: "Capacidad real",
    description:
      "Capacidad real (m²/mes por dotación/equipos) y limitantes: clima, logística, turnos, permisos.",
  },

  // HSEC
  {
    area: "HSEC",
    code: "A.2.12",
    title: "Matriz de riesgos HSEC",
    description: "Matriz de riesgos HSEC y controles críticos asociados.",
  },
  {
    area: "HSEC",
    code: "A.2.13",
    title: "Incidentes y casi-incidentes",
    description:
      "Incidentes y casi-incidentes de los últimos 12 meses y acciones correctivas.",
  },
  {
    area: "HSEC",
    code: "A.2.14",
    title: "Evidencias de cumplimiento HSEC",
    description:
      "Inducciones, permisos, checklists, auditorías del mandante u otros.",
  },
  {
    area: "HSEC",
    code: "A.2.15",
    title: "KPIs HSEC",
    description: "KPIs HSEC (TRIFR u equivalente) si existen.",
  },

  // Datos y tecnología
  {
    area: "DATA_TECH",
    code: "A.2.16",
    title: "Catálogo de datos",
    description:
      "Qué se mide, cómo, frecuencia, calidad y trazabilidad de los datos.",
  },
  {
    area: "DATA_TECH",
    code: "A.2.17",
    title: "Reportes existentes",
    description:
      "Ejemplos de reportes enviados: operación versus alta dirección.",
  },
  {
    area: "DATA_TECH",
    code: "A.2.18",
    title: "Backlog de mejoras de plataforma",
    description:
      "Backlog de mejoras de plataforma y límites actuales (personas, sensores, conectividad).",
  },

  // Finanzas
  {
    area: "FINANCE",
    code: "A.2.19",
    title: "EERR histórico",
    description:
      "Estado de Resultados mensual de los últimos 12–24 meses, idealmente por línea de negocio.",
  },
  {
    area: "FINANCE",
    code: "A.2.20",
    title: "Margen por contrato",
    description:
      "Margen por contrato (aunque sea aproximado) y costos directos asociados.",
  },
  {
    area: "FINANCE",
    code: "A.2.21",
    title: "Ciclo de caja",
    description:
      "Días de cobro/pago y política de facturación (hitos, anticipos, retenciones).",
  },
  {
    area: "FINANCE",
    code: "A.2.22",
    title: "Proyecciones internas",
    description:
      "Proyecciones internas si existen (presupuesto, forecast, escenarios).",
  },
];

