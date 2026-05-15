import { db } from "@ccelog/db";
import Link from "next/link";
import { Plus, MapPin, Users, TrendingUp, Clock } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";

export const metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const activeFilter = status === "inactif" ? false : status === "actif" ? true : undefined;

  const clients = await db.client.findMany({
    where: {
      active: activeFilter,
      ...(q?.trim()
        ? {
            normalizedName: {
              contains: q
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[̀-ͯ]/g, ""),
            },
          }
        : {}),
    },
    include: {
      sites: { where: { active: true } },
      contacts: { where: { primary: true } },
      _count: { select: { requests: true } },
      invoices: { where: { status: "PAYEE" }, select: { total: true } },
      requests: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { updatedAt: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalActive = await db.client.count({ where: { active: true } });
  const totalInactive = await db.client.count({ where: { active: false } });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalActive} actif(s) · {totalInactive} inactif(s)
          </p>
        </div>
        <Link
          href="/clients/nouveau"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form className="relative flex-1 min-w-48 max-w-sm">
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher un client..."
            className="w-full pl-3 pr-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {status && <input type="hidden" name="status" value={status} />}
        </form>

        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border">
          <FilterLink href="/clients" active={!status} label="Tous" />
          <FilterLink href="/clients?status=actif" active={status === "actif"} label="Actifs" />
          <FilterLink href="/clients?status=inactif" active={status === "inactif"} label="Inactifs" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Client
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sites
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Contact principal
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center justify-end gap-1">
                  <Users className="h-3 w-3" />
                  Demandes
                </div>
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="h-3 w-3" />
                  CA (payé)
                </div>
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  Dernière activité
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((client) => {
              const totalRevenue = client.invoices.reduce((sum, inv) => sum + inv.total, 0);
              const lastActivity = client.requests[0]?.updatedAt ?? null;

              return (
                <tr key={client.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/clients/${client.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors"
                      >
                        {client.name}
                      </Link>
                      {!client.active && (
                        <span className="text-xs px-1.5 py-0.5 bg-secondary text-muted-foreground border border-border rounded-full">
                          Inactif
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {client.sites.slice(0, 2).map((site) => (
                        <span key={site.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {site.city}
                        </span>
                      ))}
                      {client.sites.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{client.sites.length - 2} sites
                        </span>
                      )}
                      {client.sites.length === 0 && (
                        <span className="text-xs text-muted-foreground italic">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {client.contacts[0] ? (
                      <span>{client.contacts[0].name}</span>
                    ) : (
                      <span className="italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-foreground">
                      {client._count.requests}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-foreground">
                      {totalRevenue > 0 ? formatCurrency(totalRevenue) : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                    {lastActivity ? formatDate(lastActivity) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {clients.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            {q ? `Aucun client trouvé pour "${q}".` : "Aucun client enregistré."}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </Link>
  );
}
