export function CcelogLogo({ className, showText = false }: { className?: string; showText?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" aria-label="CCE LOG" role="img">
        <path
          d="M32 4L8 14V32C8 46.4 18.4 59.6 32 62C45.6 59.6 56 46.4 56 32V14L32 4Z"
          fill="#1B4F8A"
          stroke="#2E6DB4"
          strokeWidth="1.5"
        />
        <path d="M32 10L14 18V32C14 43.6 22.4 54.2 32 56.6C41.6 54.2 50 43.6 50 32V18L32 10Z" fill="#0F2744" />
        <text x="32" y="32" textAnchor="middle" dominantBaseline="middle" fill="#F07D00" fontSize="14" fontWeight="bold" fontFamily="Inter, system-ui, sans-serif" letterSpacing="1">
          CCE
        </text>
        <text x="32" y="44" textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize="9" fontWeight="600" fontFamily="Inter, system-ui, sans-serif" letterSpacing="2">
          LOG
        </text>
        <rect x="22" y="24" width="20" height="2" rx="1" fill="#F07D00" />
      </svg>
      {showText && <span className="font-display text-sm font-semibold text-white/70">CCE LOG</span>}
    </div>
  );
}
