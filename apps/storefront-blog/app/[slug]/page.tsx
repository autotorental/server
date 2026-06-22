import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchPost, postCoverUrl } from "@/lib/api"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await fetchPost(slug)
  if (!post) return { title: "Not found" }
  return {
    title: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || undefined,
    alternates: {
      canonical: `https://autotorental.com/blog/${post.slug}`,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: post.meta_title || post.title,
      description: post.meta_description || post.excerpt || undefined,
      images: [postCoverUrl(post) || "https://autotorental.com/og-default.jpg"],
      url: `https://autotorental.com/blog/${post.slug}`,
    },
  }
}

function JsonLd({ data }: { data: Record<string, any> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  const post = await fetchPost(slug)
  if (!post) notFound()

  const readTime = Math.max(
    4,
    Math.round((((post.excerpt || "") + " " + post.title + " " + post.body.replace(/<[^>]+>/g, " ")).split(/\s+/).filter(Boolean).length) / 220)
  )
  const cleanedBody = post.body
    .replace(/<p>\s*يمكنك تعديل المحتوى الكامل من لوحة التحكم\s*→\s*المدونة\.\s*<\/p>/gi, "")
    .replace(/يمكنك تعديل المحتوى الكامل من لوحة التحكم\s*→\s*المدونة\./gi, "")

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://autotorental.com/" },
            { "@type": "ListItem", position: 2, name: "Blog", item: "https://autotorental.com/blog" },
            { "@type": "ListItem", position: 3, name: post.title, item: `https://autotorental.com/blog/${post.slug}` },
          ],
        }}
      />
      <section className="relative">
        <div className="aspect-[21/9] md:aspect-[16/6] bg-ink-100 overflow-hidden relative">
          {postCoverUrl(post) && <img src={postCoverUrl(post) || ""} alt={post.title} className="w-full h-full object-cover"/>}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent"/>
        </div>
        <div className="mx-auto max-w-3xl px-4 -mt-32 md:-mt-40 relative pb-10">
          <div className="bg-white border border-ink-100 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="text-xs text-ink-500 mb-3 flex items-center gap-2">
              <a href="https://autotorental.com/" className="hover:text-brand-600">Home</a>›
              <Link href="/" className="hover:text-brand-600">Blog</Link>›
              <span className="text-ink-700">{((post as unknown as { category?: string }).category || "Blog")}</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-brand-600 font-bold mb-3">{((post as unknown as { category?: string }).category || "Blog")}</div>
            <h1 className="text-2xl md:text-4xl font-black text-ink-900 leading-tight">{post.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-ink-600">
              {post.published_at && <span className="inline-flex items-center gap-1.5">📅 {new Date(post.published_at).toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" })}</span>}
              <span className="inline-flex items-center gap-1.5">🕒 {readTime} min read</span>
              {post.author_name && <span>By {post.author_name}</span>}
            </div>
          </div>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 pb-14">
        {post.excerpt && (
          <div className="space-y-4 text-lg text-ink-800 leading-relaxed border-l-4 border-brand-600 pl-5 my-8">
            <p>{post.excerpt}</p>
          </div>
        )}

        <div className="prose max-w-none text-ink-700 leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: cleanedBody }} />
        </div>

        <div className="my-14 p-6 bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 rounded-2xl text-center">
          <h3 className="text-xl font-bold text-ink-900">Browse 1,200+ rental cars now</h3>
          <p className="mt-2 text-ink-600">Direct contact with verified rental companies. No commission, no fees.</p>
          <a href="https://autotorental.com/cars" className="mt-4 inline-block bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl">Browse Cars →</a>
        </div>

        <section className="rounded-2xl border border-ink-100 bg-ink-50 p-5 md:p-6 my-12">
          <h2 className="text-2xl font-black text-ink-900">Related rental links</h2>
          <p className="mt-2 text-sm text-ink-600">Continue to live inventory and verified partners:</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="https://autotorental.com/cars" className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700">All cars</a>
            <a href="https://autotorental.com/cars?period=monthly" className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700">Monthly deals</a>
            <a href="https://autotorental.com/companies" className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700">Verified companies</a>
            <Link href="/" className="rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 hover:text-brand-700">More guides</Link>
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700">← Back to blog</Link>
        </div>
      </article>
    </>
  )
}
