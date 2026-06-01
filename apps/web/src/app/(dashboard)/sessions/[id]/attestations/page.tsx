import { db } from "@ccelog/db";
import type { CacesModuleRef } from "@ccelog/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, BookOpen } from "lucide-react";
import { AttestationsClient } from "./attestations-client";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.trainingSession.findUnique({
    where: { id },
    include: { theme: true, request: { include: { client: true } } },
  });
  if (!session) return { title: "Session introuvable" };
  return { title: `Attestations — ${session.theme.code} · ${session.request.client.name}` };
}

// CACES modules derived from theme code (e.g. "CACES_R489" → R489)
function extractCacesModules(themeCode: string): CacesModuleRef[] {
  const validModules: CacesModuleRef[] = [
    "R482", "R483", "R484", "R485", "R486", "R487", "R489", "R490",
  ];
  const matches = themeCode.match(/R\d{3}/g) ?? [];
  return matches.filter((m) =>
    validModules.includes(m as CacesModuleRef)
  ) as CacesModuleRef[];
}

export default async function AttestationsPage({
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
      participants: {
        orderBy: [{ nom: "asc" }, { prenom: "asc" }],
        include: {
          attestations: true,
          cacesResults: true,
        },
      },
    },
  });

  if (!session) notFound();

  const isCaces = session.theme.category === "CACES";
  const cacesModules = isCaces ? extractCacesModules(session.theme.code) : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
        <h1 className="text-2xl font-bold text-foreground">Attestations</h1>
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
          {isCaces && (
            <span className="mt-1 inline-flex px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-500/10 text-blue-400">
              CACES
            </span>
          )}
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

      {/* Nav to presences */}
      <div className="flex items-center gap-2">
        <Link
          href={`/sessions/${id}/presences`}
          className="text-xs text-primary hover:underline"
        >
          Gérer la feuille de présence →
        </Link>
      </div>

      {/* Attestations client */}
      <AttestationsClient
        sessionId={id}
        isCaces={isCaces}
        cacesModules={cacesModules}
        participants={session.participants}
      />
    </div>
  );
}
