import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

const AI_BASE = "https://ai.sirizone.com/ollama/v1"
const AI_KEY  = "sk-f171498a5cb5e5f93461e0ef12d4ba30c3374dafb2d0d01c"

const TEMPLATES: Record<string,string> = {
  terms: `Generate a complete Terms of Service page for Auto to Rental (autotorental.com) — a UAE-based luxury car rental marketplace. Cover: 1) Acceptance of Terms 2) Use of Platform 3) Rental Company Obligations 4) User Responsibilities 5) Bookings & Payments 6) Cancellations 7) Prohibited Activities 8) Intellectual Property 9) Limitation of Liability 10) Governing Law (UAE). Write in clear professional English. Use HTML with <h2>, <p>, <ul> tags. No markdown. Company: Auto to Rental (autotorental.com), registered in UAE.`,
  privacy: `Generate a complete Privacy Policy for Auto to Rental (autotorental.com) — a UAE-based luxury car rental marketplace that collects user data for booking purposes. Cover: 1) Data We Collect 2) How We Use Data 3) Data Sharing 4) Cookies 5) Data Security 6) User Rights (GDPR compliant) 7) Data Retention 8) Third-party Services 9) Children's Privacy 10) Contact (info@autotorental.com). Professional legal language, HTML format with <h2>, <p>, <ul> tags.`,
  cookies: `Generate a Cookie Policy for Auto to Rental (autotorental.com). Cover: 1) What Are Cookies 2) Types We Use (essential, analytics, marketing) 3) Google Analytics 4) How to Control Cookies 5) Browser Settings 6) Impact of Disabling. HTML format with <h2>, <p>, <ul> tags.`,
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { type } = (req.body || {}) as { type: "terms"|"privacy"|"cookies" }
  if (!TEMPLATES[type]) return res.status(400).json({ message: "type must be terms|privacy|cookies" })

  const r = await fetch(`${AI_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "hermes3:8b", messages: [{ role: "user", content: TEMPLATES[type] }], stream: false, max_tokens: 2500, temperature: 0.4 }),
    signal: AbortSignal.timeout(120000),
  })
  if (!r.ok) return res.status(500).json({ message: "AI error" })
  const d = await r.json()
  let content = d.choices?.[0]?.message?.content || ""
  // Clean up markdown if AI added it
  content = content.replace(/```html\n?/g,"").replace(/```\n?/g,"").trim()
  res.json({ ok: true, content })
}
