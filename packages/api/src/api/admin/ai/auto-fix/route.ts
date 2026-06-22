import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"
import * as crypto from "crypto"
const execAsync = promisify(exec)

const ROOT = "/opt/autorental"

// Safety guards
function isDestructive(cmd: string): boolean {
  const c = cmd.trim().toLowerCase()
  if (/\brm\s+(-rf?|--recursive)/.test(c)) return true
  if (/\bdd\s+if=/.test(c)) return true
  if (/\bmkfs\b|\bfdisk\b/.test(c)) return true
  if (/\bsudo\b/.test(c)) return true
  if (/\bshutdown\b|\breboot\b|\bhalt\b/.test(c)) return true
  if (/\bchmod\s+777\b/.test(c)) return true
  if (/\bchown\s+-r\s+root/.test(c)) return true
  if (/\/root\/\.ssh|\/etc\/(passwd|shadow|sudoers)/.test(c)) return true
  return false
}
function isDestructiveSQL(sql: string): boolean {
  const s = sql.trim().toLowerCase()
  if (/^drop\b|^truncate\b/.test(s)) return true
  if (/delete\s+from\s+(customer|seller_member|admin|app_setting|auth_identity)\b/.test(s)) return true
  if (/update\s+(customer|seller_member|admin|auth_identity)\s+set/.test(s)) return true
  return false
}

// 14 tools the auto-heal agent can call
const TOOLS = [
  { name: "list_directory", description: "List files in a directory under /opt/autorental",
    input_schema: { type: "object" as const, properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "read_file", description: "Read a file (FULL content, up to 180KB)",
    input_schema: { type: "object" as const, properties: { path: { type: "string" } }, required: ["path"] } },
  { name: "write_file", description: "Create or overwrite a file inside /opt/autorental. Use this to FIX bugs.",
    input_schema: { type: "object" as const, properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } },
  { name: "shell_exec", description: "Run a shell command in /opt/autorental. Safe: npm/bun/pnpm/git/pm2/psql/ffmpeg/curl/grep/find/cat/ls/tail/node. Destructive blocked.",
    input_schema: { type: "object" as const, properties: { command: { type: "string" } }, required: ["command"] } },
  { name: "query_database", description: "Run a SELECT query (read-only). Sensitive columns blocked.",
    input_schema: { type: "object" as const, properties: { sql: { type: "string" } }, required: ["sql"] } },
  { name: "write_database", description: "INSERT/UPDATE/DELETE. DROP/TRUNCATE/auth-table writes blocked. UPDATE/DELETE require WHERE.",
    input_schema: { type: "object" as const, properties: { sql: { type: "string" } }, required: ["sql"] } },
  { name: "pm2_logs", description: "Read recent PM2 error logs for a service. Useful to diagnose crashes.",
    input_schema: { type: "object" as const, properties: { service: { type: "string", enum: ["autorental-api", "storefront", "storefront-blog", "atr-media-worker"] }, lines: { type: "number" } }, required: ["service"] } },
  { name: "restart_service", description: "pm2 restart a service after fixing it",
    input_schema: { type: "object" as const, properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "git_commit", description: "Commit current changes (auto-runs before risky edits as a checkpoint).",
    input_schema: { type: "object" as const, properties: { message: { type: "string" } }, required: ["message"] } },
  { name: "git_rollback", description: "Undo the last commit (use ONLY if your fix made things worse and you cannot fix forward).",
    input_schema: { type: "object" as const, properties: {} } },
  { name: "git_diff", description: "Show what files changed since last commit",
    input_schema: { type: "object" as const, properties: {} } },
  { name: "speed_test", description: "Measure load time of a URL on autotorental.com to verify a fix worked.",
    input_schema: { type: "object" as const, properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "health_check", description: "Check API + storefront + admin status. Use BEFORE and AFTER fixes.",
    input_schema: { type: "object" as const, properties: {} } },
  { name: "fetch_url", description: "GET any URL on autotorental.com — inspect response after a fix.",
    input_schema: { type: "object" as const, properties: { url: { type: "string" } }, required: ["url"] } },
]

async function execTool(name: string, input: any, pg: any): Promise<any> {
  const inside = (rel: string) => {
    const full = path.resolve(ROOT, String(rel || "").replace(/^\/+/, ""))
    return full.startsWith(ROOT + "/") || full === ROOT ? full : null
  }
  try {
    if (name === "list_directory") {
      const full = inside(input?.path); if (!full) return { error: "Path must be inside /opt/autorental" }
      if (!fs.existsSync(full)) return { error: "Not found" }
      const items = fs.readdirSync(full, { withFileTypes: true }).slice(0, 200)
      return { path: full, items: items.map(d => ({ name: d.name, type: d.isDirectory() ? "dir" : "file" })) }
    }
    if (name === "read_file") {
      const full = inside(input?.path); if (!full) return { error: "Path must be inside /opt/autorental" }
      if (!fs.existsSync(full)) return { error: "Not found" }
      const st = fs.statSync(full)
      if (st.isDirectory()) return { error: "Is a directory" }
      if (st.size > 2*1024*1024) return { error: "File >2MB" }
      const content = fs.readFileSync(full, "utf8")
      return { path: full, size: st.size, content: content.slice(0, 180000), truncated: content.length > 180000 }
    }
    if (name === "write_file") {
      const full = inside(input?.path); if (!full) return { error: "Path must be inside /opt/autorental" }
      const content = String(input?.content ?? "")
      if (content.length > 2*1024*1024) return { error: "Content >2MB" }
      fs.mkdirSync(path.dirname(full), { recursive: true })
      fs.writeFileSync(full, content)
      return { ok: true, path: full, bytes: content.length }
    }
    if (name === "shell_exec") {
      const cmd = String(input?.command || "").trim()
      if (!cmd) return { error: "Empty" }
      if (isDestructive(cmd)) return { error: "Blocked: destructive command" }
      const { stdout, stderr } = await execAsync(cmd, { timeout: 300_000, cwd: ROOT, maxBuffer: 8*1024*1024 })
        .catch((e: any) => ({ stdout: "", stderr: (e?.stderr || e?.message || "").toString() }))
      return { stdout: String(stdout||"").slice(-8000), stderr: String(stderr||"").slice(-3000) }
    }
    if (name === "query_database") {
      const sql = String(input?.sql || "").trim()
      if (!/^select\b/i.test(sql)) return { error: "Only SELECT — use write_database for writes" }
      if (/;\s*\w/i.test(sql)) return { error: "Single statement only" }
      if (/\b(password|hashed_password|salt|token|secret|api_key|auth_identity)\b/i.test(sql)) return { error: "Sensitive column" }
      const r = await pg.raw(sql)
      const rows = (r.rows || r || []).slice(0, 100)
      return { rows, count: rows.length }
    }
    if (name === "write_database") {
      const sql = String(input?.sql || "").trim()
      if (!/^(insert|update|delete)\b/i.test(sql)) return { error: "Only INSERT/UPDATE/DELETE" }
      if (isDestructiveSQL(sql)) return { error: "Blocked: destructive SQL" }
      if (/^(update|delete)\b/i.test(sql) && !/\bwhere\b/i.test(sql)) return { error: "Need WHERE clause" }
      const r = await pg.raw(sql)
      return { ok: true, rows_affected: r.rowCount ?? r.affectedRows ?? null }
    }
    if (name === "pm2_logs") {
      const svc = String(input?.service || "")
      const lines = Math.min(300, Math.max(20, Number(input?.lines || 80)))
      if (!/^[a-z-]+$/.test(svc)) return { error: "Bad service name" }
      const { stdout } = await execAsync(`pm2 logs ${svc} --err --lines ${lines} --nostream 2>&1 | grep -v "geo.*mmdb missing" | tail -${lines}`, { timeout: 15000, maxBuffer: 4*1024*1024 })
        .catch((e: any) => ({ stdout: e?.stderr || "" }))
      return { service: svc, logs: String(stdout || "").slice(-12000) }
    }
    if (name === "restart_service") {
      const raw = String(input?.name || "").trim().toLowerCase()
      if (/^(admin|vendor|autorental-admin|autorental-vendor)$/.test(raw)) {
        return { ok: true, note: `${raw} is a static build served by nginx from dist/. No restart - bun run build already deployed it.` }
      }
      const map: Record<string,string> = { api: "autorental-api", "autorental-api": "autorental-api", storefront: "storefront", "storefront-blog": "storefront-blog", "atr-media-worker": "atr-media-worker" }
      const svc = map[raw]
      if (!svc) return { error: `Unknown service '${raw}'. Use api or storefront; admin/vendor deploy by build only.` }
      const { stdout, stderr } = await execAsync(`pm2 restart ${svc} --update-env`, { timeout: 30000 })
      return { ok: true, service: svc, output: (stdout || stderr || "").trim().slice(-400) }
    }
    if (name === "git_commit") {
      const msg = String(input?.message || "agent checkpoint").replace(/["`$\\]/g, "")
      const { stdout, stderr } = await execAsync(`cd ${ROOT} && git add -A && git commit -m "${msg}" --allow-empty -q 2>&1 || true`, { timeout: 30000 })
      return { ok: true, output: (stdout || stderr || "committed").slice(-400) }
    }
    if (name === "git_rollback") {
      const { stdout, stderr } = await execAsync(`cd ${ROOT} && git reset --hard HEAD~1 2>&1`, { timeout: 15000 })
      return { ok: true, output: (stdout || stderr || "").slice(-400) }
    }
    if (name === "git_diff") {
      const { stdout } = await execAsync(`cd ${ROOT} && git diff --stat HEAD~1 HEAD 2>&1`, { timeout: 10000 })
      return { diff: String(stdout || "").slice(-4000) }
    }
    if (name === "speed_test") {
      const url = String(input?.url || "")
      if (!url.includes("autotorental.com")) return { error: "Must be autotorental.com" }
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
        try { const r = await fetch(e.url, { signal: AbortSignal.timeout(10000) }); results[e.name] = { status: r.status, time_ms: Date.now()-t0, ok: r.ok || r.status === 302 } }
        catch (err: any) { results[e.name] = { error: err?.message || "unreachable", ok: false } }
      }))
      return results
    }
    if (name === "fetch_url") {
      const url = String(input?.url || "")
      if (!/autotorental\.com/i.test(url)) return { error: "Must be autotorental.com" }
      const t0 = Date.now()
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) })
      const text = await r.text()
      return { url, status: r.status, time_ms: Date.now()-t0, body: text.slice(0, 8000) }
    }
    return { error: "Unknown tool: " + name }
  } catch (e: any) { return { error: e?.message || "tool failed" } }
}

const SYSTEM_PROMPT = `You are the AUTO-HEAL agent for Auto to Rental — a luxury car rental marketplace on Next.js + Medusa 2.x.

Platform paths & HOW EACH DEPLOYS (critical - get this right or your fix never goes live):
- Storefront: /opt/autorental/apps/storefront - Next.js 15. Deploy: shell_exec("cd /opt/autorental/apps/storefront && npm run build") THEN restart_service("storefront").
- API:        /opt/autorental/packages/api - Medusa 2.x. Deploy: shell_exec("cd /opt/autorental/packages/api && bunx medusa build") THEN restart_service("autorental-api"). A custom route only goes live AFTER medusa build + restart.
- Admin:      /opt/autorental/apps/admin - React/Vite. Deploy: shell_exec("cd /opt/autorental/apps/admin && bun run build"). nginx serves the fresh dist/ automatically - DO NOT restart_service (admin is NOT a pm2 process). THE BUILD IS THE DEPLOY.
- Vendor:     /opt/autorental/apps/vendor - same as Admin: bun run build only, NO restart.
- DB:         PostgreSQL "autorental_db", user "autorental"
- ONE TypeScript error fails the ENTIRE build -> the fix does NOT deploy. Read the build output; if it did not say "completed successfully"/"built in", FIX and rebuild until it passes.

WORKFLOW for every problem you diagnose & fix:
1. health_check          — establish baseline
2. pm2_logs              — read recent errors for the affected service
3. read_file / list_directory — locate the buggy code
4. git_commit            — checkpoint BEFORE editing (mandatory)
5. write_file            — apply the fix (precise, minimal)
6. shell_exec            — BUILD the app you edited (see deploy recipe per app above)
7. restart_service       — ONLY storefront & api need it; admin & vendor deploy by build alone
8. health_check + speed_test/fetch_url — VERIFY the fix worked
9. git_rollback          — ONLY if verification fails AND you cannot fix forward

PRINCIPLES:
- Be SURGICAL. Minimum change to fix the issue. Don't refactor unrelated code.
- read_file returns the FULL file; write_file the COMPLETE new content (never a fragment, or you erase the rest of the file).
- ALWAYS git_commit before write_file (checkpoint for rollback).
- VERIFY every fix with a real probe (fetch_url, speed_test, health_check).
- If you don't know the root cause, investigate FIRST (read logs, read code) — don't guess.
- When done, output a one-paragraph SUMMARY: what was broken, what you changed, verification result.

You have FULL agency — investigate freely, fix autonomously, verify rigorously.`

async function getClaudeKey(pg: any): Promise<string> {
  try { const r = await pg("app_setting").where({ key: "claude_api_key" }).first(); return r?.value || "" } catch { return "" }
}

function safeWrite(res: any, chunk: string): boolean {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return false
  try { res.write(chunk); return true } catch { (res as any).__closed = true; return false }
}
function safeEnd(res: any): void {
  if (!res || (res as any).__closed || res.writableEnded || res.destroyed) return
  try { res.end() } catch {}
  ;(res as any).__closed = true
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { problem = "", autodetect = false } = (req.body || {}) as { problem?: string; autodetect?: boolean }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  req.on("close", () => { (res as any).__closed = true })

  const emit = (type: string, data: any) => safeWrite(res, `data: ${JSON.stringify({ type, ...data })}\n\n`)

  const claudeKey = await getClaudeKey(pg)
  if (!claudeKey) {
    emit("error", { message: "Claude API key not configured" })
    safeEnd(res); return
  }

  let userPrompt = ""
  if (problem.trim()) {
    userPrompt = `Problem reported by the owner:\n\n"${problem.trim()}"\n\nDiagnose, fix, and verify. Follow the workflow.`
  } else if (autodetect) {
    userPrompt = "Auto-detect problems on the platform. Start with health_check, then check pm2_logs for autorental-api and storefront. If errors found, diagnose and fix the most critical one. If everything is healthy, report 'All systems nominal' and stop."
  } else {
    emit("error", { message: "Either 'problem' or 'autodetect:true' required" })
    safeEnd(res); return
  }

  emit("start", { problem: problem || "auto-detect" })

  let convo: any[] = [{ role: "user", content: userPrompt }]
  let finalSummary = ""

  for (let iter = 0; iter < 25; iter++) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": claudeKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: convo,
        tools: TOOLS,
      }),
      signal: AbortSignal.timeout(180_000),
    }).catch((e: any) => { emit("error", { message: `Claude unreachable: ${e?.message}` }); return null })

    if (!r) break
    const data = await r.json()
    if (!r.ok) {
      emit("error", { message: `Claude ${r.status}: ${JSON.stringify(data).slice(0, 200)}` })
      break
    }

    const blocks = data.content || []
    const assistantBlocks: any[] = []
    let text = ""
    const pending: any[] = []
    for (const b of blocks) {
      if (b.type === "text") { text += b.text; assistantBlocks.push(b) }
      else if (b.type === "tool_use") { assistantBlocks.push(b); pending.push(b) }
    }
    if (text) { finalSummary = text; emit("thinking", { text }) }

    if (data.stop_reason !== "tool_use" || pending.length === 0) {
      emit("done", { summary: finalSummary || "Complete" })
      break
    }

    const toolResults: any[] = []
    for (const tu of pending) {
      emit("tool_start", { name: tu.name, input: tu.input })
      const result = await execTool(tu.name, tu.input, pg)
      emit("tool_result", { name: tu.name, result: JSON.stringify(result).slice(0, 500) })
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result).slice(0, 8000) })
    }
    convo.push({ role: "assistant", content: assistantBlocks })
    convo.push({ role: "user", content: toolResults })
  }

  safeWrite(res, "data: [DONE]\n\n")
  safeEnd(res)
}
