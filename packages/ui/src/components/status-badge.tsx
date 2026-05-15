import * as React from "react";
import { Badge } from "./badge";

type SessionStatus = "CONFIRMEE" | "PROVISOIRE" | "ANNULEE";
type RequestStatus = "NOUVELLE" | "EN_RECHERCHE" | "PROPOSEE" | "CONFIRMEE" | "ANNULEE" | "CLOTUREE";

interface StatusBadgeProps {
  status: SessionStatus | RequestStatus;
  className?: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "confirmed" | "provisional" | "cancelled" | "default" | "secondary" | "outline" | "destructive" }> = {
  CONFIRMEE: { label: "Confirmée", variant: "confirmed" },
  PROVISOIRE: { label: "Provisoire", variant: "provisional" },
  ANNULEE: { label: "Annulée", variant: "cancelled" },
  NOUVELLE: { label: "Nouvelle", variant: "secondary" },
  EN_RECHERCHE: { label: "En recherche", variant: "secondary" },
  PROPOSEE: { label: "Proposée", variant: "provisional" },
  CLOTUREE: { label: "Clôturée", variant: "outline" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, variant: "default" as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
