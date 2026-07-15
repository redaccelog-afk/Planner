import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ReportsListPage() {
  const session = await auth();
  const sessions = await prisma.gameSession.findMany({
    where: { hostId: session!.user.id, status: "ENDED" },
    orderBy: { endedAt: "desc" },
    include: { quiz: { select: { title: true } }, _count: { select: { players: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Historique des parties</h1>

      {sessions.length === 0 && (
        <p className="card p-8 text-center text-white/60">Aucune partie terminée pour l&apos;instant.</p>
      )}

      <ul className="space-y-3">
        {sessions.map((s) => (
          <li key={s.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-semibold">{s.quiz.title}</p>
              <p className="text-sm text-white/60">
                {s._count.players} joueur{s._count.players > 1 ? "s" : ""} ·{" "}
                {s.endedAt ? new Date(s.endedAt).toLocaleString("fr-FR") : ""}
              </p>
            </div>
            <Link href={`/reports/${s.id}`} className="btn-secondary">
              Voir le rapport
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
