import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@ccelog/db";
import { enqueueIntake } from "@/lib/pipeline-enqueue";

// GET /api/pipeline/[id]  — détail complet
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const pipeline = await db.demandePipeline.findUnique({
    where: { id },
    include: {
      candidates: {
        include: { trainer: true },
        orderBy: { rank: "asc" },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ pipeline });
}

// PATCH /api/pipeline/[id]  — actions planner
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as {
    action: "validate_trainers" | "confirm_dates" | "client_response" | "cancel";
    trainerOrder?: string[];       // IDs des formateurs dans l'ordre validé
    confirmedDate?: string;        // date confirmée par le planner
    clientConfirmed?: boolean;
    proposedDates?: string[];
  };

  const pipeline = await db.demandePipeline.findUnique({ where: { id } });
  if (!pipeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  switch (body.action) {
    // ── Planner valide/réordonne la liste des formateurs ──────────
    case "validate_trainers": {
      if (!body.trainerOrder?.length) {
        return NextResponse.json({ error: "trainerOrder requis" }, { status: 400 });
      }

      // Re-numéroter les candidats selon l'ordre validé
      for (let i = 0; i < body.trainerOrder.length; i++) {
        await db.trainerCandidate.updateMany({
          where: { pipelineId: id, trainerId: body.trainerOrder[i] },
          data: { rank: i + 1 },
        });
      }

      await db.demandePipeline.update({
        where: { id },
        data: { status: "CONTACTING_TRAINER", currentTrainerIndex: 0 },
      });

      // Contacter le premier formateur
      await enqueueIntake({ action: "contact_trainer", pipelineId: id });

      return NextResponse.json({ ok: true, action: "contacting_first_trainer" });
    }

    // ── Planner confirme les dates proposées par le formateur ─────
    case "confirm_dates": {
      if (!body.confirmedDate) {
        return NextResponse.json({ error: "confirmedDate requis" }, { status: 400 });
      }

      await db.demandePipeline.update({
        where: { id },
        data: { status: "WAITING_CLIENT" },
      });

      // Notifier le client
      await enqueueIntake({ action: "notify_client", pipelineId: id });

      return NextResponse.json({ ok: true, action: "client_notified" });
    }

    // ── Réponse du client (peut être déclenchée manuellement) ─────
    case "client_response": {
      const confirmed = body.clientConfirmed ?? false;

      if (confirmed && body.confirmedDate) {
        await enqueueIntake({ action: "create_session", pipelineId: id, confirmedDate: body.confirmedDate });
      } else {
        await enqueueIntake({ action: "move_next_trainer", pipelineId: id, reason: "client_rejected_manually" });
      }

      return NextResponse.json({ ok: true });
    }

    // ── Annulation manuelle ────────────────────────────────────────
    case "cancel": {
      await db.demandePipeline.update({
        where: { id },
        data: { status: "CANCELLED", notes: "Annulé manuellement par le planner" },
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }
}
