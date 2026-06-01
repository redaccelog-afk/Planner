"use client";

import { useTransition } from "react";
import { workflowTransitionAction } from "@/app/(dashboard)/demandes/[id]/actions";

type Variant = "purple" | "teal" | "green" | "orange" | "gray" | "red";

const VARIANT_CLASSES: Record<Variant, string> = {
  purple: "bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 border border-purple-500/30",
  teal:   "bg-teal-500/15 text-teal-400 hover:bg-teal-500/25 border border-teal-500/30",
  green:  "bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/30",
  orange: "bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 border border-orange-500/30",
  gray:   "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25 border border-gray-500/30",
  red:    "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30",
};

interface WorkflowActionButtonProps {
  requestId: string;
  targetStatus: string;
  label: string;
  variant: Variant;
}

export function WorkflowActionButton({
  requestId,
  targetStatus,
  label,
  variant,
}: WorkflowActionButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Confirmer : ${label} ?`)) return;
    const fd = new FormData();
    fd.append("requestId", requestId);
    fd.append("targetStatus", targetStatus);
    startTransition(() => workflowTransitionAction(fd));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]}`}
    >
      {isPending ? "..." : label}
    </button>
  );
}
