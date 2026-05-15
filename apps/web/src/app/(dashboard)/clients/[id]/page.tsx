import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  FileText,
  TrendingUp,
  Phone,
  Mail,
  Star,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
} from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  addContactAction,
  removeContactAction,
  setPrimaryContactAction,
  addSiteAction,
  toggleSiteAction,
} from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await db.client.findUnique({ where: { id } });
  return { title: client ? `Client — ${client.name}` : "Client introuvable" };
}

const REQUEST_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NOUVELLE: { label: "Nouvelle", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  EN_RECHERCHE: { label: "En recherche", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  PROPOSEE: { label: "Proposée", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  CONFIRMEE: { label: "Confirmée", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  ANNULEE: { label: "Annulée", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  CLOTUREE: { label: "Clôturée", color: "bg-secondary text-muted-foreground border-border" },
};

const INVOICE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BROUILLON: { label: "Brouillon", color: "bg-secondary text-muted-foreground border-border" },
  EMISE: { label: "Émise", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  ENVOYEE_CLIENT: { label: "Envoyée", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  PAYEE: { label: "Payée", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  EN_RETARD: { label: "En retard", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  ANNULEE: { label: "Annulée", color: "bg-secondary text-muted-foreground border-border" },
};

export default async function ClientDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;

  const client = await db.client.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: [{ primary: "desc" }, { name: "asc" }] },
      sites: { orderBy: [{ active: "desc" }, { label: "asc" }] },
      requests: {
        orderBy: { createdAt: "desc" },
        include: { site: true },
      },
      invoices: { orderBy: { issueDate: "desc" } },
    },
  });

  if (!client) notFound();

  const sessions = await db.trainingSession.findMany({
    where: { request: { clientId: id } },
    include: { theme: true, request: { include: { site: true } } },
    orderBy: { startDate: "desc" },
    take: 5,
  });

  const totalSessions = await db.trainingSession.count({
    where: { request: { clientId: id } },
  });

  const totalRevenue = client.invoices
    .filter((inv) => inv.status === "PAYEE")
    .reduce((sum, inv) => sum + inv.total, 0);

  const activeRequests = client.requests.filter(
    (r) => r.status !== "ANNULEE" && r.status !== "CLOTUREE"
  ).length;

  const tabs = [
    { key: "overview", label: "Vue d'ensemble" },
    { key: "sites", label: `Sites (${client.sites.length})` },
    { key: "contacts", label: `Contacts (${client.contacts.length})` },
    { key: "demandes", label: `Demandes (${client.requests.length})` },
    { key: "factures", label: `Factures (${client.invoices.length})` },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link
        href="/clients"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour aux clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  client.active
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-secondary text-muted-foreground border-border"
                }`}
              >
                {client.active ? "Actif" : "Inactif"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {totalSessions} session(s) · {client.requests.length} demande(s)
            </p>
          </div>
        </div>
        <Link
          href={`/clients/${id}/modifier`}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
        >
          <Edit className="h-4 w-4" />
          Modifier
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={<FileText className="h-4 w-4" />} label="Sessions totales">
          <p className="text-2xl font-bold text-foreground">{totalSessions}</p>
        </KpiCard>
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="CA facturé (payé)">
          <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
        </KpiCard>
        <KpiCard icon={<Users className="h-4 w-4" />} label="Demandes en cours">
          <p className="text-2xl font-bold text-foreground">{activeRequests}</p>
        </KpiCard>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`/clients/${id}?tab=${t.key}`}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewTab client={client} sessions={sessions} />
      )}
      {tab === "sites" && (
        <SitesTab client={client} />
      )}
      {tab === "contacts" && (
        <ContactsTab client={client} />
      )}
      {tab === "demandes" && (
        <DemandesTab requests={client.requests} />
      )}
      {tab === "factures" && (
        <FacturesTab invoices={client.invoices} />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      {children}
    </div>
  );
}

type ClientWithAll = NonNullable<Awaited<ReturnType<typeof db.client.findUnique<{
  where: { id: string };
  include: {
    contacts: true;
    sites: true;
    requests: { include: { site: true } };
    invoices: true;
  };
}>>>>;

type SessionWithRelations = Awaited<ReturnType<typeof db.trainingSession.findMany<{
  include: { theme: true; request: { include: { site: true } } };
}>>>[number];

function OverviewTab({
  client,
  sessions,
}: {
  client: ClientWithAll;
  sessions: SessionWithRelations[];
}) {
  const primaryContact = client.contacts.find((c) => c.primary);
  const activeSites = client.sites.filter((s) => s.active);

  return (
    <div className="space-y-6">
      {/* Info carte */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Informations</h2>
        <dl className="space-y-3">
          {client.notes && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Notes</dt>
              <dd className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</dd>
            </div>
          )}
          {primaryContact && (
            <div>
              <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Contact principal</dt>
              <dd className="text-sm text-foreground">
                {primaryContact.name}
                {primaryContact.role && (
                  <span className="text-muted-foreground ml-1">— {primaryContact.role}</span>
                )}
                {primaryContact.email && (
                  <a href={`mailto:${primaryContact.email}`} className="flex items-center gap-1 text-primary mt-0.5 text-xs hover:underline">
                    <Mail className="h-3 w-3" />
                    {primaryContact.email}
                  </a>
                )}
                {primaryContact.phone && (
                  <a href={`tel:${primaryContact.phone}`} className="flex items-center gap-1 text-muted-foreground mt-0.5 text-xs hover:text-foreground">
                    <Phone className="h-3 w-3" />
                    {primaryContact.phone}
                  </a>
                )}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Sites actifs */}
      {activeSites.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Sites actifs</h2>
          </div>
          <div className="divide-y divide-border">
            {activeSites.map((site) => (
              <div key={site.id} className="flex items-center gap-3 px-6 py-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{site.label}</p>
                  <p className="text-xs text-muted-foreground">{site.address} — {site.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5 dernières sessions */}
      {sessions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Dernières sessions</h2>
          </div>
          <div className="divide-y divide-border">
            {sessions.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    s.status === "CONFIRMEE"
                      ? "bg-green-400"
                      : s.status === "PROVISOIRE"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.theme.label}</p>
                  <p className="text-xs text-muted-foreground">{s.request.site.city}</p>
                </div>
                <p className="text-sm text-muted-foreground flex-shrink-0">{formatDate(s.startDate)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SitesTab({ client }: { client: ClientWithAll }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Sites</h2>
        </div>

        {client.sites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Aucun site enregistré.</div>
        ) : (
          <div className="divide-y divide-border">
            {client.sites.map((site) => (
              <div key={site.id} className="flex items-center gap-4 px-6 py-4">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    site.active ? "bg-green-400" : "bg-secondary border border-border"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{site.label}</p>
                  <p className="text-xs text-muted-foreground">{site.address}</p>
                  <p className="text-xs text-muted-foreground">{site.city}</p>
                </div>
                <form action={toggleSiteAction}>
                  <input type="hidden" name="siteId" value={site.id} />
                  <input type="hidden" name="clientId" value={client.id} />
                  <input type="hidden" name="active" value={site.active ? "true" : "false"} />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-secondary"
                    title={site.active ? "Désactiver" : "Activer"}
                  >
                    {site.active ? (
                      <ToggleRight className="h-4 w-4 text-green-400" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                    {site.active ? "Actif" : "Inactif"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add site form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un site
        </h3>
        <form action={addSiteAction} className="space-y-4">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Label *
              </label>
              <input
                name="label"
                required
                placeholder="ex. HUTCHINSON BOUSKOURA"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Ville *
              </label>
              <input
                name="city"
                required
                placeholder="ex. Casablanca"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Adresse *
            </label>
            <input
              name="address"
              required
              placeholder="ex. Zone Industrielle, Route de Bouskoura"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ajouter le site
          </button>
        </form>
      </div>
    </div>
  );
}

function ContactsTab({ client }: { client: ClientWithAll }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Contacts</h2>
        </div>

        {client.contacts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Aucun contact enregistré.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nom</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Téléphone</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {client.contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{contact.name}</span>
                      {contact.primary && (
                        <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full">
                          <Star className="h-3 w-3" />
                          Principal
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="hover:text-primary transition-colors">
                        {contact.email}
                      </a>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {contact.phone || "—"}
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {contact.role || "—"}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!contact.primary && (
                        <form action={setPrimaryContactAction}>
                          <input type="hidden" name="contactId" value={contact.id} />
                          <input type="hidden" name="clientId" value={client.id} />
                          <button
                            type="submit"
                            title="Définir comme principal"
                            className="p-1.5 rounded-md text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                          >
                            <Star className="h-4 w-4" />
                          </button>
                        </form>
                      )}
                      <form action={removeContactAction}>
                        <input type="hidden" name="contactId" value={contact.id} />
                        <input type="hidden" name="clientId" value={client.id} />
                        <button
                          type="submit"
                          title="Supprimer le contact"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add contact form */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un contact
        </h3>
        <form action={addContactAction} className="space-y-4">
          <input type="hidden" name="clientId" value={client.id} />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Nom *
              </label>
              <input
                name="name"
                required
                placeholder="ex. Karim Benali"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Rôle
              </label>
              <input
                name="role"
                placeholder="ex. Responsable formation"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="ex. k.benali@entreprise.ma"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                Téléphone
              </label>
              <input
                name="phone"
                placeholder="ex. +212 6 00 00 00 00"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="primary"
              value="true"
              id="contact-primary"
              className="rounded border-border"
            />
            <label htmlFor="contact-primary" className="text-sm text-foreground">
              Définir comme contact principal
            </label>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Ajouter le contact
          </button>
        </form>
      </div>
    </div>
  );
}

function DemandesTab({ requests }: { requests: ClientWithAll["requests"] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Demandes de formation</h2>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucune demande.</div>
      ) : (
        <div className="divide-y divide-border">
          {requests.map((req) => {
            const statusInfo = REQUEST_STATUS_LABELS[req.status] ?? {
              label: req.status,
              color: "bg-secondary text-muted-foreground border-border",
            };
            return (
              <Link
                key={req.id}
                href={`/demandes/${req.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/50 transition-colors"
              >
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${statusInfo.color}`}
                >
                  {statusInfo.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {req.participants} participant(s)
                    {req.urgency > 0 && (
                      <span className="ml-2 text-xs text-orange-400">
                        ⚡ {["", "Assez urgent", "Urgent", "Très urgent"][req.urgency]}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {req.site.city} — {req.site.label}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {req.desiredDateFrom && (
                    <p className="text-sm text-foreground">{formatDate(req.desiredDateFrom)}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{formatDate(req.createdAt)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FacturesTab({ invoices }: { invoices: ClientWithAll["invoices"] }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Factures</h2>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Aucune facture.</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Référence</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Émission</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Échéance</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Montant TTC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.map((inv) => {
              const statusInfo = INVOICE_STATUS_LABELS[inv.status] ?? {
                label: inv.status,
                color: "bg-secondary text-muted-foreground border-border",
              };
              return (
                <tr key={inv.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-3 text-sm font-medium text-foreground">{inv.reference}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{formatDate(inv.issueDate)}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{formatDate(inv.dueDate)}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-foreground">
                    {formatCurrency(inv.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
