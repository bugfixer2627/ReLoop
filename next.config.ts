import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: process.env.RELOOP_DEV_ORIGINS?.split(",").map((host) => host.trim()).filter(Boolean),
};

export default nextConfig;
