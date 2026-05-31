export type VideoLinkKind = "file" | "youtube" | "instagram" | "link"

const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v", ".ogg", ".ogv"])

function fileExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const dot = pathname.lastIndexOf(".")
    return dot >= 0 ? pathname.slice(dot).toLowerCase() : ""
  } catch {
    return ""
  }
}

export function classifyVideoUrl(url: string): VideoLinkKind {
  const lower = url.toLowerCase()
  if (/youtube\.com|youtu\.be/.test(lower)) return "youtube"
  if (/instagram\.com/.test(lower)) return "instagram"
  if (VIDEO_EXTENSIONS.has(fileExtFromUrl(url))) return "file"
  return "link"
}

export function isAllowedVideoLink(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  if (!/^https?:\/\//i.test(trimmed)) return false
  try {
    const parsed = new URL(trimmed)
    if (!["http:", "https:"].includes(parsed.protocol)) return false
    if (!parsed.hostname) return false
  } catch {
    return false
  }
  return true
}

export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      return u.pathname.replace(/^\/+/, "").split("/")[0] || null
    }
    if (u.pathname.startsWith("/shorts/")) {
      return u.pathname.split("/")[2] || null
    }
    if (u.pathname.startsWith("/embed/")) {
      return u.pathname.split("/")[2] || null
    }
    return u.searchParams.get("v")
  } catch {
    return null
  }
}

export function youtubeEmbedUrl(url: string): string | null {
  const id = extractYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

export function instagramEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes("instagram.com")) return null
    const path = u.pathname.replace(/\/+$/, "")
    if (!path || path === "/") return null
    return `${u.origin}${path}/embed`
  } catch {
    return null
  }
}

export function videoLinkLabel(url: string): string {
  const kind = classifyVideoUrl(url)
  if (kind === "youtube") return "YouTube"
  if (kind === "instagram") return "Instagram"
  if (kind === "file") return "Video file"
  return "Video link"
}
