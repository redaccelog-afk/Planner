type PodiumEntry = { id: string; label: string; color: string; totalScore: number };

export default function Podium({ entries }: { entries: PodiumEntry[] }) {
  const [first, second, third] = entries;

  return (
    <div className="flex items-end gap-4">
      {second && <PodiumStep entry={second} place={2} heightClass="h-28" />}
      {first && <PodiumStep entry={first} place={1} heightClass="h-36" />}
      {third && <PodiumStep entry={third} place={3} heightClass="h-20" />}
    </div>
  );
}

function PodiumStep({ entry, place, heightClass }: { entry: PodiumEntry; place: number; heightClass: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-semibold">{entry.label}</span>
      <span className="text-sm text-white/60">{entry.totalScore} pts</span>
      <div
        className={`flex w-24 items-end justify-center rounded-t-lg font-display text-3xl font-bold ${heightClass}`}
        style={{ backgroundColor: entry.color }}
      >
        {place}
      </div>
    </div>
  );
}

export type { PodiumEntry };
