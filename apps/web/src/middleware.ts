/**
 * Edge Middleware — utilise NextAuth avec authConfig (sans Prisma).
 * Ne jamais importer depuis @/lib/auth ici (PrismaAdapter incompatible Edge).
 */
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = [
  "/",
  "/auth/erreur",
  "/formateur/acces",
  "/api/auth",
  "/api/health",
  "/api/whatsapp/webhook",
];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  if (!isPublic && !req.auth) {
    const loginUrl = new URL("/", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
