// POST /admin/seo/keyword-volume  Body: { keyword }
// Returns { search_volume, competition, cpc, monthly_searches, provider } from the
// selected provider: DataForSEO (default, "installed") OR SEMrush — chosen in
// ai_setting.keyword_provider. Cached 24h per provider+keyword+location.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

async function viaDataForSEO(login: string, pw: string, keyword: string, location: number, language: string) {
  const auth = Buffer.from(`${login}:${pw}`).toString("base64")
  const r = await fetch("https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live", {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify([{ keywords: [keyword], location_code: location, language_code: language }]),
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) return { error: `DataForSEO failed: ${(await r.text()).slice(0, 300)}` }
  const j: any = await r.json()
  const item = j?.tasks?.[0]?.result?.[0]
  if (!item) return { error: "No data for this keyword" }
  return {
    keyword: item.keyword, provider: "dataforseo",
    search_volume: item.search_volume ?? null, competition: item.competition ?? null,
    competition_index: item.competition_index ?? null, cpc: item.cpc ?? null,
    low_top_of_page_bid: item.low_top_of_page_bid ?? null, high_top_of_page_bid: item.high_top_of_page_bid ?? null,
    monthly_searches: (item.monthly_searches || []).slice(0, 12),
  }
}

async function viaSemrush(key: string, keyword: string, db: string) {
  // phrase_this: Ph;Nq;Cp;Co;Nr;Td  (Td = comma-separated 12-month relative trend 0..1)
  const url = `https://api.semrush.com/?type=phrase_this&key=${encodeURIComponent(key)}&phrase=${encodeURIComponent(keyword)}&database=${encodeURIComponent(db)}&export_columns=Ph,Nq,Cp,Co,Nr,Td`
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const text = (await r.text()).trim()
  if (!r.ok || /^ERROR/i.test(text)) return { error: `SEMrush: ${text.slice(0, 160)}` }
  const lines = text.split("\n")
  if (lines.length < 2) return { error: "SEMrush: no data for this keyword" }
  const v = lines[1].split(";")
  const nq = Number(v[1] || 0)
  const cpc = Number(v[2] || 0)
  const comp = Number(v[3] || 0)
  const td = String(v[5] || "").split(",").map(Number).filter((n) => !isNaN(n))
  // Build approximate 12-month series from the relative trend (labelled, scaled by volume).
  let monthly: any[] = []
  if (td.length) {
    const now = new Date()
    monthly = td.slice(-12).map((rel, i, arr) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (arr.length - 1 - i), 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1, search_volume: Math.round(rel * nq) }
    })
  }
  return {
    keyword, provider: "semrush",
    search_volume: isNaN(nq) ? null : nq,
    competition: isNaN(comp) ? null : comp, competition_index: isNaN(comp) ? null : Math.round(comp * 100),
    cpc: isNaN(cpc) ? null : cpc, low_top_of_page_bid: null, high_top_of_page_bid: null,
    monthly_searches: monthly,
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cfg = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  const provider = String((cfg && cfg.keyword_provider) || "dataforseo").toLowerCase()

  const body = req.body as any
  const keyword = (body?.keyword || "").toString().trim()
  if (!keyword) return res.status(400).json({ message: "keyword required" })
  const location = body?.location_code || 2784 // UAE
  const language = body?.language_code || "en"

  const cacheKey = provider === "semrush" ? `semrush:${keyword}` : keyword
  const cached = await knex("keyword_cache").where({ keyword: cacheKey, location_code: location }).first().catch(() => null)
  if (cached && new Date(cached.updated_at).getTime() > Date.now() - 86400000) {
    return res.json({ ...cached.data, cached: true })
  }

  let out: any
  try {
    if (provider === "semrush") {
      const key = (cfg && cfg.semrush_api_key) || process.env.SEMRUSH_API_KEY
      if (!key) return res.status(503).json({ message: "SEMrush is selected but no API key is set. Add it in SEO → Keyword data source." })
      const db = body?.semrush_db || "ae"
      out = await viaSemrush(key, keyword, db)
    } else {
      const login = (cfg && cfg.dataforseo_login) || process.env.DATAFORSEO_LOGIN
      const pw = (cfg && cfg.dataforseo_password) || process.env.DATAFORSEO_PASSWORD
      if (!login || !pw) return res.status(503).json({ message: "DataForSEO not configured. Add credentials in AI Settings." })
      out = await viaDataForSEO(login, pw, keyword, location, language)
    }
  } catch (e: any) {
    return res.status(500).json({ message: "lookup failed", error: String(e?.message || e).slice(0, 200) })
  }
  if (out?.error) return res.status(502).json({ message: out.error })

  await knex("keyword_cache").insert({ keyword: cacheKey, location_code: location, data: out, updated_at: new Date() }).onConflict(["keyword", "location_code"]).merge().catch(() => {})
  res.json({ ...out, cached: false })
}
