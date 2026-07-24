import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { ShieldCheck, Users, AlertTriangle } from "lucide-react";
import { ROLE_LABELS, ROLE_COLORS, type AppRole } from "@/lib/roles";
import { updateUserRoleAction } from "./actions";

export const metadata = { title: "Gestion des autorisations" };

export default async function AutorisationsPage() {
  const session = await auth();
  const currentUserRole = (session?.user as Record<string, unknown>)?.role;
  if (currentUserRole !== "ADMIN") notFound();

  const currentUserId = (session?.user as Record<string, unknown>)?.id as string;

  const users = await db.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      createdAt: true,
    },
  });

  const roleOrder: AppRole[] = ["ADMIN", "PLANIFICATEUR", "PREPARATEUR", "COMPTABILITE", "FORMATEUR", "LECTEUR", "CLIENT"];
  const allRoles: AppRole[] = ["ADMIN", "PLANIFICATEUR", "PREPARATEUR", "COMPTABILITE", "FORMATEUR", "LECTEUR", "CLIENT"];

  // Statistiques par rôle
  const roleCounts = allRoles.reduce<Record<string, number>>((acc, r) => {
    acc[r] = users.filter((u) => u.role === r).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Autorisations</h1>
          <p className="text-sm text-muted-foreground">{users.length} utilisateur(s) enregistré(s)</p>
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid gap-3 md:grid-cols-4">
        {(["ADMIN", "PLANIFICATEUR", "PREPARATEUR", "COMPTABILITE"] as AppRole[]).map((r) => (
          <div key={r} className="bg-card border border-border rounded-xl p-4">
            <div className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full border mb-2 ${ROLE_COLORS[r]}`}>
              {ROLE_LABELS[r]}
            </div>
            <p className="text-2xl font-bold text-foreground">{roleCounts[r] ?? 0}</p>
            <p className="text-xs text-muted-foreground">utilisateur(s)</p>
          </div>
        ))}
      </div>

      {/* Role descriptions */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          Description des rôles
        </h2>
        <div className="grid gap-2 md:grid-cols-2 text-sm">
          <RoleDescription role="ADMIN" description="Accès complet à toutes les fonctionnalités, gestion des utilisateurs et paramètres système." />
          <RoleDescription role="PLANIFICATEUR" description="Gestion complète des sessions : demandes, affectation formateurs, confirmations, clôture." />
          <RoleDescription role="PREPARATEUR" description="Préparation des dossiers de formation et gestion du stock de fournitures." />
          <RoleDescription role="COMPTABILITE" description="Facturation clients, achats externes, analytiques financières." />
          <RoleDescription role="FORMATEUR" description="Consultation des sessions assignées, listes de présence, rapports." />
          <RoleDescription role="LECTEUR" description="Accès en lecture au tableau de bord uniquement." />
          <RoleDescription role="CLIENT" description="Portail client (accès par lien dédié) : ses sessions et demandes uniquement." />
        </div>
      </div>

      {/* Users table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Utilisateurs</h2>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Utilisateur
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Rôle actuel
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Modifier le rôle
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const role = user.role as AppRole;
              return (
                <tr key={user.id} className={`hover:bg-secondary/30 transition-colors ${isSelf ? "bg-primary/5" : ""}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                          {(user.name ?? user.email)[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {user.name ?? "—"}
                          {isSelf && (
                            <span className="ml-2 text-xs text-primary">(vous)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_COLORS[role] ?? "bg-secondary text-muted-foreground border-border"}`}>
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {isSelf ? (
                      <span className="text-xs text-muted-foreground italic">
                        Impossible de modifier votre propre rôle
                      </span>
                    ) : (
                      <form action={updateUserRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="px-2 py-1.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {roleOrder.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          Appliquer
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RoleDescription({ role, description }: { role: AppRole; description: string }) {
  return (
    <div className="flex gap-2">
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 h-fit mt-0.5 ${ROLE_COLORS[role]}`}>
        {ROLE_LABELS[role]}
      </span>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
