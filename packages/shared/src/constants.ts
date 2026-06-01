export const TIMEZONE = "Africa/Casablanca";

export const HOTEL_DISTANCE_THRESHOLD_KM = 150;
export const MAX_CONSECUTIVE_SESSIONS = 3;
export const DISTANCE_CACHE_DAYS = 30;

// Tarif kilométrique MAD
export const RATE_PER_KM = 2.5;
export const PER_DIEM_MAD = 300;

// Couleurs statut session (CSS class)
export const SESSION_STATUS_COLORS = {
  CONFIRMEE: "bg-white border-gray-300 text-gray-900",
  PROVISOIRE: "bg-yellow-50 border-yellow-300 text-yellow-900",
  ANNULEE: "bg-red-50 border-red-300 text-red-800",
} as const;

// Templates WhatsApp approuvés
export const WA_TEMPLATES = {
  DISPO_FORMATEUR: "dispo_formateur_v1",
  CONFIRMATION: "confirmation_formateur_v1",
  RAPPEL_DOCUMENTS: "rappel_documents_v1",
  RAPPEL_MATERIEL: "rappel_materiel_v1",
  DEMANDE_RAPPORT: "demande_rapport_v1",
} as const;

// Jours de décalage pour les notifications
export const NOTIFICATION_OFFSETS = {
  RAPPEL_J7_CLIENT: -7,          // rappel client J-7
  CONFIRMATION_CLIENT: -7,       // keep for backward compat
  RAPPEL_FORMATEUR: -3,          // rappel formateur J-3
  ORDRE_MISSION_AUTO: -3,        // génération ordre de mission J-3 (INTERNE only)
  RAPPEL_J3_ALL: -3,             // rappel J-3 tous destinataires
  DOCUMENTS_PRETS: -2,           // documents prêts J-2
  RAPPEL_HOTEL_ITINERAIRE: -1,   // rappel hotel J-1
  DEMANDE_RAPPORT: 1,            // demande rapport J+1
  RELANCE_RAPPORT: 3,            // relance rapport J+3
  ENVOI_RAPPORT_CLIENT: 7,       // envoi rapport client J+7
} as const;

export const MOROCCAN_CITIES = [
  "Casablanca", "Rabat", "Fès", "Marrakech", "Agadir", "Tanger", "Meknès",
  "Oujda", "Kénitra", "Tétouan", "Safi", "Mohammedia", "Khouribga", "Béni Mellal",
  "El Jadida", "Nador", "Berrechid", "Taza", "Settat", "Ksar el-Kébir",
  "Laâyoune", "Khémisset", "Guelmim", "Berkane", "Taourirt", "Errachidia",
  "Ouarzazate", "Taroudant", "Bouskoura",
] as const;
