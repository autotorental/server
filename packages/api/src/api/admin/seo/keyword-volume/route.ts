// POST /admin/seo/keyword-volume
// Body: { keyword: "car rental dubai" }
// Returns: { search_volume, competition, cpc, difficulty, ... } from DataForSEO
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cfg = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  const login = cfg?.dataforseo_login || process.env.DATAFORSEO_LOGIN
  const pw = cfg?.dataforseo_password || process.env.DATAFORSEO_PASSWORD
  if (!login || !pw) {
    return res.status(503).json({ message: "DataForSEO not configured. Add credentials in AI Settings." })
  }

  const body = req.body as any
  const keyword = (body?.keyword || "").toString().trim()
  if (!keyword) return res.status(400).json({ message: "keyword required" })
  const location = body?.location_code || 2784 // 2784 = UAE
  const language = body?.language_code || "en"

  // Check cache first (24h TTL)
  const cached = await knex("keyword_cache").where({ keyword, location_code: location }).first().catch(() => null)
  if (cached && new Date(cached.updated_at).getTime() > Date.now() - 86400000) {
    return res.json({ ...cached.data, cached: true })
  }

  // DataForSEO API call
  const auth = Buffer.from(`${login}:${pw}`).toString("base64")
  try {
    const r = await fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
      method: "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify([{ keywords: [keyword], location_code: location, language_code: language }]),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(502).json({ message: "DataForSEO failed", detail: t.slice(0, 400) })
    }
    const j = await r.json()
    const item = j?.tasks?.[0]?.result?.[0]
    if (!item) return res.status(404).json({ message: "No data for this keyword" })

    const out = {
      keyword: item.keyword,
      search_volume: item.search_volume ?? null,
      competition: item.competition ?? null,
      competition_index: item.competition_index ?? null,
      cpc: item.cpc ?? null,
      low_top_of_page_bid: item.low_top_of_page_bid ?? null,
      high_top_of_page_bid: item.high_top_of_page_bid ?? null,
      monthly_searches: item.monthly_searches?.slice(0, 12) ?? [],
    }
    // Cache for 24h
    await knex("keyword_cache").insert({
      keyword, location_code: location, data: out, updated_at: new Date(),
    }).onConflict(["keyword", "location_code"]).merge()
    res.json({ ...out, cached: false })
  } catch (e: any) {
    res.status(500).json({ message: "lookup failed", error: e.message })
  }
}
