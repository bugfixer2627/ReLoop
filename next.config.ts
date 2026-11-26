import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: { tsconfigPath: "tsconfig.build.json" },
  allowedDevOrigins: process.env.RELOOP_DEV_ORIGINS?.split(",").map((host) => host.trim()).filter(Boolean),
};

export default nextConfig;
