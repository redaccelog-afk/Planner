const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  NOUVELLE: { label: "Nouvelle", className: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  EN_RECHERCHE: { label: "En recherche", className: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  PROPOSEE: { label: "Proposée", className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
  CONFIRMEE: { label: "Confirmée", className: "bg-green-500/10 text-green-400 border border-green-500/20" },
  ANNULEE: { label: "Annulée", className: "bg-red-500/10 text-red-400 border border-red-500/20" },
  CLOTUREE: { label: "Clôturée", className: "bg-gray-500/10 text-gray-400 border border-gray-500/20" },
};

export function RequestStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_STYLES[status] ?? { label: status, className: "bg-secondary text-muted-foreground" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
