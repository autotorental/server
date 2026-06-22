import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSetting } from "../../../../lib/settings"
import { resolveAiTask, aiComplete } from "../../../../lib/ai-resolve"

const MIN_WORDS = 1500
const TARGET_WORDS = 1700

function stripCodeFence(s: string): string {
  return s.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim()
}

function extractJson(text: string): any {
  const cleaned = stripCodeFence(text || "")
  try { return JSON.parse(cleaned) } catch {}
  const start = cleaned.indexOf("{")
  const end   = cleaned.lastIndexOf("}")
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch {}
  }
  return null
}

// Same Claude call our AI Agent uses. Proven working.
async function callClaude(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.6,
    }),
    signal: AbortSignal.timeout(150_000),
  })
  if (!r.ok) {
    const t = await r.text().catch(() => "")
    throw new Error(`Claude ${r.status}: ${t.slice(0, 250)}`)
  }
  const d = await r.json()
  return d?.content?.[0]?.text || ""
}

// Fallback: Hermes3 via sirizone (always reachable, never fails)
async function callHermes(systemPrompt: string, userPrompt: string): Promise<string> {
  const r = await fetch("https://ai.sirizone.com/ollama/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": "Bearer sk-f171498a5cb5e5f93461e0ef12d4ba30c3374dafb2d0d01c", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "hermes3:8b",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.6, max_tokens: 4000, stream: false, keep_alive: "30m",
    }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!r.ok) throw new Error(`Hermes ${r.status}`)
  const d = await r.json()
  return d?.choices?.[0]?.message?.content || ""
}

const SYSTEM_PROMPT = `You are a senior automotive content strategist for Auto to Rental — a luxury car rental marketplace in Dubai, UAE (autotorental.com).

Write SEO-optimized blog posts of ${MIN_WORDS}-${TARGET_WORDS} words. Use clean HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>. NO <h1> (the post title is the H1). NO markdown.

Style:
- Direct, factual, helpful — like a senior writer at AutoBild or Top Gear
- UAE-specific knowledge (Salik tolls, RTA rules, Dubai/Abu Dhabi geography, insurance norms)
- Cite real prices in AED with daily/weekly/monthly options
- Include 2-3 internal links to /cars, /cars/brand/{brand}, /companies, /list-your-car where relevant
- Add an FAQ section at the end with 4-6 questions

Output STRICT JSON only — no markdown fences, no preamble:
{
  "title": "Refined title (max 70 chars)",
  "slug": "url-slug-here",
  "excerpt": "1-2 sentence summary for the blog list (max 200 chars)",
  "body": "Full HTML article ${MIN_WORDS}+ words",
  "meta_title": "SEO title (50-60 chars)",
  "meta_description": "SEO description (140-160 chars, compelling, includes focus keyword)",
  "focus_keyword": "primary keyword"
}`

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { topic, keywords = [] } = (req.body || {}) as { topic: string; keywords?: string[] }
  if (!topic?.trim()) return res.status(400).json({ message: "topic required" })

  const pgB: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const ai = await resolveAiTask(pgB, "blog")

  const userPrompt = [
    `Blog topic: "${topic}"`,
    keywords.length ? `Focus keywords: ${keywords.join(", ")}` : "",
    "Write the full post now. Output ONLY the JSON object — no other text.",
  ].filter(Boolean).join("\n")

  let raw = ""
  let usedProvider = ""
  const errors: string[] = []

  // 1. Use the AI assigned to "blog" in the AI Control Center
  if (ai.enabled && ai.key) {
    try {
      raw = await aiComplete(ai, SYSTEM_PROMPT, userPrompt, { maxTokens: 8000, timeoutMs: 150000, temperature: 0.6 })
      usedProvider = ai.provider + ":" + ai.model
    } catch (e: any) {
      errors.push(`${ai.provider}: ${e?.message?.slice(0, 150) || "failed"}`)
    }
  } else {
    errors.push("No AI engine assigned/configured for blog")
  }

  // 2. Fallback to Hermes3 (always available)
  if (!raw) {
    try {
      raw = await callHermes(SYSTEM_PROMPT, userPrompt)
      usedProvider = "hermes3-fallback"
    } catch (e: any) {
      errors.push(`Hermes3: ${e?.message?.slice(0, 100) || "failed"}`)
    }
  }

  if (!raw) {
    return res.status(500).json({
      message: "All AI providers failed",
      error: errors.join(" | "),
      hint: "Check /dashboard/ai-settings — make sure Claude API key is set and valid.",
    })
  }

  // Parse the JSON
  const parsed = extractJson(raw)
  if (!parsed || !parsed.body) {
    return res.status(500).json({
      message: "AI returned unparseable content",
      error: `Provider ${usedProvider} returned: ${raw.slice(0, 300)}…`,
      hint: "Try again — the AI sometimes returns prose instead of JSON.",
    })
  }

  res.json({
    ok: true,
    provider: usedProvider,
    title:            parsed.title || topic,
    slug:             parsed.slug,
    excerpt:          parsed.excerpt || "",
    body:             parsed.body,
    meta_title:       parsed.meta_title || parsed.title || topic,
    meta_description: parsed.meta_description || parsed.excerpt || "",
    focus_keyword:    parsed.focus_keyword || (keywords[0] || ""),
  })
}
