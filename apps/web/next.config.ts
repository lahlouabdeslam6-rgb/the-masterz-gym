import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  transpilePackages: ["@masterz/ui"],
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: "http://api:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
