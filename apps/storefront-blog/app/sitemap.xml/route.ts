import { fetchPosts } from "@/lib/api"

export const revalidate = 120

const SITE = "https://autotorental.com"

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const now = new Date()
  const posts = await fetchPosts()

  const entries = [
    {
      url: `${SITE}/blog`,
      lastModified: now.toISOString(),
      changeFrequency: "daily",
      priority: "0.9",
    },
    ...posts.map((post) => ({
      url: `${SITE}/blog/${post.slug}`,
      lastModified: new Date(post.published_at || now).toISOString(),
      changeFrequency: "weekly",
      priority: "0.7",
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `<url>
  <loc>${escapeXml(entry.url)}</loc>
  <lastmod>${entry.lastModified}</lastmod>
  <changefreq>${entry.changeFrequency}</changefreq>
  <priority>${entry.priority}</priority>
</url>`
  )
  .join("\n")}
</urlset>`

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  })
}
