import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { FraisClient } from "./frais-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await db.trainingSession.findUnique({
    where: { id },
    include: { theme: true, request: { include: { client: true } } },
  });
  if (!session) return { title: "Frais introuvables" };
  return { title: `Frais — ${session.theme.code} · ${session.request.client.name}` };
}

export default async function SessionFraisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await dbAny.trainingSession.findUnique({
    where: { id },
    include: {
      trainer: true,
      theme: true,
      request: { include: { client: true, site: true } },
      expenseItems: { orderBy: { date: "asc" } },
    },
  });

  if (!session) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = session as any;
  const grandTotal = (s.expenseItems as { amount: number }[]).reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href={`/sessions/${id}`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la session
      </Link>

      {/* Session header */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h1 className="text-xl font-bold text-foreground mb-1">
          Frais de mission
        </h1>
        <p className="text-muted-foreground text-sm mb-4">
          {s.theme.label} — {s.request.client.name}
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {formatDate(s.startDate)}
              {formatDate(s.startDate) !== formatDate(s.endDate) &&
                ` → ${formatDate(s.endDate)}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4 shrink-0" />
            <span>{s.trainer.fullName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Total enregistré :</span>
            <span className="font-semibold text-foreground">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Sub-nav links */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/sessions/${id}`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Détail
        </Link>
        <Link
          href={`/sessions/${id}/presences`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Présences
        </Link>
        <Link
          href={`/sessions/${id}/attestations`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Attestations
        </Link>
        <Link
          href={`/sessions/${id}/frais`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary"
          aria-current="page"
        >
          Frais
        </Link>
        <Link
          href={`/sessions/${id}/rapport`}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
        >
          Rapport
        </Link>
      </div>

      {/* Frais interactive section */}
      <FraisClient
        sessionId={id}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expenses={(s.expenseItems as any[]).map((e: any) => ({
          id: e.id as string,
          category: e.category as "REPAS" | "HEBERGEMENT" | "TRANSPORT" | "AUTRE",
          amount: e.amount as number,
          date: e.date as Date,
          description: e.description as string | null,
          approved: e.approved as boolean | null,
        }))}
      />
    </div>
  );
}
