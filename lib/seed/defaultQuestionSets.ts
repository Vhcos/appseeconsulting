export type SeedQuestionType =
  | "TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "SINGLE_SELECT"
  | "MULTI_SELECT"
  | "SCALE_1_5";

export type SeedQuestion = {
  key: string;
  order: number;
  type: SeedQuestionType;
  required?: boolean;

  promptEs: string;
  promptEn: string;

  helpEs?: string;
  helpEn?: string;

  // Para SINGLE_SELECT / MULTI_SELECT
  options?: string[];
};

export type SeedQuestionSet = {
  kind: "SURVEY" | "INTERVIEW" | "WORKSHOP";
  order: number;

  titleEs: string;
  titleEn: string;

  descriptionEs?: string;
  descriptionEn?: string;

  questions: SeedQuestion[];
};

/**
 * Base inicial (simple pero útil) para que el Wizard ya “camine”.
 * La idea es que luego lo afinamos con tus anexos (docx) y el PDF final.
 */
export const DEFAULT_QUESTION_SETS: SeedQuestionSet[] = [
  {
    kind: "INTERVIEW",
    order: 1,
    titleEs: "Kickoff y contexto",
    titleEn: "Kickoff and context",
    descriptionEs: "Contexto del negocio, objetivos, restricciones y definición de éxito.",
    descriptionEn: "Business context, goals, constraints and definition of success.",
    questions: [
      {
        key: "project_goal",
        order: 1,
        type: "LONG_TEXT",
        required: true,
        promptEs: "¿Cuál es el objetivo principal de este proceso (en una frase)?",
        promptEn: "What is the main goal of this process (one sentence)?"
      },
      {
        key: "success_definition",
        order: 2,
        type: "LONG_TEXT",
        required: true,
        promptEs: "¿Cómo se define 'éxito' al cierre del proyecto?",
        promptEn: "How do you define 'success' at the end of the project?"
      },
      {
        key: "constraints",
        order: 3,
        type: "LONG_TEXT",
        promptEs: "Restricciones: tiempo, presupuesto, recursos, tecnología, legales, etc.",
        promptEn: "Constraints: time, budget, resources, tech, legal, etc."
      }
    ]
  },
  {
    kind: "SURVEY",
    order: 2,
    titleEs: "Modelo de negocio",
    titleEn: "Business model",
    descriptionEs: "Propuesta de valor, clientes, canales, ingresos y costos.",
    descriptionEn: "Value prop, customers, channels, revenue and costs.",
    questions: [
      {
        key: "value_prop",
        order: 1,
        type: "LONG_TEXT",
        required: true,
        promptEs: "Describe la propuesta de valor actual (qué problema resuelve y para quién).",
        promptEn: "Describe the current value proposition (problem and for whom)."
      },
      {
        key: "customer_segments",
        order: 2,
        type: "LONG_TEXT",
        promptEs: "Segmentos de cliente principales (y secundarios si aplica).",
        promptEn: "Main customer segments (and secondary if applicable)."
      },
      {
        key: "pricing",
        order: 3,
        type: "LONG_TEXT",
        promptEs: "¿Cómo cobran hoy? (precio, plan, contrato, condiciones)",
        promptEn: "How do you charge today? (pricing, plans, contract, terms)"
      }
    ]
  },
  {
    kind: "SURVEY",
    order: 3,
    titleEs: "Operación",
    titleEn: "Operations",
    descriptionEs: "Proceso, equipo, cuellos de botella, riesgos operativos.",
    descriptionEn: "Process, team, bottlenecks, operational risks.",
    questions: [
      {
        key: "process_overview",
        order: 1,
        type: "LONG_TEXT",
        promptEs: "Describe el proceso operativo end-to-end (paso a paso).",
        promptEn: "Describe the end-to-end operating process (step by step)."
      },
      {
        key: "bottlenecks",
        order: 2,
        type: "LONG_TEXT",
        promptEs: "Top 3 cuellos de botella hoy (y por qué).",
        promptEn: "Top 3 bottlenecks today (and why)."
      }
    ]
  },
  {
    kind: "SURVEY",
    order: 4,
    titleEs: "Mercado y competencia",
    titleEn: "Market and competition",
    descriptionEs: "Competidores, sustitutos, diferenciación, riesgos de mercado.",
    descriptionEn: "Competitors, substitutes, differentiation, market risks.",
    questions: [
      {
        key: "main_competitors",
        order: 1,
        type: "LONG_TEXT",
        promptEs: "Competidores principales (nombres + por qué compiten).",
        promptEn: "Main competitors (names + why they compete)."
      },
      {
        key: "differentiation",
        order: 2,
        type: "LONG_TEXT",
        promptEs: "¿Dónde está tu diferenciación real hoy? (no marketing)",
        promptEn: "What is your real differentiation today? (not marketing)"
      }
    ]
  },
  {
    kind: "WORKSHOP",
    order: 5,
    titleEs: "KPIs (definición inicial)",
    titleEn: "KPIs (initial definition)",
    descriptionEs: "Qué se mide, por qué, frecuencia y dueño.",
    descriptionEn: "What to measure, why, frequency and owner.",
    questions: [
      {
        key: "north_star",
        order: 1,
        type: "TEXT",
        promptEs: "North Star Metric (si aplica):",
        promptEn: "North Star Metric (if applies):"
      },
      {
        key: "kpi_candidates",
        order: 2,
        type: "LONG_TEXT",
        promptEs: "Lista inicial de KPIs candidatos (10–20).",
        promptEn: "Initial list of KPI candidates (10–20)."
      }
    ]
  }
];
