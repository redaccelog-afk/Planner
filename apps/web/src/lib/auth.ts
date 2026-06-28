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

// Comptes demo — actifs en permanence pour les tests et démos
const DEMO_ACCOUNTS = [
  { email: "admin@ccelog.demo",          name: "Admin Demo",          role: "ADMIN" as const },
  { email: "planificateur@ccelog.demo",  name: "Planificateur Demo",  role: "PLANIFICATEUR" as const },
  { email: "formateur@ccelog.demo",      name: "Formateur Demo",      role: "FORMATEUR" as const },
  { email: "comptabilite@ccelog.demo",   name: "Comptabilité Demo",   role: "COMPTABILITE" as const },
  { email: "preparateur@ccelog.demo",    name: "Préparateur Demo",    role: "PREPARATEUR" as const },
  { email: "client@ccelog.demo",         name: "Client Demo",         role: "CLIENT" as const },
];

providers.push(
  Credentials({
    name: "Accès demo",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Mot de passe", type: "password" },
    },
    async authorize(credentials) {
      const email = (credentials?.email as string) ?? "";
      const password = (credentials?.password as string) ?? "";

      // Comptes demo (mot de passe fixe)
      const demo = DEMO_ACCOUNTS.find((a) => a.email === email);
      if (demo && password === "demo2024") {
        const user = await db.user.upsert({
          where: { email: demo.email },
          update: {},
          create: { email: demo.email, name: demo.name, role: demo.role },
        });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      }

      // Compte dev historique (DEV_ADMIN_EMAIL / DEV_ADMIN_PASSWORD)
      if (
        email === process.env.DEV_ADMIN_EMAIL &&
        password === process.env.DEV_ADMIN_PASSWORD
      ) {
        const user = await db.user.upsert({
          where: { email },
          update: {},
          create: { email, name: "Admin CCE LOG", role: "ADMIN" },
        });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      }

      return null;
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  adapter: PrismaAdapter(db),
  providers,
});
