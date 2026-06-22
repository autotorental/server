import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting, invalidateSettings } from "../../../lib/settings"

const OAI = "https://api.openai.com/v1"

type Day = { date: string; spend: number; tokens: number; requests: number }

// GET /admin/openai-usage — official OpenAI spend / tokens / requests, last 30 days
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const adminKey = await getSetting(req.scope, "openai_admin_key").catch(() => "")
  const projKeySet = !!(await getSetting(req.scope, "openai_api_key").catch(() => ""))
  if (!adminKey) return res.json({ connected: false, project_key_set: projKeySet })

  const start = Math.floor(Date.now() / 1000) - 30 * 86400
  const byDay: Record<string, Day> = {}
  const dk = (t: number) => new Date(t * 1000).toISOString().slice(0, 10)
  const row = (t: number): Day => (byDay[dk(t)] = byDay[dk(t)] || { date: dk(t), spend: 0, tokens: 0, requests: 0 })
  const auth = { Authorization: `Bearer ${adminKey}` }
  let err = ""

  try {
    const r = await fetch(`${OAI}/organization/costs?start_time=${start}&limit=180`, { headers: auth, signal: AbortSignal.timeout(20000) })
    const d: any = await r.json().catch(() => ({}))
    if (!r.ok) err = d?.error?.message || `Costs API ${r.status}`
    for (const b of (d.data || [])) for (const x of (b.results || [])) row(b.start_time).spend += Number(x.amount?.value || 0)
  } catch (e: any) { err = err || e.message }

  try {
    const r = await fetch(`${OAI}/organization/usage/completions?start_time=${start}&bucket_width=1d&limit=31`, { headers: auth, signal: AbortSignal.timeout(20000) })
    const d: any = await r.json().catch(() => ({}))
    if (!r.ok && !err) err = d?.error?.message || `Usage API ${r.status}`
    for (const b of (d.data || [])) for (const x of (b.results || [])) {
      const rr = row(b.start_time)
      rr.tokens += Number(x.input_tokens || 0) + Number(x.output_tokens || 0)
      rr.requests += Number(x.num_model_requests || 0)
    }
  } catch (e: any) { err = err || e.message }

  const days = Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date))
  res.json({
    connected: true, error: err || undefined, currency: "usd",
    total_spend: days.reduce((s, d) => s + d.spend, 0),
    total_tokens: days.reduce((s, d) => s + d.tokens, 0),
    total_requests: days.reduce((s, d) => s + d.requests, 0),
    days,
  })
}

// POST /admin/openai-usage — owner pastes their OpenAI Admin Key (saved as secret)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b: any = req.body || {}
  if (b.openai_admin_key !== undefined) {
    const key = String(b.openai_admin_key || "").trim()
    const ex = await pg("app_setting").where({ key: "openai_admin_key" }).first()
    if (ex) await pg("app_setting").where({ key: "openai_admin_key" }).update({ value: key, is_secret: true, updated_at: new Date() })
    else await pg("app_setting").insert({ key: "openai_admin_key", value: key, is_secret: true, updated_at: new Date() })
    invalidateSettings()
  }
  res.json({ ok: true })
}
