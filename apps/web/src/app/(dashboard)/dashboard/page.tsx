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
import { startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";

export const metadata = { title: "Tableau de bord" };

async function getDashboardData() {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));
  const yearStart = startOfYear(now);

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
  ]);

  // Resolve client names for top clients
  const topClientDetails = await Promise.all(
    topClients.map(async (g) => {
      const req = await db.trainingRequest.findUnique({
        where: { id: g.requestId },
        include: { client: true },
      });
      return { clientName: req?.client.name ?? "Inconnu", count: g._count.id };
    })
  );

  // Resolve theme labels
  const topThemeDetails = await Promise.all(
    topThemes.map(async (g) => {
      const theme = await db.theme.findUnique({ where: { id: g.themeId } });
      return { themeLabel: theme?.label ?? "Inconnu", count: g._count.id };
    })
  );

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
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bonne après-midi" : "Bonsoir";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {session?.user?.name?.split(" ")[0] ?? "Reda"} 👋
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
  const bgMap = {
    blue: "bg-blue-500/10",
    yellow: "bg-yellow-500/10",
    orange: "bg-orange-500/10",
    red: "bg-red-500/10",
  };

  return (
    <Link
      href={href}
      className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
        <div className={`p-2 rounded-lg ${bgMap[color]}`}>{icon}</div>
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
