import type { Metadata } from "next"
import Link from "next/link"
import { fetchPosts, postCoverUrl } from "@/lib/api"

export const metadata: Metadata = {
  title: "Car Rental Blog — Tips, Guides, Reviews | Auto to Rental",
  description:
    "Expert guides on car rental in Dubai and UAE. Cheapest car rental tips, luxury car reviews, tourist guides, and money-saving strategies.",
  alternates: {
    canonical: "https://autotorental.com/blog",
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Car Rental Blog — Tips, Guides, Reviews | Auto to Rental",
    description:
      "Expert guides on car rental in Dubai and UAE. Cheapest car rental tips, luxury car reviews, tourist guides, and money-saving strategies.",
    url: "https://autotorental.com/blog",
    type: "website",
    images: ["https://autotorental.com/og-default.jpg"],
  },
}

const BLOG_FAQ = [
  { q: "Can I book directly from guides?", a: "Each article links to live inventory and verified companies where you contact providers directly." },
  { q: "How often are blog guides updated?", a: "Editorial pages are refreshed periodically to keep pricing logic and recommendations aligned with the market." },
  { q: "Are these tips relevant for UAE tourists?", a: "Yes. Guides are written for both residents and tourists planning rentals in Dubai and the UAE." },
]

function JsonLd({ data }: { data: Record<string, any> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export default async function BlogIndexPage() {
  const sorted = [...(await fetchPosts())].sort((a, b) =>
    (b.published_at || "").localeCompare(a.published_at || "")
  )
  const featured = sorted[0]
  const rest = sorted.slice(1)
  const categories = Array.from(
    new Set(sorted.map((p) => ((p as unknown as { category?: string }).category || "Blog")))
  )

  const readTime = (post: { body: string; excerpt: string | null; title: string }) => {
    const text = (post.excerpt || "") + " " + post.title + " " + post.body.replace(/<[^>]+>/g, " ")
    return Math.max(4, Math.round(text.split(/\s+/).filter(Boolean).length / 220))
  }

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://autotorental.com/" },
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://autotorental.com/blog" },
          ],
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: BLOG_FAQ.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }}
      />
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-xs text-brand-200 mb-3">
            <a href="https://autotorental.com/" className="hover:text-white">Home</a> › Blog
          </div>
          <h1 className="text-4xl md:text-5xl font-black">Car Rental Blog</h1>
          <p className="mt-3 text-brand-100 text-lg max-w-2xl">Honest tips, real prices, and practical guides for renting cars in Dubai and the UAE.</p>
        </div>
      </section>

      {featured && (
        <section className="py-12 md:py-14">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-[11px] uppercase tracking-wider text-brand-600 font-bold mb-3">Featured</div>
            <Link href={`/${featured.slug}`} className="group block surface-card interactive-card rounded-2xl overflow-hidden grid md:grid-cols-[1.2fr_1fr] gap-0">
              <div className="aspect-[16/10] md:aspect-auto bg-ink-100 overflow-hidden">
                <img src={postCoverUrl(featured) || ""} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="text-[11px] uppercase tracking-wider text-brand-600 font-bold mb-3">
                  {(featured as unknown as { category?: string }).category || "Car rental guide"}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-ink-900 leading-tight group-hover:text-brand-600 transition">{featured.title}</h2>
                {featured.excerpt && <p className="mt-3 text-ink-600 leading-relaxed">{featured.excerpt}</p>}
                <div className="mt-5 flex items-center gap-4 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1">
                    📅
                    {featured.published_at ? new Date(featured.published_at).toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" }) : "Published"}
                  </span>
                  <span className="inline-flex items-center gap-1">🕒 {readTime(featured)} min read</span>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      <section className="pb-6">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span key={c} className="bg-ink-50 text-ink-700 px-3 py-1.5 rounded-full text-xs font-semibold">{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post) => (
              <Link key={post.slug} href={`/${post.slug}`} className="group surface-card interactive-card rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-[16/10] bg-ink-100 overflow-hidden">
                  <img src={postCoverUrl(post) || ""} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[10px] uppercase tracking-wider text-brand-600 font-bold mb-2">{(post as unknown as { category?: string }).category || "Blog"}</div>
                  <h3 className="font-bold text-ink-900 leading-tight group-hover:text-brand-600 transition flex-1">{post.title}</h3>
                  {post.excerpt && <p className="mt-2 text-sm text-ink-600">{post.excerpt}</p>}
                  <div className="mt-4 pt-4 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
                    <span>{post.published_at ? new Date(post.published_at).toLocaleDateString("en-AE", { month: "short", day: "numeric" }) : "Published"}</span>
                    <span>{readTime(post)} min read</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {sorted.length === 0 && <p className="text-ink-500">No blog posts published yet.</p>}
        </div>
      </section>

      <section className="py-14 bg-gradient-to-br from-brand-600 to-brand-900 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-black">Ready to rent your car?</h2>
          <p className="mt-3 text-brand-100">Browse 1,200+ cars from verified rental companies across UAE & Syria.</p>
          <a href="https://autotorental.com/cars" className="mt-6 inline-block bg-white text-brand-700 hover:bg-amber-300 hover:text-ink-950 font-bold px-7 py-3.5 rounded-xl">Browse cars →</a>
        </div>
      </section>
    </>
  )
}
