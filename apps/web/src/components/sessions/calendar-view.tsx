"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  status: string;
  trainer: { fullName: string };
  theme: { code: string; label: string };
  request: { client: { name: string }; site: { city: string } };
}

interface CalendarViewProps {
  sessions: Session[];
  year: number;
  month: number;
}

const STATUS_STYLES: Record<string, string> = {
  CONFIRMEE: "bg-green-500/15 border-green-500/30 text-green-400",
  PROVISOIRE: "bg-yellow-500/15 border-yellow-500/30 text-yellow-400",
  ANNULEE: "bg-red-500/15 border-red-500/30 text-red-400 line-through opacity-60",
  EN_COURS: "bg-blue-500/15 border-blue-500/30 text-blue-400",
  TERMINEE: "bg-gray-500/15 border-gray-500/30 text-gray-400",
};

export function CalendarView({ sessions, year, month }: CalendarViewProps) {
  const [currentYear, setCurrentYear] = useState(year);
  const [currentMonth, setCurrentMonth] = useState(month);

  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = lastDay.getDate();

  const cells: (number | null)[] = [
    ...Array(startDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthName = firstDay.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const getSessionsForDay = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return sessions.filter((s) => {
      const start = new Date(s.startDate);
      const end = new Date(s.endDate);
      return date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) &&
             date <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
    });
  };

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
  };

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <h2 className="text-sm font-semibold text-foreground capitalize">{monthName}</h2>
        <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Jours de semaine */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="border-r border-b border-border/50 min-h-[80px]" />;
          }
          const daySessions = getSessionsForDay(day);
          const isWeekend = (idx % 7) >= 5;

          return (
            <div
              key={day}
              className={cn(
                "border-r border-b border-border/50 p-1.5 min-h-[80px]",
                isWeekend ? "bg-secondary/20" : ""
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}>
                {day}
              </div>
              <div className="space-y-0.5">
                {daySessions.slice(0, 3).map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className={cn(
                      "block text-xs px-1.5 py-0.5 rounded border truncate hover:opacity-80 transition-opacity",
                      STATUS_STYLES[s.status]
                    )}
                    title={`${s.theme.label} — ${s.request.client.name}`}
                  >
                    {s.theme.code}
                  </Link>
                ))}
                {daySessions.length > 3 && (
                  <p className="text-xs text-muted-foreground pl-1">+{daySessions.length - 3}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
