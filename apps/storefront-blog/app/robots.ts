import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "Googlebot", allow: "/" },
    ],
    sitemap: "https://autotorental.com/blog/sitemap.xml",
    host: "https://autotorental.com",
  }
}
