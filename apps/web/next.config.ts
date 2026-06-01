import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Standalone output — image Docker minimale (Railway / Docker deploy)
  output: "standalone",
  // Nécessaire en monorepo pour que le tracing remonte jusqu'à la racine
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@ccelog/ui", "@ccelog/shared", "@ccelog/db", "@ccelog/integrations"],
  // bullmq/ioredis sont des optionnels du worker — exclure du bundle web pour éviter les warnings
  serverExternalPackages: ["@prisma/client", "bullmq", "ioredis", "pizzip", "docxtemplater"],
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
