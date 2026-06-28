import { auth } from "@/lib/auth";
import { db } from "@ccelog/db";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  FileWarning,
  Package,
  TrendingUp,
  Users,
  CalendarCheck,
  Euro,
} from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, startOfYear, format } from "date-fns";
import { fr } from "date-fns/locale/fr";

export const metadata = { title: "Tableau de bord" };

async function getDashboardData() {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const yearStart = startOfYear(now);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    newRequests,
    pendingSessions,
    pendingReports,
    lowStockConsumables,
    upcomingSessions,
    thisMonthSessions,
    lastMonthSessions,
    ytdRevenue,
    topClients,
    topThemes,
    trainerUtilization,
    demandCounts,
  ] = await Promise.all([
    db.trainingRequest.count({ where: { status: "NOUVELLE" } }),
    db.trainingSession.count({ where: { status: "PROVISOIRE" } }),
    db.trainingReport.count({ where: { status: { in: ["ATTENDU", "RECU"] } } }),
    db.consumable
      .findMany({ take: 20 })
      .then((items) => items.filter((c) => c.stockQty <= c.reorderAt))
      .catch(() => []),
    db.trainingSession.findMany({
      where: {
        status: { in: ["PROVISOIRE", "CONFIRMEE"] },
        startDate: { gte: now },
      },
      include: {
        trainer: true,
        theme: true,
        request: { include: { client: true, site: true } },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    db.trainingSession.count({
      where: {
        status: "CONFIRMEE",
        startDate: { gte: thisMonthStart, lte: thisMonthEnd },
      },
    }),
    db.trainingSession.count({
      where: {
        status: "CONFIRMEE",
        startDate: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
    db.trainingSession.aggregate({
      where: {
        status: "CONFIRMEE",
        startDate: { gte: yearStart },
        totalCost: { not: null },
      },
      _sum: { totalCost: true },
    }),
    db.trainingSession.groupBy({
      by: ["requestId"],
      where: {
        status: "CONFIRMEE",
        startDate: { gte: yearStart },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    db.trainingSession.groupBy({
      by: ["themeId"],
      where: {
        status: "CONFIRMEE",
        startDate: { gte: yearStart },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    db.trainer.findMany({
      where: { active: true },
      include: {
        sessions: {
          where: {
            status: "CONFIRMEE",
            startDate: { gte: yearStart },
          },
          select: { id: true },
        },
      },
      take: 5,
      orderBy: { fullName: "asc" },
    }),
    db.trainingRequest.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const sessionInclude = {
    trainer: { select: { id: true, fullName: true } },
    theme: { select: { id: true, label: true, code: true } },
    request: {
      include: {
        client: { select: { id: true, name: true } },
        site: { select: { id: true, label: true, city: true } },
      },
    },
  } as const;

  const [todaySessions, upcomingWeekSessions] = await Promise.all([
    db.trainingSession.findMany({
      where: {
        startDate: { gte: today },
        endDate: { lt: tomorrow },
        status: { not: "ANNULEE" },
      },
      include: sessionInclude,
      orderBy: { startDate: "asc" },
    }),
    db.trainingSession.findMany({
      where: {
        startDate: { gt: tomorrow, lte: in7Days },
        status: { not: "ANNULEE" },
      },
      include: sessionInclude,
      orderBy: { startDate: "asc" },
    }),
  ]);

  // Resolve client names for top clients — batch query (avoid N+1)
  const requestIds = topClients.map((g) => g.requestId).filter(Boolean) as string[];
  const requests = await db.trainingRequest.findMany({
    where: { id: { in: requestIds } },
    include: { client: { select: { name: true } } },
  });
  const requestMap = new Map(requests.map((r) => [r.id, r.client.name]));
  const topClientDetails = topClients.map((g) => ({
    clientName: requestMap.get(g.requestId) ?? "Inconnu",
    count: g._count.id,
  }));

  // Resolve theme labels — batch query (avoid N+1)
  const themeIds = topThemes.map((g) => g.themeId);
  const themes = await db.theme.findMany({
    where: { id: { in: themeIds } },
    select: { id: true, label: true },
  });
  const themeMap = new Map(themes.map((t) => [t.id, t.label]));
  const topThemeDetails = topThemes.map((g) => ({
    themeLabel: themeMap.get(g.themeId) ?? "Inconnu",
    count: g._count.id,
  }));

  const sessionsDelta = thisMonthSessions - lastMonthSessions;

  return {
    newRequests,
    pendingSessions,
    pendingReports,
    lowStockCount: lowStockConsumables.length,
    upcomingSessions,
    thisMonthSessions,
    sessionsDelta,
    ytdRevenue: ytdRevenue._sum.totalCost ?? 0,
    topClients: topClientDetails,
    topThemes: topThemeDetails,
    trainerUtilization,
    demandCounts,
    todaySessions,
    upcomingWeekSessions,
  };
}

const DEMAND_WORKFLOW = [
  { status: "NOUVELLE",                        label: "Nouvelles",         colorClass: "text-blue-400",   dotClass: "bg-blue-400" },
  { status: "EN_ATTENTE_VALIDATION_FORMATEUR", label: "Attente formateur", colorClass: "text-purple-400", dotClass: "bg-purple-400" },
  { status: "VALIDEE_FORMATEUR",               label: "Validée formateur", colorClass: "text-teal-400",   dotClass: "bg-teal-400" },
  { status: "EN_ATTENTE_VALIDATION_BO",        label: "Attente BO",        colorClass: "text-orange-400", dotClass: "bg-orange-400" },
  { status: "CONFIRMEE",                       label: "Confirmées",        colorClass: "text-green-400",  dotClass: "bg-green-400" },
  { status: "TERMINEE",                        label: "Terminées",         colorClass: "text-gray-400",   dotClass: "bg-gray-400" },
] as const

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bonne après-midi" : "Bonsoir";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {session?.user?.name?.split(" ")[0] ?? "Admin"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Voici les actions en attente et les indicateurs du mois.
        </p>
      </div>

      {/* KPI Cards — actions en attente */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Nouvelles demandes"
          value={data.newRequests}
          icon={<AlertCircle className="h-5 w-5 text-blue-400" />}
          href="/demandes"
          color="blue"
        />
        <KpiCard
          label="Sessions provisoires"
          value={data.pendingSessions}
          icon={<Clock className="h-5 w-5 text-yellow-400" />}
          href="/sessions"
          color="yellow"
        />
        <KpiCard
          label="Rapports en attente"
          value={data.pendingReports}
          icon={<FileWarning className="h-5 w-5 text-orange-400" />}
          href="/rapports"
          color="orange"
        />
        <KpiCard
          label="Alertes stock"
          value={data.lowStockCount}
          icon={<Package className="h-5 w-5 text-red-400" />}
          href="/stock"
          color="red"
        />
      </div>

      {/* Workflow demandes — CDC M2 */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Workflow demandes</h2>
          <Link href="/demandes" className="text-sm text-primary hover:underline">Voir toutes →</Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-border">
          {DEMAND_WORKFLOW.map(({ status, label, dotClass }) => {
            const count = data.demandCounts.find(c => c.status === status)?._count ?? 0
            return (
              <Link key={status} href={`/demandes?status=${status}`}
                className="flex flex-col items-center gap-1.5 py-4 hover:bg-secondary/40 transition-colors text-center">
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                <span className="text-2xl font-bold text-foreground">{count}</span>
                <span className="text-[10px] text-muted-foreground leading-tight px-2">{label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Planning du jour */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="font-semibold text-foreground">Formations aujourd'hui</h2>
          </div>
          <span className="text-xs text-muted-foreground">{data.todaySessions.length} session(s)</span>
        </div>
        {data.todaySessions.length === 0 ? (
          <p className="px-6 py-8 text-center text-muted-foreground text-sm">Aucune formation programmée aujourd'hui</p>
        ) : (
          <div className="divide-y divide-border">
            {data.todaySessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{s.theme.label}</p>
                  <p className="text-xs text-muted-foreground">{s.request.client.name} · {s.request.site?.city ?? ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-foreground">{s.trainer?.fullName ?? 'Non assigné'}</p>
                  <span className="text-xs text-muted-foreground">{format(s.startDate, 'HH:mm', { locale: fr })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Formations à venir (7 jours) */}
      <div className="bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <h2 className="font-semibold text-foreground">Formations à venir (7 jours)</h2>
          </div>
          <span className="text-xs text-muted-foreground">{data.upcomingWeekSessions.length} session(s)</span>
        </div>
        {data.upcomingWeekSessions.length === 0 ? (
          <p className="px-6 py-8 text-center text-muted-foreground text-sm">Aucune formation prévue dans les 7 prochains jours</p>
        ) : (
          <div className="divide-y divide-border">
            {data.upcomingWeekSessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{s.theme.label}</p>
                  <p className="text-xs text-muted-foreground">{s.request.client.name} · {s.request.site?.city ?? ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-foreground">{s.trainer?.fullName ?? 'Non assigné'}</p>
                  <span className="text-xs text-muted-foreground">{format(s.startDate, 'EEEE d MMM', { locale: fr })}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Stats mensuelles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Sessions confirmées ce mois"
          value={String(data.thisMonthSessions)}
          sub={
            data.sessionsDelta > 0
              ? `+${data.sessionsDelta} vs mois dernier`
              : data.sessionsDelta < 0
              ? `${data.sessionsDelta} vs mois dernier`
              : "Identique au mois dernier"
          }
          subColor={data.sessionsDelta >= 0 ? "text-green-400" : "text-red-400"}
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard
          label="CA confirmé YTD"
          value={formatCurrency(data.ytdRevenue)}
          sub="Sessions confirmées depuis le 1er janvier"
          icon={<Euro className="h-5 w-5" />}
        />
        <StatCard
          label="Formateurs actifs"
          value={String(data.trainerUtilization.length)}
          sub="Avec au moins 1 session confirmée"
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sessions à venir */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Sessions à venir</h2>
            <Link href="/sessions" className="text-sm text-primary hover:underline">
              Voir tout →
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.upcomingSessions.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground text-center">
                Aucune session planifiée.
              </p>
            ) : (
              data.upcomingSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      s.status === "CONFIRMEE" ? "bg-green-400" : "bg-yellow-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {s.theme.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.request.client.name} · {s.request.site.city}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-foreground">{formatDate(s.startDate)}</p>
                    <p className="text-xs text-muted-foreground">{s.trainer.fullName}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top Clients & Thèmes */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Top clients (YTD)</h2>
            </div>
            <div className="px-5 py-3 space-y-2">
              {data.topClients.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Aucune donnée</p>
              ) : (
                data.topClients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">{c.clientName}</p>
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">
                      {c.count} session{c.count > 1 ? "s" : ""}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Top formations (YTD)</h2>
            </div>
            <div className="px-5 py-3 space-y-2">
              {data.topThemes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Aucune donnée</p>
              ) : (
                data.topThemes.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">{t.themeLabel}</p>
                    <span className="text-xs font-semibold text-foreground flex-shrink-0">
                      {t.count}×
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground text-sm">Formateurs actifs (YTD)</h2>
            </div>
            <div className="px-5 py-3 space-y-2">
              {data.trainerUtilization.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground truncate">{t.fullName}</p>
                  <span className="text-xs font-semibold text-foreground flex-shrink-0">
                    {t.sessions.length} mission{t.sessions.length > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Lien vers analytiques détaillées */}
      <div className="flex justify-end">
        <Link
          href="/analytiques"
          className="flex items-center gap-2 text-sm text-primary hover:underline"
        >
          <TrendingUp className="h-4 w-4" />
          Voir les analytiques détaillées →
        </Link>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  href,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  color: "blue" | "yellow" | "orange" | "red";
}) {
  const colorMap = {
    blue:   { bg: "bg-blue-500/10",   border: "border-l-blue-400",   text: "text-blue-400" },
    yellow: { bg: "bg-yellow-500/10", border: "border-l-yellow-400", text: "text-yellow-400" },
    orange: { bg: "bg-orange-500/10", border: "border-l-orange-400", text: "text-orange-400" },
    red:    { bg: "bg-red-500/10",    border: "border-l-red-400",    text: "text-red-400" },
  };
  const c = colorMap[color];

  return (
    <Link
      href={href}
      className={`bg-card border border-border border-l-4 ${c.border} rounded-xl p-5 hover:bg-secondary/40 transition-colors group`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-3xl font-bold ${value > 0 ? c.text : "text-foreground"}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-tight">{label}</p>
        </div>
        <div className={`p-2 rounded-lg ${c.bg}`}>{icon}</div>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
  subColor = "text-muted-foreground",
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  subColor?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className={`text-xs mt-1 ${subColor}`}>{sub}</p>
    </div>
  );
}
