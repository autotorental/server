import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// POST /store/assistant — public "Auto to Rental AI" assistant (real LLM).
// Answers ANY question naturally like ChatGPT, but stays anchored to the
// Auto to Rental car-rental marketplace business. Used by the public
// profit-study chat (and optionally the storefront widget).

type Msg = { role: "user" | "assistant"; content: string }

const SYS = `You are "Auto to Rental AI", the official assistant on the Auto to Rental website — an international, multi-vendor CAR-RENTAL MARKETPLACE.

HOW YOU TALK:
- Answer ANY question naturally, warmly and intelligently, like a sharp human expert. Never robotic, never canned.
- ALWAYS reply in the SAME language the user writes in (Arabic, English, Thai, French, ...) and match their tone. Keep it concise: usually 2-5 short sentences.

STAY ON MISSION:
- You represent ONE business: Auto to Rental. Keep every conversation centered on it — the platform, car rental, investing in it, or using it.
- If the user asks something personal or off-topic ("how are you", a general question), reply briefly and kindly like a real assistant, then smoothly steer back to how you can help with Auto to Rental. NEVER refuse, never say you cannot help, never start an unrelated discussion.

THE BUSINESS (be accurate, never invent numbers):
- Customers browse cars, then call / WhatsApp / in-app call and book DIRECTLY with the rental company.
- 0% booking commission — the platform takes NO cut of bookings (rivals take 15-25%). This is the core edge that pulls rental companies in.
- Revenue = rental-company subscriptions: Basic 99 AED/mo and Plus 150 AED/mo (Plus adds AI tools), paid via Mollie (card / Klarna / PayPal), plus optional paid "featured listing" ads. The platform takes nothing from bookings.
- Reach: 7 languages, 13 currencies, iOS + Android apps, a full website, plus vendor & admin dashboards.
- Tech: Medusa v2 + Next.js + React Native + Mollie payments + LiveKit (direct calls) + AI + Cloudflare.
- Market: car rental is a >\$100B global market; thousands of rental companies still run on WhatsApp and phone calls with no unified platform — the gap Auto to Rental fills.
- Investor angle: recurring subscription revenue, very high margin (AI cost near-zero), the 0%-commission moat, and international scale. Funding amount & equity are open by stage — invite serious investors to contact the team.
- Rental-company angle: list your company in minutes (sign up, upload trade license, add cars or auto-fill by VIN), go live, and customers contact you directly — you keep 100% of booking revenue.

If you do not know a specific fact or number, say so honestly and suggest contacting the Auto to Rental team. Be helpful, confident and friendly.`

function modeLine(mode: string): string {
  if (mode === "client" || mode === "company")
    return "The person you are talking to is a RENTAL COMPANY (a potential vendor). Focus on how to list and use the platform, pricing, and how customers reach them."
  return "The person you are talking to is a potential INVESTOR. Focus on the market, the business model, returns, and the competitive moat."
}

// ---- simple in-memory per-IP rate limit ----
const HITS = new Map<string, number[]>()
const WINDOW = 5 * 60_000
const MAX_IN_WINDOW = 25
function limited(ip: string): boolean {
  const now = Date.now()
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW)
  arr.push(now)
  HITS.set(ip, arr)
  if (HITS.size > 5000) {
    for (const [k, v] of HITS) { if (!v.length || now - v[v.length - 1] > WINDOW) HITS.delete(k) }
  }
  return arr.length > MAX_IN_WINDOW
}

async function getCfg(pg: any): Promise<Record<string, string>> {
  const keys = ["public_chat_provider", "public_chat_model", "openai_api_key", "openai_model", "claude_api_key", "ollama_cloud_api_key", "ollama_model"]
  const rows = await pg("app_setting").whereIn("key", keys)
  const m: Record<string, string> = {}
  rows.forEach((r: any) => { if (r && r.value != null) m[r.key] = String(r.value) })
  return m
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const ip = ((req.headers["x-forwarded-for"] as string) || "").split(",")[0].trim()
    || (req.socket as any)?.remoteAddress || "unknown"
  if (limited(ip)) return res.status(429).json({ error: "rate_limited", reply: "" })

  const body: any = req.body || {}
  const mode = String(body.mode || "investor")
  let history: Msg[] = Array.isArray(body.messages) ? body.messages : []
  history = history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-8)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 1500) }))
  if (!history.length || history[history.length - 1].role !== "user")
    return res.json({ reply: "" })

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let cfg: Record<string, string> = {}
  try { cfg = await getCfg(pg) } catch {}

  let provider = (cfg.public_chat_provider || "").trim()
  if (!provider) {
    if ((cfg.openai_api_key || "").length > 20) provider = "openai"
    else if ((cfg.claude_api_key || "").length > 20) provider = "claude"
    else provider = "ollama"
  }

  const sys = SYS + "\n\n" + modeLine(mode)
  try {
    let reply = ""
    if (provider === "claude") {
      const model = cfg.public_chat_model || "claude-haiku-4-5-20251001"
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": cfg.claude_api_key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 600, system: sys, messages: history }),
        signal: AbortSignal.timeout(30000),
      })
      const j: any = await r.json()
      reply = j?.content?.[0]?.text || ""
    } else {
      let base = "http://localhost:11434/v1", key = "ollama", model = cfg.public_chat_model || cfg.ollama_model || "qwen2.5:3b", to = 90000
      if (provider === "openai") { base = "https://api.openai.com/v1"; key = cfg.openai_api_key; model = cfg.public_chat_model || cfg.openai_model || "gpt-4o-mini"; to = 30000 }
      else if (provider === "ollama_cloud") { base = "https://ollama.com/v1"; key = cfg.ollama_cloud_api_key || ""; model = cfg.public_chat_model || cfg.ollama_model || "gpt-oss:120b"; to = 60000 }
      const r = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", "authorization": `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: 600, temperature: 0.5, messages: [{ role: "system", content: sys }, ...history] }),
        signal: AbortSignal.timeout(to),
      })
      const j: any = await r.json()
      reply = j?.choices?.[0]?.message?.content || ""
    }
    reply = (reply || "").trim()
    if (!reply) return res.status(502).json({ error: "empty", reply: "" })
    return res.json({ reply, provider })
  } catch (e: any) {
    return res.status(502).json({ error: String(e?.message || e), reply: "" })
  }
}
