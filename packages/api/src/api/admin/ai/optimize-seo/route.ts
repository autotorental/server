import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

async function loadCfg(req: MedusaRequest) {
  const knex: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const row = await knex("ai_setting").where({ id: "default" }).first().catch(() => null)
  return {
    api_key: row?.api_key || process.env.OPENAI_API_KEY || "",
    base_url: row?.base_url || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: row?.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
  }
}

const SEO_SYSTEM_PROMPT = `You are an SEO expert specializing in Middle East / UAE car rental.

Given a page on a car rental marketplace (autotorental.com — UAE + Syria, no commission, direct contact with rental companies), generate optimal SEO metadata.

Return STRICT JSON with these exact fields:
{
  "title": "SEO title, 50-60 characters, includes primary keyword, click-worthy",
  "description": "Meta description, 140-160 characters, includes primary keyword, ends with a soft CTA or value prop",
  "focus_keyword": "The single phrase this page should rank for (2-4 words, all lowercase)",
  "rationale": "1-2 sentence explanation of your choices"
}

Rules:
- Title must include the focus keyword
- Description must include the focus keyword once naturally
- Use UAE/Dubai/Syria locality when relevant
- Mention AED prices, "direct contact", "no commission" where it fits
- For Arabic-named cities, use English transliteration
- Never invent specs or features not mentioned in the page context`

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const cfg = await loadCfg(req)
  if (!cfg.api_key) return res.status(503).json({ message: "AI not configured. Go to AI Settings to add an API key." })

  const b = req.body as any
  const { path, page_type, current_title, current_description, context } = b
  if (!path) return res.status(400).json({ message: "path required" })

  const userPrompt = [
    `Page URL: https://autotorental.com${path}`,
    page_type && `Page type: ${page_type}`,
    current_title && `Current title (for context, may need rewriting): ${current_title}`,
    current_description && `Current description (for context, may need rewriting): ${current_description}`,
    context && `Page context: ${context}`,
    "",
    "Generate optimal SEO metadata for this page.",
  ].filter(Boolean).join("\n")

  try {
    const url = `${cfg.base_url.replace(/\/$/, "")}/chat/completions`
    const r = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SEO_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    })
    if (!r.ok) {
      const t = await r.text()
      return res.status(502).json({ message: "AI provider failed", detail: t.slice(0, 400) })
    }
    const j = await r.json()
    const content = j.choices?.[0]?.message?.content || "{}"
    const out = JSON.parse(content)
    res.json({
      title: out.title || "",
      description: out.description || "",
      focus_keyword: out.focus_keyword || "",
      rationale: out.rationale || "",
    })
  } catch (e: any) {
    res.status(500).json({ message: "optimize failed", error: e.message })
  }
}
