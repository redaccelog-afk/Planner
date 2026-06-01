import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Portail Client — CCE LOG",
    template: "%s | Portail CCE LOG",
  },
  description: "Portail client CCE LOG — Suivi de vos formations",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-foreground text-lg">CCE LOG</span>
          </div>
          <span className="text-muted-foreground text-sm hidden sm:inline">— Portail Client</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-xs text-muted-foreground text-center">
            CCE LOG — Portail de formation sécurisé
          </p>
        </div>
      </footer>
    </div>
  );
}
