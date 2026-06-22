import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /store/ticker — public live activity feed for the storefront marquee.
// Mixes admin-authored news (ticker_news) with REAL events: cars added,
// discounts, new companies, and a live "browsing now" count. Cached 45s.
let cache: { t: number; data: any } | null = null
const TTL = 45_000

const cleanCar = (t: string) => (t || "").replace(/^rent\s+/i, "").replace(/\s+in\s+[^,]+$/i, "").trim()
function weave(news: any[], events: any[]): any[] {
  const out: any[] = []; let i = 0, j = 0
  while (i < news.length || j < events.length) {
    if (j < events.length) out.push(events[j++])
    if (i < news.length) out.push(news[i++])
    if (j < events.length) out.push(events[j++])
  }
  return out
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const now = Date.now()
  if (cache && now - cache.t < TTL) return res.json(cache.data)
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = async (sql: string) => (await pg.raw(sql)).rows

  const news: any[] = []
  const events: any[] = []

  try {
    const rows = await q(`SELECT emoji, text, text_ar, link FROM ticker_news WHERE active IS TRUE ORDER BY sort ASC, created_at DESC LIMIT 20`)
    rows.forEach((n: any) => news.push({ kind: "news", emoji: n.emoji || "📣", text: n.text, text_ar: n.text_ar || n.text, link: n.link || null }))
  } catch { /* table missing -> just skip news */ }

  try {
    const [a] = await q(`SELECT count(DISTINCT session_id) AS n FROM pageview WHERE is_bot IS NOT TRUE AND created_at > now() - interval '10 minutes'`)
    const n = Number(a?.n || 0)
    if (n >= 2) events.push({ kind: "live", emoji: "👀", text: `${n} people are browsing right now`, text_ar: `${n} شخص يتصفّحون الموقع الآن` })
  } catch {}

  try {
    const cars = await q(`SELECT v.id, v.title, v.slug, b.name AS brand, s.name AS seller
      FROM vehicle v JOIN seller s ON s.id=v.seller_id LEFT JOIN brand b ON b.id=v.brand_id
      WHERE v.deleted_at IS NULL AND v.status='active' ORDER BY v.created_at DESC LIMIT 14`)
    cars.forEach((v: any) => {
      const car = cleanCar(v.title) || v.brand || "a new car"
      events.push({ kind: "car_added", emoji: "🚗", text: `${v.seller} added ${car}`, text_ar: `${v.seller} أضافت ${car}`, link: `/cars/${v.slug || v.id}` })
    })
  } catch {}

  try {
    const deals = await q(`SELECT v.id, v.title, v.slug, b.name AS brand, s.name AS seller, v.daily_price, v.sale_daily_price
      FROM vehicle v JOIN seller s ON s.id=v.seller_id LEFT JOIN brand b ON b.id=v.brand_id
      WHERE v.deleted_at IS NULL AND v.status='active' AND v.sale_daily_price IS NOT NULL AND v.sale_daily_price > 0 AND v.sale_daily_price < v.daily_price
      ORDER BY v.created_at DESC LIMIT 10`)
    deals.forEach((v: any) => {
      const car = cleanCar(v.title) || v.brand || "a car"
      const pct = Math.round((1 - Number(v.sale_daily_price) / Number(v.daily_price)) * 100)
      if (pct > 0) events.push({ kind: "discount", emoji: "🔥", text: `${v.seller}: ${car} now ${pct}% off`, text_ar: `${v.seller}: ${car} الآن خصم ${pct}%`, link: `/cars/${v.slug || v.id}` })
    })
  } catch {}

  try {
    const cos = await q(`SELECT name FROM seller WHERE status='open' ORDER BY created_at DESC LIMIT 6`)
    cos.forEach((s: any) => events.push({ kind: "company", emoji: "🏢", text: `${s.name} joined Auto to Rental`, text_ar: `${s.name} انضمّت إلى Auto to Rental`, link: "/companies" }))
  } catch {}

  const data = { items: weave(news, events), fetched_at: new Date().toISOString() }
  cache = { t: now, data }
  res.json(data)
}
