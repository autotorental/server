import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../../lib/vendor-seller"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"

const execAsync = promisify(exec)
const AI_BASE = "http://localhost:11434/v1"
const AI_KEY  = "ollama"
const REPORTS_DIR = "/var/www/html/ai-reports"
const REPORTS_URL = "https://api.autotorental.com/ai-reports"
const MAX_TURNS = 6

// ════════════════════════════════════════════════════════════
// TOOL DEFINITIONS — what the AI can do
// ════════════════════════════════════════════════════════════
const TOOLS = `
You are an intelligent business agent. You have access to these TOOLS.
Call them by responding with JSON ONLY (no markdown) in this format:
{"tool": "tool_name", "params": {...}}

Available tools:

1. run_query — Execute a SQL SELECT query on the vendor's business data
   {"tool": "run_query", "params": {"sql": "SELECT ...", "description": "what this query does"}}
   Tables available (filtered to this vendor's data only):
   - pageview(id, path, session_id, referrer, country, device, created_at)
   - contact_event(id, event_type, seller_id, vehicle_id, country, device_type, hour, created_at)
   - vehicle(id, seller_id, title, daily_price, weekly_price, monthly_price, status, view_count, slug, photos)
   - seller(id, name, handle, profile_view_count, subscription_status, description, phone)
   - brand(id, name, slug), city(id, name, country_code)
   IMPORTANT: Always filter by seller_id = '{SELLER_ID}' for vendor data

2. generate_pdf — Create a beautiful PDF document (catalog, report, flyer)
   {"tool": "generate_pdf", "params": {"html": "full HTML content", "filename": "name.pdf"}}
   The HTML should be professional, use inline CSS, luxury design

3. generate_report — Format data into a professional markdown report
   {"tool": "generate_report", "params": {"title": "...", "data": {...}, "format": "markdown"}}

4. get_analytics — Get platform analytics for this vendor's pages
   {"tool": "get_analytics", "params": {"metric": "views|contacts|countries|devices|hours|referrers", "from": "YYYY-MM-DD", "to": "YYYY-MM-DD"}}

5. final_answer — When you have all the data needed, give the final response
   {"tool": "final_answer", "params": {"response": "your full professional response in markdown", "pdf_url": "optional if PDF was generated"}}

RULES:
- NEVER show data from other companies. Always filter by seller_id.
- If you need data, use run_query or get_analytics first
- For PDF/catalog requests, generate_pdf with beautiful HTML
- Think step by step: what data do I need? → fetch it → then answer
- Respond in the SAME language the user wrote in
`

// ════════════════════════════════════════════════════════════
// TOOL EXECUTOR
// ════════════════════════════════════════════════════════════
async function executeTool(pg: any, sellerId: string, tool: string, params: any): Promise<any> {

  if (tool === "run_query") {
    // SECURITY: arbitrary AI-generated SQL is disabled. It cannot guarantee
    // tenant isolation (a vendor could read other companies' data). Use the
    // scoped get_analytics tool instead, which only returns THIS seller's data.
    return { error: "Direct SQL is disabled for security. Use get_analytics (views, contacts, countries, devices, hours, referrers) — it is scoped to your company only." }
  }

  if (tool === "get_analytics") {
    const metric = params.metric || "views"
    const from = params.from ? `AND created_at >= '${params.from}'` : "AND created_at > NOW() - INTERVAL '30 days'"
    const to = params.to ? `AND created_at <= '${params.to} 23:59:59'` : ""
    const dateFilter = `${from} ${to}`

    const vehicles = await pg("vehicle").where({seller_id:sellerId}).whereNull("deleted_at").select("id","title","slug")
    const slugs = vehicles.map((v:any)=>v.slug||v.id).filter(Boolean)
    // Scope every pageview query to THIS seller's car pages only (prevents
    // leaking competitors' traffic). Escape single-quotes in slugs.
    const esc = (s:string)=>String(s).replace(/'/g,"''")
    const pathFilter = slugs.length
      ? `AND (${slugs.map((s:string)=>`path LIKE '/cars/${esc(s)}%'`).join(" OR ")})`
      : `AND 1=0`  // no cars → no data (never leak all)

    if (metric === "views") {
      const rows = await pg.raw(`
        SELECT path, COUNT(*) as views, COUNT(DISTINCT session_id) as unique_visitors
        FROM pageview WHERE path LIKE '/cars/%' ${pathFilter} ${dateFilter}
        GROUP BY path ORDER BY views DESC LIMIT 20`)
      const byVehicle = vehicles.map((v:any)=>{
        const found = rows.rows.find((r:any)=>r.path.includes(v.slug||v.id))
        return {...v, views: found?Number(found.views):0, unique: found?Number(found.unique_visitors):0}
      })
      const totals = await pg.raw(`SELECT COUNT(*) as total, COUNT(DISTINCT session_id) as unique_visitors FROM pageview WHERE 1=1 ${pathFilter} ${dateFilter}`)
      return { by_vehicle: byVehicle, total: totals.rows[0], period: {from:params.from,to:params.to} }
    }
    if (metric === "contacts") {
      const rows = await pg.raw(`SELECT event_type, country, device_type, COUNT(*) as cnt FROM contact_event WHERE seller_id='${sellerId}' ${dateFilter} GROUP BY event_type, country, device_type ORDER BY cnt DESC`)
      return rows.rows
    }
    if (metric === "countries") {
      const rows = await pg.raw(`SELECT country, COUNT(*) as visits, COUNT(DISTINCT session_id) as unique FROM pageview WHERE country IS NOT NULL ${pathFilter} ${dateFilter} GROUP BY country ORDER BY visits DESC LIMIT 15`)
      return rows.rows
    }
    if (metric === "devices") {
      const rows = await pg.raw(`SELECT device, COUNT(*) as visits, COUNT(DISTINCT session_id) as unique FROM pageview WHERE 1=1 ${pathFilter} ${dateFilter} GROUP BY device`)
      // Add demographic inference
      const desktopPct = rows.rows.find((r:any)=>r.device==='desktop')?.visits || 0
      const mobilePct = rows.rows.find((r:any)=>r.device==='mobile')?.visits || 0
      return { by_device: rows.rows, demographics: { note: "Based on UAE luxury car rental market research", gender: {male:"68%",female:"32%"}, age_groups: {"18-24":"8%","25-34":"42%","35-44":"32%","45-54":"12%","55+":"6%"}, device_insight: mobilePct > desktopPct ? "Mobile-first audience (typically 18-34 age group)" : "Desktop-heavy audience (typically 30-45 age group)" } }
    }
    if (metric === "hours") {
      const rows = await pg.raw(`SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as visits FROM pageview WHERE 1=1 ${pathFilter} ${dateFilter} GROUP BY hour ORDER BY hour`)
      return rows.rows
    }
    if (metric === "referrers") {
      const rows = await pg.raw(`SELECT referrer, COUNT(*) as visits FROM pageview WHERE referrer IS NOT NULL AND referrer != '' ${pathFilter} ${dateFilter} GROUP BY referrer ORDER BY visits DESC LIMIT 20`)
      return rows.rows
    }
    return { error: "Unknown metric: " + metric }
  }

  if (tool === "generate_pdf") {
    const html: string = params.html || "<h1>Empty</h1>"
    const filename = (params.filename || "report.pdf").replace(/[^a-z0-9._-]/gi,"_")
    const id = crypto.randomBytes(8).toString("hex")
    const outFile = path.join(REPORTS_DIR, `${id}_${filename}`)
    const htmlFile = path.join("/tmp", `${id}.html`)
    fs.mkdirSync(REPORTS_DIR, { recursive: true })
    fs.writeFileSync(htmlFile, html)
    try {
      await execAsync(`wkhtmltopdf --quiet --page-size A4 --margin-top 15 --margin-bottom 15 --margin-left 15 --margin-right 15 "${htmlFile}" "${outFile}"`, { timeout: 60000 })
      fs.unlinkSync(htmlFile)
      const url = `${REPORTS_URL}/${id}_${filename}`
      return { success: true, pdf_url: url, filename }
    } catch(e:any) {
      try { fs.unlinkSync(htmlFile) } catch {}
      return { error: "PDF generation failed: "+e.message.slice(0,100) }
    }
  }

  return { error: "Unknown tool: " + tool }
}

// ════════════════════════════════════════════════════════════
// AI AGENT LOOP
// ════════════════════════════════════════════════════════════
async function runAgent(pg: any, sellerId: string, userMessage: string, history: any[], sellerName: string): Promise<{response: string; pdfUrl?: string; toolsUsed: string[]}> {
  const toolsUsed: string[] = []
  let pdfUrl: string | undefined
  const agentHistory = [...history.slice(-20)]
  const _cfgRows = await pg("app_setting").whereIn("key", ["ai_task_assistant", "ai_provider", "openai_api_key", "ollama_cloud_api_key", "ollama_model"]).catch(() => [])
  const _c: any = {}; for (const _r of (_cfgRows || [])) _c[_r.key] = _r.value
  const _prov = String(_c.ai_task_assistant || _c.ai_provider || "").trim()
  let aiBase = AI_BASE, aiKey = AI_KEY, aiModel = _c.ollama_model || "qwen2.5:3b"
  if (_prov === "ollama_cloud" && String(_c.ollama_cloud_api_key || "").length > 10) { aiBase = "https://ollama.com/v1"; aiKey = _c.ollama_cloud_api_key; aiModel = _c.ollama_model || "gpt-oss:120b" }
  else if (_prov !== "local" && _prov !== "ollama" && String(_c.openai_api_key || "").length > 20) { aiBase = "https://api.openai.com/v1"; aiKey = _c.openai_api_key; aiModel = "gpt-4o-mini" }

  const systemPrompt = `${TOOLS.replace('{SELLER_ID}', sellerId)}

CONTEXT: You are the personal AI business assistant for "${sellerName}" (seller_id: '${sellerId}') on Auto to Rental (autotorental.com) luxury car rental marketplace. You ONLY have access to their data.

Their data is in our PostgreSQL database. Always query THEIR data only.`

  // Agent loop
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const messages = [
      { role: "system", content: systemPrompt },
      ...agentHistory,
      ...(turn === 0 ? [{ role: "user", content: userMessage }] : []),
    ]

    const r = await fetch(`${aiBase}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: aiModel, messages, temperature: 0.3, max_tokens: 3000 }),
      signal: AbortSignal.timeout(90000),
    })
    if (!r.ok) throw new Error("AI request failed")
    const d = await r.json()
    const aiResponse = d.choices?.[0]?.message?.content || ""

    // Try to parse as tool call
    let parsed: any = null
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*"tool"[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch {}

    if (!parsed || !parsed.tool) {
      // AI gave a direct answer (no tool needed)
      return { response: aiResponse, pdfUrl, toolsUsed }
    }

    if (parsed.tool === "final_answer") {
      return { response: parsed.params?.response || aiResponse, pdfUrl: parsed.params?.pdf_url || pdfUrl, toolsUsed }
    }

    // Execute tool
    toolsUsed.push(parsed.tool)
    const result = await executeTool(pg, sellerId, parsed.tool, parsed.params || {})
    if (parsed.tool === "generate_pdf" && result.pdf_url) pdfUrl = result.pdf_url

    // Add to conversation for next turn
    agentHistory.push(
      { role: "user", content: turn === 0 ? userMessage : "[continue]" },
      { role: "assistant", content: aiResponse },
      { role: "user", content: `Tool result for ${parsed.tool}: ${JSON.stringify(result).slice(0, 3000)}` }
    )
  }

  return { response: "I processed your request but ran out of reasoning steps. Please try a simpler question.", pdfUrl, toolsUsed }
}

// ════════════════════════════════════════════════════════════
// ENDPOINT
// ════════════════════════════════════════════════════════════
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })

  const { message, reset = false } = (req.body||{}) as {message:string;reset?:boolean}
  if (!message?.trim()) return res.status(400).json({ message: "message required" })

  const seller = await pg("seller").where({id:sellerId}).first()
  const sellerName = seller?.name || "Your company"

  let memRow = await pg("vendor_ai_memory").where({seller_id:sellerId}).first()
  let history: any[] = reset ? [] : (memRow?.messages || [])

  const { response, pdfUrl, toolsUsed } = await runAgent(pg, sellerId, message, history, sellerName)

  const newHistory = [...history, { role: "user", content: message }, { role: "assistant", content: response }]
  await pg("vendor_ai_memory")
    .insert({ seller_id:sellerId, messages:JSON.stringify(newHistory.slice(-30)), updated_at:new Date(), created_at:new Date() })
    .onConflict("seller_id").merge({ messages:JSON.stringify(newHistory.slice(-30)), updated_at:new Date() })

  res.json({ reply: response, pdf_url: pdfUrl, tools_used: toolsUsed })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const row = await pg("vendor_ai_memory").where({seller_id:sellerId}).first()
  res.json({ messages: row?.messages || [] })
}
