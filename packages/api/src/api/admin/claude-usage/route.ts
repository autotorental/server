import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting, invalidateSettings } from "../../../lib/settings"

const A = "https://api.anthropic.com/v1"
type Day = { date: string; spend: number; input: number; output: number }
const n = (v: any) => { const x = Number(v); return isFinite(x) ? x : 0 }

// GET /admin/claude-usage — Anthropic spend + tokens, last 30 days (needs an Admin Key sk-ant-admin-)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const adminKey = await getSetting(req.scope, "claude_admin_key").catch(() => "")
  const keySet = !!(await getSetting(req.scope, "claude_api_key").catch(() => ""))
  if (!adminKey) return res.json({ connected: false, key_set: keySet })

  const startMs = Date.now() - 30 * 86400000
  const startIso = new Date(startMs).toISOString()
  const headers = { "x-api-key": adminKey, "anthropic-version": "2023-06-01", "content-type": "application/json" }
  const byDay: Record<string, Day> = {}
  const dk = (t: any) => { try { return new Date(t).toISOString().slice(0, 10) } catch { return "?" } }
  const row = (t: any): Day => (byDay[dk(t)] = byDay[dk(t)] || { date: dk(t), spend: 0, input: 0, output: 0 })
  let err = ""

  try {
    const r = await fetch(`${A}/organizations/cost_report?starting_at=${encodeURIComponent(startIso)}`, { headers, signal: AbortSignal.timeout(20000) })
    const d: any = await r.json().catch(() => ({}))
    if (!r.ok) err = d?.error?.message || `Cost API ${r.status}`
    for (const b of (d.data || [])) for (const x of (b.results || [])) row(b.starting_at).spend += n(x.amount)
  } catch (e: any) { err = err || e.message }

  try {
    const r = await fetch(`${A}/organizations/usage_report/messages?starting_at=${encodeURIComponent(startIso)}&bucket_width=1d&limit=31`, { headers, signal: AbortSignal.timeout(20000) })
    const d: any = await r.json().catch(() => ({}))
    if (!r.ok && !err) err = d?.error?.message || `Usage API ${r.status}`
    for (const b of (d.data || [])) for (const x of (b.results || [])) {
      const rr = row(b.starting_at)
      rr.input += n(x.uncached_input_tokens) + n(x.cache_creation_input_tokens) + n(x.cache_read_input_tokens) + n(x.input_tokens)
      rr.output += n(x.output_tokens)
    }
  } catch (e: any) { err = err || e.message }

  const days = Object.values(byDay).filter((d) => d.date !== "?").sort((a, b) => a.date.localeCompare(b.date))
  res.json({
    connected: true, error: err || undefined,
    total_spend: days.reduce((s, d) => s + d.spend, 0),
    total_input: days.reduce((s, d) => s + d.input, 0),
    total_output: days.reduce((s, d) => s + d.output, 0),
    days,
  })
}

// POST /admin/claude-usage — owner pastes their Anthropic Admin Key (secret)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b: any = req.body || {}
  if (b.claude_admin_key !== undefined) {
    const key = String(b.claude_admin_key || "").trim()
    const ex = await pg("app_setting").where({ key: "claude_admin_key" }).first()
    if (ex) await pg("app_setting").where({ key: "claude_admin_key" }).update({ value: key, is_secret: true, updated_at: new Date() })
    else await pg("app_setting").insert({ key: "claude_admin_key", value: key, is_secret: true, updated_at: new Date() })
    invalidateSettings()
  }
  res.json({ ok: true })
}
