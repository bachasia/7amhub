import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.vnecdn.net" },
      { protocol: "https", hostname: "**.tinhte.vn" },
      { protocol: "http", hostname: "**.tinhte.vn" },
      { protocol: "https", hostname: "s2.googleusercontent.com" },
      { protocol: "https", hostname: "www.google.com" },
      { protocol: "https", hostname: "**.baomoi.com" },
      { protocol: "https", hostname: "**.dantri.com.vn" },
      { protocol: "https", hostname: "**.thanhnien.vn" },
      { protocol: "https", hostname: "**.tuoitre.vn" },
      { protocol: "https", hostname: "**.vnexpress.net" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
