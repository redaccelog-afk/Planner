import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { EMAIL_EXTRACTION_PROMPT, fuzzyMatchClient } from "@ccelog/shared";
import type { AiEmailExtraction } from "@ccelog/shared";
import { auth } from "@/lib/auth";
// @ts-expect-error -- anthropic sdk loaded at runtime
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const ParseEmailSchema = z.object({
  subject: z.string(),
  body: z.string(),
  fromAddress: z.string().optional(),
  outlookMessageId: z.string().optional(),
});

export async function POST(req: Request) {
  const authSession = await auth();
  if (!authSession) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  try {
    const body = await req.json();
    const { subject, body: emailBody, fromAddress, outlookMessageId } = ParseEmailSchema.parse(body);

    // Appel Anthropic pour extraction IA
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: EMAIL_EXTRACTION_PROMPT,
      messages: [
        {
          role: "user",
          content: `Objet : ${subject}\n\n${emailBody}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";

    let extracted: AiEmailExtraction;
    try {
      extracted = JSON.parse(text) as AiEmailExtraction;
    } catch {
      return NextResponse.json({ error: "Impossible de parser la réponse IA", raw: text }, { status: 422 });
    }

    // Matching fuzzy client
    const allClients = await db.client.findMany({
      where: { active: true },
      select: { id: true, name: true, normalizedName: true },
    });

    const clientMatches = extracted.clientNameGuess
      ? fuzzyMatchClient(extracted.clientNameGuess, allClients)
      : [];

    const bestClient = clientMatches[0];

    // Trouver les thèmes dans la DB
    const themeMatches = await db.theme.findMany({
      where: {
        code: { in: extracted.themes },
        active: true,
      },
      select: { id: true, code: true, label: true },
    });

    // Préparer la réponse pour validation humaine (ne pas créer automatiquement)
    return NextResponse.json({
      extracted,
      clientSuggestion: bestClient ?? null,
      clientMatches: clientMatches.slice(0, 3),
      themeSuggestions: themeMatches,
      outlookMessageId,
      fromAddress,
      subject,
      // L'humain valide avant création
      readyToCreate: !!(bestClient && themeMatches.length > 0),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides", details: error.errors }, { status: 422 });
    }
    console.error("parse-email error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
