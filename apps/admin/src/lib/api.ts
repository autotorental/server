/** Same-origin API base — required so admin session cookies are sent on save. */
export const API = import.meta.env.VITE_BACKEND_URL || "https://admin.autotorental.com"

/** Serve uploaded files from the admin host (/static is nginx → uploads). */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ""
  try {
    const path = new URL(url).pathname
    if (path.startsWith("/static/")) return path
  } catch {
    if (url.startsWith("/static/")) return url
  }
  return url
}
