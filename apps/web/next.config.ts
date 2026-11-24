import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source.
  transpilePackages: ["@golf/db", "@golf/golf"],
};

export default nextConfig;
