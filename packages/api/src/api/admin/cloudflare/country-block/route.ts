import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { cfCall, cfContext } from "../../../../lib/cloudflare"

// Country-level traffic blocking via Cloudflare IP Access Rules (target=country).
// These apply at Cloudflare's edge to the whole zone, instantly.
//   GET    -> list blocked/challenged countries (+ the admin's own country, for a lockout warning)
//   POST   -> { country, mode }  add a rule   (mode: block | managed_challenge | challenge | js_challenge)
//   DELETE -> { id }             remove a rule

const MODES = ["block", "managed_challenge", "challenge", "js_challenge"]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const yourCountry = String(req.headers["cf-ipcountry"] || "").toUpperCase().slice(0, 2)
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const rules = await cfCall(
      token,
      `/zones/${zoneId}/firewall/access_rules/rules?configuration.target=country&per_page=100`
    )
    const blocked = (rules || [])
      .filter((r: any) => r?.configuration?.target === "country")
      .map((r: any) => ({
        id: r.id,
        country: String(r.configuration.value || "").toUpperCase(),
        mode: r.mode,
        notes: r.notes || "",
        created_on: r.created_on,
      }))
    res.json({ ok: true, blocked, zone_id: zoneId, your_country: yourCountry })
  } catch (e: any) {
    if (e?.code === "NO_TOKEN") return res.json({ ok: false, no_token: true, your_country: yourCountry })
    res.status(500).json({ ok: false, message: e?.message || "Cloudflare error" })
  }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = (req.body || {}) as { country?: string; mode?: string; notes?: string }
  const country = String(b.country || "").trim().toUpperCase()
  const mode = MODES.includes(String(b.mode)) ? String(b.mode) : "block"
  if (!/^[A-Z]{2}$/.test(country)) {
    return res.status(400).json({ ok: false, message: "A valid 2-letter country code is required" })
  }
  try {
    const { token, zoneId } = await cfContext(req.scope)
    const result = await cfCall(token, `/zones/${zoneId}/firewall/access_rules/rules`, "POST", {
      mode,
      configuration: { target: "country", value: country },
      notes: (b.notes ? String(b.notes).slice(0, 100) : "") || "Added from Auto to Rental dashboard",
    })
    res.json({ ok: true, rule: { id: result.id, country: String(result.configuration.value).toUpperCase(), mode: result.mode } })
  } catch (e: any) {
    if (e?.code === "NO_TOKEN") return res.json({ ok: false, no_token: true })
    // Cloudflare returns a clear "already exists" message we surface as-is.
    res.status(500).json({ ok: false, message: e?.message || "Cloudflare error" })
  }
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = (req.body || {}) as { id?: string }
  const id = String(b.id || "").trim()
  if (!id) return res.status(400).json({ ok: false, message: "rule id required" })
  try {
    const { token, zoneId } = await cfContext(req.scope)
    await cfCall(token, `/zones/${zoneId}/firewall/access_rules/rules/${id}`, "DELETE")
    res.json({ ok: true, deleted: id })
  } catch (e: any) {
    res.status(500).json({ ok: false, message: e?.message || "Cloudflare error" })
  }
}
