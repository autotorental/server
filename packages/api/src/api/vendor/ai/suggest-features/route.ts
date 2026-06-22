import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { CATALOG_MODULE } from "../../../../modules/catalog"

// Uses the SAME AI config as the rest of the app (app_setting: ai_provider +
// claude/openai/openrouter/huggingface keys) instead of the old standalone
// ai_setting row, so vendor feature auto-fill works with the live provider.
const SYSTEM_PROMPT = `You help pre-fill a car rental listing by selecting which features a specific car most likely has as standard/common equipment.

You are given the car details and a list of AVAILABLE features (id :: name). Return JSON: {"feature_ids": ["..."]} containing ONLY the ids of features this exact car/trim very likely comes with.

Rules:
- Choose from the provided ids ONLY. Never invent ids.
- Be realistic for the brand/model/year/trim tier: a base economy car should NOT get premium features (ventilated seats, massage, air suspension); a luxury/SUV/sports car can.
- Older cars (pre-2010) should not get modern tech (CarPlay, 360 camera, wireless charging).
- When unsure, leave it out. Quality over quantity.
- Reply with ONLY the JSON object, no prose.`

const CLAUDE_MODELS: Record<string, string> = {
  "claude-haiku": "claude-haiku-4-5",
  "claude-sonnet": "claude-sonnet-4-5",
  "claude-opus": "claude-opus-4-5",
}
const OAI: Record<string, { base: string; model: string; extra?: Record<string, string> }> = {
  openai: { base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  openrouter: { base: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini", extra: { "HTTP-Referer": "https://autotorental.com", "X-Title": "AutoToRental" } },
  huggingface: { base: "https://router.huggingface.co/v1", model: "meta-llama/Llama-3.3-70B-Instruct" },
}

async function loadCfg(pg: any): Promise<Record<string, string>> {
  const keys = ["ai_provider", "claude_api_key", "claude_model", "openai_api_key", "openai_model", "openrouter_api_key", "openrouter_model", "huggingface_api_key", "huggingface_model"]
  const out: Record<string, string> = {}
  try {
    const rows = await pg("app_setting").whereIn("key", keys)
    for (const r of rows) out[r.key] = r.value
  } catch { /* ignore */ }
  return out
}

async function callClaude(key: string, model: string, system: string, user: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 4096, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(60000),
  })
  if (!r.ok) throw new Error("claude " + r.status + " " + (await r.text()).slice(0, 200))
  const j = await r.json()
  return (j.content || []).map((c: any) => c.text || "").join("")
}

async function callOAI(base: string, key: string, model: string, system: string, user: string, extra?: Record<string, string>): Promise<string> {
  const r = await fetch(base.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json", ...(extra || {}) },
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    signal: AbortSignal.timeout(60000),
  })
  if (!r.ok) throw new Error("oai " + r.status + " " + (await r.text()).slice(0, 200))
  const j = await r.json()
  return j.choices?.[0]?.message?.content || "{}"
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const cfg = await loadCfg(pg)

  const b = (req.body as any) || {}
  const { brand, model, year, body_type, transmission, fuel_type, seats } = b
  if (!brand && !model) return res.status(400).json({ message: "brand or model required" })

  const svc: any = req.scope.resolve(CATALOG_MODULE)
  const features = await svc.listFeatures({})
  if (!features?.length) return res.json({ feature_ids: [] })
  const validIds = new Set(features.map((f: any) => f.id))
  const featureLines = features.map((f: any) => f.id + " :: " + f.name + (f.category ? " (" + f.category + ")" : "")).join("\n")

  const carName = [year, brand, model].filter(Boolean).join(" ")
  const userPrompt = [
    "Car: " + (carName || "(unknown)"),
    body_type ? "Body type: " + body_type : undefined,
    transmission ? "Transmission: " + transmission : undefined,
    fuel_type ? "Fuel: " + fuel_type : undefined,
    seats ? "Seats: " + seats : undefined,
    "",
    "AVAILABLE FEATURES (id :: name):",
    featureLines,
  ].filter((x) => x !== undefined).join("\n")

  const provider = (cfg.ai_provider || "").toLowerCase()
  const pref =
    provider.startsWith("claude") || provider === "anthropic" ? "claude" :
    provider.startsWith("openrouter") ? "openrouter" :
    provider.startsWith("openai") || provider === "gpt" ? "openai" :
    provider.startsWith("hermes") || provider.startsWith("hugging") || provider.startsWith("hf") ? "huggingface" : ""
  const order = [...new Set([pref, "claude", "openai", "openrouter", "huggingface"].filter(Boolean))]

  let content = ""
  let detail = ""
  for (const p of order) {
    try {
      if (p === "claude" && cfg.claude_api_key) {
        const cm = CLAUDE_MODELS[provider] || CLAUDE_MODELS[cfg.claude_model] || cfg.claude_model || "claude-sonnet-4-5"
        content = await callClaude(cfg.claude_api_key, cm, SYSTEM_PROMPT, userPrompt); break
      }
      if (p === "openai" && cfg.openai_api_key) {
        content = await callOAI(OAI.openai.base, cfg.openai_api_key, cfg.openai_model || OAI.openai.model, SYSTEM_PROMPT, userPrompt); break
      }
      if (p === "openrouter" && cfg.openrouter_api_key) {
        content = await callOAI(OAI.openrouter.base, cfg.openrouter_api_key, cfg.openrouter_model || OAI.openrouter.model, SYSTEM_PROMPT, userPrompt, OAI.openrouter.extra); break
      }
      if (p === "huggingface" && cfg.huggingface_api_key) {
        content = await callOAI(OAI.huggingface.base, cfg.huggingface_api_key, cfg.huggingface_model || OAI.huggingface.model, SYSTEM_PROMPT, userPrompt); break
      }
    } catch (e: any) {
      detail = (e?.message || "error")
    }
  }

  if (!content) {
    return res.status(503).json({ message: "AI not configured or providers failed", feature_ids: [], detail })
  }

  let ids: string[] = []
  try {
    const cleaned = content.replace(/```json/gi,"").replace(/```/g,"").trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match ? match[0] : cleaned)
    ids = Array.isArray(parsed?.feature_ids) ? parsed.feature_ids : []
  } catch { ids = [] }
  const feature_ids = ids.filter((id) => validIds.has(id))
  return res.json({ feature_ids })
}
