"use client";

import { useState } from "react";
import { RefreshCw, Check } from "lucide-react";

interface OutlookSyncButtonProps {
  sessionId: string;
  hasOutlookId: boolean;
}

export function OutlookSyncButton({ sessionId, hasOutlookId: _hasOutlookId }: OutlookSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/outlook-sync`, { method: "POST" });
      if (res.ok) {
        setDone(true);
        setTimeout(() => setDone(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
      title="Synchroniser avec Outlook"
    >
      {done ? (
        <Check className="h-4 w-4 text-green-400" />
      ) : (
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      )}
      {done ? "Synchronisé" : "Sync Outlook"}
    </button>
  );
}
