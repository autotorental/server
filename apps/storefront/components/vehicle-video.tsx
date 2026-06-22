import { classifyVideoUrl, instagramEmbedUrl, youtubeEmbedUrl } from "@/lib/vehicle-video"

const EXT_MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
}

function pathExt(pathname: string): string {
  const dot = pathname.lastIndexOf(".")
  return dot >= 0 ? pathname.slice(dot).toLowerCase() : ""
}

// For videos we host on our own static domain, a background worker produces an
// optimized .webm sibling. Prefer it; the browser falls back to the original
// source automatically if the .webm isn't ready yet (or the browser can't play it).
function webmSibling(url: string): string | null {
  try {
    const u = new URL(url)
    if (!/(^|\.)api\.autotorental\.com$/.test(u.hostname)) return null
    const ext = pathExt(u.pathname)
    if (!ext || ext === ".webm") return null
    u.pathname = u.pathname.slice(0, -ext.length) + ".webm"
    return u.toString()
  } catch {
    return null
  }
}

function mimeFor(url: string): string {
  try {
    return EXT_MIME[pathExt(new URL(url).pathname)] || "video/mp4"
  } catch {
    return "video/mp4"
  }
}

export function VehicleVideoPlayer({ url, title = "Vehicle video" }: { url: string; title?: string }) {
  const kind = classifyVideoUrl(url)

  if (kind === "youtube") {
    const embed = youtubeEmbedUrl(url)
    if (!embed) return null
    return (
      <iframe
        src={embed}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="w-full rounded-xl bg-ink-950 aspect-video"
      />
    )
  }

  if (kind === "instagram") {
    const embed = instagramEmbedUrl(url)
    if (!embed) return null
    return (
      <iframe
        src={embed}
        title={title}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        className="w-full rounded-xl bg-ink-950 min-h-[420px]"
      />
    )
  }

  const webm = webmSibling(url)

  return (
    <video
      controls
      muted
      playsInline
      preload="metadata"
      className="w-full rounded-xl bg-ink-950 aspect-video"
    >
      {webm && <source src={webm} type="video/webm" />}
      <source src={url} type={mimeFor(url)} />
    </video>
  )
}
