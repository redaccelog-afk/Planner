import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Calendar, MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { MatchingPanel } from "@/components/demandes/matching-panel";
import { RequestStatusBadge } from "@/components/demandes/request-status-badge";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const req = await db.trainingRequest.findUnique({ where: { id }, include: { client: true } });
  return { title: req ? `Demande — ${req.client.name}` : "Demande introuvable" };
}

export default async function DemandeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const request = await db.trainingRequest.findUnique({
    where: { id },
    include: {
      client: { include: { contacts: true } },
      site: true,
      themes: { include: { theme: true } },
      sessions: {
        include: { trainer: true, theme: true },
        orderBy: { startDate: "asc" },
      },
      emailThread: {
        include: { messages: { orderBy: { receivedAt: "desc" }, take: 5 } },
      },
    },
  });

  if (!request) notFound();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <Link href="/demandes" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Retour aux demandes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <RequestStatusBadge status={request.status} />
            {request.urgency > 0 && (
              <span className="text-xs text-orange-400 font-medium">
                ⚡ {["", "Assez urgent", "Urgent", "Très urgent"][request.urgency]}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">{request.client.name}</h1>
          <p className="text-muted-foreground mt-1">{request.site.city} · {request.site.label}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={<Users className="h-4 w-4" />} label="Participants">
          <p className="text-2xl font-bold text-foreground">{request.participants}</p>
        </InfoCard>

        <InfoCard icon={<Calendar className="h-4 w-4" />} label="Période souhaitée">
          {request.desiredDateFrom ? (
            <>
              <p className="font-medium text-foreground">{formatDate(request.desiredDateFrom)}</p>
              {request.desiredDateTo && (
                <p className="text-sm text-muted-foreground">→ {formatDate(request.desiredDateTo)}</p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">Non précisée</p>
          )}
        </InfoCard>

        <InfoCard icon={<MapPin className="h-4 w-4" />} label="Site">
          <p className="font-medium text-foreground">{request.site.label}</p>
          <p className="text-sm text-muted-foreground">{request.site.address}</p>
        </InfoCard>
      </div>

      {/* Thèmes */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Thèmes demandés</h2>
        <div className="flex flex-wrap gap-3">
          {request.themes.map((rt) => (
            <div key={rt.themeId} className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <span className="text-xs font-mono text-muted-foreground">{rt.theme.code}</span>
              <span className="text-sm text-foreground">{rt.theme.label}</span>
              <span className="text-xs text-muted-foreground">{rt.theme.durationDays}j</span>
            </div>
          ))}
        </div>
      </div>

      {/* Extraction IA */}
      {request.aiExtracted && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-2">Extraction IA</h2>
          <p className="text-xs text-muted-foreground mb-3">Données extraites automatiquement du mail — validées par Reda</p>
          <pre className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 overflow-x-auto">
            {JSON.stringify(request.aiExtracted, null, 2)}
          </pre>
        </div>
      )}

      {/* Matching formateurs */}
      {(request.status === "NOUVELLE" || request.status === "EN_RECHERCHE") && (
        <MatchingPanel requestId={request.id} />
      )}

      {/* Sessions associées */}
      {request.sessions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Sessions planifiées</h2>
          </div>
          <div className="divide-y divide-border">
            {request.sessions.map((s) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/50 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  s.status === "CONFIRMEE" ? "bg-green-400" : s.status === "PROVISOIRE" ? "bg-yellow-400" : "bg-red-400"
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.theme.label}</p>
                  <p className="text-xs text-muted-foreground">{s.trainer.fullName}</p>
                </div>
                <p className="text-sm text-foreground">{formatDate(s.startDate)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {request.notes && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.notes}</p>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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
