import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@ccelog/integrations";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: RouteContext) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await ctx.params;

  const session = await db.trainingSession.findUnique({
    where: { id },
    include: {
      trainer: true,
      theme: true,
      request: { include: { client: true, site: true } },
    },
  });

  if (!session) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const showAs = (session.status === "CONFIRMEE" ? "busy" : "tentative") as "busy" | "tentative";

  const eventData = {
    subject: `[CCE LOG] ${session.theme.label} — ${session.request.client.name}`,
    start: { dateTime: session.startDate.toISOString(), timeZone: "Africa/Casablanca" },
    end: { dateTime: session.endDate.toISOString(), timeZone: "Africa/Casablanca" },
    location: { displayName: session.request.site.city },
    showAs,
    body: {
      contentType: "text" as const,
      content: [
        `Formation : ${session.theme.label}`,
        `Client : ${session.request.client.name}`,
        `Lieu : ${session.request.site.label}`,
        `Formateur : ${session.trainer.fullName}`,
      ].join("\n"),
    },
  };

  try {
    if (session.status === "ANNULEE") {
      if (session.outlookEventId) {
        await deleteCalendarEvent(session.outlookEventId);
        await db.trainingSession.update({ where: { id }, data: { outlookEventId: null } });
      }
      return NextResponse.json({ ok: true, action: "deleted" });
    }

    if (session.outlookEventId) {
      await updateCalendarEvent(session.outlookEventId, eventData);
      return NextResponse.json({ ok: true, action: "updated", eventId: session.outlookEventId });
    } else {
      const eventId = await createCalendarEvent(eventData);
      await db.trainingSession.update({ where: { id }, data: { outlookEventId: eventId } });
      return NextResponse.json({ ok: true, action: "created", eventId });
    }
  } catch (error) {
    console.error("Outlook sync error:", error);
    return NextResponse.json({ error: "Erreur sync Outlook", details: String(error) }, { status: 500 });
  }
}
