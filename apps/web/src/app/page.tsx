import Link from "next/link";
import { CcelogLogo } from "@/components/ccelog-logo";
import { SignInButton } from "@/components/sign-in-button";
import { DevLoginForm } from "@/components/dev-login-form";

export default function HomePage() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-ccelog-dark via-background to-background"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-ccelog-blue/5 rounded-full blur-3xl -z-10"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 bg-ccelog-orange/5 rounded-full blur-3xl -z-10"
        aria-hidden="true"
      />

      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-center">
          <CcelogLogo className="h-16 w-auto" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">CCE LOG</h1>
          <p className="text-xl text-muted-foreground font-medium">Planification des formations</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Gérez vos demandes de formation, planifiez les formateurs et automatisez le cycle
            complet de vos sessions CACES, VR et sécurité.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-xl space-y-6">
          {isDev ? (
            <>
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">Accès de test</h2>
                <p className="text-xs text-muted-foreground">Mode développement local</p>
              </div>
              <DevLoginForm />
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">Accès sécurisé</h2>
                <p className="text-sm text-muted-foreground">
                  Connectez-vous avec votre compte Microsoft CCE LOG
                </p>
              </div>
              <SignInButton />
            </>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Formateur ? Accédez à vos sessions via le lien qui vous a été envoyé par mail.
            </p>
            <Link
              href="/formateur/acces"
              className="text-xs text-primary hover:underline underline-offset-4"
            >
              Accès formateur →
            </Link>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CCE LOG · Organisme de formation &amp; certification · Maroc
        </p>
      </div>
    </main>
  );
}
