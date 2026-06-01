import { db } from "@ccelog/db";
import { formatCurrency } from "@/lib/utils";
import { startOfYear, subMonths, startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, MapPin } from "lucide-react";

export const metadata = { title: "Analytiques" };

async function getAnalyticsData() {
  const now = new Date();
  const yearStart = startOfYear(now);

  // Build last-12-months buckets
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    return { start: startOfMonth(d), end: endOfMonth(d), label: format(d, "MMM yy", { locale: fr }) };
  });

  const [
    sessionsPerMonth,
    revenuePerMonth,
    cancellationCount,
    totalConfirmedYtd,
    trainerStats,
    cityStats,
    avgCostPerSession,
  ] = await Promise.all([
    // Sessions confirmées par mois
    Promise.all(
      months.map((m) =>
        db.trainingSession
          .count({ where: { status: "CONFIRMEE", startDate: { gte: m.start, lte: m.end } } })
          .then((count) => ({ label: m.label, count }))
      )
    ),
    // CA par mois
    Promise.all(
      months.map((m) =>
        db.trainingSession
          .aggregate({
            where: {
              status: "CONFIRMEE",
              startDate: { gte: m.start, lte: m.end },
              totalCost: { not: null },
            },
            _sum: { totalCost: true },
          })
          .then((r) => ({ label: m.label, total: r._sum.totalCost ?? 0 }))
      )
    ),
    db.trainingSession.count({ where: { status: "ANNULEE", startDate: { gte: yearStart } } }),
    db.trainingSession.count({ where: { status: "CONFIRMEE", startDate: { gte: yearStart } } }),
    // Formateurs — nombre de sessions + CA total
    db.trainer.findMany({
      where: { active: true },
      include: {
        sessions: {
          where: { status: "CONFIRMEE", startDate: { gte: yearStart } },
          select: { totalCost: true },
        },
      },
    }),
    // Groupement par ville
    db.trainingSession.findMany({
      where: { status: "CONFIRMEE", startDate: { gte: yearStart } },
      include: { request: { include: { site: true } } },
    }),
    db.trainingSession.aggregate({
      where: { status: "CONFIRMEE", startDate: { gte: yearStart }, totalCost: { not: null } },
      _avg: { totalCost: true },
    }),
  ]);

  // Process city stats
  const cityMap = new Map<string, number>();
  cityStats.forEach((s) => {
    const city = s.request.site.city;
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
  });
  const topCities = Array.from(cityMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({ city, count }));

  // Process trainer stats
  const trainerSummary = trainerStats
    .map((t) => ({
      name: t.fullName,
      sessions: t.sessions.length,
      revenue: t.sessions.reduce((s, ss) => s + (ss.totalCost ?? 0), 0),
    }))
    .filter((t) => t.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  const cancellationRate =
    totalConfirmedYtd + cancellationCount > 0
      ? Math.round((cancellationCount / (totalConfirmedYtd + cancellationCount)) * 100)
      : 0;

  const totalRevenueYtd = revenuePerMonth.reduce((s, m) => s + m.total, 0);

  return {
    sessionsPerMonth,
    revenuePerMonth,
    cancellationRate,
    totalConfirmedYtd,
    totalRevenueYtd,
    avgCost: avgCostPerSession._avg.totalCost ?? 0,
    topCities,
    trainerSummary,
  };
}

export default async function AnalytiquesPage() {
  const data = await getAnalyticsData();

  const maxSessions = Math.max(...data.sessionsPerMonth.map((m) => m.count), 1);
  const maxRevenue = Math.max(...data.revenuePerMonth.map((m) => m.total), 1);
  const maxCities = Math.max(...data.topCities.map((c) => c.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytiques</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Indicateurs de performance — année en cours
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticKpi
          label="Sessions confirmées (YTD)"
          value={String(data.totalConfirmedYtd)}
        />
        <AnalyticKpi
          label="CA confirmé (YTD)"
          value={formatCurrency(data.totalRevenueYtd)}
        />
        <AnalyticKpi
          label="Coût moyen / session"
          value={formatCurrency(data.avgCost)}
        />
        <AnalyticKpi
          label="Taux annulation (YTD)"
          value={`${data.cancellationRate} %`}
          bad={data.cancellationRate > 15}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sessions par mois */}
        <ChartCard title="Sessions confirmées — 12 derniers mois">
          <BarChart
            data={data.sessionsPerMonth.map((m) => ({
              label: m.label,
              value: m.count,
              ratio: m.count / maxSessions,
              display: String(m.count),
            }))}
          />
        </ChartCard>

        {/* CA par mois */}
        <ChartCard title="Chiffre d'affaires — 12 derniers mois">
          <BarChart
            data={data.revenuePerMonth.map((m) => ({
              label: m.label,
              value: m.total,
              ratio: m.total / maxRevenue,
              display: m.total > 0 ? formatCurrency(m.total) : "0",
            }))}
            color="bg-green-500/60"
          />
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Villes */}
        <ChartCard title="Top villes (sessions YTD)">
          <div className="space-y-2 pt-1">
            {data.topCities.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune donnée</p>
            ) : (
              data.topCities.map((c) => (
                <div key={c.city} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {c.city}
                    </span>
                    <span className="font-semibold text-foreground">{c.count}</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full transition-all"
                      style={{ width: `${(c.count / maxCities) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </ChartCard>

        {/* Formateurs */}
        <div className="lg:col-span-2">
          <ChartCard title="Formateurs — utilisation (YTD)">
            <div className="divide-y divide-border -mx-5">
              {data.trainerSummary.length === 0 ? (
                <p className="px-5 py-4 text-xs text-muted-foreground">Aucune session confirmée</p>
              ) : (
                data.trainerSummary.map((t) => (
                  <div key={t.name} className="flex items-center gap-4 px-5 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {t.sessions} session{t.sessions > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(t.revenue)}
                      </p>
                    </div>
                    <TrendIndicator value={t.sessions} />
                  </div>
                ))
              )}
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function AnalyticKpi({
  label,
  value,
  bad = false,
}: {
  label: string;
  value: string;
  bad?: boolean;
}) {
  return (
    <div className={`bg-card border rounded-xl p-5 ${bad ? "border-red-500/30" : "border-border"}`}>
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className={`text-2xl font-bold mt-2 tracking-tight ${bad ? "text-red-400" : "text-foreground"}`}>
        {value}
      </p>
      {bad && (
        <p className="text-[10px] text-red-400/70 mt-1">Au-dessus du seuil recommandé (15%)</p>
      )}
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      {children}
    </div>
  );
}

function BarChart({
  data,
  color = "bg-primary/60",
}: {
  data: { label: string; value: number; ratio: number; display: string }[];
  color?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 h-36 min-w-[480px]">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group min-w-[28px]">
            <span className="text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap leading-tight text-center px-0.5">
              {d.display}
            </span>
            <div
              className={`w-full rounded-t ${color} hover:brightness-125 transition-all min-h-[3px]`}
              style={{ height: `${Math.max(d.ratio * 108, d.value > 0 ? 6 : 3)}px` }}
              title={d.display}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center leading-tight">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendIndicator({ value }: { value: number }) {
  if (value >= 5) return <TrendingUp className="h-4 w-4 text-green-400 flex-shrink-0" />;
  if (value >= 2) return <Minus className="h-4 w-4 text-yellow-400 flex-shrink-0" />;
  return <TrendingDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}
