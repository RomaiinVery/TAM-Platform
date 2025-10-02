import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname, // ← force la racine sur “frontend/”
  },
};

export default nextConfig;
