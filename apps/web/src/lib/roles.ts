/**
 * Matrice centrale des droits d'accès par rôle.
 * Utilisée dans le middleware (Edge) et les composants serveur.
 */

export type AppRole =
  | "ADMIN"
  | "PLANIFICATEUR"
  | "PREPARATEUR"
  | "COMPTABILITE"
  | "FORMATEUR"
  | "LECTEUR"
  | "CLIENT";

export const ROLE_LABELS: Record<AppRole, string> = {
  ADMIN: "Super Admin",
  PLANIFICATEUR: "Planificateur",
  PREPARATEUR: "Préparateur dossiers",
  COMPTABILITE: "Comptabilité",
  FORMATEUR: "Formateur",
  LECTEUR: "Lecteur",
  CLIENT: "Client",
};

export const ROLE_COLORS: Record<AppRole, string> = {
  ADMIN: "bg-red-500/20 text-red-400 border-red-500/30",
  PLANIFICATEUR: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PREPARATEUR: "bg-green-500/20 text-green-400 border-green-500/30",
  COMPTABILITE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  FORMATEUR: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LECTEUR: "bg-secondary text-muted-foreground border-border",
  CLIENT: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

/**
 * Routes protégées : préfixe → rôles autorisés.
 * ADMIN a accès à tout sans être listé ici.
 * L'ordre n'a pas d'importance (on teste tous les préfixes).
 */
export const ROUTE_PERMISSIONS: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: "/pipeline", roles: ["PLANIFICATEUR"] },
  { prefix: "/demandes", roles: ["PLANIFICATEUR"] },
  { prefix: "/sessions", roles: ["PLANIFICATEUR"] },
  { prefix: "/calendrier", roles: ["PLANIFICATEUR"] },
  { prefix: "/formateurs", roles: ["PLANIFICATEUR"] },
  { prefix: "/clients", roles: ["PLANIFICATEUR", "COMPTABILITE"] },
  { prefix: "/themes", roles: ["PLANIFICATEUR"] },
  { prefix: "/stock", roles: ["PLANIFICATEUR", "PREPARATEUR"] },
  { prefix: "/dossiers", roles: ["PLANIFICATEUR", "PREPARATEUR"] },
  { prefix: "/rapports", roles: ["PLANIFICATEUR", "FORMATEUR"] },
  { prefix: "/facturation", roles: ["COMPTABILITE"] },
  { prefix: "/achats", roles: ["PLANIFICATEUR", "COMPTABILITE"] },
  { prefix: "/analytiques", roles: ["PLANIFICATEUR", "COMPTABILITE"] },
  { prefix: "/ged", roles: ["PLANIFICATEUR", "COMPTABILITE"] },
  { prefix: "/parametres", roles: [] }, // ADMIN only — empty = personne d'autre
  { prefix: "/mes-validations", roles: ["FORMATEUR"] },
];

/** Vérifie si un rôle peut accéder à un chemin donné. */
export function canAccess(role: string | undefined | null, pathname: string): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true; // super admin

  // Chercher le préfixe correspondant
  const match = ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix));
  if (!match) return true; // aucune règle = accès autorisé (ex. /dashboard)

  return match.roles.includes(role as AppRole);
}
