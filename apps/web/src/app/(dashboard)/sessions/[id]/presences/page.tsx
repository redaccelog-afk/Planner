import { db } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, BookOpen } from "lucide-react";
import { PresenceClient } from "./presence-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.trainingSession.findUnique({
    where: { id },
    include: { theme: true, request: { include: { client: true } } },
  });
  if (!session) return { title: "Session introuvable" };
  return { title: `Présences — ${session.theme.code} · ${session.request.client.name}` };
}

export default async function PresencesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await db.trainingSession.findUnique({
    where: { id },
    include: {
      theme: true,
      trainer: { select: { fullName: true } },
      request: { include: { client: true, site: true } },
      participants: { orderBy: [{ nom: "asc" }, { prenom: "asc" }] },
    },
  });

  if (!session) notFound();

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

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feuille de présence</h1>
        <p className="text-muted-foreground mt-1">
          {session.theme.label} — {session.request.client.name}
        </p>
      </div>

      {/* Session info cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <BookOpen className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Thème</span>
          </div>
          <p className="text-sm font-medium text-foreground">{session.theme.label}</p>
          <p className="text-xs text-muted-foreground">{session.theme.code}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Dates</span>
          </div>
          <p className="text-sm font-medium text-foreground">
            {new Date(session.startDate).toLocaleDateString("fr-MA")}
          </p>
          {session.startDate.toDateString() !== session.endDate.toDateString() && (
            <p className="text-xs text-muted-foreground">
              au {new Date(session.endDate).toLocaleDateString("fr-MA")}
            </p>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Site</span>
          </div>
          <p className="text-sm font-medium text-foreground">{session.request.site.label}</p>
          <p className="text-xs text-muted-foreground">{session.request.site.city}</p>
        </div>
      </div>

      {/* Participants (client) */}
      <PresenceClient sessionId={id} participants={session.participants} />
    </div>
  );
}
