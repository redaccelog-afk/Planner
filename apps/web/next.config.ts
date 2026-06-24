import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// "standalone" pour Docker/Railway, désactivé sur Netlify (incompatible avec le plugin)
const isNetlify = process.env.NETLIFY === "true";

const nextConfig: NextConfig = {
  output: isNetlify ? undefined : "standalone",
  // Nécessaire en monorepo pour que le tracing remonte jusqu'à la racine (standalone seulement)
  ...(isNetlify ? {} : { outputFileTracingRoot: path.join(__dirname, "../../") }),
  transpilePackages: ["@ccelog/ui", "@ccelog/shared", "@ccelog/db", "@ccelog/integrations"],
  // Packages serveur-only exclus du bundle webpack (résolus à runtime par Node.js)
  // @ccelog/worker : worker BullMQ — non bundlé, utilisé uniquement via import dynamique
  serverExternalPackages: [
    "@prisma/client",
    "bullmq",
    "ioredis",
    "pizzip",
    "docxtemplater",
    "@anthropic-ai/sdk",
    "@ccelog/worker",
  ],
  images: {
    domains: ["ccelog.com"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
