import { classifyVideoUrl, instagramEmbedUrl, videoLinkLabel, youtubeEmbedUrl } from "../lib/vehicle-video"

export function VehicleVideoPreview({ url }: { url: string }) {
  const kind = classifyVideoUrl(url)
  const label = videoLinkLabel(url)

  if (kind === "youtube") {
    const embed = youtubeEmbedUrl(url)
    if (!embed) {
      return (
        <div className="flex h-[150px] items-center justify-center rounded bg-ui-bg-subtle px-3 text-center text-xs text-ui-fg-muted">
          Invalid YouTube link
        </div>
      )
    }
    return (
      <iframe
        src={embed}
        title={label}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ width: "100%", height: 150, border: 0, borderRadius: 8, background: "#000", pointerEvents: "none" }}
      />
    )
  }

  if (kind === "instagram") {
    const embed = instagramEmbedUrl(url)
    if (!embed) {
      return (
        <div className="flex h-[150px] items-center justify-center rounded bg-ui-bg-subtle px-3 text-center text-xs text-ui-fg-muted">
          Invalid Instagram link
        </div>
      )
    }
    return (
      <iframe
        src={embed}
        title={label}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        style={{ width: "100%", height: 150, border: 0, borderRadius: 8, background: "#000", pointerEvents: "none" }}
      />
    )
  }

  return (
    <video
      src={url}
      controls
      muted
      playsInline
      style={{ width: "100%", height: 150, objectFit: "cover", background: "#000" }}
    />
  )
}
