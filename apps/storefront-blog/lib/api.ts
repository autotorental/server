const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

export type BlogPost = {
  slug: string
  title: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  published_at: string | null
  meta_title: string | null
  meta_description: string | null
  author_name: string | null
  path: string
}

const UNWANTED_EDITOR_NOTE =
  /(?:<p>\s*)?يمكنك تعديل المحتوى الكامل من لوحة التحكم\s*(?:→|&rarr;|-&gt;)\s*المدونة\.\s*(?:<\/p>)?/gi

const FALLBACK_COVER_BY_SLUG: Record<string, string> = {
  "cheapest-car-rental-dubai-2026":
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&q=80",
  "monthly-car-rental-dubai-guide":
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=1600&q=80",
  "rent-lamborghini-dubai-real-cost":
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1600&q=80",
  "car-rental-vs-taxi-uber-dubai":
    "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1600&q=80",
  "rent-car-dubai-tourist-guide":
    "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=1600&q=80",
  "best-suv-rental-desert-dubai":
    "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=1600&q=80",
  "long-term-car-rental-dubai-vs-leasing":
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=1600&q=80",
}

export async function fetchPosts(): Promise<BlogPost[]> {
  const r = await fetch(`${API}/store/blog/posts`, {
    headers: PK ? { "x-publishable-api-key": PK } : {},
    next: { revalidate: 60 },
  })
  if (!r.ok) return []
  const d = await r.json()
  return ((d.posts || []) as BlogPost[]).map(sanitizePost)
}

export async function fetchPost(slug: string): Promise<BlogPost | null> {
  const r = await fetch(`${API}/store/blog/posts/${encodeURIComponent(slug)}`, {
    headers: PK ? { "x-publishable-api-key": PK } : {},
    next: { revalidate: 60 },
  })
  if (!r.ok) return null
  const d = await r.json()
  return d.post ? sanitizePost(d.post as BlogPost) : null
}

export function mediaUrl(url: string | null | undefined) {
  if (!url) return null
  if (url.startsWith("http")) return url
  return `https://api.autotorental.com${url.startsWith("/") ? "" : "/"}${url}`
}

export function postCoverUrl(post: BlogPost | null | undefined) {
  if (!post) return null
  return (
    mediaUrl(post.cover_image_url) ||
    FALLBACK_COVER_BY_SLUG[post.slug] ||
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1600&q=80"
  )
}

function sanitizePost(post: BlogPost): BlogPost {
  return {
    ...post,
    title: stripNote(post.title) || post.title,
    excerpt: post.excerpt ? stripNote(post.excerpt) : post.excerpt,
    body: stripNote(post.body),
    meta_title: post.meta_title ? stripNote(post.meta_title) : post.meta_title,
    meta_description: post.meta_description ? stripNote(post.meta_description) : post.meta_description,
  }
}

function stripNote(value: string) {
  return value.replace(UNWANTED_EDITOR_NOTE, "").trim()
}
