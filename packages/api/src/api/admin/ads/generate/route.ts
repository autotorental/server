import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveAiTask, aiComplete } from "../../../../lib/ai-resolve"

const SITE = "https://autotorental.com"
const slug = (s: string) => String(s || "campaign").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40)
const clampInt = (v: any, lo: number, hi: number, dflt: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt }

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b: any = req.body || {}
  const goal = b.goal || "whatsapp"
  const platform = b.platform || "meta"
  const countries: string[] = Array.isArray(b.countries) && b.countries.length ? b.countries : ["United Arab Emirates"]
  const category = b.category || "", company = b.company || "", companyName = b.company_name || ""
  const budget = Number(b.budget) || 50, days = Number(b.days) || 7
  const lang = b.language === "en" ? "English" : "Arabic"
  const tone = String(b.tone || "premium")
  const offer = String(b.offer || "").slice(0, 160)
  const model = String(b.model || "").slice(0, 80)
  const variations = clampInt(b.variations, 3, 6, 3)

  const incGoogle = platform === "google" || platform === "all" || platform === "both"
  const incMeta = platform === "meta" || platform === "all" || platform === "both"
  const incTikTok = platform === "tiktok" || platform === "all"
  const incSnap = platform === "snapchat" || platform === "all"

  const claudeRow = await pg("app_setting").where({ key: "claude_api_key" }).first().catch(() => null)
  const claudeKey = claudeRow?.value || ""
  const cfg: any = (claudeKey && claudeKey.length > 20)
    ? { enabled: true, provider: "claude", base: "https://api.anthropic.com", key: claudeKey, model: "claude-haiku-4-5-20251001", isClaude: true }
    : await resolveAiTask(pg, "ads")
  if (!cfg.enabled || !cfg.key) return res.status(400).json({ message: "AI not configured" })

  const goalText: Record<string, string> = { whatsapp: "WhatsApp message leads", call: "phone calls", view: "car detail page views", traffic: "website visits", subscription: "vendor subscriptions" }
  const platParts = [incMeta && "Meta (Facebook + Instagram)", incGoogle && "Google Ads (Search + PMax)", incTikTok && "TikTok", incSnap && "Snapchat"].filter(Boolean)
  const toneText: Record<string, string> = {
    premium: "premium & aspirational", luxury: "ultra-luxury, exclusive, high-status",
    urgent: "urgent, scarcity-driven, FOMO", friendly: "warm, friendly, conversational",
    professional: "professional, trustworthy, corporate", playful: "playful, bold, scroll-stopping",
  }

  const ctx = [
    `Business: Auto to Rental — UAE luxury & everyday car-rental marketplace (autotorental.com).`,
    `Primary goal: maximize ${goalText[goal] || "leads"}.`,
    `Ad platforms: ${platParts.join(", ") || "Meta"}.`,
    `Target countries: ${countries.join(", ")}.`,
    category ? `Car category to feature: ${category}.` : "",
    model ? `Specific model/vehicle to spotlight: ${model}.` : "",
    companyName ? `Rental company to feature: ${companyName}.` : "",
    offer ? `Promotion/offer to push hard: "${offer}".` : "",
    `Tone: ${toneText[tone] || tone}.`,
    `Daily budget: AED ${budget} for ${days} days (total AED ${budget * days}).`,
  ].filter(Boolean).join(" ")

  const system = `You are a world-class performance media buyer who has profitably spent millions on Meta, Google, TikTok & Snapchat ads for car rental in the Gulf (UAE, KSA, Qatar). Write ALL ad copy and human-readable text in ${lang} (JSON keys stay English). Be specific to the Gulf market, premium, with strong hooks and a clear CTA toward ${goalText[goal] || "leads"}; tone = ${toneText[tone] || tone}.${offer ? ` Feature the offer "${offer}" prominently.` : ""}

Return STRICT JSON ONLY (no markdown, no code fences) with EXACTLY these keys:
{
 "campaign_name": string,
 "objective": string,
 "strategy": string (2-3 sentences: the winning angle, the USP, and why it converts),
 "target_summary": string (one line: who we target & why),
 "audience": { "age": "e.g. 25-55", "gender": string, "interests": [6 specific interests/behaviors], "behaviors": [3 purchase/device behaviors], "exclusions": [3 audiences to exclude], "lookalike": string (1 lookalike/custom-audience idea), "placements": [array] },
 "ad_variations": [EXACTLY ${variations} objects, each { "headline": string (<=40 chars), "primary_text": string (<=200 chars), "description": string (<=60 chars), "cta": string (e.g. "WhatsApp Us"/"Book Now"/"Call Now"), "hook": string (the emotional angle, 3-6 words) }],
 "google": ${incGoogle ? `{ "headlines": [10 distinct strings each <=30 chars], "descriptions": [4 strings each <=90 chars], "keywords": [10 objects { "kw": string, "match": "phrase"|"exact"|"broad" }], "negative_keywords": [6 strings], "sitelinks": [4 objects { "text": string (<=25 chars), "desc": string (<=35 chars) }], "callouts": [4 strings each <=25 chars] }` : "null"},
 "social": { "hashtags": [8 relevant hashtags], "hooks": [3 scroll-stopping opening lines for Reels/TikTok] },
 "budget_plan": { "summary": string, "daily_split": string (how to split AED ${budget}/day across the chosen platforms), "bid_strategy": string, "est_cpc": string (realistic AED range), "est_leads_per_day": string, "est_reach": string },
 "schedule": { "best_days": [array of best weekdays], "best_hours": string (best hours in Gulf time) },
 "ab_test": string (the single most important thing to A/B test first),
 "creative_brief": string (the exact hero image/video to use),
 "creative_ideas": [2 specific image or video concepts],
 "tips": [4 sharp, specific, non-generic optimization tips]
}
${incGoogle ? "" : 'Set "google" to null. '}Be concise: short phrases, no filler words. Every array must have the exact count requested. Keep within character limits.`

  let pkg: any
  try {
    const raw = await aiComplete(cfg, system, ctx, { json: true, maxTokens: 8000, temperature: 0.8, timeoutMs: 110000 })
    const s2 = String(raw).replace(/```json|```/g, "").trim()
    const i = s2.indexOf("{"), j = s2.lastIndexOf("}")
    pkg = JSON.parse(i >= 0 && j > i ? s2.slice(i, j + 1) : s2)
  } catch (e: any) {
    return res.status(500).json({ message: "AI failed: " + String(e?.message || e).slice(0, 180) })
  }

  const name = slug(pkg.campaign_name || goal + "-" + (category || "cars"))
  let path = "/cars"; const qs: string[] = []
  if (category) qs.push("body_type=" + encodeURIComponent(category))
  if (company) qs.push("seller=" + encodeURIComponent(company))
  if (qs.length) path += "?" + qs.join("&")
  const src = incGoogle && !incMeta ? "google" : incTikTok && !incMeta ? "tiktok" : incSnap && !incMeta ? "snapchat" : "facebook"
  const utm = (path.includes("?") ? "&" : "?") + `utm_source=${src}&utm_medium=cpc&utm_campaign=${name}`
  const landing_url = SITE + path + utm
  const conv = goal === "view" ? "ViewContent" : goal === "traffic" ? "PageView" : goal === "subscription" ? "Purchase" : "Lead"

  res.json({
    ...pkg, provider: cfg.provider, landing_url, conversion_event: conv,
    platforms: platParts,
    tracking_note: `Use this exact landing URL in your ad. WhatsApp/Call clicks on the site auto-fire "${conv}" to Meta Pixel + Conversions API + Google Ads (deduped).`,
  })
}
