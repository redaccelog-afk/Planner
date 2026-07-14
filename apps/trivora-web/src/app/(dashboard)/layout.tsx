import Link from "next/link";
import { auth } from "@/lib/auth";
import SignOutButton from "@/components/SignOutButton";
import { CcelogLogo } from "@/components/CcelogLogo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-xl font-bold">
          <CcelogLogo />
          Trivora
        </Link>
        <nav className="flex items-center gap-4 text-sm text-white/80">
          <Link href="/dashboard" className="hover:text-white">
            Mes quiz
          </Link>
          <Link href="/library" className="hover:text-white">
            Bibliothèque
          </Link>
          <Link href="/reports" className="hover:text-white">
            Historique
          </Link>
          <span className="text-white/50">{session?.user?.name}</span>
          <SignOutButton />
        </nav>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
