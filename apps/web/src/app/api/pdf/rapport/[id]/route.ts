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
    marginBottom: 20,
    alignItems: "center",
  },
  logoText: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1a3c5e",
    letterSpacing: 2,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  separator: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    marginVertical: 14,
  },
  thinSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a3c5e",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    backgroundColor: "#f1f5f9",
    padding: 6,
    borderRadius: 3,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  infoCell: {
    width: "50%",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  rapportContainer: {
    marginTop: 4,
  },
  paragraph: {
    fontSize: 11,
    color: "#374151",
    lineHeight: 1.7,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
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

  const report = await db.trainingReport.findUnique({
    where: { id },
    include: {
      session: {
        include: {
          trainer: true,
          theme: true,
          request: {
            include: {
              client: true,
              site: true,
            },
          },
        },
      },
    },
  });

  if (!report) {
    return new Response("Rapport introuvable", { status: 404 });
  }

  const { session: trainingSession } = report;
  const { trainer, theme, request } = trainingSession;
  const { client, site } = request;

  const startDate = format(trainingSession.startDate, "dd MMMM yyyy", { locale: fr });
  const endDate = format(trainingSession.endDate, "dd MMMM yyyy", { locale: fr });
  const depositedAt = format(report.createdAt, "dd MMMM yyyy", { locale: fr });

  // Split raw text into paragraphs
  const rawText = report.rawFromTrainer ?? "(Aucun contenu fourni par le formateur)";
  const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim().length > 0);

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
        React.createElement(Text, { style: styles.titleText }, "RAPPORT DE FORMATION")
      ),
      React.createElement(View, { style: styles.separator }),
      // Section Informations
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Informations"
      ),
      React.createElement(
        View,
        { style: styles.infoGrid },
        React.createElement(
          View,
          { style: styles.infoCell },
          React.createElement(Text, { style: styles.infoLabel }, "Client"),
          React.createElement(Text, { style: styles.infoValue }, client.name)
        ),
        React.createElement(
          View,
          { style: styles.infoCell },
          React.createElement(Text, { style: styles.infoLabel }, "Site"),
          React.createElement(
            Text,
            { style: styles.infoValue },
            `${site.label} — ${site.city}`
          )
        ),
        React.createElement(
          View,
          { style: styles.infoCell },
          React.createElement(Text, { style: styles.infoLabel }, "Formateur"),
          React.createElement(Text, { style: styles.infoValue }, trainer.fullName)
        ),
        React.createElement(
          View,
          { style: styles.infoCell },
          React.createElement(Text, { style: styles.infoLabel }, "Formation"),
          React.createElement(Text, { style: styles.infoValue }, theme.label)
        ),
        React.createElement(
          View,
          { style: styles.infoCell },
          React.createElement(Text, { style: styles.infoLabel }, "Dates"),
          React.createElement(
            Text,
            { style: styles.infoValue },
            `${startDate} — ${endDate}`
          )
        ),
        React.createElement(
          View,
          { style: styles.infoCell },
          React.createElement(Text, { style: styles.infoLabel }, "Participants"),
          React.createElement(
            Text,
            { style: styles.infoValue },
            String(request.participants)
          )
        )
      ),
      React.createElement(View, { style: styles.thinSeparator }),
      // Section Rapport
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Rapport du formateur"
      ),
      React.createElement(
        View,
        { style: styles.rapportContainer },
        ...paragraphs.map((para, idx) =>
          React.createElement(
            Text,
            { key: String(idx), style: styles.paragraph },
            para.trim()
          )
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          { style: styles.footerText },
          `Rapport déposé le ${depositedAt}`
        )
      )
    )
  );

  const pdfBuffer = await renderToBuffer(doc);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapport-formation-${report.id}.pdf"`,
    },
  });
}
