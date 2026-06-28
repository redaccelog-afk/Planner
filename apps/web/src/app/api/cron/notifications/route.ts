import { NextResponse } from "next/server"
import { db, type Role } from "@ccelog/db"

export const dynamic = "force-dynamic"
export const maxDuration = 30

/**
 * Daily cron — multi-role notification scheduling.
 * Secured by CRON_SECRET (header x-cron-secret or query ?secret=).
 * Called daily at 06:00 Casablanca by Vercel Cron (see vercel.json).
 *
 * Notification dedup strategy: each notification carries a `ref` key in its
 * JSON payload. Before inserting, we check for an existing row with the same
 * sessionId + type + payload->>'ref'. This avoids N+1 per-user existence
 * checks by fetching all existing refs for a session in one query.
 */
export async function GET(req: Request) {
  const secret =
    req.headers.get("x-cron-secret") ??
    new URL(req.url).searchParams.get("secret")

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const now = new Date()
  const results = { created: 0, errors: 0 }

  // ── Fetch all confirmed upcoming sessions in one query ───────────────────
  const sessions = await db.trainingSession.findMany({
    where: { status: "CONFIRMEE", startDate: { gte: now } },
    include: {
      trainer: { select: { id: true, fullName: true, email: true } },
      theme: { select: { label: true, code: true } },
      request: {
        include: {
          client: { select: { name: true } },
          site: { select: { label: true, city: true } },
        },
      },
      dossier: { select: { status: true } },
    },
  })

  if (sessions.length === 0) {
    return NextResponse.json({ ok: true, ...results })
  }

  // ── Pre-fetch all users by role in two queries (no per-session N+1) ──────
  const clientRoles: Role[] = ["CLIENT"]
  const planRoles: Role[] = ["PLANIFICATEUR", "ADMIN"]

  const [clientUsers, planUsers] = await Promise.all([
    db.user.findMany({
      where: { role: { in: clientRoles } },
      select: { id: true, email: true, role: true },
    }),
    db.user.findMany({
      where: { role: { in: planRoles } },
      select: { id: true, email: true, role: true },
    }),
  ])

  // ── Pre-fetch existing notification refs for all sessions ────────────────
  // We store the dedup key as payload->>'ref'. Fetch all existing inapp
  // notifications for the relevant sessions so we can check duplicates in
  // memory instead of per-row DB queries.
  const sessionIds = sessions.map((s) => s.id)
  const existingNotifications = await db.notification.findMany({
    where: { sessionId: { in: sessionIds }, channel: "inapp" },
    select: { sessionId: true, payload: true },
  })

  // Build a Set of "sessionId::ref" strings for O(1) lookup
  const existingRefs = new Set<string>()
  for (const n of existingNotifications) {
    const payload = n.payload as Record<string, unknown> | null
    if (n.sessionId && payload?.ref && typeof payload.ref === "string") {
      existingRefs.add(`${n.sessionId}::${payload.ref}`)
    }
  }

  // Helper: check and register a ref atomically in-memory
  const refSeen = (sessionId: string, ref: string): boolean => {
    const key = `${sessionId}::${ref}`
    if (existingRefs.has(key)) return true
    existingRefs.add(key) // mark to prevent duplicates within same run
    return false
  }

  // ── Process each session ─────────────────────────────────────────────────
  for (const session of sessions) {
    const sessionDate = session.startDate
    const daysUntil = Math.ceil(
      (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    const themeLabel = session.theme.label
    const clientName = session.request.client.name

    // Collect rows to bulk-insert for this session
    const toCreate: Parameters<typeof db.notification.create>[0]["data"][] = []

    const push = (
      data: Parameters<typeof db.notification.create>[0]["data"],
    ) => {
      toCreate.push(data)
      results.created++
    }

    // ── CLIENT : J-15, J-7, J-1 ───────────────────────────────────────────
    if ([15, 7, 1].includes(daysUntil) && clientUsers.length > 0) {
      for (const u of clientUsers) {
        const ref = `session:${session.id}:client:j-${daysUntil}`
        if (refSeen(session.id, ref)) continue
        push({
          sessionId: session.id,
          type: "RAPPEL_J7_CLIENT",
          channel: "inapp",
          recipient: u.email,
          scheduledAt: now,
          payload: {
            ref,
            userId: u.id,
            title: `Rappel formation dans ${daysUntil} jour(s)`,
            body: `Formation ${themeLabel} pour ${clientName} prévue dans ${daysUntil} jour(s).`,
          },
        })
      }
    }

    // ── FORMATEUR : J-2, J-1 ──────────────────────────────────────────────
    if (session.trainer?.email && [2, 1].includes(daysUntil)) {
      const ref = `session:${session.id}:formateur:j-${daysUntil}`
      if (!refSeen(session.id, ref)) {
        push({
          sessionId: session.id,
          type: "RAPPEL_FORMATEUR",
          channel: "inapp",
          recipient: session.trainer.email,
          scheduledAt: now,
          payload: {
            ref,
            trainerId: session.trainer.id,
            title: `Formation dans ${daysUntil} jour(s) — ${themeLabel}`,
            body: `Rappel : vous animez la formation ${themeLabel} pour ${clientName} dans ${daysUntil} jour(s).`,
          },
        })
      }
    }

    // ── PRÉPARATEUR (PLANIFICATEUR + ADMIN) : J-7, J-5 ────────────────────
    if ([7, 5].includes(daysUntil) && planUsers.length > 0) {
      for (const p of planUsers) {
        const ref = `session:${session.id}:preparateur:j-${daysUntil}`
        if (refSeen(session.id, ref)) continue
        push({
          sessionId: session.id,
          type: "DOCUMENTS_PRETS",
          channel: "inapp",
          recipient: p.email,
          scheduledAt: now,
          payload: {
            ref,
            userId: p.id,
            title: `Dossier à préparer — ${themeLabel} dans ${daysUntil}j`,
            body: `La formation ${themeLabel} pour ${clientName} a lieu dans ${daysUntil} jours. Dossier à préparer.`,
          },
        })
      }
    }

    // ── ALERTE URGENTE : dossier non prêt à J-2 ───────────────────────────
    if (
      daysUntil === 2 &&
      planUsers.length > 0 &&
      (!session.dossier || session.dossier.status !== "PRET")
    ) {
      for (const p of planUsers) {
        const ref = `session:${session.id}:dossier-urgent:j-2`
        if (refSeen(session.id, ref)) continue
        push({
          sessionId: session.id,
          type: "ALERTE_STOCK",
          channel: "inapp",
          recipient: p.email,
          scheduledAt: now,
          payload: {
            ref,
            userId: p.id,
            title: `URGENT — Dossier non prêt J-2 : ${themeLabel}`,
            body: `La formation ${themeLabel} pour ${clientName} a lieu dans 2 jours et le dossier n'est pas encore prêt.`,
          },
        })
      }
    }

    // Bulk insert for this session (createMany not available on all providers,
    // use Promise.all over individual creates to stay within the session loop
    // without per-row sequential awaits)
    if (toCreate.length > 0) {
      const inserts = toCreate.map((data) =>
        db.notification.create({ data }).catch((err: unknown) => {
          console.error("[cron/notifications] insert error:", err)
          results.created-- // roll back the optimistic counter
          results.errors++
        }),
      )
      await Promise.all(inserts)
    }
  }

  console.log(
    `[cron/notifications] created=${results.created} errors=${results.errors}`,
  )
  return NextResponse.json({ ok: true, ...results })
}
