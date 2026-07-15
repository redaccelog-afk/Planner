export const MAX_ANSWER_SLOTS = 4;

export const ANSWER_STYLES = [
  { shape: "triangle", color: "#E53935" },
  { shape: "diamond", color: "#1E88E5" },
  { shape: "circle", color: "#FBC02D" },
  { shape: "square", color: "#43A047" },
] as const;

export const TEAM_COLORS = [
  "#7C3AED",
  "#E53935",
  "#1E88E5",
  "#FBC02D",
  "#43A047",
  "#FB8C00",
  "#00897B",
  "#D81B60",
];

export const DEFAULT_TIME_LIMIT_SEC = 20;
export const DEFAULT_QUESTION_POINTS = 1000;
export const MIN_SCORE_FACTOR = 0.5;

export const PIN_LENGTH = 6;

export type BackgroundTheme = {
  key: string;
  label: string;
  gradient: string;
  accent: string;
};

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    key: "cce_log",
    label: "CCE LOG",
    gradient: "radial-gradient(circle at top, #1B4F8A 0%, #0F2744 55%, #081527 100%)",
    accent: "#F07D00",
  },
  {
    key: "violet_nuit",
    label: "Violet nuit",
    gradient: "radial-gradient(circle at top, #2e1065 0%, #1e0a4a 55%, #120730 100%)",
    accent: "#7C3AED",
  },
  {
    key: "ocean",
    label: "Océan",
    gradient: "radial-gradient(circle at top, #0c4a6e 0%, #0b3355 55%, #051d33 100%)",
    accent: "#22D3EE",
  },
  {
    key: "coucher_de_soleil",
    label: "Coucher de soleil",
    gradient: "radial-gradient(circle at top, #7c2d12 0%, #6b1d1d 55%, #2a0a0a 100%)",
    accent: "#FB923C",
  },
  {
    key: "foret",
    label: "Forêt",
    gradient: "radial-gradient(circle at top, #14532d 0%, #0f3d22 55%, #051f10 100%)",
    accent: "#4ADE80",
  },
];

export const DEFAULT_BACKGROUND_THEME = "cce_log";

export type MusicTheme = {
  key: string;
  label: string;
};

export const MUSIC_THEMES: MusicTheme[] = [
  { key: "none", label: "Aucune musique" },
  { key: "energique", label: "Énergique" },
  { key: "suspense", label: "Suspense" },
  { key: "decontracte", label: "Décontracté" },
  { key: "epique", label: "Épique" },
];

export const DEFAULT_MUSIC_THEME = "none";

export const FUN_TEAM_NAMES = [
  "Les Lions",
  "Les Aigles",
  "Les Requins",
  "Les Renards",
  "Les Loups",
  "Les Panthères",
  "Les Faucons",
  "Les Tigres",
  "Les Dragons",
  "Les Phénix",
  "Les Cobras",
  "Les Scorpions",
];
