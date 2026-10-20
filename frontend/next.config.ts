import path from "node:path";
import type { NextConfig } from "next";

// The browser only ever talks to this Next.js origin. /api/* is proxied to FastAPI, so the session
// cookie is first-party in development and production alike.
const backendUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo root has its own package-lock (git hooks), so pin tracing to this app.
  outputFileTracingRoot: path.join(__dirname),
  // Lets the E2E server build into its own directory so it can run next to a normal dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  experimental: {
    // AI analysis of several jobs can take longer than the default 30 s proxy timeout.
    proxyTimeout: 120_000,
    optimizePackageImports: ["@mantine/core", "@mantine/hooks", "@tabler/icons-react", "recharts"],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
