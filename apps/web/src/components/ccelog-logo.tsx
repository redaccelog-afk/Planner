import Image from "next/image";
import { cn } from "@/lib/utils";

interface CcelogLogoProps {
  className?: string;
  showText?: boolean;
}

export function CcelogLogo({ className, showText = false }: CcelogLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-full w-auto flex items-center">
        <Image
          src="/ccelog-logo.png"
          alt="CCE LOG"
          width={120}
          height={60}
          className="h-full w-auto object-contain"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg font-bold text-foreground leading-none tracking-wide">
            CCE LOG
          </span>
          <span className="text-xs text-muted-foreground tracking-wider uppercase">
            Planification
          </span>
        </div>
      )}
    </div>
  );
}
