import Link from "next/link"
import { notFound } from "next/navigation"
import { POST_BY_SLUG, POSTS } from "@/lib/blog-posts"
import { buildMetadata, SITE } from "@/lib/seo"
import { BreadcrumbJsonLd, FAQPageJsonLd } from "@/components/jsonld"
import { Calendar, Clock, ArrowLeft } from "lucide-react"
import { getLocale } from "@/lib/locale-server"
import { translateText, translateBatch } from "@/lib/mt"

export async function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const p = POST_BY_SLUG[slug]
  if (!p) return { title: "Not found" }
  const locale = await getLocale()
  const [title, description] = await translateBatch([p.title, p.description], locale)
  return buildMetadata({
    title,
    description,
    path: `/blog/${p.slug}`,
    image: p.cover,
    keywords: p.keywords,
  })
}

function ArticleJsonLd({ post }: { post: typeof POSTS[number] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: post.cover,
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: "Auto to Rental", url: SITE.url },
    publisher: { "@type": "Organization", name: "Auto to Rental", logo: { "@type": "ImageObject", url: `${SITE.url}/logo.png` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE.url}/blog/${post.slug}` },
    keywords: post.keywords.join(", "),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}/>
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = POST_BY_SLUG[slug]
  if (!post) return notFound()
  const locale = await getLocale()
  const related = post.related.map(s => POST_BY_SLUG[s]).filter(Boolean)

  // Collect every translatable string into one ordered list, translate in a
  // single batched API call, then slice the results back into shape. Plain-text
  // format preserves the **bold** and • bullet markers the renderer relies on.
  const sourceStrings: string[] = [
    post.title,
    post.description,
    post.category,
    ...post.intro,
    ...post.sections.flatMap(s => [s.h2 || "", s.h3 || "", ...s.body]),
    ...post.faqs.flatMap(f => [f.q, f.a]),
    ...related.flatMap(r => [r.title, r.category]),
  ]
  const t = await translateBatch(sourceStrings, locale)
  let k = 0
  const next = () => t[k++]
  const tPost = {
    title: next(),
    description: next(),
    category: next(),
    intro: post.intro.map(() => next()),
    sections: post.sections.map(s => {
      const h2v = next(); const h3v = next()
      return { h2: s.h2 ? h2v : undefined, h3: s.h3 ? h3v : undefined, body: s.body.map(() => next()) }
    }),
    faqs: post.faqs.map(() => ({ q: next(), a: next() })),
  }
  const tRelated = related.map(() => ({ title: next(), category: next() }))

  return (
    <>
      <ArticleJsonLd post={post}/>
      <FAQPageJsonLd faqs={tPost.faqs}/>
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }, { name: tPost.title, url: `/blog/${post.slug}` }]}/>

      {/* Hero */}
      <section className="relative">
        <div className="aspect-[21/9] md:aspect-[16/6] bg-ink-100 dark:bg-ink-800 overflow-hidden relative">
          <img src={post.cover} alt={post.title} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/30 to-transparent"/>
        </div>
        <div className="mx-auto max-w-3xl px-4 -mt-32 md:-mt-40 relative pb-10">
          <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-6 md:p-8 shadow-2xl">
            <div className="text-xs text-ink-500 mb-3 flex items-center gap-2">
              <Link href="/" className="hover:text-brand-600">Home</Link>›
              <Link href="/blog" className="hover:text-brand-600">Blog</Link>›
              <span className="text-ink-700 dark:text-ink-300">{tPost.category}</span>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-brand-600 font-bold mb-3">{tPost.category}</div>
            <h1 className="text-2xl md:text-4xl font-black text-ink-900 dark:text-ink-100 leading-tight">{tPost.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-ink-600 dark:text-ink-400">
              <span className="inline-flex items-center gap-1.5"><Calendar size={14}/>{new Date(post.published_at).toLocaleDateString("en-AE", { year: "numeric", month: "long", day: "numeric" })}</span>
              <span className="inline-flex items-center gap-1.5"><Clock size={14}/>{post.read_time} min read</span>
              {post.author && <span>By {post.author.name}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* Article body */}
      <article className="mx-auto max-w-3xl px-4 pb-14 content-prose">
        {/* Intro */}
        <div className="space-y-4 text-lg text-ink-800 dark:text-ink-200 leading-relaxed border-l-4 border-brand-600 pl-5 my-8">
          {tPost.intro.map((p, i) => <p key={i}>{p}</p>)}
        </div>

        {/* Sections */}
        <div className="max-w-none space-y-8">
          {tPost.sections.map((s, i) => (
            <section key={i}>
              {s.h2 && <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mt-12 mb-4">{s.h2}</h2>}
              {s.h3 && <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100 mt-6 mb-3">{s.h3}</h3>}
              <div className="space-y-4 text-ink-700 dark:text-ink-300 leading-relaxed">
                {s.body.map((p, j) => p.startsWith("•") || p.includes("\n•") ? (
                  <ul key={j} className="space-y-2 list-disc pl-5">{p.split("\n").filter(l => l.trim().startsWith("•")).map((l, k) => <li key={k} dangerouslySetInnerHTML={{ __html: l.replace(/^•\s*/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}/>)}</ul>
                ) : (
                  <p key={j} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}/>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA inline */}
        <div className="my-14 p-6 bg-gradient-to-br from-brand-50 to-brand-100 border border-brand-200 rounded-2xl text-center">
          <h3 className="text-xl font-bold text-ink-900 dark:text-ink-100">Browse 1,200+ rental cars now</h3>
          <p className="mt-2 text-ink-600 dark:text-ink-400">Direct contact with verified rental companies. No commission, no fees.</p>
          <Link href="/cars" className="mt-4 inline-block bg-brand-600 hover:bg-brand-700 text-white font-bold px-6 py-3 rounded-xl">Browse Cars →</Link>
        </div>

        <section className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-5 md:p-6 my-12">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-3">Related rental links</h2>
          <p className="text-sm text-ink-600 dark:text-ink-400">Move from reading to booking with these quick paths:</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/cars" className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">Browse all cars</Link>
            <Link href="/cars?period=monthly" className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">Monthly deals</Link>
            <Link href="/companies" className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">Verified companies</Link>
            <Link href="/blog" className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">More guides</Link>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-14">
          <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-7">Frequently asked questions</h2>
          <div className="space-y-3">
            {tPost.faqs.map((f, i) => (
              <details key={i} className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-xl p-5 group">
                <summary className="font-bold text-ink-900 dark:text-ink-100 cursor-pointer list-none flex items-center justify-between">
                  <span>{f.q}</span><span className="text-ink-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 text-ink-700 dark:text-ink-300 text-sm leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className="py-14 bg-ink-50 dark:bg-ink-900/50 border-t border-ink-100 dark:border-ink-800">
          <div className="mx-auto max-w-7xl px-4">
            <h2 className="text-2xl md:text-3xl font-black text-ink-900 dark:text-ink-100 mb-7">Read next</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((p, ri) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:border-brand-300 hover:shadow-cardHover rounded-2xl overflow-hidden">
                  <div className="aspect-[16/10] bg-ink-100 dark:bg-ink-800 overflow-hidden"><img src={p.cover} alt={tRelated[ri].title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div>
                  <div className="p-5">
                    <div className="text-[10px] uppercase tracking-wider text-brand-600 font-bold mb-2">{tRelated[ri].category}</div>
                    <h3 className="font-bold text-ink-900 dark:text-ink-100 leading-tight group-hover:text-brand-600 transition">{tRelated[ri].title}</h3>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-10 text-center"><Link href="/blog" className="inline-flex items-center gap-2 text-brand-600 font-bold hover:text-brand-700"><ArrowLeft size={16}/>Back to blog</Link></div>
          </div>
        </section>
      )}
    </>
  )
}
