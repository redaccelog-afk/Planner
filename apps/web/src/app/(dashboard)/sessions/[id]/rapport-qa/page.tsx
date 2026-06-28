import { db } from "@ccelog/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { RapportQAWizard } from "./rapport-qa-wizard"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await db.trainingSession.findUnique({
    where: { id },
    include: { theme: true, request: { include: { client: true } } },
  })
  if (!session) return { title: "Session introuvable" }
  return {
    title: `Rédaction rapport — ${session.theme.code} · ${session.request.client.name}`,
  }
}

export default async function RapportQAPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const session = await db.trainingSession.findUnique({
    where: { id },
    include: {
      theme: true,
      request: { include: { client: true } },
      rapportQA: true,
    },
  })

  if (!session) notFound()

  // Only allow editing if no rapport yet, or it's still a BROUILLON
  if (
    session.rapportQA &&
    session.rapportQA.status !== "BROUILLON"
  ) {
    // Redirect to rapport view — already validated
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Link
          href={`/sessions/${id}/rapport`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au rapport
        </Link>
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-3">
          <p className="text-foreground font-medium">
            Ce rapport a déjà été validé et ne peut plus être modifié.
          </p>
          <Link
            href={`/sessions/${id}/rapport`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Voir le rapport
          </Link>
        </div>
      </div>
    )
  }

  // Parse existing moyensDisposition back into individual fields if present
  type ExistingShape = {
    bilanGeneral?: string
    salle?: string
    esepi?: string
    chariot?: string
    accueilAmbiance?: string
    hasVr?: boolean
    vrDescription?: string
    recommandations?: string
    conclusion?: string
  }

  let existing: ExistingShape | null = null

  if (session.rapportQA) {
    const r = session.rapportQA
    // moyensDisposition was stored as "Salle de formation : X\nESEPI : Y\nChariot élévateur : Z"
    const moyensLines = (r.moyensDisposition ?? "").split("\n")
    const extract = (prefix: string) => {
      const line = moyensLines.find((l) => l.startsWith(prefix))
      return line ? line.replace(prefix, "").trim() : "RAS"
    }

    existing = {
      bilanGeneral: r.bilanGeneral ?? "",
      salle: extract("Salle de formation : "),
      esepi: extract("ESEPI : "),
      chariot: extract("Chariot élévateur : "),
      accueilAmbiance: r.accueilAmbiance ?? "",
      hasVr: r.hasVr,
      vrDescription: r.vrDescription ?? "",
      recommandations: r.recommandations ?? "",
      conclusion: r.conclusion ?? "",
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href={`/sessions/${id}/rapport`}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour au rapport
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {session.rapportQA ? "Modifier le rapport" : "Rédiger le rapport"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {session.theme.label} — {session.request.client.name}
        </p>
      </div>

      {/* Wizard */}
      <RapportQAWizard sessionId={id} existing={existing} />
    </div>
  )
}
