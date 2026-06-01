import { db } from "@ccelog/db";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const metadata = { title: "Calendrier" };

// ── helpers ──────────────────────────────────────────────────────────────────

function parseDate(dateStr: string | undefined, fallback: Date): Date {
  if (!dateStr) return fallback;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? fallback : d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  // lundi = début de semaine
  const day = d.getDay(); // 0=dim
  const diff = (day === 0 ? -6 : 1 - day);
  return addDays(d, diff);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function sessionOverlapsDay(start: Date, end: Date, day: Date): boolean {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

const FR_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];
const FR_DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ── nav URL builders ──────────────────────────────────────────────────────────

function navUrl(view: string, date: Date, delta: number): string {
  let next = new Date(date);
  if (view === "month") {
    next.setMonth(next.getMonth() + delta);
    next.setDate(1);
  } else if (view === "week") {
    next = addDays(next, delta * 7);
  } else {
    next = addDays(next, delta);
  }
  return `/calendrier?view=${view}&date=${next.toISOString().slice(0, 10)}`;
}

function todayUrl(view: string): string {
  return `/calendrier?view=${view}&date=${new Date().toISOString().slice(0, 10)}`;
}

function viewUrl(view: string, date: Date): string {
  return `/calendrier?view=${view}&date=${date.toISOString().slice(0, 10)}`;
}

// ── chip ──────────────────────────────────────────────────────────────────────

type SessionForCalendar = {
  id: string;
  startDate: Date;
  endDate: Date;
  status: string;
  theme: { code: string; label: string };
  trainer: { fullName: string };
  request: { client: { name: string }; site: { city: string } };
};

function SessionChip({ session }: { session: SessionForCalendar }) {
  const isConfirmee = session.status === "CONFIRMEE";
  const colorClass = isConfirmee
    ? "bg-green-400/15 text-green-400 border-green-400/30"
    : "bg-yellow-400/15 text-yellow-400 border-yellow-400/30";

  return (
    <Link
      href={`/sessions/${session.id}`}
      className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium border ${colorClass} hover:opacity-80 transition-opacity`}
      title={`${session.theme.label} — ${session.request.client.name} (${session.request.site.city})`}
    >
      {session.theme.code} · {session.request.client.name}
    </Link>
  );
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({
  year,
  month,
  sessions,
}: {
  year: number;
  month: number;
  sessions: SessionForCalendar[];
}) {
  const firstDay = new Date(year, month, 1);
  // premier lundi avant ou égal au 1er du mois
  const gridStart = startOfWeek(firstDay);

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(gridStart, i));
  }

  const today = new Date();

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header jours */}
      <div className="grid grid-cols-7 border-b border-border">
        {FR_DAYS_SHORT.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border">
        {cells.map((day) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const daySessions = sessions.filter((s) =>
            sessionOverlapsDay(new Date(s.startDate), new Date(s.endDate), day)
          );

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[100px] p-1.5 flex flex-col gap-0.5 ${
                isCurrentMonth ? "bg-card" : "bg-secondary/20"
              }`}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : isCurrentMonth
                    ? "text-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                {day.getDate()}
              </span>
              {daySessions.slice(0, 3).map((s) => (
                <SessionChip key={s.id} session={s} />
              ))}
              {daySessions.length > 3 && (
                <span className="text-xs text-muted-foreground px-1">
                  +{daySessions.length - 3} autres
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week view ─────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  sessions,
}: {
  weekStart: Date;
  sessions: SessionForCalendar[];
}) {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(weekStart, i));
  const today = new Date();

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="grid grid-cols-7 border-b border-border">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="py-3 px-2 text-center">
              <p className="text-xs text-muted-foreground">{FR_DAYS_SHORT[(day.getDay() + 6) % 7]}</p>
              <span
                className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 flex-1 divide-x divide-border bg-card">
        {days.map((day) => {
          const daySessions = sessions.filter((s) =>
            sessionOverlapsDay(new Date(s.startDate), new Date(s.endDate), day)
          );
          return (
            <div key={day.toISOString()} className="p-2 space-y-1 min-h-[120px]">
              {daySessions.map((s) => (
                <SessionChip key={s.id} session={s} />
              ))}
              {daySessions.length === 0 && (
                <p className="text-xs text-muted-foreground/30 text-center mt-4">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────────────────────

function DayView({
  day,
  sessions,
}: {
  day: Date;
  sessions: SessionForCalendar[];
}) {
  const daySessions = sessions.filter((s) =>
    sessionOverlapsDay(new Date(s.startDate), new Date(s.endDate), day)
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 p-4 bg-card border border-border rounded-xl">
      {daySessions.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center mt-8">
          Aucune session ce jour.
        </p>
      ) : (
        daySessions.map((s) => {
          const isConfirmee = s.status === "CONFIRMEE";
          const colorBg = isConfirmee ? "bg-green-400/10 border-green-400/30" : "bg-yellow-400/10 border-yellow-400/30";
          const colorText = isConfirmee ? "text-green-400" : "text-yellow-400";
          return (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className={`flex items-start gap-4 p-4 rounded-xl border ${colorBg} hover:opacity-80 transition-opacity`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${colorText}`}>{s.theme.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {s.request.client.name} · {s.request.site.city}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Formateur : {s.trainer.fullName}
                </p>
              </div>
              <span
                className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border ${
                  isConfirmee
                    ? "bg-green-400/15 text-green-400 border-green-400/30"
                    : "bg-yellow-400/15 text-yellow-400 border-yellow-400/30"
                }`}
              >
                {isConfirmee ? "Confirmée" : "Provisoire"}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view = (params.view === "week" || params.view === "day") ? params.view : "month";

  const today = new Date();
  const baseDate = parseDate(params.date, today);

  // Compute fetch range based on view
  let fetchFrom: Date;
  let fetchTo: Date;

  if (view === "month") {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    // include surrounding days shown in grid
    fetchFrom = startOfWeek(new Date(year, month, 1));
    fetchTo = addDays(fetchFrom, 41);
  } else if (view === "week") {
    fetchFrom = startOfWeek(baseDate);
    fetchTo = addDays(fetchFrom, 6);
  } else {
    fetchFrom = new Date(baseDate);
    fetchFrom.setHours(0, 0, 0, 0);
    fetchTo = new Date(baseDate);
    fetchTo.setHours(23, 59, 59, 999);
  }

  const sessions = await db.trainingSession.findMany({
    where: {
      status: { in: ["PROVISOIRE", "CONFIRMEE"] },
      startDate: { lte: fetchTo },
      endDate: { gte: fetchFrom },
    },
    include: {
      trainer: { select: { fullName: true } },
      theme: { select: { code: true, label: true } },
      request: { include: { client: { select: { name: true } }, site: { select: { city: true } } } },
    },
    orderBy: { startDate: "asc" },
  });

  // Title
  let titleLabel: string;
  if (view === "month") {
    titleLabel = `${FR_MONTHS[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
  } else if (view === "week") {
    const ws = startOfWeek(baseDate);
    const we = addDays(ws, 6);
    titleLabel = `${ws.getDate()} ${FR_MONTHS[ws.getMonth()].slice(0, 3)} — ${we.getDate()} ${FR_MONTHS[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
  } else {
    titleLabel = `${baseDate.getDate()} ${FR_MONTHS[baseDate.getMonth()]} ${baseDate.getFullYear()}`;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={navUrl(view, baseDate, -1)}
            className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground min-w-[200px] text-center">
            {titleLabel}
          </h1>
          <Link
            href={navUrl(view, baseDate, 1)}
            className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          <Link
            href={todayUrl(view)}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Aujourd&apos;hui
          </Link>
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {(["month", "week", "day"] as const).map((v) => (
            <Link
              key={v}
              href={viewUrl(v, baseDate)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                view === v
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v === "month" ? "Mois" : v === "week" ? "Semaine" : "Jour"}
            </Link>
          ))}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-400/15 border border-green-400/30" />
          <span className="text-green-400">Confirmée</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-400/15 border border-yellow-400/30" />
          <span className="text-yellow-400">Provisoire</span>
        </div>
        <span className="ml-auto">{sessions.length} session(s) sur la période</span>
      </div>

      {/* Calendar body */}
      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {view === "month" && (
          <MonthView
            year={baseDate.getFullYear()}
            month={baseDate.getMonth()}
            sessions={sessions}
          />
        )}
        {view === "week" && (
          <WeekView weekStart={startOfWeek(baseDate)} sessions={sessions} />
        )}
        {view === "day" && <DayView day={baseDate} sessions={sessions} />}
      </div>
    </div>
  );
}
