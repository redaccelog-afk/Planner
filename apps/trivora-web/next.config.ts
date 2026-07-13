import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trivora/shared", "@trivora/db"],
};

export default nextConfig;
