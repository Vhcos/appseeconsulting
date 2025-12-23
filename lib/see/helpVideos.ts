// lib/see/helpVideos.ts
export type HelpVideo = {
  key: string;
  youtubeId?: string;      // si no hay, mostramos "Video aún no cargado"
  titleEs: string;
  titleEn: string;
  helperEs?: string;
  helperEn?: string;
  minutes?: number;        // opcional
};

const VIDEOS: Record<string, HelpVideo> = {
  "account-plan": {
    key: "account-plan",
    titleEs: "Plan por cuenta (cliente)",
    titleEn: "Account plan",
    helperEs: "Cómo llenar esta tabla en 2 minutos (sin palabras raras).",
    helperEn: "How to fill this table in 2 minutes (no jargon).",
    minutes: 2,
  },
  "unit-economics": {
    key: "unit-economics",
    titleEs: "Unit economics",
    titleEn: "Unit economics",
    helperEs: "Cómo estimar precio, margen y supuestos sin volverte loco.",
    helperEn: "How to estimate price, margin and assumptions.",
    minutes: 3,
  },
  "actions": {
    key: "actions",
    titleEs: "Acciones (action-log)",
    titleEn: "Actions (action-log)",
    helperEs: "Cómo usar acciones para empujar el roadmap cada semana.",
    helperEn: "How to use actions to push the roadmap weekly.",
    minutes: 2,
  },
  "strategy": {
    key: "strategy",
    titleEs: "Visión, misión y objetivos",
    titleEn: "Vision, mission and objectives",
    helperEs: "Preguntas guía para escribirlo bien sin confundir misión con visión.",
    helperEn: "Guiding questions to write it well (vision vs mission).",
    minutes: 4,
  },
  "swot": {
    key: "swot",
    titleEs: "FODA",
    titleEn: "SWOT",
    helperEs: "Cómo pasar de diagnóstico a FODA accionable (no poema).",
    helperEn: "How to turn diagnosis into an actionable SWOT.",
    minutes: 4,
  },
};

export function youtubeWatchUrl(youtubeId: string) {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function youtubeEmbedUrl(youtubeId: string) {
  return `https://www.youtube.com/embed/${youtubeId}`;
}

export function getHelpVideo(
  key: string,
  locale: string = "es"
): HelpVideo & {
  title: string;
  helper: string;
  eta: string;
  embedUrl: string;
  watchUrl: string;
  hasVideo: boolean;
} {
  const base =
    VIDEOS[key] ??
    ({
      key,
      titleEs: "Video de ayuda",
      titleEn: "Help video",
      helperEs: "Video aún no cargado.",
      helperEn: "Video not added yet.",
    } as HelpVideo);

  const title = locale === "en" ? base.titleEn : base.titleEs;
  const helper = locale === "en" ? base.helperEn ?? "" : base.helperEs ?? "";
  const eta = base.minutes ? `${base.minutes} min` : "";

  const hasVideo = Boolean(base.youtubeId);
  const embedUrl = base.youtubeId ? youtubeEmbedUrl(base.youtubeId) : "";
  const watchUrl = base.youtubeId ? youtubeWatchUrl(base.youtubeId) : "";

  return { ...base, title, helper, eta, embedUrl, watchUrl, hasVideo };
}
