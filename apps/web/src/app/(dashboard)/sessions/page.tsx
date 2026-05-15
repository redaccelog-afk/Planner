import { db } from "@ccelog/db";
import { Suspense } from "react";
import { CalendarView } from "@/components/sessions/calendar-view";
import { SessionsFilter } from "@/components/sessions/sessions-filter";
import { CalendarDays, List, Map, Plus } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Sessions" };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string; to?: string; trainerId?: string }>;
}) {
  const params = await searchParams;
  const view = params.view ?? "list";

  const now = new Date();
  const from = params.from ? new Date(params.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = params.to
    ? new Date(params.to)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const sessions = await db.trainingSession.findMany({
    where: {
      startDate: { gte: from },
      endDate: { lte: to },
      ...(params.trainerId ? { trainerId: params.trainerId } : {}),
    },
    include: {
      trainer: true,
      theme: true,
      request: { include: { client: true, site: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const trainers = await db.trainer.findMany({
    where: { active: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  // Stats ce mois
  const confirmed = sessions.filter((s) => s.status === "CONFIRMEE").length;
  const provisional = sessions.filter((s) => s.status === "PROVISOIRE").length;
  const cancelled = sessions.filter((s) => s.status === "ANNULEE").length;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
          <p className="text-sm text-muted-foreground mt-1">{sessions.length} session(s) sur la période</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Vue switcher */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
            {[
              { key: "list", label: "Liste", icon: List },
              { key: "calendar", label: "Calendrier", icon: CalendarDays },
              { key: "map", label: "Carte", icon: Map },
            ].map(({ key, label, icon: Icon }) => (
              <a
                key={key}
                href={`/sessions?view=${key}&from=${from.toISOString()}&to=${to.toISOString()}${params.trainerId ? `&trainerId=${params.trainerId}` : ""}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  view === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </a>
            ))}
          </div>
          <Link
            href="/sessions/nouveau"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle session
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <StatCard label="Confirmées" value={confirmed} color="text-green-400" dot="bg-green-400" />
        <StatCard label="Provisoires" value={provisional} color="text-yellow-400" dot="bg-yellow-400" />
        <StatCard label="Annulées" value={cancelled} color="text-red-400" dot="bg-red-400" />
      </div>

      {/* Filtres */}
      <SessionsFilter trainers={trainers} currentTrainerId={params.trainerId} />

      {/* Légende couleurs */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-white border border-gray-300" />
          Confirmée
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-300" />
          Provisoire
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-50 border border-red-300" />
          Annulée
        </div>
      </div>

      {/* Vue */}
      <div className="flex-1 min-h-0">
        <Suspense fallback={<div className="flex items-center justify-center h-64 text-muted-foreground">Chargement…</div>}>
          {view === "list" && <ListView sessions={sessions} />}
          {view === "calendar" && (
            <CalendarView sessions={sessions} year={from.getFullYear()} month={from.getMonth()} />
          )}
          {view === "map" && <MapPlaceholder />}
        </Suspense>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, dot }: { label: string; value: number; color: string; dot: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dot}`} />
      <div>
        <p className={`text-xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

type SessionWithRelations = Awaited<ReturnType<typeof db.trainingSession.findMany<{
  include: {
    trainer: true;
    theme: true;
    request: { include: { client: true; site: true } };
  };
}>>>[number];

function ListView({ sessions }: { sessions: SessionWithRelations[] }) {
  if (sessions.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl flex items-center justify-center h-48">
        <p className="text-muted-foreground text-sm">Aucune session sur cette période.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground w-48">Formateur</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Thème</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Client</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Site</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Début</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Fin</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sessions.map((s) => {
              const statusClass =
                s.status === "CONFIRMEE"
                  ? "bg-white text-gray-900 border-gray-300"
                  : s.status === "PROVISOIRE"
                  ? "bg-yellow-50 text-yellow-900 border-yellow-300"
                  : "bg-red-50 text-red-800 border-red-300";
              const statusLabel =
                s.status === "CONFIRMEE" ? "Confirmée" : s.status === "PROVISOIRE" ? "Provisoire" : "Annulée";

              return (
                <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-6 py-3 text-sm text-foreground">
                    <a href={`/sessions/${s.id}`} className="hover:underline font-medium">
                      {s.trainer.fullName}
                    </a>
                  </td>
                  <td className="px-6 py-3 text-sm text-foreground">{s.theme.code}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{s.request.client.name}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{s.request.site.city}</td>
                  <td className="px-6 py-3 text-sm text-foreground">
                    {new Date(s.startDate).toLocaleDateString("fr-MA")}
                  </td>
                  <td className="px-6 py-3 text-sm text-foreground">
                    {new Date(s.endDate).toLocaleDateString("fr-MA")}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}>
                      {statusLabel}
                    </span>
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

function MapPlaceholder() {
  return (
    <div className="bg-card border border-border rounded-xl flex items-center justify-center h-64">
      <p className="text-muted-foreground text-sm">Vue carte — Phase 5 (Google Maps Distance Matrix)</p>
    </div>
  );
}
