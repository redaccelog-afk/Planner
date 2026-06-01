export const runtime = "nodejs";

import { auth } from "@/lib/auth";
import { db } from "@ccelog/db";
import { NextRequest } from "next/server";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 11,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  logoText: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1a3c5e",
    letterSpacing: 2,
    marginBottom: 6,
  },
  titleText: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  separator: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    marginVertical: 16,
  },
  numero: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "right",
    marginBottom: 24,
  },
  body: {
    marginTop: 20,
    lineHeight: 1.8,
  },
  bodyText: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 8,
    lineHeight: 1.8,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  resultContainer: {
    marginTop: 28,
    alignItems: "center",
  },
  resultBoxApte: {
    backgroundColor: "#dcfce7",
    borderWidth: 2,
    borderColor: "#16a34a",
    borderRadius: 6,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  resultBoxInapt: {
    backgroundColor: "#fee2e2",
    borderWidth: 2,
    borderColor: "#dc2626",
    borderRadius: 6,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  resultTextApte: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#16a34a",
    letterSpacing: 2,
  },
  resultTextInapt: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#dc2626",
    letterSpacing: 2,
  },
  noteText: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 10,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
  },
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  const attestation = await db.attestation.findUnique({
    where: { id },
    include: {
      participant: true,
      session: {
        include: {
          theme: true,
          trainer: true,
          request: {
            include: {
              client: true,
              site: true,
            },
          },
        },
      },
      template: true,
    },
  });

  if (!attestation) {
    return new Response("Attestation introuvable", { status: 404 });
  }

  const { participant, session: trainingSession } = attestation;
  const { theme, request } = trainingSession;
  const { site } = request;

  const startDate = format(trainingSession.startDate, "dd MMMM yyyy", { locale: fr });
  const endDate = format(trainingSession.endDate, "dd MMMM yyyy", { locale: fr });
  const today = format(new Date(), "dd MMMM yyyy", { locale: fr });

  const isApte = attestation.resultat === "APTE";

  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.logoText }, "CCE LOG"),
        React.createElement(Text, { style: styles.titleText }, "ATTESTATION DE FORMATION")
      ),
      React.createElement(View, { style: styles.separator }),
      // Numero
      React.createElement(
        Text,
        { style: styles.numero },
        `N° ${attestation.numero}`
      ),
      // Body
      React.createElement(
        View,
        { style: styles.body },
        React.createElement(
          Text,
          { style: styles.bodyText },
          "Nous certifions que ",
          React.createElement(Text, { style: styles.bold }, `${participant.prenom} ${participant.nom}`),
          " a participé à la formation :"
        ),
        React.createElement(
          Text,
          { style: styles.bodyText },
          React.createElement(Text, { style: styles.bold }, theme.label)
        ),
        React.createElement(
          Text,
          { style: styles.bodyText },
          `du ${startDate} au ${endDate}`
        ),
        React.createElement(
          Text,
          { style: styles.bodyText },
          "organisée par ",
          React.createElement(Text, { style: styles.bold }, "CCE LOG")
        ),
        React.createElement(
          Text,
          { style: styles.bodyText },
          "Site : ",
          React.createElement(Text, { style: styles.bold }, site.city)
        )
      ),
      // Résultat
      React.createElement(
        View,
        { style: styles.resultContainer },
        React.createElement(
          View,
          { style: isApte ? styles.resultBoxApte : styles.resultBoxInapt },
          React.createElement(
            Text,
            { style: isApte ? styles.resultTextApte : styles.resultTextInapt },
            isApte ? "APTE" : "INAPT"
          )
        ),
        attestation.note !== null && attestation.note !== undefined
          ? React.createElement(
              Text,
              { style: styles.noteText },
              `Note : ${attestation.note}/20`
            )
          : null
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          { style: styles.footerText },
          `CCE LOG — Casablanca | Date de délivrance : ${today}`
        )
      )
    )
  );

  const pdfBuffer = await renderToBuffer(doc);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="attestation-${attestation.numero}.pdf"`,
    },
  });
}
