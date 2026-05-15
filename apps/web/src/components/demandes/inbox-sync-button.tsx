"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function InboxSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inbox/sync-outlook", { method: "POST" });
      if (res.ok) {
        const data = await res.json() as { created: number };
        setResult(data);
        if (data.created > 0) router.refresh();
        setTimeout(() => setResult(null), 4000);
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
      title="Synchroniser les mails Outlook"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {result ? `${result.created} importé(s)` : "Sync Outlook"}
    </button>
  );
}
