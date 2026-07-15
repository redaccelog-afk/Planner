"use client";

import { useEffect, useState } from "react";

export default function QuestionTimer({ startedAt, timeLimitSec }: { startedAt: number; timeLimitSec: number }) {
  const [remaining, setRemaining] = useState(timeLimitSec);

  useEffect(() => {
    const tick = () => {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      setRemaining(Math.max(0, Math.ceil(timeLimitSec - elapsedSec)));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [startedAt, timeLimitSec]);

  return (
    <div className="flex items-center gap-2">
      <span className="font-display text-2xl font-bold tabular-nums">{remaining}</span>
      <span className="text-sm text-white/60">s</span>
    </div>
  );
}
