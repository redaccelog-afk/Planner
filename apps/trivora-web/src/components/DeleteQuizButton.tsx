"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteQuizButton({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Supprimer ce quiz définitivement ?")) return;
    setLoading(true);
    await fetch(`/api/quizzes/${quizId}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button onClick={handleClick} className="btn-secondary text-red-300" disabled={loading}>
      Supprimer
    </button>
  );
}
