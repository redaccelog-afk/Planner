import Link from "next/link";
import { ShieldX, ArrowLeft } from "lucide-react";

export const metadata = { title: "Accès refusé" };

export default function AccesRefusePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto">
          <ShieldX className="h-8 w-8 text-red-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Accès refusé</h1>
          <p className="text-muted-foreground text-sm">
            Vous n'avez pas les autorisations nécessaires pour accéder à cette page.
            Contactez votre administrateur si vous pensez que c'est une erreur.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium transition-colors border border-border"
          >
            Se déconnecter
          </Link>
        </div>
      </div>
    </div>
  );
}
