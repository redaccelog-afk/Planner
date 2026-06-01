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
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  titleText: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#1a3c5e",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  logoText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    letterSpacing: 2,
  },
  separator: {
    borderBottomWidth: 2,
    borderBottomColor: "#1a3c5e",
    marginVertical: 14,
  },
  thinSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 12,
  },
  toBlock: {
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    padding: 12,
    marginBottom: 20,
  },
  toLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  toValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a3c5e",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bodyText: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 6,
    lineHeight: 1.7,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 5,
  },
  fieldLabel: {
    fontSize: 11,
    color: "#6b7280",
    width: 100,
  },
  fieldValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e293b",
    flex: 1,
  },
  fraisSection: {
    marginTop: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
    padding: 12,
  },
  fraisItem: {
    fontSize: 11,
    color: "#374151",
    marginBottom: 4,
    paddingLeft: 10,
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBlock: {
    width: "45%",
  },
  signatureLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    marginBottom: 40,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#6b7280",
    marginTop: 4,
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

  const missionOrder = await db.missionOrder.findUnique({
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

  if (!missionOrder) {
    return new Response("Ordre de mission introuvable", { status: 404 });
  }

  const { session: trainingSession, numero } = missionOrder;
  const { trainer, theme, request } = trainingSession;
  const { client, site } = request;

  const startDate = format(trainingSession.startDate, "dd MMMM yyyy", { locale: fr });
  const endDate = format(trainingSession.endDate, "dd MMMM yyyy", { locale: fr });
  const today = format(new Date(), "dd/MM/yyyy");

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
        React.createElement(
          View,
          { style: styles.titleRow },
          React.createElement(
            Text,
            { style: styles.titleText },
            `ORDRE DE MISSION N° ${numero}`
          ),
          React.createElement(Text, { style: styles.logoText }, "CCE LOG")
        )
      ),
      React.createElement(View, { style: styles.separator }),
      // To block
      React.createElement(
        View,
        { style: styles.toBlock },
        React.createElement(Text, { style: styles.toLabel }, "À l'attention de"),
        React.createElement(
          Text,
          { style: styles.toValue },
          `Formateur ${trainer.fullName}`
        )
      ),
      // Body
      React.createElement(
        Text,
        { style: styles.bodyText },
        "Vous êtes prié(e) de vous rendre au :"
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, "Client :"),
        React.createElement(Text, { style: styles.fieldValue }, client.name)
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, "Site :"),
        React.createElement(
          Text,
          { style: styles.fieldValue },
          `${site.label} - ${site.city} - ${site.address}`
        )
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, "Formation :"),
        React.createElement(
          Text,
          { style: styles.fieldValue },
          `${theme.label} (${theme.durationDays} jour(s))`
        )
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, "Dates :"),
        React.createElement(
          Text,
          { style: styles.fieldValue },
          `du ${startDate} au ${endDate}`
        )
      ),
      React.createElement(
        View,
        { style: styles.fieldRow },
        React.createElement(Text, { style: styles.fieldLabel }, "Participants :"),
        React.createElement(
          Text,
          { style: styles.fieldValue },
          String(request.participants)
        )
      ),
      // Frais
      React.createElement(View, { style: styles.thinSeparator }),
      React.createElement(
        Text,
        { style: styles.sectionTitle },
        "Frais pris en charge"
      ),
      React.createElement(
        View,
        { style: styles.fraisSection },
        React.createElement(
          Text,
          { style: styles.fraisItem },
          "• Transport selon barème kilométrique CCE LOG"
        ),
        React.createElement(
          Text,
          { style: styles.fraisItem },
          "• Hébergement si distance > 150 km"
        ),
        React.createElement(
          Text,
          { style: styles.fraisItem },
          "• Per diem : 300 MAD/jour"
        )
      ),
      // Signatures
      React.createElement(
        View,
        { style: styles.signatureSection },
        React.createElement(
          View,
          { style: styles.signatureBlock },
          React.createElement(Text, { style: styles.signatureLabel }, "Formateur :"),
          React.createElement(View, { style: styles.signatureLine })
        ),
        React.createElement(
          View,
          { style: styles.signatureBlock },
          React.createElement(
            Text,
            { style: styles.signatureLabel },
            "Direction CCE LOG :"
          ),
          React.createElement(View, { style: styles.signatureLine })
        )
      ),
      // Footer
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          { style: styles.footerText },
          `Document généré automatiquement le ${today}`
        )
      )
    )
  );

  const pdfBuffer = await renderToBuffer(doc);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ordre-mission-${numero}.pdf"`,
    },
  });
}
