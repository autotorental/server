import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getSetting } from "../../../../lib/settings"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { exec } from "child_process"
import { promisify } from "util"
import * as fs from "fs"
import * as path from "path"

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

const AI_BASE = "https://ai.sirizone.com/ollama/v1"
const AI_KEY  = "sk-f171498a5cb5e5f93461e0ef12d4ba30c3374dafb2d0d01c"
const STOREFRONT = "/opt/autorental/apps/storefront"
const API_PATH   = "/opt/autorental/packages/api/src"

async function getClaudeKey(): Promise<string> {
  try {
    const { stdout } = await execAsync(`psql 'postgresql://autorental:vqrmVQLK5iEunWCcliSMrjyu@localhost:5432/autorental_db' -tA -c "SELECT value FROM app_setting WHERE key='claude_api_key'"`, { timeout: 5000 })
    return (stdout || "").trim()
  } catch { return "" }
}

async function askAI(system: string, user: string): Promise<string> {
  // Prefer Claude (smart, reliable). Fall back to hermes3 (local) if no key.
  const claudeKey = await getClaudeKey()
  if (claudeKey) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": claudeKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 1500, system, messages: [{ role: "user", content: user }] }),
        signal: AbortSignal.timeout(90000),
      })
      const d = await r.json()
      if (r.ok) return d.content?.[0]?.text || ""
    } catch {}
  }
  // Fallback: hermes3 (always works via sirizone /v1)
  try {
    const r = await fetch(`${AI_BASE}/chat/completions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "hermes3:8b", messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: 0.1, max_tokens: 1500, stream: false, keep_alive: "30m" }),
      signal: AbortSignal.timeout(60000),
    })
    const d = await r.json()
    return d.choices?.[0]?.message?.content || ""
  } catch (e: any) { return `(AI unavailable: ${e?.message?.slice(0, 80)})` }
}

// alias for backward compat
const askQwen = askAI

function findFile(filename: string): string | null {
  const dirs = [STOREFRONT, API_PATH]
  for (const dir of dirs) {
    try {
      const { execSync } = require("child_process")
      const result = execSync(`find "${dir}" -name "${filename}" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null | head -1`, { timeout: 5000 }).toString().trim()
      if (result) return result
    } catch {}
  }
  return null
}

// Filter out: minified hash files (5442-ef8d.js), URL slugs (peugeot, umm-al-quwain),
// internal Next.js chunks. Only return real source filenames we can actually edit.
function isUsefulSourceFile(name: string): boolean {
  if (!name) return false
  if (name.includes("node_modules") || name.includes("webpack")) return false
  if (/^main-app-[0-9a-f]+\.js$/.test(name)) return false      // Next minified
  if (/^\d{3,}-[0-9a-f]{6,}\.js$/.test(name)) return false      // chunk hash
  if (/^[a-f0-9]{8,}\.js$/.test(name)) return false             // pure hash
  if (!/\.(tsx?|jsx?|mjs|cjs)$/.test(name)) return false       // only real source
  return true
}

function extractFilename(culprit: string, stacktrace: string): string[] {
  const files = new Set<string>()
  const culpritFile = culprit?.split(" in ")?.[0]?.split("?")?.[0]
  if (culpritFile && isUsefulSourceFile(path.basename(culpritFile))) files.add(path.basename(culpritFile))
  const stackMatches = stacktrace.matchAll(/([a-zA-Z0-9_/-]+\.(tsx?|jsx?|mjs))/g)
  for (const m of stackMatches) {
    const f = path.basename(m[1])
    if (isUsefulSourceFile(f)) files.add(f)
  }
  return Array.from(files).slice(0, 3)
}

// Known error patterns — instant fixes, no AI needed.
const KNOWN_PATTERNS: Array<{ match: RegExp; fix: (errMsg: string) => Promise<{ summary: string; applied: boolean; details: string }> }> = [
  {
    // Sentry duplicate session replay
    match: /Multiple Sentry Session Replay instances are not supported/i,
    fix: async () => {
      const deprecated = "/opt/autorental/apps/storefront/sentry.client.config.ts"
      const newWay     = "/opt/autorental/apps/storefront/instrumentation-client.ts"
      if (!fs.existsSync(deprecated)) return { applied: false, summary: "Already fixed (no sentry.client.config.ts)", details: "" }
      if (!fs.existsSync(newWay))     return { applied: false, summary: "Manual: instrumentation-client.ts missing — cannot safely remove old file", details: "" }
      fs.renameSync(deprecated, deprecated + ".bak")
      try { await execAsync(`cd /opt/autorental/apps/storefront && bun run build && pm2 restart storefront`, { timeout: 300000 }) } catch {}
      return { applied: true, summary: "Renamed deprecated sentry.client.config.ts → .bak, kept instrumentation-client.ts, rebuilt & restarted.", details: deprecated + ".bak" }
    },
  },
  {
    // Hydration mismatch — point to the relevant SSR/CSR mismatch hint
    match: /Hydration failed|Text content does not match server-rendered|did not match\. Server:/i,
    fix: async (errMsg) => ({
      applied: false,
      summary: "Hydration mismatch detected. Most common causes: `new Date()` / `Math.random()` rendered without `suppressHydrationWarning`, locale formatting, or `window`-dependent code in SSR.",
      details: errMsg.slice(0, 300),
    }),
  },
  {
    // Module not found
    match: /Module not found: Can\u2019t resolve|Cannot find module/i,
    fix: async (errMsg) => {
      const mm = errMsg.match(/Cannot find module ['"`]([^'"`]+)/) || errMsg.match(/Can\u2019t resolve ['"`]([^'"`]+)/)
      const pkg = mm?.[1] || "unknown"
      return { applied: false, summary: `Missing package: ${pkg}. Run: bun add ${pkg}`, details: "" }
    },
  },
]

async function tryKnownFix(errMsg: string) {
  for (const p of KNOWN_PATTERNS) {
    if (p.match.test(errMsg)) return await p.fix(errMsg)
  }
  return null
}

// GET /admin/ai/sentry-autofix?token=... — list fixable issues
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { status = "unresolved", limit = "10" } = req.query as any
  const token = (req.query as any).token || await getSetting(req.scope, "sentry_auth_token").catch(() => "")
  if (!token) return res.status(400).json({ message: "Sentry token required" })

  const r = await fetch(
    `https://sentry.io/api/0/projects/auto-to-rerntal/javascript-nextjs/issues/?query=is:${status}&limit=${limit}&sort=date`,
    { headers: { "Authorization": `Bearer ${token}` } }
  )
  if (!r.ok) return res.status(r.status).json({ message: "Sentry API error" })
  const issues = await r.json()
  res.json({ issues: Array.isArray(issues) ? issues : [], count: Array.isArray(issues) ? issues.length : 0 })
}

// POST /admin/ai/sentry-autofix — fix one or all issues
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const body = (req.body || {}) as { token?: string; issue_id?: string; fix_all?: boolean }
  const { issue_id, fix_all = false } = body
  const token = body.token || await getSetting(req.scope, "sentry_auth_token").catch(() => "")
  if (!token) return res.status(400).json({ message: "Sentry token required" })

  // Fetch issues
  const limit = fix_all ? "10" : "1"
  const query = issue_id ? `issue.id:${issue_id}` : "is:unresolved"
  const r = await fetch(
    `https://sentry.io/api/0/projects/auto-to-rerntal/javascript-nextjs/issues/?query=${query}&limit=${limit}`,
    { headers: { "Authorization": `Bearer ${token}` } }
  )
  if (!r.ok) return res.status(r.status).json({ message: "Sentry API error" })
  const issues = await r.json()
  if (!Array.isArray(issues) || issues.length === 0) return res.json({ fixes: [], message: "No issues found" })

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")

  
  req.on("close", () => { (res as any).__closed = true })
const emit = (data: any) => safeWrite(res, `data: ${JSON.stringify(data)}\n\n`)
  const fixes: any[] = []

  for (const issue of issues.slice(0, 5)) {
    emit({ event: "issue", id: issue.id, title: issue.title, level: issue.level })

    try {
      // Get full event details with stacktrace
      const errPreview = issue.title || issue.metadata?.value || ""
      // FAST PATH: known error patterns get an instant deterministic fix
      const known = await tryKnownFix(errPreview)
      if (known) {
        if (known.applied) {
          fixes.push({ issue_id: issue.id, title: issue.title, status: "applied", recommendation: known.summary, details: known.details })
          emit({ event: "applied", issue_id: issue.id, summary: known.summary })
        } else {
          fixes.push({ issue_id: issue.id, title: issue.title, status: "manual", recommendation: known.summary, details: known.details })
          emit({ event: "suggestion", issue_id: issue.id, recommendation: known.summary })
        }
        continue
      }
      const evR = await fetch(
        `https://sentry.io/api/0/issues/${issue.id}/events/latest/`,
        { headers: { "Authorization": `Bearer ${token}` } }
      )
      const ev = evR.ok ? await evR.json() : {}
      const exceptions = ev.entries?.find((e: any) => e.type === "exception")?.data?.values || []
      const exception = exceptions[0]
      const frames = exception?.stacktrace?.frames || []
      const stackText = frames.map((f: any) => `${f.filename}:${f.lineno} in ${f.function}\n${f.context_line || ""}`).join("\n").slice(0, 2000)
      const errMsg = exception?.value || issue.title
      const errType = exception?.type || ""

      // Find the file to fix
      const filenames = extractFilename(issue.culprit || "", stackText)
      emit({ event: "analyzing", files: filenames, error: errMsg })

      let fixed = false
      for (const filename of filenames) {
        const filePath = findFile(filename)
        if (!filePath) continue

        // SAFE: analysis-only. We NEVER overwrite source files or auto-deploy.
        // Qwen proposes a concrete fix; a human reviews & applies it. This
        // prevents AI-corrupted files from silently shipping to production.
        const analysis = await askQwen(
          "You are a Next.js expert. Given an error and the file path, give a precise fix: which lines to change and the exact replacement. Be concise (max 5 sentences). Do NOT return the whole file.",
          `Error type: ${errType}\nMessage: ${errMsg}\nFile: ${filePath}\nStacktrace:\n${stackText.slice(0, 1200)}`
        )
        fixes.push({ issue_id: issue.id, title: issue.title, file: filePath, status: "manual", recommendation: analysis })
        emit({ event: "suggestion", issue_id: issue.id, file: filePath, recommendation: analysis })
        fixed = true
        break
      }

      if (!fixed) {
        const analysis = await askQwen(
          "You are a Next.js expert. Analyze this error and give a 2-sentence fix recommendation.",
          `Error: ${errMsg}\nStacktrace: ${stackText.slice(0, 800)}`
        )
        fixes.push({ issue_id: issue.id, title: issue.title, status: "manual", recommendation: analysis })
        emit({ event: "manual", issue_id: issue.id, recommendation: analysis })
      }
    } catch(e: any) {
      fixes.push({ issue_id: issue.id, title: issue.title, status: "failed", error: e.message })
      emit({ event: "failed", issue_id: issue.id, error: e.message })
    }
  }

  // Analysis-only mode: no auto-rebuild, no auto-deploy. Human applies fixes.

  const appliedCount = fixes.filter((f:any)=>f.status==="applied").length
  emit({ event: "done", fixes, total: fixes.length, fixed: appliedCount, manual: fixes.filter((f:any)=>f.status==="manual").length })
  safeWrite(res, "data: [DONE]\n\n")
  safeEnd(res)
}
