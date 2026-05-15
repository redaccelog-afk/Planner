"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";

interface ConfirmSessionButtonProps {
  sessionId: string;
  trainerConfirmed: boolean;
  clientConfirmed: boolean;
}

export function ConfirmSessionButton({ sessionId, trainerConfirmed, clientConfirmed }: ConfirmSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (type: "trainer" | "client") => {
    setLoading(true);
    try {
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          type === "trainer"
            ? { trainerConfirmed: true }
            : { clientConfirmed: true }
        ),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      {!trainerConfirmed && (
        <button
          onClick={() => handleConfirm("trainer")}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4" />
          Confirmer formateur
        </button>
      )}
      {!clientConfirmed && (
        <button
          onClick={() => handleConfirm("client")}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <CheckCircle className="h-4 w-4" />
          Confirmer client
        </button>
      )}
    </div>
  );
}
