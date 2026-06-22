import { isAllowedVideoUrl, normalizeVideoUrl } from "./vehicle-video-url"

function sanitizeUrlArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function normalizeVehicleMedia(body: any): void {
  if (Object.prototype.hasOwnProperty.call(body, "photos")) {
    body.photos = sanitizeUrlArray(body.photos)
  }

  if (!Object.prototype.hasOwnProperty.call(body, "videos")) {
    return
  }

  const videos = sanitizeUrlArray(body.videos)
  if (videos.length > 3) {
    throw new Error("A vehicle can have up to 3 videos")
  }

  for (const videoUrl of videos) {
    if (!isAllowedVideoUrl(videoUrl)) {
      throw new Error(`Invalid video URL: ${videoUrl}`)
    }
  }

  body.videos = videos.map(normalizeVideoUrl)
}
