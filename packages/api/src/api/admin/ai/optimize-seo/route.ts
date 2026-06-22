import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveAiTask, aiComplete } from "../../../../lib/ai-resolve"

const CLAUDE_MODELS: Record<string, string> = { "claude-haiku": "claude-haiku-4-5", "claude-sonnet": "claude-sonnet-4-5", "claude-opus": "claude-opus-4-5" }
async function loadCfg(req: MedusaRequest) {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const m: Record<string, string> = {}
  try { const rows = await knex("app_setting").whereIn("key", ["ai_provider","claude_api_key","claude_model","openai_api_key","openai_model"]); for (const r of rows) m[r.key] = r.value } catch {}
  const provider = (m.ai_provider || "").toLowerCase()
  return {
    claude_key: m.claude_api_key || "",
    claude_model: CLAUDE_MODELS[provider] || CLAUDE_MODELS[m.claude_model] || m.claude_model || "claude-sonnet-4-5",
    api_key: m.openai_api_key || process.env.OPENAI_API_KEY || "",
    base_url: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: m.openai_model || process.env.OPENAI_MODEL || "gpt-4o-mini",
  }
}
async function callClaude(key: string, model: string, system: string, user: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model, max_tokens: 700, system, messages: [{ role: "user", content: user }] }), signal: AbortSignal.timeout(40000) })
  if (!r.ok) throw new Error("claude " + r.status + " " + (await r.text()).slice(0, 200))
  const j = await r.json()
  return (j.content || []).map((c: any) => c.text || "").join("")
}

const SEO_SYSTEM_PROMPT = `You are an SEO expert for autotorental.com — a UAE + Syria car-rental marketplace (no commission, direct contact with rental companies).

Return STRICT JSON:
{
  "title": "...",
  "description": "...",
  "focus_keyword": "...",
  "rationale": "1-2 sentences"
}

HARD RULES (these are scored — follow exactly or the score fails):
- focus_keyword: 2-4 words, all lowercase (e.g. "lamborghini rental dubai").
- title: MUST be 30-60 characters total, and MUST contain the focus_keyword as an EXACT contiguous phrase (same word order, no extra words inserted between the keyword words). Make EVERY title UNIQUE — never reuse the same structure/wording across pages: vary the verb (Rent / Hire / Lease / Book), the value prop (No Commission / Direct from Owners / AED Daily Rates / Verified Companies / Best Price), and the phrasing so no two brand/car/city pages read alike. The keyword may sit at the start OR be woven in naturally.
- description: MUST be 120-160 characters and MUST contain the focus_keyword once, naturally. End with a value prop (direct contact / no commission / AED prices).
- Do NOT exceed 60 chars in the title. Count characters carefully.
- Use Dubai/UAE/Syria locality when relevant. Never invent specs.`

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const clean = (s: string) => String(s || "").replace(/\s+/g, " ").trim()

// Guarantee the metadata passes the SEO checks (title 30-60 w/ keyword, desc 120-160 w/ keyword).
function enforceSeo(rawTitle: string, rawDesc: string, rawKw: string) {
  // focus keyword: lowercase, max 4 words
  let kw = clean(rawKw).toLowerCase()
  const kwWords = kw.split(" ").filter(Boolean)
  if (kwWords.length > 4) kw = kwWords.slice(0, 4).join(" ")
  const kwTitle = titleCase(kw)
  const has = (str: string) => !!kw && str.toLowerCase().includes(kw)

  // ---- TITLE: contains keyword, 30-60 chars ----
  let title = clean(rawTitle)
  if (kw && !has(title)) title = kwTitle
  if (title.length > 60) {
    const sep = title.lastIndexOf("|", 60)
    if (sep > 28) title = clean(title.slice(0, sep))
    if (title.length > 60) {
      title = title.slice(0, 60)
      const ls = title.lastIndexOf(" ")
      if (ls > 30) title = title.slice(0, ls)
      title = title.replace(/[\s|,\-–—]+$/, "").trim()
    }
    if (kw && !has(title)) title = kwTitle
  }
  if (title.length < 30) {
    for (const pad of [" | No Commission", " | Direct Contact", " | Auto to Rental", " in the UAE"]) {
      if (title.length >= 30) break
      if ((title + pad).length <= 60) title = title + pad
    }
  }

  // ---- DESCRIPTION: contains keyword, 120-160 chars ----
  let desc = clean(rawDesc)
  if (kw && !has(desc)) desc = `${cap(kw)} — ${desc}`
  desc = clean(desc)
  if (desc.length > 160) {
    desc = desc.slice(0, 160)
    const ls = desc.lastIndexOf(" ")
    if (ls > 120) desc = desc.slice(0, ls)
    desc = desc.replace(/[\s,;:\-–—]+$/, "").trim()
  }
  if (desc.length < 120) {
    desc = clean(desc + " Direct contact with verified rental companies — no commission and the best AED prices across the UAE and Syria.")
    if (desc.length > 160) {
      desc = desc.slice(0, 160)
      const ls = desc.lastIndexOf(" ")
      if (ls > 120) desc = desc.slice(0, ls)
      desc = desc.replace(/[\s,;:\-–—]+$/, "").trim()
    }
  }

  return { title, description: desc, focus_keyword: kw }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const ai = await resolveAiTask(pg, "seo")
  if (ai.provider !== "local" && !ai.key) return res.status(503).json({ message: "AI not configured for SEO — pick an engine in AI Control Center / add its key in AI Settings." })

  const b = req.body as any
  const { path, page_type, current_title, current_description, context } = b
  if (!path) return res.status(400).json({ message: "path required" })

  const userPrompt = [
    `Page URL: https://autotorental.com${path}`,
    page_type && `Page type: ${page_type}`,
    current_title && `Current title (context, may rewrite): ${current_title}`,
    current_description && `Current description (context, may rewrite): ${current_description}`,
    context && `Page context: ${context}`,
    "",
    "Generate optimal SEO metadata. Remember: title 30-60 chars with the focus keyword at the start; description 120-160 chars containing the focus keyword.",
  ].filter(Boolean).join("\n")

  try {
    const content = await aiComplete(ai, SEO_SYSTEM_PROMPT, userPrompt, { json: true, maxTokens: 700, temperature: 0.5 })
    const mm = content.match(/\{[\s\S]*\}/)
    const out = JSON.parse(mm ? mm[0] : content)
    // Post-process to GUARANTEE the metadata passes the SEO score checks.
    const fixed = enforceSeo(out.title || "", out.description || "", out.focus_keyword || "")
    res.json({ ...fixed, rationale: out.rationale || "" })
  } catch (e: any) {
    res.status(500).json({ message: "optimize failed", error: e.message })
  }
}
