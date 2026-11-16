import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: ['192.168.0.102', '192.168.0.101', '192.168.0.100', 'localhost:3000', '*.trycloudflare.com'],
};

export default nextConfig;