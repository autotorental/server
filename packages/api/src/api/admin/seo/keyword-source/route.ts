// GET/POST /admin/seo/keyword-source — choose the keyword-volume provider
// (DataForSEO = installed, or SEMrush) + store the SEMrush key. The token is
// never returned in plaintext.
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const mask = (t?: string) => (!t ? "" : (t.length <= 6 ? "••••••" : `${t.slice(0, 3)}••••••${t.slice(-3)}`))

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cfg = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  res.json({
    provider: String((cfg && cfg.keyword_provider) || "dataforseo").toLowerCase(),
    semrush_set: !!(cfg && cfg.semrush_api_key),
    semrush_masked: mask(cfg && cfg.semrush_api_key),
    dataforseo_set: !!(cfg && cfg.dataforseo_login && cfg.dataforseo_password),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as any
  const cfg = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)

  if (body.action === "test") {
    const provider = String(body.provider || (cfg && cfg.keyword_provider) || "dataforseo").toLowerCase()
    if (provider === "semrush") {
      const key = (typeof body.semrush_api_key === "string" && body.semrush_api_key.trim()) || (cfg && cfg.semrush_api_key)
      if (!key) return res.json({ ok: false, message: "No SEMrush API key set." })
      try {
        const r = await fetch(`https://api.semrush.com/?type=phrase_this&key=${encodeURIComponent(key)}&phrase=car%20rental%20dubai&database=ae&export_columns=Ph,Nq`, { signal: AbortSignal.timeout(15000) })
        const t = (await r.text()).trim()
        if (!r.ok || /^ERROR/i.test(t)) return res.json({ ok: false, message: t.slice(0, 150) })
        const v = (t.split("\n")[1] || "").split(";")
        return res.json({ ok: true, message: `Connected ✓ — "car rental dubai" ≈ ${v[1] || "?"} searches/mo (UAE)` })
      } catch (e: any) { return res.json({ ok: false, message: String(e?.message || e).slice(0, 120) }) }
    }
    if (!(cfg && cfg.dataforseo_login && cfg.dataforseo_password)) return res.json({ ok: false, message: "DataForSEO credentials are not set (AI Settings)." })
    return res.json({ ok: true, message: "DataForSEO credentials are set and ready." })
  }

  const upd: any = {}
  if (typeof body.provider === "string") upd.keyword_provider = (body.provider === "semrush" ? "semrush" : "dataforseo")
  if (typeof body.semrush_api_key === "string" && body.semrush_api_key.trim()) upd.semrush_api_key = body.semrush_api_key.trim()
  if (!Object.keys(upd).length) return res.status(400).json({ message: "Nothing to save" })
  upd.updated_at = new Date()
  if (cfg) await knex("ai_setting").where({ id: "default" }).update(upd)
  else await knex("ai_setting").insert({ id: "default", ...upd })
  const after = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  res.json({ ok: true, provider: String((after && after.keyword_provider) || "dataforseo"), semrush_set: !!(after && after.semrush_api_key), semrush_masked: mask(after && after.semrush_api_key) })
}
