#!/usr/bin/env node
/**
 * Configure cPanel email + Cloudflare DNS + Auto to Rental SMTP.
 *
 * Usage:
 *   cp /opt/autorental/scripts/cpanel-mail.env.example /root/.cpanel-mail.env
 *   nano /root/.cpanel-mail.env   # fill in tokens (chmod 600)
 *   node /opt/autorental/scripts/setup-cpanel-mail.mjs
 */
import fs from "node:fs"
import nodemailer from "nodemailer"
import { execSync } from "node:child_process"

const ENV_FILE = process.env.CPANEL_MAIL_ENV || "/root/.cpanel-mail.env"
const API_ENV = "/opt/autorental/packages/api/.env"

function loadEnvFile(path) {
  if (!fs.existsSync(path)) {
    console.error(`✗ Missing ${path}`)
    console.error("  Copy: cp /opt/autorental/scripts/cpanel-mail.env.example /root/.cpanel-mail.env")
    process.exit(1)
  }
  const out = {}
  for (const line of fs.readFileSync(path, "utf8").split("\n")) {
    const t = line.trim()
    if (!t || t.startsWith("#")) continue
    const i = t.indexOf("=")
    if (i < 1) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

function upsertEnv(key, val) {
  let body = fs.existsSync(API_ENV) ? fs.readFileSync(API_ENV, "utf8") : ""
  const re = new RegExp(`^${key}=.*$`, "m")
  const line = `${key}=${val}`
  body = re.test(body) ? body.replace(re, line) : `${body.trim()}\n${line}\n`
  fs.writeFileSync(API_ENV, body)
}

async function cpanelUapi(cfg, module, func, params = {}) {
  const base = `https://${cfg.CPANEL_HOST}:2083/execute/${module}/${func}`
  const url = new URL(base)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `cpanel ${cfg.CPANEL_USER}:${cfg.CPANEL_API_TOKEN}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.status === 0) {
    throw new Error(data?.errors?.[0] || data?.error || `cPanel ${module}/${func} failed (${res.status})`)
  }
  return data
}

function cloudflareHeaders(cfg) {
  if (cfg.CLOUDFLARE_API_TOKEN) {
    return { Authorization: `Bearer ${cfg.CLOUDFLARE_API_TOKEN}`, "Content-Type": "application/json" }
  }
  if (cfg.CLOUDFLARE_API_EMAIL && cfg.CLOUDFLARE_API_KEY) {
    return {
      "X-Auth-Email": cfg.CLOUDFLARE_API_EMAIL,
      "X-Auth-Key": cfg.CLOUDFLARE_API_KEY,
      "Content-Type": "application/json",
    }
  }
  throw new Error("Set CLOUDFLARE_API_TOKEN or CLOUDFLARE_API_EMAIL + CLOUDFLARE_API_KEY in cpanel-mail.env")
}

async function cloudflareApi(cfg, method, path, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: cloudflareHeaders(cfg),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!data.success) {
    throw new Error(data.errors?.map((e) => e.message).join("; ") || "Cloudflare API error")
  }
  return data
}

async function listCfRecords(cfg) {
  const zone = cfg.CLOUDFLARE_ZONE_ID
  const data = await cloudflareApi(cfg, "GET", `/zones/${zone}/dns_records?per_page=500`)
  return data.result || []
}

async function upsertDns(cfg, { type, name, content, priority, proxied = false, ttl = 3600 }) {
  const zone = cfg.CLOUDFLARE_ZONE_ID
  const fqdn = name === "@" ? cfg.DOMAIN : `${name}.${cfg.DOMAIN}`
  const existing = (await listCfRecords(cfg)).find((r) => {
    if (r.type !== type) return false
    if (type === "MX") return r.name === fqdn && Number(r.priority) === Number(priority)
    return r.name === fqdn && r.content === content
  })
  const record = {
    type,
    name: name === "@" ? cfg.DOMAIN : `${name}.${cfg.DOMAIN}`,
    content,
    ttl,
    proxied,
    ...(type === "MX" ? { priority: Number(priority) } : {}),
  }
  if (existing) {
    await cloudflareApi(cfg, "PUT", `/zones/${zone}/dns_records/${existing.id}`, record)
    console.log(`  ✓ Updated ${type} ${name} → ${content}`)
  } else {
    await cloudflareApi(cfg, "POST", `/zones/${zone}/dns_records`, record)
    console.log(`  ✓ Created ${type} ${name} → ${content}`)
  }
}

async function removeZohoMx(cfg) {
  const zone = cfg.CLOUDFLARE_ZONE_ID
  const records = await listCfRecords(cfg)
  for (const r of records) {
    if (r.type !== "MX") continue
    if (/zoho\.com/i.test(r.content) || /amazonaws\.com/i.test(r.content)) {
      await cloudflareApi(cfg, "DELETE", `/zones/${zone}/dns_records/${r.id}`)
      console.log(`  ✓ Removed old MX ${r.content}`)
    }
  }
}

async function mergeSpf(cfg) {
  const zone = cfg.CLOUDFLARE_ZONE_ID
  const records = await listCfRecords(cfg)
  const spfRecords = records.filter((r) => r.type === "TXT" && r.name === cfg.DOMAIN && r.content.startsWith("v=spf1"))
  const content = cfg.SPF_TXT || `v=spf1 a mx ip4:${cfg.MAIL_SERVER_IP} ~all`
  if (spfRecords.length) {
    await cloudflareApi(cfg, "PUT", `/zones/${zone}/dns_records/${spfRecords[0].id}`, {
      type: "TXT", name: cfg.DOMAIN, content, ttl: 3600,
    })
    for (const extra of spfRecords.slice(1)) {
      await cloudflareApi(cfg, "DELETE", `/zones/${zone}/dns_records/${extra.id}`)
    }
  } else {
    await cloudflareApi(cfg, "POST", `/zones/${zone}/dns_records`, {
      type: "TXT", name: cfg.DOMAIN, content, ttl: 3600,
    })
  }
  console.log(`  ✓ SPF: ${content}`)
}

async function dbUpsert(key, val, secret) {
  const env = fs.readFileSync(API_ENV, "utf8")
  const m = env.match(/DATABASE_URL=postgresql:\/\/[^:]+:([^@]+)@/)
  if (!m) return
  const pg = `PGPASSWORD=${m[1]} psql -h localhost -U autorental -d autorental_db -tAc`
  const exists = execSync(`${pg} "SELECT 1 FROM app_setting WHERE key='${key}' LIMIT 1"`, { encoding: "utf8" }).trim()
  const esc = val.replace(/'/g, "''")
  if (exists === "1") {
    execSync(`${pg} "UPDATE app_setting SET value='${esc}', is_secret=${secret}, updated_at=NOW() WHERE key='${key}'"`)
  } else {
    execSync(`${pg} "INSERT INTO app_setting (key,value,is_secret) VALUES ('${key}','${esc}',${secret})"`)
  }
}

const cfg = loadEnvFile(ENV_FILE)

console.log("\n=== 1) cPanel — create mailboxes ===")
for (const box of (cfg.MAILBOXES || "info@autotorental.com").split(",").map((s) => s.trim()).filter(Boolean)) {
  const [local, domain] = box.split("@")
  if (!local || !domain) continue
  const passKey = `MAIL_PASS_${local.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`
  const password = cfg[passKey] || cfg.MAIL_DEFAULT_PASSWORD
  if (!password) throw new Error(`Set ${passKey} or MAIL_DEFAULT_PASSWORD in ${ENV_FILE}`)
  try {
    await cpanelUapi(cfg, "Email", "add_pop", {
      email: local,
      password,
      domain,
      quota: cfg.MAIL_QUOTA_MB || "1024",
    })
    console.log(`  ✓ Created ${box}`)
  } catch (e) {
    if (/already exists/i.test(String(e.message))) console.log(`  · ${box} already exists`)
    else throw e
  }
}

console.log("\n=== 2) Cloudflare DNS ===")
await removeZohoMx(cfg)
await upsertDns(cfg, { type: "A", name: "mail", content: cfg.MAIL_SERVER_IP, proxied: false })
if (cfg.WEBMAIL_A === "true") {
  await upsertDns(cfg, { type: "A", name: "webmail", content: cfg.MAIL_SERVER_IP, proxied: false })
}
await upsertDns(cfg, {
  type: "MX", name: "@", content: cfg.MX_HOST || `mail.${cfg.DOMAIN}`, priority: cfg.MX_PRIORITY || "10", proxied: false,
})
await mergeSpf(cfg)

console.log("\n=== 3) Auto to Rental API SMTP ===")
const smtpHost = cfg.SMTP_HOST || cfg.MX_HOST || `mail.${cfg.DOMAIN}`
const smtpPort = cfg.SMTP_PORT || "465"
const smtpSecure = cfg.SMTP_SECURE ?? "true"
const smtpUser = cfg.SMTP_USER || "info@autotorental.com"
const smtpPass = cfg.SMTP_PASS || cfg.MAIL_PASS_INFO || cfg.MAIL_DEFAULT_PASSWORD
const smtpFrom = cfg.SMTP_FROM || `Auto to Rental <${smtpUser}>`

for (const [k, v] of Object.entries({
  ZOHO_SMTP_HOST: smtpHost,
  ZOHO_SMTP_PORT: smtpPort,
  ZOHO_SMTP_SECURE: smtpSecure,
  ZOHO_SMTP_USER: smtpUser,
  ZOHO_SMTP_PASS: smtpPass,
  ZOHO_FROM: smtpFrom,
})) upsertEnv(k, v)

await dbUpsert("zoho_smtp_host", smtpHost, "false")
await dbUpsert("zoho_smtp_port", smtpPort, "false")
await dbUpsert("zoho_smtp_secure", smtpSecure, "false")
await dbUpsert("zoho_smtp_user", smtpUser, "false")
await dbUpsert("zoho_smtp_pass", smtpPass, "true")
await dbUpsert("zoho_from_email", smtpFrom, "false")

console.log("\n=== 4) Test SMTP ===")
const t = nodemailer.createTransport({
  host: smtpHost,
  port: Number(smtpPort),
  secure: smtpSecure === "true",
  auth: { user: smtpUser, pass: smtpPass },
})
await t.verify()
console.log(`  ✓ SMTP OK — ${smtpUser} via ${smtpHost}:${smtpPort}`)

try {
  execSync("pm2 restart autorental-api", { stdio: "ignore" })
  console.log("  ✓ API restarted")
} catch {
  console.log("  → Run: pm2 restart autorental-api")
}

console.log("\n✓ Done. Test from Admin → Integrations → Test Email\n")
