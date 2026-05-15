import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@ccelog/db";

const providers = [];

// Provider Microsoft — actif uniquement si le secret Azure est configuré
if (process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope:
            "openid profile email User.Read Calendars.ReadWrite Mail.ReadWrite Mail.Send offline_access",
        },
      },
    })
  );
}

// Provider de test local — actif uniquement en développement
if (process.env.NODE_ENV === "development") {
  providers.push(
    Credentials({
      name: "Compte de test",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        if (
          email === process.env.DEV_ADMIN_EMAIL &&
          password === process.env.DEV_ADMIN_PASSWORD
        ) {
          // Crée ou récupère l'utilisateur de test
          const user = await db.user.upsert({
            where: { email },
            update: {},
            create: {
              email,
              name: "Admin CCE LOG",
              role: "ADMIN",
            },
          });
          return { id: user.id, email: user.email, name: user.name };
        }
        return null;
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers,
  callbacks: {
    async session({ session, user, token }) {
      if (session.user) {
        session.user.id = (user?.id ?? token?.sub) as string;
        session.user.role = (user as { role?: string })?.role ?? "ADMIN";
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
  trustHost: true,   // accepte toutes les origines en dev (port variable)
  debug: process.env.NODE_ENV === "development",
});
