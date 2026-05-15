import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@ccelog/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const pipelines = await db.demandePipeline.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      candidates: {
        include: { trainer: { select: { id: true, fullName: true, phone: true, type: true } } },
        orderBy: { rank: "asc" },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 3 },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ pipelines });
}
