"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface Trainer { id: string; fullName: string; }

interface SessionsFilterProps {
  trainers: Trainer[];
  currentTrainerId?: string;
}

export function SessionsFilter({ trainers, currentTrainerId }: SessionsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/sessions?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
      <select
        value={currentTrainerId ?? ""}
        onChange={(e) => updateFilter("trainerId", e.target.value || null)}
        className="h-8 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Tous les formateurs</option>
        {trainers.map((t) => (
          <option key={t.id} value={t.id}>{t.fullName}</option>
        ))}
      </select>

      <input
        type="month"
        defaultValue={searchParams.get("from")?.slice(0, 7) ?? new Date().toISOString().slice(0, 7)}
        onChange={(e) => {
          if (e.target.value) {
            const [y, m] = e.target.value.split("-").map(Number);
            const from = new Date(y, m - 1, 1).toISOString();
            const to = new Date(y, m, 0).toISOString();
            const params = new URLSearchParams(searchParams.toString());
            params.set("from", from);
            params.set("to", to);
            router.push(`/sessions?${params.toString()}`);
          }
        }}
        className="h-8 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
