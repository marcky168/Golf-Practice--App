import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Recommended for PWA service worker + security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript" },
        ],
      },
    ];
  },
  // Enable experimental features useful for modern Next 15
  experimental: {
    // Partial Prerendering is stable and great for dashboards + dynamic sections
  },
};

export default nextConfig;
