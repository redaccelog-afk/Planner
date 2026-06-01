/**
 * Configuration Auth.js complète — Node.js Runtime uniquement.
 * Étend authConfig (Edge-compatible) avec PrismaAdapter et la vérification DB
 * pour le provider Credentials.
 * Importé uniquement par les API routes et les Server Components, jamais par middleware.ts.
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@ccelog/db";
import { authConfig } from "./auth.config";

// Filtrer le provider Credentials du config Edge (authorize = null)
// et le remplacer par la version complète avec vérification DB.
const providers = authConfig.providers.filter(
  (p) => (p as { id?: string }).id !== "credentials"
);

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
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  adapter: PrismaAdapter(db),
  providers,
});
