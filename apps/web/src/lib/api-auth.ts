import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type AppRole = "ADMIN" | "PLANIFICATEUR" | "PREPARATEUR" | "COMPTABILITE" | "FORMATEUR" | "LECTEUR" | "CLIENT";

type AppSession = {
  user: { id: string; email?: string | null; name?: string | null; role?: string };
  expires: string;
};

type AuthOk = { session: AppSession; userId: string; role: AppRole };
type AuthErr = NextResponse;

export async function requireRole(allowedRoles: AppRole[]): Promise<AuthOk | AuthErr> {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = session.user as Record<string, unknown>;
  const role = user.role as string;
  const userId = user.id as string;

  if (!role || !allowedRoles.includes(role as AppRole)) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  return { session: session as AppSession, userId, role: role as AppRole };
}

export function isAuthErr(v: AuthOk | AuthErr): v is AuthErr {
  return v instanceof NextResponse;
}
