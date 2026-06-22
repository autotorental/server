import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  basePath: "/blog",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.autotorental.com" },
      { protocol: "https", hostname: "admin.autotorental.com" },
    ],
  },
}

export default nextConfig
