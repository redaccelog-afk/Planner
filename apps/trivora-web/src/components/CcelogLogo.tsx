export function CcelogLogo({ className = "h-8" }: { className?: string }) {
  return (
    <span className="inline-flex items-center rounded-lg bg-white/95 px-3 py-1.5 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/ccelog-logo.png" alt="CCE LOG" className={`w-auto ${className}`} />
    </span>
  );
}
