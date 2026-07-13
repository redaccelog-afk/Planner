"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CloneQuizButton({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch(`/api/quizzes/${quizId}/clone`, { method: "POST" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const { id } = await res.json();
    router.push(`/quizzes/${id}/edit`);
  }

  return (
    <button onClick={handleClick} className="btn-primary" disabled={loading}>
      {loading ? "Clonage..." : "Cloner dans mes quiz"}
    </button>
  );
}
