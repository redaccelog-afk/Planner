"use client";

import { useTransition } from "react";
import { clientConfirmSessionFormAction } from "@/app/portal/[token]/actions";

interface PortalSessionActionsProps {
  token: string;
  sessionId: string;
}

export function PortalSessionActions({ token, sessionId }: PortalSessionActionsProps) {
  const [isPendingConfirm, startConfirm] = useTransition();
  const [isPendingRefuse, startRefuse] = useTransition();

  function handleConfirm() {
    const fd = new FormData();
    fd.append("token", token);
    fd.append("sessionId", sessionId);
    fd.append("confirm", "true");
    startConfirm(() => clientConfirmSessionFormAction(fd));
  }

  function handleRefuse() {
    if (!confirm("Confirmer le refus de cette session ?")) return;
    const fd = new FormData();
    fd.append("token", token);
    fd.append("sessionId", sessionId);
    fd.append("confirm", "false");
    startRefuse(() => clientConfirmSessionFormAction(fd));
  }

  const isLoading = isPendingConfirm || isPendingRefuse;

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={handleConfirm}
        disabled={isLoading}
        className="px-3 py-1.5 bg-green-500/15 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium hover:bg-green-500/25 transition-colors disabled:opacity-50"
      >
        {isPendingConfirm ? "..." : "Confirmer"}
      </button>
      <button
        onClick={handleRefuse}
        disabled={isLoading}
        className="px-3 py-1.5 bg-red-500/15 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/25 transition-colors disabled:opacity-50"
      >
        {isPendingRefuse ? "..." : "Refuser"}
      </button>
    </div>
  );
}
