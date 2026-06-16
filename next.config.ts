import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // Client-side Router Cache TTL (seconds). Without this, dynamic pages
    // default to 0 = refetch on every navigation. With it, the RSC payload
    // for a visited page is reused for the cached window — so going
    // Board → Tracker → Board is instant on the way back.
    staleTimes: {
      dynamic: 120,  // dynamic (force-dynamic / cookie-based) pages
      static: 300,   // static pages or those with prefetch={true}
    },
  },
};

export default nextConfig;
