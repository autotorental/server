import type { MedusaResponse } from "@medusajs/framework/http"

export const setCacheHeaders = (res: MedusaResponse, maxAge: number = 300) => {
  res.setHeader("Cache-Control", `public, max-age=${maxAge}, must-revalidate`)
  res.setHeader("Vary", "Accept-Encoding")
}

export const setNoCacheHeaders = (res: MedusaResponse) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate")
  res.setHeader("Pragma", "no-cache")
}

// For frequently accessed endpoints
export const setLongCacheHeaders = (res: MedusaResponse) => {
  res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate")
}
