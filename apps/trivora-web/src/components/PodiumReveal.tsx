"use client";

import { useEffect, useState } from "react";
import { musicPlayer } from "@/lib/musicPlayer";
import type { PodiumEntry } from "@/components/Podium";

type Stage = "suspense" | "third" | "second" | "first";

const CONFETTI_COLORS = ["#F07D00", "#F9A12E", "#2E6DB4", "#4ADE80", "#F43F5E", "#FBC02D"];

export default function PodiumReveal({ entries }: { entries: PodiumEntry[] }) {
  const [stage, setStage] = useState<Stage>("suspense");
  const [first, second, third] = entries;

  useEffect(() => {
    musicPlayer.stop();
    musicPlayer.playSuspenseRoll(2200);
    const t1 = setTimeout(() => setStage("third"), 2400);
    const t2 = setTimeout(() => setStage("second"), 4200);
    const t3 = setTimeout(() => {
      setStage("first");
      musicPlayer.playFanfare();
    }, 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === "suspense") {
    return (
      <div className="flex flex-col items-center gap-4">
        <span className="suspense-pulse text-6xl">🥁</span>
        <p className="font-display text-2xl font-bold">Et les résultats sont...</p>
      </div>
    );
  }

  const showSecond = stage === "second" || stage === "first";
  const showFirst = stage === "first";

  return (
    <div className="relative flex items-end gap-4">
      {showFirst && <Confetti />}
      {third && (
        <PodiumStep entry={third} place={3} heightClass="h-20" visible />
      )}
      {first && <PodiumStep entry={first} place={1} heightClass="h-36" visible={showFirst} big />}
      {second && <PodiumStep entry={second} place={2} heightClass="h-28" visible={showSecond} />}
    </div>
  );
}

function PodiumStep({
  entry,
  place,
  heightClass,
  visible,
  big,
}: {
  entry: PodiumEntry;
  place: number;
  heightClass: string;
  visible: boolean;
  big?: boolean;
}) {
  if (!visible) return <div className="w-24" />;
  return (
    <div className="podium-rise flex flex-col items-center gap-2">
      <span className={`font-semibold ${big ? "text-xl" : ""}`}>{entry.label}</span>
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

function Confetti() {
  const pieces = Array.from({ length: 60 }, (_, i) => i);
  return (
    <div className="pointer-events-none absolute inset-0 -top-20 overflow-hidden">
      {pieces.map((i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDuration: `${2 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * 1.2}s`,
          }}
        />
      ))}
    </div>
  );
}
