"use client";

import { useState, useTransition } from "react";
import { Workflow } from "lucide-react";
import { triggerPipelineAction } from "@/app/(dashboard)/demandes/actions";

interface TriggerPipelineButtonProps {
  requestId: string;
}

export function TriggerPipelineButton({ requestId }: TriggerPipelineButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    const formData = new FormData();
    formData.set("requestId", requestId);
    startTransition(async () => {
      try {
        await triggerPipelineAction(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inattendue");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        title="Lancer le pipeline automatique"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Workflow className={`h-3.5 w-3.5 ${isPending ? "animate-pulse" : ""}`} />
        {isPending ? "Lancement…" : "Pipeline"}
      </button>
      {error && (
        <p className="text-[10px] text-red-400 max-w-[140px] text-right">{error}</p>
      )}
    </div>
  );
}
