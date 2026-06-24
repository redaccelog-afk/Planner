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
  const tenantId = process.env.AZURE_AD_TENANT_ID!;
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      // Forcer le endpoint tenant-spécifique (évite AADSTS50194 sur /common)
      issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
      authorization: {
        url: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        params: {
          scope:
            "openid profile email User.Read Calendars.ReadWrite Mail.ReadWrite Mail.Send offline_access",
        },
      },
      token: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      userinfo: "https://graph.microsoft.com/oidc/userinfo",
    })
  );
}

// Provider demo — toujours actif (stub Edge-compatible, la vérif DB se fait dans auth.ts)
providers.push(
  Credentials({
    name: "Accès demo",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize() {
      return null;
    },
  })
);

export const authConfig: NextAuthConfig = {
  providers,
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token?.sub as string;
        session.user.role = (token?.role as string) ?? "ADMIN";
      }
      return session;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, account }: any) {
      // user est présent uniquement au premier sign-in (authorize return value)
      if (user?.role) token.role = user.role;
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
