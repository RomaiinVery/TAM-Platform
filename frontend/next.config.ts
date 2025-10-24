import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname, // ← force la racine sur "frontend/"
  },
  // Force le port 3000 pour le développement
  devIndicators: {
    buildActivity: true,
  },
};

export default nextConfig;
