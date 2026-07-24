import { NextResponse } from "next/server";
import { db } from "@ccelog/db";
import { auth } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const trainer = await db.trainer.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      fullName: true,
      phone: true,
      email: true,
      city: true,
      address: true,
      notes: true,
      employeeId: true,
      employerCost: true,
      legalStatus: true,
      ice: true,
      rc: true,
      ifFiscal: true,
      cnss: true,
      iban: true,
      bankName: true,
      defaultDayRate: true,
      paymentTerms: true,
      legalEntities: {
        select: { id: true, entityName: true, legalStatus: true, ice: true, rc: true, ifFiscal: true, cnss: true, iban: true, bankName: true, isDefault: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!trainer) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(trainer);
}
