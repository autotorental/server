#!/usr/bin/env node
/**
 * AutoToRental Auto-Heal Agent
 * Runs every 5 minutes via cron
 * - Checks pages for white screens / errors
 * - Polls Sentry for new unresolved errors  
 * - Calls Qwen2.5-Coder to fix automatically
 * - Rebuilds and restarts if fixes applied
 */
const https = require("https")
const http  = require("http")
const { execSync } = require("child_process")
const fs   = require("fs")
const path = require("path")

const AI_BASE   = "https://ai.sirizone.com/ollama/v1"
const AI_KEY    = "sk-f171498a5cb5e5f93461e0ef12d4ba30c3374dafb2d0d01c"
const LOG_FILE  = "/var/log/autoheal.log"
const STOREFRONT = "/opt/autorental/apps/storefront"

const PAGES_TO_MONITOR = [
  { url: "https://autotorental.com",                 name: "Homepage" },
  { url: "https://autotorental.com/cars",            name: "Cars page" },
  { url: "https://autotorental.com/companies",       name: "Companies" },
  { url: "https://api.autotorental.com/health",      name: "API health" },
]

function log(msg) {
  const ts = new Date().toISOString().slice(0,19)
  const line = `[${ts}] ${msg}\n`
  process.stdout.write(line)
  try { fs.appendFileSync(LOG_FILE, line) } catch {}
}

function fetch2(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith("https") ? https : http
    const req = mod.get(url, { headers: { "User-Agent": "AutoHeal/1.0" }, timeout: 15000 }, (res) => {
      let body = ""
      res.on("data", d => { body += d.toString(); if (body.length > 50000) req.destroy() })
      res.on("end", () => resolve({ status: res.statusCode, body, ok: res.statusCode < 400 }))
    })
    req.on("error", () => resolve({ status: 0, body: "", ok: false }))
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, body: "", ok: false }) })
  })
}

async function askQwen(system, user) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: "qwen2.5-coder:14b",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.1, max_tokens: 3000, stream: false
    })
    const req = https.request({
      hostname: "ai.sirizone.com", path: "/ollama/v1/chat/completions",
      method: "POST", headers: { "Authorization": `Bearer ${AI_KEY}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
      timeout: 120000
    }, res => {
      let body = ""
      res.on("data", d => body += d.toString())
      res.on("end", () => {
        try { resolve(JSON.parse(body).choices?.[0]?.message?.content || "") }
        catch { resolve("") }
      })
    })
    req.on("error", () => resolve(""))
    req.write(data); req.end()
  })
}

function isWhiteScreen(body, url) {
  if (!body || body.length < 500) return { broken: true, reason: "Empty response" }
  if (body.includes("Application error") || body.includes("An unexpected error")) return { broken: true, reason: "Application error page" }
  if (body.includes("500") && body.includes("Internal Server Error")) return { broken: true, reason: "500 error" }
  if (!body.includes("<html") && !body.includes("<!DOCTYPE")) return { broken: true, reason: "No HTML" }
  // For React pages - check if there is any content
  if (url.includes("autotorental.com") && !url.includes("api.") && body.length < 2000) return { broken: true, reason: "Suspiciously small page" }
  return { broken: false }
}

async function checkPages() {
  const broken = []
  for (const page of PAGES_TO_MONITOR) {
    const r = await fetch2(page.url)
    if (!r.ok) {
      broken.push({ ...page, status: r.status, reason: `HTTP ${r.status}` })
      log(`❌ ${page.name}: HTTP ${r.status}`)
      continue
    }
    const ws = isWhiteScreen(r.body, page.url)
    if (ws.broken) {
      broken.push({ ...page, status: r.status, reason: ws.reason })
      log(`⚠️  ${page.name}: ${ws.reason}`)
    } else {
      log(`✅ ${page.name}: OK (${r.body.length} bytes)`)
    }
  }
  return broken
}

async function fixPage(page) {
  log(`🤖 Auto-fixing: ${page.name} (${page.reason})`)
  
  // Ask Qwen to diagnose and fix
  const diag = await askQwen(
    `You are an expert Next.js developer fixing a production issue on autotorental.com.
The tech stack: Next.js 14 App Router, Medusa 2.x backend, Tailwind CSS.
File locations: /opt/autorental/apps/storefront (storefront), /opt/autorental/packages/api/src (API)
When you identify the fix, respond with JSON: {"file":"full_path","fix":"description","type":"restart|rebuild|code"}`,
    `Page "${page.name}" (${page.url}) is broken: ${page.reason}. Status: ${page.status}.
Common causes: import errors, missing env vars, syntax errors, crashed process.
What is the most likely fix?`
  )
  
  log(`  Qwen says: ${diag.slice(0, 200)}`)
  
  // Parse fix type
  let fixType = "restart"
  try {
    const j = JSON.parse(diag.match(/\{[\s\S]*\}/)?.[0] || "{}")
    fixType = j.type || "restart"
  } catch {}

  if (fixType === "restart" || page.url.includes("api.")) {
    log(`  🔄 Restarting services...`)
    execSync("pm2 restart all --update-env 2>/dev/null || true", { timeout: 30000 })
    return true
  }
  
  if (fixType === "rebuild") {
    log(`  🔨 Rebuilding storefront...`)
    execSync(`cd ${STOREFRONT} && npm run build 2>&1 | tail -5 && pm2 restart storefront`, { timeout: 180000 })
    execSync("/opt/autorental/scripts/notify-sentry-release.sh 2>/dev/null || true", { timeout: 10000 })
    return true
  }

  // Default: restart all
  execSync("pm2 restart all --update-env 2>/dev/null || true", { timeout: 30000 })
  return true
}

async function fetchSentryIssues(token) {
  if (!token) return []
  const r = await fetch2(`https://sentry.io/api/0/projects/auto-to-rerntal/javascript-nextjs/issues/?query=is:unresolved&limit=5&sort=date`)
  // Can't use auth header with simple fetch2, use curl
  try {
    const out = execSync(
      `curl -s "https://sentry.io/api/0/projects/auto-to-rerntal/javascript-nextjs/issues/?query=is:unresolved&limit=5&sort=date" -H "Authorization: Bearer ${token}"`,
      { timeout: 15000 }
    ).toString()
    const issues = JSON.parse(out)
    return Array.isArray(issues) ? issues : []
  } catch { return [] }
}

async function autoFixSentryIssue(issue, token) {
  log(`🐛 Auto-fixing Sentry: ${issue.title.slice(0,80)}`)
  
  // Get stacktrace
  let stackText = ""
  try {
    const evOut = execSync(
      `curl -s "https://sentry.io/api/0/issues/${issue.id}/events/latest/" -H "Authorization: Bearer ${token}"`,
      { timeout: 10000 }
    ).toString()
    const ev = JSON.parse(evOut)
    const frames = ev.entries?.find(e => e.type === "exception")?.data?.values?.[0]?.stacktrace?.frames || []
    stackText = frames.map(f => `${f.filename}:${f.lineno} ${f.context_line || ""}`).join("\n").slice(0, 1500)
  } catch {}

  // Find file
  const culpritFile = issue.culprit?.split(" in ")?.[0]
  const filename = culpritFile ? path.basename(culpritFile) : ""
  
  if (!filename) { log(`  No file identified, skipping`); return false }
  
  // Find file on disk
  let filePath = null
  try {
    const found = execSync(
      `find /opt/autorental/apps/storefront /opt/autorental/packages/api/src -name "${filename}" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null | head -1`,
      { timeout: 5000 }
    ).toString().trim()
    if (found) filePath = found
  } catch {}
  
  if (!filePath) { log(`  File ${filename} not found on disk`); return false }

  const content = fs.readFileSync(filePath, "utf8")
  log(`  Fixing ${filePath}...`)
  
  const fixed = await askQwen(
    "You are fixing a production Next.js error. Return ONLY the complete fixed file content with no explanation or markdown.",
    `Fix this error: ${issue.title}\nStacktrace:\n${stackText}\n\nFile (${filename}):\n${content.slice(0, 5000)}`
  )

  if (fixed && fixed.length > content.length * 0.7 && fixed !== content) {
    fs.writeFileSync(filePath, fixed)
    log(`  ✅ File fixed! Rebuilding...`)
    execSync(`cd ${STOREFRONT} && npm run build 2>&1 | tail -3 && pm2 restart storefront`, { timeout: 180000 })
    // Resolve in Sentry
    execSync(`curl -s -X PUT "https://sentry.io/api/0/issues/${issue.id}/" -H "Authorization: Bearer ${token}" -H "Content-Type: application/json" -d '{"status":"resolved"}' > /dev/null`, { timeout: 5000 })
    execSync("/opt/autorental/scripts/notify-sentry-release.sh 2>/dev/null || true", { timeout: 10000 })
    log(`  ✅ Sentry issue resolved!`)
    return true
  }
  log(`  ⚠️  Qwen could not generate a safe fix`)
  return false
}

async function main() {
  log("=== AutoHeal check started ===")
  
  // 1. Check pages for white screens
  const brokenPages = await checkPages()
  for (const page of brokenPages) {
    await fixPage(page)
    // Re-check after fix
    await new Promise(r => setTimeout(r, 10000))
    const recheck = await fetch2(page.url)
    if (recheck.ok) log(`✅ ${page.name}: Fixed!`)
    else log(`❌ ${page.name}: Still broken after fix`)
  }

  // 2. Check Sentry for new errors (only if token saved)
  let sentryToken = ""
  try {
    const PGPASSWORD = "vqrmVQLK5iEunWCcliSMrjyu"
    const tokenOut = execSync(
      `PGPASSWORD=${PGPASSWORD} psql -U autorental -h localhost -d autorental_db -t -c "SELECT value FROM app_setting WHERE key='sentry_token' AND value != '' LIMIT 1" 2>/dev/null`,
      { timeout: 5000 }
    ).toString().trim()
    sentryToken = tokenOut
  } catch {}

  if (sentryToken) {
    const issues = await fetchSentryIssues(sentryToken)
    log(`Found ${issues.length} Sentry issues`)
    for (const issue of issues.slice(0, 2)) {
      if (issue.level === "error" || issue.level === "fatal") {
        await autoFixSentryIssue(issue, sentryToken)
      }
    }
  } else {
    log("No Sentry token configured — add in AI Settings to enable auto-fix")
  }

  log("=== AutoHeal check complete ===")
}

main().catch(e => log(`FATAL: ${e.message}`))
