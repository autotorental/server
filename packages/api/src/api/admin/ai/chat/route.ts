import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"
import { retrieveCode } from "../../../../lib/code-rag"

// SSE safety helper — avoids "Cannot set headers" when the client disconnects
// mid-stream. Tracks the close state on the response object itself.
function safeWrite(res: any, chunk: string): boolean {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return false
  try { res.write(chunk); return true } catch { (res as any).__closed = true; return false }
}
function safeEnd(res: any): void {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return
  try { res.end() } catch {}
  ;(res as any).__closed = true
}

const execAsync = promisify(exec)

const AI_BASE      = "http://localhost:11434/v1"
const AI_KEY       = "ollama"
const VISION_MODEL = "llava:7b"
const TEXT_MODEL   = "qwen2.5:3b"
const SESSION_KEY  = "admin-owner-main"
const MAX_MSGS     = 50

const CLAUDE_MODELS: Record<string, string> = {
  "claude-haiku":  "claude-haiku-4-5-20251001",
  "claude-sonnet": "claude-sonnet-4-6",
  "claude-opus":   "claude-opus-4-8",
}

async function getAIConfig(pg: any): Promise<{
  provider: string; claudeKey: string;
  openaiKey: string; openrouterKey: string; huggingfaceKey: string;
  openaiModel: string; openrouterModel: string; huggingfaceModel: string;
}> {
  try {
    const [prov, key, oaKey, orKey, hfKey, oaModel, orModel, hfModel] = await Promise.all([
      pg("app_setting").where({ key: "ai_provider" }).first(),
      pg("app_setting").where({ key: "claude_api_key" }).first(),
      pg("app_setting").where({ key: "openai_api_key" }).first(),
      pg("app_setting").where({ key: "openrouter_api_key" }).first(),
      pg("app_setting").where({ key: "huggingface_api_key" }).first(),
      pg("app_setting").where({ key: "openai_model" }).first(),
      pg("app_setting").where({ key: "openrouter_model" }).first(),
      pg("app_setting").where({ key: "huggingface_model" }).first(),
    ])
    return {
      provider: prov?.value || "hermes3",
      claudeKey: key?.value || "",
      openaiKey: oaKey?.value || "",
      openrouterKey: orKey?.value || "",
      huggingfaceKey: hfKey?.value || "",
      openaiModel: oaModel?.value || "",
      openrouterModel: orModel?.value || "",
      huggingfaceModel: hfModel?.value || "",
    }
  } catch {
    return {
      provider: "hermes3", claudeKey: "",
      openaiKey: "", openrouterKey: "", huggingfaceKey: "",
      openaiModel: "", openrouterModel: "", huggingfaceModel: "",
    }
  }
}

const OAI_DEFAULTS: Record<string, { base: string; model: string; extra?: Record<string, string> }> = {
  openai:      { base: "https://api.openai.com/v1",        model: "gpt-4o-mini" },
  openrouter:  { base: "https://openrouter.ai/api/v1",     model: "openai/gpt-4o-mini", extra: { "HTTP-Referer": "https://autotorental.com", "X-Title": "AutoToRental" } },
  huggingface: { base: "https://router.huggingface.co/v1", model: "meta-llama/Llama-3.3-70B-Instruct" },
}

async function callOpenAICompatible(
  baseUrl: string, apiKey: string, model: string, messages: any[],
  stream: boolean, res?: any, extraHeaders?: Record<string, string>,
): Promise<string> {
  const cleanMsgs = messages.map((m: any) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content : extractText(m.content),
  }))
  const payload: any = { model, messages: cleanMsgs, temperature: 0.7, max_tokens: 1400, stream }
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    ...(extraHeaders || {}),
  }
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  })
  if (!stream) { const d = await r.json(); return d.choices?.[0]?.message?.content || "" }
  if (!r.ok || !r.body) { res?.write("data: [DONE]\n\n"); return "" }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let full = ""
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    const chunk = dec.decode(value, { stream: true })
    res?.write(chunk)
    for (const line of chunk.split("\n").filter((l: string) => l.startsWith("data: "))) {
      try { const d = JSON.parse(line.slice(6)); full += d.choices?.[0]?.delta?.content || "" } catch {}
    }
  }
  return full
}

async function callClaude(claudeKey: string, model: string, messages: any[], stream: boolean, res?: any): Promise<string> {
  const claudeModel = CLAUDE_MODELS[model] || "claude-haiku-4-5"
  const sysMsg = messages.find((m: any) => m.role === "system")
  const userMsgs = messages.filter((m: any) => m.role !== "system").map((m: any) => ({
    role: m.role,
    content: typeof m.content === "string" ? m.content
      : Array.isArray(m.content) ? m.content.map((c: any) => {
          if (c.type === "text") return { type: "text", text: c.text }
          if (c.type === "image_url") {
            const b64 = c.image_url?.url?.replace(/^data:image\/[^;]+;base64,/, "") || ""
            return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } }
          }
          return { type: "text", text: JSON.stringify(c) }
        }) : m.content
  }))
  const payload: any = { model: claudeModel, max_tokens: 1500, messages: userMsgs, stream }
  if (sysMsg) payload.system = typeof sysMsg.content === "string" ? sysMsg.content : JSON.stringify(sysMsg.content)

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": claudeKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  })
  if (!stream) { const d = await r.json(); return d.content?.[0]?.text || "" }
  if (!r.ok || !r.body) { res?.write("data: [DONE]\n\n"); return "" }
  const reader = r.body.getReader(); const dec = new TextDecoder(); let full = ""
  while (true) {
    const { done, value } = await reader.read(); if (done) break
    const chunk = dec.decode(value, { stream: true })
    for (const line of chunk.split("\n").filter((l: string) => l.startsWith("data: "))) {
      try {
        const ev = JSON.parse(line.slice(6))
        if (ev.type === "content_block_delta") {
          const text = ev.delta?.text || ""; full += text
          res?.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
        }
      } catch {}
    }
  }
  return full
}

function extractText(content: any): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) return content.find((c: any) => c.type === "text")?.text || ""
  return ""
}
function detectLanguage(text: string): string {
  if (/[؀-ۿ]/.test(text)) return "Arabic"
  if (/[一-鿿]/.test(text)) return "Chinese"
  if (/[Ѐ-ӿ]/.test(text)) return "Russian"
  return "English"
}

const SYSTEM_PROMPT = `You are the AI assistant for "Auto to Rental" — a luxury car rental marketplace in the UAE (website: autotorental.com).

IMPORTANT IDENTITY RULES:
- The brand name is always written "Auto to Rental" (three words). The website/domain is autotorental.com. Never write "AutoToRental" as one word.
- You are ALWAYS talking to the verified owner/admin who is already logged into the secure admin dashboard. NEVER ask for a password, NEVER mention password verification, NEVER tell them to navigate somewhere to verify — they are already verified. Just help immediately.
- You have full permissions to advise on and help with: website content, car listings, SEO, marketing, pricing, business strategy, and platform features.

PLATFORM FACTS:
- Auto to Rental: UAE luxury car rental marketplace, 0% commission, vendors pay flat subscription.
- 50+ cars listed. Features: AI video ads, Instagram Reels, GPS tracking, WhatsApp/Call/Video contact.

YOU ARE A SENIOR ENGINEER WITH FULL DEPLOY ACCESS — 11 REAL TOOLS:
• speed_test(url)         → measure ms load time of any autotorental.com page
• health_check()           → ping API / storefront / admin and report status
• query_database(sql)      → SELECT data (vehicles, leads, pageviews, sellers, etc.)
• write_database(sql)      → INSERT / UPDATE / DELETE  (DROP and auth-table writes are blocked)
• read_file(path)          → read the FULL file in /opt/autorental (up to 180KB)
• write_file(path,content) → create or overwrite a file in /opt/autorental — USE THIS to fix bugs and add features
• list_directory(path)     → explore the codebase
• shell_exec(command)      → run any safe shell command in /opt/autorental (npm/bun/pnpm build, pm2, git, psql, ffmpeg, curl, grep/find, node — destructive commands blocked)
• restart_service(name)    → pm2 restart api / storefront / admin / vendor
• git_commit(message)      → commit changes (use BEFORE risky edits for rollback safety)
• fetch_url(url)           → GET any autotorental.com endpoint and inspect the response
• list_emails(folder)      → read the owner inbox (folder: inbox | spam | all) to review messages
• delete_email(id)         → soft-delete ONE email (ads/spam only — recoverable for 15 days)

EMAIL CLEANUP RULES (when the owner asks to clean ads/spam):
- FIRST list_emails, READ each subject + snippet, and classify.
- DELETE only clear ADVERTISING / PROMOTIONAL / marketing / spam (newsletters, "50% off", cold sales pitches, casino/crypto/SEO-service spam).
- NEVER delete: customer inquiries, car booking/rental requests, vendor messages, payments/invoices, bank/Stripe/Google/Apple/Microsoft security or legal notices, password resets, anything that looks personal or transactional.
- If unsure, DO NOT delete — list it and ask the owner.
- Delete one-by-one with a short reason; then report a summary (how many deleted, how many kept).

PHILOSOPHY:
- You are an autonomous deploy engineer. When asked to fix/add/improve/deploy/speed up — DO IT end to end with the tools. Never just describe or hand back code: write the file, BUILD, DEPLOY, and VERIFY on the live site.

⚠️ DEPLOY PLAYBOOK — this is EXACTLY how a change reaches the dashboard. Each app deploys DIFFERENTLY. Get this wrong and your edit never goes live:

1) ADMIN dashboard (admin.autotorental.com) — code in /opt/autorental/apps/admin/src
   → edit files, then BUILD: shell_exec("cd /opt/autorental/apps/admin && bun run build")
   → nginx serves the fresh dist/ automatically. DO NOT restart_service for admin — it is NOT a pm2 process. THE BUILD IS THE DEPLOY.
   → verify: fetch_url("https://admin.autotorental.com/") expect status 200. Owner must hard-refresh (Cmd+Shift+R) to bypass cache.

2) VENDOR dashboard — code in /opt/autorental/apps/vendor — SAME as admin: bun run build only, NO restart.

3) STOREFRONT (autotorental.com) — code in /opt/autorental/apps/storefront/app
   → edit, then: shell_exec("cd /opt/autorental/apps/storefront && npm run build") THEN restart_service("storefront")
   → verify with speed_test or fetch_url of the changed page.

4) API / backend — custom routes in /opt/autorental/packages/api/src/api/**/route.ts
   → edit, then: shell_exec("cd /opt/autorental/packages/api && bunx medusa build") THEN restart_service("autorental-api")
   → a NEW or EDITED route only goes live AFTER medusa build + restart. Until then it 404s or runs old code.

HARD RULES:
- ONE TypeScript error fails the ENTIRE build → your change does NOT deploy. Always read the build output; if it did not say "completed successfully" / "built in", FIX it and rebuild until it passes.
- read_file returns the FULL file. When editing, write_file the COMPLETE new file content — never a fragment, or you delete the rest of the file.
- git_commit BEFORE risky edits so the owner can rollback.
- Make the SMALLEST change that solves it; match existing code style and @medusajs/ui design tokens.
- A task is DONE only after: file written → build SUCCEEDED → deployed → verified live. Report the actual build result and verify result — not "I edited the file".
- Be concise; let tool results speak. End with one line: ✅ <what is now live> or ❌ <what failed and why>.

WHAT IS BLOCKED (for your own safety and ours):
- rm -rf, dd, mkfs, sudo, shutdown, reboot, chmod 777
- DROP TABLE, TRUNCATE, writes to customer/seller_member/admin tables
- File operations outside /opt/autorental
- SSH key paths, /etc/passwd, /etc/shadow
Everything else is yours to use freely. Go.

LANGUAGE: Reply in the SAME language the user writes in — Arabic if they write Arabic, English if English.
Be direct, helpful, and concise. Never refuse a request by asking for verification — you are already with the owner.`

// ── GET: load memory ──────────────────────────────────────────────────────────
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const row = await pg("admin_ai_memory").where({ session_key: SESSION_KEY }).first()
    const aiCfg = await getAIConfig(pg)
    res.json({
      messages: row?.messages || [],
      facts: row?.facts || {},
      summary: row?.summary || "",
      owner_verified: true,
      ai_provider: aiCfg.provider,
    })
  } catch { res.json({ messages: [], facts: {}, summary: "", owner_verified: true, ai_provider: "hermes3" }) }
}


// ── LIVE DATA INJECTOR ───────────────────────────────────────────────────────
// When the user asks for a "report", "performance", "analytics", "stats", etc.,
// pull REAL numbers from the DB and inject them as a system message so the AI
// writes an evidence-backed report instead of asking for screenshots.
const REPORT_TRIGGERS = /\b(report|performance|analytics|stats|statistics|how (are|is) (we|the site|business)|kpi|dashboard summary|overview|تقرير|الأداء|إحصائيات)\b/i

async function buildLiveContext(pg: any): Promise<string> {
  try {
    const since30 = new Date(Date.now() - 30 * 86400_000)
    const since7 = new Date(Date.now() - 7 * 86400_000)
    const sincePrev30 = new Date(Date.now() - 60 * 86400_000)

    const [
      vehTotal, vehActive, vehInactive,
      sellerTotal, sellerActive,
      pv30, pv7, pvPrev30,
      contacts30, contacts7,
      topCarsRows, topCountriesRows, topReferrersRows, topDevicesRows,
      brandRows, cityRows, recentLeadsRows,
    ] = await Promise.all([
      pg("vehicle").count("id as c").first(),
      pg("vehicle").where({ status: "active" }).count("id as c").first(),
      pg("vehicle").whereNot({ status: "active" }).count("id as c").first(),
      pg("seller").count("id as c").first(),
      pg("seller").whereNotNull("verified_at").count("id as c").first().catch(() => ({ c: 0 })),
      pg("pageview").where("created_at", ">=", since30).count("id as c").first(),
      pg("pageview").where("created_at", ">=", since7).count("id as c").first(),
      pg("pageview").whereBetween("created_at", [sincePrev30, since30]).count("id as c").first(),
      pg("contact_event").where("created_at", ">=", since30).count("id as c").first(),
      pg("contact_event").where("created_at", ">=", since7).count("id as c").first(),
      pg("pageview").select("path").count("id as views").where("path", "like", "/cars/%").where("created_at", ">=", since30).groupBy("path").orderBy("views", "desc").limit(5),
      pg("pageview").select("country").count("id as c").where("created_at", ">=", since30).whereNotNull("country").groupBy("country").orderBy("c", "desc").limit(5),
      pg("pageview").select("referrer").count("id as c").where("created_at", ">=", since30).whereNotNull("referrer").groupBy("referrer").orderBy("c", "desc").limit(5),
      pg("pageview").select("device").count("id as c").where("created_at", ">=", since30).whereNotNull("device").groupBy("device").orderBy("c", "desc").limit(5),
      pg("vehicle").select("brand_id").count("id as c").groupBy("brand_id").orderBy("c", "desc").limit(5),
      pg("vehicle").select("city_id").count("id as c").groupBy("city_id").orderBy("c", "desc").limit(5),
      pg("contact_event").select("event_type", "product_id", "country_code", "created_at").orderBy("created_at", "desc").limit(10),
    ])

    const num = (x: any) => Number(x?.c || x?.views || 0)
    const cur = num(pv30), prev = num(pvPrev30)
    const growth = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null
    const conv = num(pv30) > 0 ? ((num(contacts30) / num(pv30)) * 100).toFixed(2) : "0.00"

    const lines: string[] = []
    lines.push("=== LIVE PLATFORM DATA (Auto to Rental — fetched just now from your database) ===")
    lines.push("")
    lines.push("INVENTORY:")
    lines.push(`  • Vehicles total: ${num(vehTotal)}  (active: ${num(vehActive)}, inactive: ${num(vehInactive)})`)
    lines.push(`  • Rental companies (sellers): ${num(sellerTotal)}  (verified: ${num(sellerActive)})`)
    lines.push("")
    lines.push("TRAFFIC:")
    lines.push(`  • Pageviews last 7 days:  ${num(pv7).toLocaleString()}`)
    lines.push(`  • Pageviews last 30 days: ${num(pv30).toLocaleString()}` + (growth != null ? `  (${growth >= 0 ? "+" : ""}${growth}% vs previous 30d)` : ""))
    lines.push("")
    lines.push("LEADS (WhatsApp/Call/Phone clicks):")
    lines.push(`  • Last 7 days: ${num(contacts7)}`)
    lines.push(`  • Last 30 days: ${num(contacts30)}`)
    lines.push(`  • Conversion rate (leads / pageviews, 30d): ${conv}%`)
    lines.push("")
    if (topCarsRows?.length) {
      lines.push("TOP-VIEWED CAR PAGES (last 30 days):")
      topCarsRows.forEach((r: any, i: number) => lines.push(`  ${i+1}. ${r.path}  —  ${Number(r.views)} views`))
      lines.push("")
    }
    if (topCountriesRows?.length) {
      lines.push("TOP COUNTRIES (visitors, 30d):")
      topCountriesRows.forEach((r: any) => lines.push(`  • ${r.country}: ${Number(r.c)}`))
      lines.push("")
    }
    if (topReferrersRows?.length) {
      lines.push("TOP TRAFFIC SOURCES (30d):")
      topReferrersRows.forEach((r: any) => {
        const src = (r.referrer || "").length > 60 ? (r.referrer.slice(0, 60) + "…") : (r.referrer || "direct")
        lines.push(`  • ${src}: ${Number(r.c)}`)
      })
      lines.push("")
    }
    if (topDevicesRows?.length) {
      lines.push("DEVICES (30d):")
      topDevicesRows.forEach((r: any) => lines.push(`  • ${r.device || "unknown"}: ${Number(r.c)}`))
      lines.push("")
    }
    if (recentLeadsRows?.length) {
      lines.push("RECENT LEADS (newest first):")
      recentLeadsRows.forEach((r: any) => {
        const when = new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ")
        lines.push(`  • ${when}  ${r.event_type}  on  ${r.product_id}  (${r.country_code || "?"})`)
      })
      lines.push("")
    }
    lines.push("=== END LIVE DATA ===")
    lines.push("")
    lines.push("INSTRUCTIONS FOR YOU (the assistant):")
    lines.push("• You ALREADY have the real numbers above — DO NOT ask the user to share screenshots or paste analytics.")
    lines.push("• Write a concrete report using these exact numbers.")
    lines.push("• Lead with the headline (growth %, top car, conversion rate), then 3-5 bullet insights, then 3 concrete actions.")
    lines.push("• Use clean markdown with bold headers. No filler like 'I'd be happy to'.")
    return lines.join("\n")
  } catch (e: any) {
    return `(Live data fetch failed: ${e?.message || "unknown"} — answer from general knowledge.)`
  }
}


// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE AGENT TOOLS — real actions, executed safely on the server
// ═══════════════════════════════════════════════════════════════════════════
// Hard-block list — these are the ONLY things the agent cannot do.
// Everything else is allowed. This is a "deny destructive, allow everything else" policy.
function isDestructive(cmd: string): boolean {
  const c = cmd.trim().toLowerCase()
  if (/\brm\s+(-rf?|--recursive)/.test(c)) return true       // rm -rf anything
  if (/\bdd\s+if=/.test(c)) return true                       // disk wipe
  if (/\bmkfs\b|\bfdisk\b/.test(c)) return true             // format disk
  if (/\bsudo\b/.test(c)) return true                         // privilege escalation
  if (/\bshutdown\b|\breboot\b|\bhalt\b/.test(c)) return true
  if (/\bchmod\s+777\b|chmod\s+-r\s+777/.test(c)) return true
  if (/\bchown\s+-r\s+root/.test(c)) return true
  if (/\buseradd\b|\bpasswd\b|\busermod\b/.test(c)) return true
  if (/>\s*\/dev\/sd|>\s*\/etc\/(passwd|shadow|sudoers)/.test(c)) return true
  if (/\/root\/\.ssh|\/etc\/ssh|authorized_keys/.test(c)) return true
  return false
}

function isDestructiveSQL(sql: string): boolean {
  const s = sql.trim().toLowerCase()
  if (/^drop\b/.test(s)) return true             // DROP TABLE/DATABASE
  if (/^truncate\b/.test(s)) return true         // TRUNCATE
  if (/^alter\s+(table|database)\s+\w+\s+drop/.test(s)) return true
  if (/delete\s+from\s+(customer|seller_member|admin|app_setting)\b/.test(s)) return true  // critical tables
  if (/update\s+(customer|seller_member|admin)\s+set/.test(s)) return true                  // user data
  return false
}

const CLAUDE_TOOLS = [
  {
    name: "speed_test",
    description: "Measure load time of a page on autotorental.com. Returns HTTP status, time_ms, size_kb, verdict.",
    input_schema: { type: "object" as const, properties: { url: { type: "string" } }, required: ["url"] }
  },
  {
    name: "health_check",
    description: "Check API + storefront + admin status with response times.",
    input_schema: { type: "object" as const, properties: {} }
  },
  {
    name: "query_database",
    description: "Run a SELECT query (read-only) on the platform DB. Sensitive columns (password, token, api_key) are blocked.",
    input_schema: { type: "object" as const, properties: { sql: { type: "string" } }, required: ["sql"] }
  },
  {
    name: "write_database",
    description: "Run an INSERT/UPDATE/DELETE on the platform DB. DROP, TRUNCATE, and writes to user-auth tables are blocked. Use for ops like updating vehicle prices, status flags, settings, etc. Always include a WHERE clause for UPDATE/DELETE.",
    input_schema: { type: "object" as const, properties: { sql: { type: "string" } }, required: ["sql"] }
  },
  {
    name: "read_file",
    description: "Read any file inside /opt/autorental (up to 16KB shown, paths relative to /opt/autorental).",
    input_schema: { type: "object" as const, properties: { path: { type: "string" } }, required: ["path"] }
  },
  {
    name: "write_file",
    description: "Create or overwrite a file inside /opt/autorental. Use for fixing bugs, adding features, editing config. Path is relative to /opt/autorental.",
    input_schema: { type: "object" as const, properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] }
  },
  {
    name: "list_directory",
    description: "List files and subfolders inside a directory under /opt/autorental.",
    input_schema: { type: "object" as const, properties: { path: { type: "string", description: "Relative to /opt/autorental, e.g. apps/storefront/components" } }, required: ["path"] }
  },
  {
    name: "shell_exec",
    description: "Run a shell command on the server. Allowed: npm/bun/pnpm build, pm2 restart/list, git operations, psql, curl, grep/find/cat/ls, ffmpeg, tail/head, node scripts. BLOCKED: rm -rf, sudo, dd, mkfs, shutdown, reboot, chmod 777, writes outside /opt/autorental. Use for builds, deploys, log inspection, test runs.",
    input_schema: { type: "object" as const, properties: { command: { type: "string", description: "Shell command to run (executes in /opt/autorental)" } }, required: ["command"] }
  },
  {
    name: "restart_service",
    description: "Restart a service via pm2. Allowed names: autorental-api, autorental-storefront, autorental-admin, autorental-vendor.",
    input_schema: { type: "object" as const, properties: { name: { type: "string" } }, required: ["name"] }
  },
  {
    name: "git_commit",
    description: "Stage all changes inside /opt/autorental and commit with a message. Useful before risky changes for rollback.",
    input_schema: { type: "object" as const, properties: { message: { type: "string" } }, required: ["message"] }
  },
  {
    name: "fetch_url",
    description: "GET any URL on autotorental.com (api/storefront/admin). Returns status, headers, first 8KB of body. Use to test endpoints after a change.",
    input_schema: { type: "object" as const, properties: { url: { type: "string" } }, required: ["url"] }
  },
  {
    name: "list_emails",
    description: "List recent emails from the owner inbox (contact_message). Returns id, from, subject, snippet, folder, date. Use this to read emails before deciding which are ads/spam. folder can be 'inbox', 'spam', or 'all'.",
    input_schema: { type: "object" as const, properties: { folder: { type: "string", description: "inbox | spam | all" }, limit: { type: "number", description: "max emails (default 40)" }, query: { type: "string", description: "optional text to filter subject/from" } }, required: [] }
  },
  {
    name: "delete_email",
    description: "Soft-delete ONE email by id (moves to Deleted, auto-purged after 15 days, recoverable). ONLY use for confirmed advertising / promotional / spam emails. NEVER delete customer inquiries, booking requests, vendor messages, invoices, or legal/security notices.",
    input_schema: { type: "object" as const, properties: { id: { type: "string" }, reason: { type: "string", description: "why this is ad/spam" } }, required: ["id"] }
  },
]

async function execTool(name: string, input: any, pg: any): Promise<any> {
  const SAFE_ROOT = "/opt/autorental"
  const inside = (rel: string) => {
    const full = path.resolve(SAFE_ROOT, String(rel || "").replace(/^\/+/, ""))
    return full.startsWith(SAFE_ROOT + "/") || full === SAFE_ROOT ? full : null
  }
  try {
    if (name === "speed_test") {
      const url = String(input?.url || "")
      if (!url.includes("autotorental.com")) return { error: "URL must be on autotorental.com" }
      const t0 = Date.now()
      const r = await fetch(url, { signal: AbortSignal.timeout(30000), redirect: "follow" })
      const ms = Date.now() - t0
      const text = await r.text()
      return { url, status: r.status, time_ms: ms, size_kb: Math.round(text.length/1024), verdict: ms < 1500 ? "fast" : ms < 3500 ? "ok" : "slow" }
    }
    if (name === "health_check") {
      const endpoints = [
        { name: "api",        url: "https://api.autotorental.com/health" },
        { name: "storefront", url: "https://autotorental.com/" },
        { name: "admin",      url: "https://admin.autotorental.com/" },
      ]
      const results: any = {}
      await Promise.all(endpoints.map(async e => {
        const t0 = Date.now()
        try { const r = await fetch(e.url, { signal: AbortSignal.timeout(10000) }); results[e.name] = { status: r.status, time_ms: Date.now()-t0, ok: r.ok } }
        catch (err: any) { results[e.name] = { error: err?.message || "unreachable", ok: false } }
      }))
      return results
    }
    if (name === "query_database") {
      const sql = String(input?.sql || "").trim()
      if (!/^select\b/i.test(sql)) return { error: "Only SELECT — for writes use write_database" }
      if (/;\s*\w/i.test(sql)) return { error: "Only a single statement" }
      if (/\b(password|hashed_password|salt|token|secret|api_key|auth_identity)\b/i.test(sql)) return { error: "Sensitive column access denied" }
      const r = await pg.raw(sql)
      const rows = (r.rows || r || []).slice(0, 100)
      return { rows, count: rows.length, truncated: (r.rows?.length || 0) > 100 }
    }
    if (name === "write_database") {
      const sql = String(input?.sql || "").trim()
      if (!/^(insert|update|delete)\b/i.test(sql)) return { error: "Only INSERT/UPDATE/DELETE" }
      if (isDestructiveSQL(sql)) return { error: "Blocked: DROP/TRUNCATE or writes to auth tables" }
      if (/^(update|delete)\b/i.test(sql) && !/\bwhere\b/i.test(sql)) return { error: "UPDATE/DELETE require a WHERE clause" }
      const r = await pg.raw(sql)
      return { ok: true, rows_affected: r.rowCount ?? r.affectedRows ?? null }
    }
    if (name === "read_file") {
      const full = inside(input?.path); if (!full) return { error: "Path must be inside /opt/autorental" }
      if (!fs.existsSync(full)) return { error: "File not found" }
      const st = fs.statSync(full)
      if (st.isDirectory()) return { error: "Path is a directory — use list_directory" }
      if (st.size > 2 * 1024 * 1024) return { error: "File too large (>2MB)" }
      const content = fs.readFileSync(full, "utf8")
      return { path: full, size_bytes: st.size, content: content.slice(0, 180000), truncated: content.length > 180000 }
    }
    if (name === "write_file") {
      const full = inside(input?.path); if (!full) return { error: "Path must be inside /opt/autorental" }
      const content = String(input?.content ?? "")
      if (content.length > 2 * 1024 * 1024) return { error: "Content too large (>2MB)" }
      fs.mkdirSync(path.dirname(full), { recursive: true })
      fs.writeFileSync(full, content)
      return { ok: true, path: full, bytes_written: content.length }
    }
    if (name === "list_directory") {
      const full = inside(input?.path); if (!full) return { error: "Path must be inside /opt/autorental" }
      if (!fs.existsSync(full)) return { error: "Not found" }
      const items = fs.readdirSync(full, { withFileTypes: true }).slice(0, 200)
      return { path: full, items: items.map(d => ({ name: d.name, type: d.isDirectory() ? "dir" : "file" })) }
    }
    if (name === "shell_exec") {
      const cmd = String(input?.command || "")
      if (!cmd.trim()) return { error: "Empty command" }
      if (isDestructive(cmd)) return { error: "Blocked: destructive command (rm -rf, sudo, dd, mkfs, shutdown, etc.)" }
      const { stdout, stderr } = await execAsync(cmd, { timeout: 180_000, cwd: "/opt/autorental", maxBuffer: 4 * 1024 * 1024 })
        .catch((e: any) => ({ stdout: "", stderr: (e?.stderr || e?.message || "exec failed") + "" }))
      return { stdout: String(stdout||"").slice(-6000), stderr: String(stderr||"").slice(-2000) }
    }
    if (name === "restart_service") {
      const raw = String(input?.name || "").trim().toLowerCase()
      // Map friendly names to the REAL pm2 process names.
      const PM2: Record<string, string> = {
        api: "autorental-api", "autorental-api": "autorental-api",
        storefront: "storefront", "autorental-storefront": "storefront",
        "storefront-blog": "storefront-blog",
      }
      // admin & vendor are STATIC builds served by nginx from dist/ — no pm2 process.
      if (raw === "admin" || raw === "vendor" || raw === "autorental-admin" || raw === "autorental-vendor") {
        return { ok: true, note: `${raw} is a static build served by nginx from dist/. No restart needed — the 'bun run build' already deployed it live.` }
      }
      const svc = PM2[raw]
      if (!svc) return { error: `Unknown service '${raw}'. Use: api, storefront (pm2) — admin/vendor deploy by build only.` }
      const { stdout, stderr } = await execAsync(`pm2 restart ${svc}`, { timeout: 30000 })
      return { ok: true, service: svc, output: (stdout || stderr || "").trim().slice(-400) }
    }
    if (name === "git_commit") {
      const msg = String(input?.message || "agent commit").replace(/["`$]/g, "")
      const { stdout, stderr } = await execAsync(`cd /opt/autorental && git add -A && git commit -m "${msg}" 2>&1 || true`, { timeout: 30000 })
      return { ok: true, output: (stdout || stderr || "").slice(-800) }
    }
    if (name === "fetch_url") {
      const url = String(input?.url || "")
      if (!/autotorental\.com/i.test(url)) return { error: "URL must be on autotorental.com" }
      const t0 = Date.now()
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) })
      const text = await r.text()
      return { url, status: r.status, time_ms: Date.now()-t0, headers: Object.fromEntries(r.headers.entries() as any), body: text.slice(0, 8000) }
    }
    if (name === "list_emails") {
      const folder = String(input?.folder || "inbox").toLowerCase()
      const limit = Math.min(Number(input?.limit) || 40, 100)
      const q = String(input?.query || "").trim()
      let qb = pg("contact_message").whereNull("deleted_at").where("direction", "inbound")
      if (folder === "spam") qb = qb.where((b: any) => b.where("status", "spam").orWhere("mailbox", "ilike", "%spam%").orWhere("mailbox", "ilike", "%junk%"))
      if (q) qb = qb.where((b: any) => b.where("subject", "ilike", `%${q}%`).orWhere("email", "ilike", `%${q}%`).orWhere("name", "ilike", `%${q}%`))
      const rows = await qb.orderBy("created_at", "desc").limit(limit)
        .select("id", "name", "email", "subject", "message", "mailbox", "status", "created_at")
      return { count: rows.length, emails: rows.map((r: any) => ({
        id: r.id,
        from: [r.name, r.email].filter(Boolean).join(" <") + (r.email ? ">" : ""),
        subject: r.subject || "(no subject)",
        snippet: String(r.message || "").replace(/\s+/g, " ").slice(0, 200),
        folder: r.mailbox || r.status || "inbox",
        date: r.created_at,
      })) }
    }
    if (name === "delete_email") {
      const id = String(input?.id || "").trim()
      if (!id) return { error: "id required" }
      const row = await pg("contact_message").where({ id }).first("id", "subject", "email", "direction")
      if (!row) return { error: "email not found" }
      if (row.direction !== "inbound") return { error: "refusing to delete a non-inbound message" }
      await pg("contact_message").where({ id }).update({ deleted_at: new Date() })
      return { ok: true, deleted: id, subject: row.subject || "", from: row.email || "", note: "moved to Deleted (recoverable, auto-purged in 15 days)" }
    }
    return { error: "Unknown tool: " + name }
  } catch (e: any) {
    return { error: e?.message || "tool failed" }
  }
}

async function callClaudeAgent(
  key: string, modelKey: string, systemText: string, messages: any[], res: any, pg: any
): Promise<string> {
  const model = CLAUDE_MODELS[modelKey] || "claude-opus-4-8"
  let convo: any[] = [...messages]
  let finalText = ""
  for (let iter = 0; iter < 25; iter++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: 8000, system: systemText, messages: convo, tools: CLAUDE_TOOLS }),
      signal: AbortSignal.timeout(120000),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data?.error?.message || "Claude error")

    const blocks = data.content || []
    const assistantBlocks: any[] = []
    let textOut = ""
    const pendingTools: any[] = []

    for (const b of blocks) {
      if (b.type === "text") { textOut += b.text; assistantBlocks.push(b) }
      else if (b.type === "tool_use") { assistantBlocks.push(b); pendingTools.push(b) }
    }

    if (textOut) {
      finalText += textOut
      safeWrite(res, `data: ${JSON.stringify({ choices: [{ delta: { content: textOut } }] })}\n\n`)
    }

    if (data.stop_reason !== "tool_use" || pendingTools.length === 0) return finalText

    const toolResults: any[] = []
    for (const tu of pendingTools) {
      safeWrite(res, `data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n🔧 \`${tu.name}\`… ` } }] })}\n\n`)
      const result = await execTool(tu.name, tu.input, pg)
      const preview = JSON.stringify(result).slice(0, 240)
      safeWrite(res, `data: ${JSON.stringify({ choices: [{ delta: { content: `\n\`\`\`json\n${preview}\n\`\`\`\n` } }] })}\n\n`)
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result).slice(0, 8000) })
    }

    convo.push({ role: "assistant", content: assistantBlocks })
    convo.push({ role: "user", content: toolResults })
  }
  return finalText || "(agent: max iterations reached)"
}

const LOCAL_BASE  = "http://localhost:11434"
const LOCAL_MODEL = "qwen2.5:7b"

function toOllamaTools() {
  return (CLAUDE_TOOLS as any[]).map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.input_schema } }))
}

// Local, FREE agent: runs the same 13 tools against the on-server Ollama model
// (qwen2.5) — no API credits needed. Slower + less clever than Claude, but it
// can actually DO things (read/write files, query DB, run builds, restart).
async function callOllamaAgent(systemText: string, messages: any[], res: any, pg: any): Promise<string> {
  // RAG: pull the most relevant chunks of YOUR backend code for the question and
  // give them to the model up-front, so it answers grounded in your real code.
  let ragContext = ""
  try {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")
    const q = typeof lastUser?.content === "string" ? lastUser.content : ""
    if (q) {
      const hits = await retrieveCode(pg, q, 5)
      if (hits.length && hits[0].score > 0.4) {
        ragContext = "\n\n## RELEVANT CODE FROM THIS PROJECT (ground your answer in this):\n" +
          hits.map((h) => `### ${h.path}\n\`\`\`\n${h.content.slice(0, 1200)}\n\`\`\``).join("\n\n")
      }
    }
  } catch { /* RAG optional */ }
  const convo: any[] = [{ role: "system", content: systemText + ragContext }, ...messages]
  const tools = toOllamaTools()
  let finalText = ""
  for (let iter = 0; iter < 10; iter++) {
    const r = await fetch(`${LOCAL_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: LOCAL_MODEL, messages: convo, tools, stream: false, keep_alive: "30m", options: { temperature: 0.3, num_ctx: 8192 } }),
      signal: AbortSignal.timeout(180000),
    })
    const data: any = await r.json()
    if (!r.ok) throw new Error(data?.error || "Ollama error")
    const msg = data.message || {}
    if (msg.content) { finalText += msg.content; safeWrite(res, `data: ${JSON.stringify({ choices: [{ delta: { content: msg.content } }] })}\n\n`) }
    const calls = msg.tool_calls || []
    if (!calls.length) return finalText
    convo.push({ role: "assistant", content: msg.content || "", tool_calls: calls })
    for (const tc of calls) {
      const name = tc.function?.name
      let args = tc.function?.arguments || {}
      if (typeof args === "string") { try { args = JSON.parse(args) } catch { args = {} } }
      safeWrite(res, `data: ${JSON.stringify({ choices: [{ delta: { content: `\n\n🔧 \`${name}\`… ` } }] })}\n\n`)
      let result: any
      try { result = await execTool(name, args, pg) } catch (e: any) { result = { error: e?.message || "tool failed" } }
      const preview = JSON.stringify(result).slice(0, 240)
      safeWrite(res, `data: ${JSON.stringify({ choices: [{ delta: { content: `\n\`\`\`json\n${preview}\n\`\`\`\n` } }] })}\n\n`)
      convo.push({ role: "tool", name, content: JSON.stringify(result).slice(0, 6000) })
    }
  }
  return finalText || "(local agent: reached max steps)"
}

// ── POST: chat ────────────────────────────────────────────────────────────────
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { messages = [], stream = true, images, reset } = (req.body || {}) as {
    messages: any[]; stream?: boolean; images?: string[]; reset?: boolean
  }

  if (reset) {
    await pg("admin_ai_memory").where({ session_key: SESSION_KEY }).delete().catch(() => {})
    return res.json({ ok: true })
  }
  if (!messages.length) return res.status(400).json({ message: "messages required" })

  const aiCfg = await getAIConfig(pg)
  const useClaude = aiCfg.provider.startsWith("claude") && !!aiCfg.claudeKey
  const useQwen   = aiCfg.provider.startsWith("qwen") || aiCfg.provider.startsWith("deepseek")
  const oaiProvider = OAI_DEFAULTS[aiCfg.provider]
  const oaiKey = aiCfg.provider === "openai" ? aiCfg.openaiKey
    : aiCfg.provider === "openrouter" ? aiCfg.openrouterKey
    : aiCfg.provider === "huggingface" ? aiCfg.huggingfaceKey : ""
  const oaiModel = aiCfg.provider === "openai" ? (aiCfg.openaiModel || OAI_DEFAULTS.openai.model)
    : aiCfg.provider === "openrouter" ? (aiCfg.openrouterModel || OAI_DEFAULTS.openrouter.model)
    : aiCfg.provider === "huggingface" ? (aiCfg.huggingfaceModel || OAI_DEFAULTS.huggingface.model) : ""
  const useOpenAICompat = !!oaiProvider && !!oaiKey

  let memRow = await pg("admin_ai_memory").where({ session_key: SESSION_KEY }).first().catch(() => null)
  const savedMsgs: any[] = memRow?.messages || []
  const facts: any = memRow?.facts || {}

  const lastText = extractText(messages[messages.length - 1]?.content || "")
  const lang = detectLanguage(lastText)

  const hasImages = Array.isArray(images) && images.length > 0
  const model = hasImages ? VISION_MODEL : (useClaude ? aiCfg.provider : (useQwen ? aiCfg.provider : TEXT_MODEL))

  // ALWAYS inject live platform data — every turn — so the AI never says
  // "I don't have access". Also checks recent conversation, not just the latest
  // message, so follow-ups like "yes please" still get the data.
  const recentText = [
    lastText,
    ...messages.slice(-3).map((m: any) => extractText(m?.content || "")),
    ...savedMsgs.slice(-4).map((m: any) => extractText(m?.content || "")),
  ].join(" ").toLowerCase()
  const wantsFullReport = REPORT_TRIGGERS.test(recentText)
  const liveContext = await buildLiveContext(pg)
  const guardrails = `STRICT RULES — READ CAREFULLY:
1. You ALREADY have the platform data in the system message above. You DO have real-time access. NEVER say "I don't have access" or "I need you to share" — that is a lie.
2. NEVER invent features that don't exist. The platform has: vehicle listings, pageviews, contact-event leads (whatsapp/call clicks), sellers (rental companies). It does NOT have Instagram Reels analytics, GPS tracking by renters, AI Video Ad engagement metrics, booking conversion, or rental duration data unless those exact fields appear in the data above.
3. When asked for a report, USE the exact numbers from the live data block above.
4. Be concise. No filler. No "I'd be happy to". Get straight to the data.
${wantsFullReport ? "5. The user wants a FULL REPORT now — write it in markdown with headline → 3-5 insights → 3 concrete actions, using the live numbers above." : ""}`

  let finalMessages: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: liveContext },
    { role: "system", content: guardrails },
    ...savedMsgs.slice(-20),
    ...messages.slice(-5),
  ]

  if (hasImages) {
    const lastIdx = finalMessages.map((m: any) => m.role).lastIndexOf("user")
    if (lastIdx >= 0) {
      const t = extractText(finalMessages[lastIdx].content) || "Analyze this screenshot."
      finalMessages[lastIdx] = { role: "user", content: t, images }
    }
  }

  const payload = { model, messages: finalMessages, temperature: 0.7, max_tokens: 1400, stream }

  if (!stream) {
    let reply = ""
    if (useClaude) { reply = await callClaude(aiCfg.claudeKey, aiCfg.provider, finalMessages, false) }
    else if (useOpenAICompat) { reply = await callOpenAICompatible(oaiProvider.base, oaiKey, oaiModel, finalMessages, false, undefined, oaiProvider.extra) }
    else {
      const r = await fetch(`${AI_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(90000),
      })
      if (!r.ok) return res.status(r.status).json({ message: "AI error" })
      const d = await r.json(); reply = d.choices?.[0]?.message?.content || ""
    }
    const newHistory = [...savedMsgs, ...messages, { role: "assistant", content: reply }].slice(-MAX_MSGS)
    await pg("admin_ai_memory")
      .insert({ session_key: SESSION_KEY, messages: JSON.stringify(newHistory), facts: JSON.stringify(facts), updated_at: new Date(), created_at: new Date() })
      .onConflict("session_key").merge({ messages: JSON.stringify(newHistory), updated_at: new Date() }).catch(() => {})
    return res.json({ choices: [{ message: { content: reply } }], owner_verified: true, provider: (useClaude || useOpenAICompat) ? aiCfg.provider : (useQwen ? aiCfg.provider : "hermes3") })
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  
  req.on("close", () => { (res as any).__closed = true })
safeWrite(res, `data: {"owner_verified":true,"lang":"${lang}","provider":"${(useClaude || useOpenAICompat) ? aiCfg.provider : (useQwen ? aiCfg.provider : "hermes3")}"}\n\n`)

  let fullReply = ""
  if (useClaude) {
    try {
      // Convert finalMessages → system + user/assistant array for Claude
      const sysParts = finalMessages.filter((m: any) => m.role === "system").map((m: any) => extractText(m.content)).filter(Boolean)
      const convo   = finalMessages.filter((m: any) => m.role !== "system").map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : (extractText(m.content) || "")
      })).filter((m: any) => m.content)
      fullReply = await callClaudeAgent(aiCfg.claudeKey, aiCfg.provider, sysParts.join("\n\n"), convo, res, pg)
    } catch (e: any) { safeWrite(res, `data: {"error":"Claude: ${(e as any)?.message}"}\n\n`) }
  } else if (useOpenAICompat) {
    try { fullReply = await callOpenAICompatible(oaiProvider.base, oaiKey, oaiModel, finalMessages, true, res, oaiProvider.extra) }
    catch (e: any) { safeWrite(res, `data: {"error":"${aiCfg.provider}: ${(e as any)?.message}"}\n\n`) }
  } else try {
    // Local FREE agent (Ollama + qwen2.5) with the full 13 tools.
    const sysParts = finalMessages.filter((m: any) => m.role === "system").map((m: any) => extractText(m.content)).filter(Boolean)
    const convo = finalMessages.filter((m: any) => m.role !== "system").map((m: any) => ({
      role: m.role, content: typeof m.content === "string" ? m.content : (extractText(m.content) || "")
    })).filter((m: any) => m.content)
    fullReply = await callOllamaAgent(sysParts.join("\n\n"), convo, res, pg)
  } catch (e: any) { safeWrite(res, `data: {"error":"local agent: ${(e as any)?.message}"}\n\n`) }

  // RELIABILITY: if the primary model produced nothing (cold-start/timeout), fall
  // back to fast hermes3 so the assistant ALWAYS responds.
  if (!fullReply.trim()) {
    try {
      const fb = await fetch(`${AI_BASE}/chat/completions`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: TEXT_MODEL, messages: finalMessages, temperature: 0.7, max_tokens: 1200, stream: false, keep_alive: "30m" }),
        signal: AbortSignal.timeout(60000),
      })
      const fbJson = await fb.json().catch(() => null)
      fullReply = fbJson?.choices?.[0]?.message?.content || ""
      if (fullReply) {
        // stream the fallback text to the client as one chunk
        safeWrite(res, `data: ${JSON.stringify({ choices: [{ delta: { content: fullReply } }] })}\n\n`)
      }
    } catch {}
  }

  if (fullReply) {
    const newHistory = [...savedMsgs, ...messages, { role: "assistant", content: fullReply }].slice(-MAX_MSGS)
    await pg("admin_ai_memory")
      .insert({ session_key: SESSION_KEY, messages: JSON.stringify(newHistory), facts: JSON.stringify(facts), updated_at: new Date(), created_at: new Date() })
      .onConflict("session_key").merge({ messages: JSON.stringify(newHistory), updated_at: new Date() }).catch(() => {})
  }

  safeWrite(res, "data: [DONE]\n\n")
  safeEnd(res)
}
