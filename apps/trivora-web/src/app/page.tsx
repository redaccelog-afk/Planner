import Link from "next/link";
import JoinForm from "@/components/JoinForm";
import { CcelogLogo } from "@/components/CcelogLogo";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-16">
      <div className="text-center">
        <div className="mb-4 flex items-center justify-center">
          <CcelogLogo className="h-12" />
        </div>
        <h1 className="font-display text-5xl font-bold tracking-tight">Trivora</h1>
        <p className="mt-2 text-white/70">Des quiz en direct, tout le monde joue depuis son téléphone.</p>
      </div>

      <JoinForm />

      <div className="flex gap-4 text-sm text-white/60">
        <Link href="/login" className="hover:text-white">
          Espace animateur
        </Link>
        <span>·</span>
        <Link href="/register" className="hover:text-white">
          Créer un compte
        </Link>
      </div>
    </main>
  );
}
