import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy /api/* requests to the NestJS backend on port 3001
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_URL ?? "http://localhost:3003"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
