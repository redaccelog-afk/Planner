"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HostGameButton({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teamMode, setTeamMode] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizId, teamMode }),
    });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const { id } = await res.json();
    router.push(`/host/${id}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1 text-xs text-white/60">
        <input type="checkbox" checked={teamMode} onChange={(e) => setTeamMode(e.target.checked)} />
        Équipes
      </label>
      <button onClick={handleClick} className="btn-primary" disabled={loading}>
        {loading ? "Lancement..." : "Lancer"}
      </button>
    </div>
  );
}
