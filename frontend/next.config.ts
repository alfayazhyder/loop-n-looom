import type { NextConfig } from "next";

const backendUrl = new URL(
  process.env.BACKEND_INTERNAL_URL ??
    "http://localhost:5000",
);

if (
  backendUrl.protocol !== "http:" &&
  backendUrl.protocol !== "https:"
) {
  throw new Error("Invalid backend URL protocol.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${backendUrl.origin}/:path*`,
      },
    ];
  },
};

export default nextConfig;