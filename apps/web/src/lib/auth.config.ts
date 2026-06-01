/**
 * Configuration Auth.js compatible Edge Runtime.
 * PAS d'import Prisma ici — utilisé par le middleware qui tourne dans l'Edge.
 * La config complète (avec PrismaAdapter) est dans auth.ts.
 */
import type { NextAuthConfig } from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

// Provider Microsoft — actif uniquement si le secret Azure est configuré
if (process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // tenantId est accepté au runtime mais absent des types de next-auth v5 beta
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(process.env.AZURE_AD_TENANT_ID ? { tenantId: process.env.AZURE_AD_TENANT_ID } : {}) as any,
      authorization: {
        params: {
          scope:
            "openid profile email User.Read Calendars.ReadWrite Mail.ReadWrite Mail.Send offline_access",
        },
      },
    })
  );
}

// Provider de test local — stub Edge-compatible (la vérification DB se fait dans auth.ts)
if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      name: "Compte de test",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      // authorize est intentionnellement vide ici (Edge Runtime) — l'implémentation
      // réelle avec vérification DB est dans auth.ts qui étend cette config.
      async authorize() {
        return null;
      },
    })
  );
}

export const authConfig: NextAuthConfig = {
  providers,
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = (user?.id ?? token?.sub) as string;
        // role est un champ custom — cast nécessaire (next-auth v5 beta types incomplets)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = (user as { role?: string })?.role ?? "ADMIN";
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
    error: "/auth/erreur",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  debug: false,
};
