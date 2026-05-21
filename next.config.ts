import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['192.168.0.102', '192.168.0.101', 'localhost:3000'],
};

export default nextConfig;