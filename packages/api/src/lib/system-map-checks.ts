import { execSync } from "child_process"
import * as crypto from "crypto"

// Shared live health checks for the System Map (admin route + monitor job).
// Whole-map result cached 2 min. Clarity cached 6h on its own (its API allows only ~10 calls/day).

const T = 6000
async function http(url: string, opts: any = {}, okCodes: number[] = [200]): Promise<any> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), T)
  const t0 = Date.now()
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal })
    clearTimeout(timer)
    return { ok: okCodes.includes(r.status), code: r.status, ms: Date.now() - t0 }
  } catch (e: any) {
    clearTimeout(timer)
    return { ok: false, ms: Date.now() - t0, err: String(e?.name || e?.message || e).slice(0, 60) }
  }
}

const b64 = (o: any) => Buffer.from(JSON.stringify(o)).toString("base64url")
async function googleSaToken(saRaw: string, scope: string): Promise<boolean> {
  try {
    const sa = typeof saRaw === "string" ? JSON.parse(saRaw) : saRaw
    const now = Math.floor(Date.now() / 1000)
    const input = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`
    const key = crypto.createPrivateKey({ key: sa.private_key, format: "pem" })
    const sig = crypto.sign("RSA-SHA256", Buffer.from(input), key).toString("base64url")
    const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${input}.${sig}` }), signal: AbortSignal.timeout(T) })
    const d: any = await r.json().catch(() => ({}))
    return !!d.access_token
  } catch { return false }
}

// config page each node links to (clicking the icon opens it). "" = no config page.
const LINKS: Record<string, string> = {
  storefront: "https://autotorental.com",
  openai: "/dashboard/ai-settings", claude: "/dashboard/ai-settings", hf: "/dashboard/ai-settings",
  fal: "/dashboard/integrations", aivideo: "/dashboard/integrations", rapidapi: "/dashboard/integrations", google: "/dashboard/integrations",
  cloudflare: "/dashboard/cloudflare-analytics", firebase: "/dashboard/firebase-analytics",
  email: "/dashboard/inbox", clarity: "/dashboard/clarity", bing: "/dashboard/bing-webmaster",
  mollie: "/dashboard/settings/payments", stripe: "/dashboard/settings/payments",
  livekit: "/dashboard/call-logs", livekit_token: "/dashboard/call-logs", blog: "/dashboard/blog",
}

let CLARITY: { val: any; ts: number } | null = null
async function clarityCheck(token?: string): Promise<any> {
  if (!token) return { status: "off", detail: "not configured" }
  if (CLARITY && Date.now() - CLARITY.ts < 6 * 3600 * 1000) return CLARITY.val
  const r = await http("https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1", { headers: { Authorization: `Bearer ${token}` } })
  const val = r.ok ? { status: "ok", detail: `live · ${r.ms}ms`, ms: r.ms } : { status: "warn", detail: "configured · couldn't verify (Clarity ~10 checks/day limit)" }
  CLARITY = { val, ts: Date.now() }
  return val
}

async function runChecks(pg: any): Promise<any> {
  const S: Record<string, string> = {}
  try { (await pg("app_setting").select("key", "value")).forEach((r: any) => { if (r.value) S[r.key] = r.value }) } catch { /* */ }
  const have = (...keys: string[]) => keys.some((k) => S[k] && String(S[k]).length > 4)

  const proc: Record<string, any> = {}
  try {
    const raw = execSync("pm2 jlist", { timeout: 4000, encoding: "utf8" }).toString()
    JSON.parse(raw || "[]").forEach((p: any) => { proc[p.name] = { status: p.pm2_env?.status, cpu: p.monit?.cpu ?? 0, mem: Math.round((p.monit?.memory || 0) / 1048576) } })
  } catch { /* */ }
  const procStat = (name: string) => { const p = proc[name]; return !p ? { status: "down", detail: "not found" } : { status: p.status === "online" ? "ok" : "down", detail: `${p.status} · ${p.cpu}% · ${p.mem}MB` } }

  const googleMapsCheck = async () => {
    if (!have("google_maps_api_key")) return { status: "off", detail: "not configured" }
    const t0 = Date.now()
    try {
      const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=Dubai&key=${S.google_maps_api_key}`, { signal: AbortSignal.timeout(T) })
      const d: any = await r.json().catch(() => ({})); const ms = Date.now() - t0
      return ["OK", "ZERO_RESULTS"].includes(d.status) ? { status: "ok", detail: `${d.status} · ${ms}ms`, ms } : { status: "down", detail: d.status || `HTTP ${r.status}` }
    } catch (e: any) { return { status: "down", detail: String(e?.name || e).slice(0, 40) } }
  }
  const bingCheck = async () => {
    if (!have("bing_webmaster_api_key")) return { status: "off", detail: "not configured" }
    const r = await http(`https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats?apikey=${encodeURIComponent(S.bing_webmaster_api_key)}&siteUrl=${encodeURIComponent("https://autotorental.com")}`)
    return r.ok ? { status: "ok", detail: `live · ${r.ms}ms`, ms: r.ms } : { status: "down", detail: r.err || `HTTP ${r.code}` }
  }
  const firebaseCheck = async () => {
    if (!have("ga4_service_account_json")) return have("firebase_app_id") ? { status: "warn", detail: "no service account" } : { status: "off", detail: "not configured" }
    const t0 = Date.now(); const ok = await googleSaToken(S.ga4_service_account_json, "https://www.googleapis.com/auth/firebase.messaging")
    return ok ? { status: "ok", detail: `token · ${Date.now() - t0}ms`, ms: Date.now() - t0 } : { status: "down", detail: "auth failed" }
  }

  const [dbR, sfR, meiliR, lkR, cfR, oaiR, clR, moR, hfR, gR, bR, fbR, claR] = await Promise.all([
    (async () => { const t0 = Date.now(); try { await pg.raw("SELECT 1"); return { ok: true, ms: Date.now() - t0 } } catch (e: any) { return { ok: false, err: String(e?.message || e).slice(0, 50) } } })(),
    http("http://127.0.0.1:7100/"),
    http("http://127.0.0.1:7700/health"),
    http("https://livekit.autotorental.com/", {}, [200, 404]),
    have("cloudflare_api_token") ? http("https://api.cloudflare.com/client/v4/zones?per_page=1", { headers: S.cloudflare_email ? { "X-Auth-Email": S.cloudflare_email, "X-Auth-Key": S.cloudflare_api_token } : { Authorization: `Bearer ${S.cloudflare_api_token}` } }) : Promise.resolve(null),
    have("openai_api_key") ? http("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${S.openai_api_key}` } }) : Promise.resolve(null),
    have("claude_api_key") ? http("https://api.anthropic.com/v1/models", { headers: { "x-api-key": S.claude_api_key, "anthropic-version": "2023-06-01" } }) : Promise.resolve(null),
    have("mollie_api_key") ? http("https://api.mollie.com/v2/methods", { headers: { Authorization: `Bearer ${S.mollie_api_key}` } }) : Promise.resolve(null),
    have("huggingface_api_key") ? http("https://huggingface.co/api/whoami-v2", { headers: { Authorization: `Bearer ${S.huggingface_api_key}` } }) : Promise.resolve(null),
    googleMapsCheck(), bingCheck(), firebaseCheck(), clarityCheck(S.clarity_api_token),
  ])

  const deep = (r: any) => !r ? { status: "off", detail: "not configured" } : r.ok ? { status: "ok", detail: `${r.code} · ${r.ms}ms`, ms: r.ms } : { status: "down", detail: r.err || `HTTP ${r.code}` }
  const cfg = (ok: boolean) => ok ? { status: "warn", detail: "configured (no live test)" } : { status: "off", detail: "not configured" }
  const N = (id: string, label: string, group: string, icon: string, st: any) => ({ id, label, group, icon, status: st.status, detail: st.detail, ms: st.ms ?? null, link: LINKS[id] || "" })

  let adsActive = 0, adsTotal = 0
  try { const a: any = await pg("ad_campaign").count({ c: "id" }); adsTotal = Number(a?.[0]?.c || 0); const b: any = await pg("ad_campaign").where({ status: "active" }).count({ c: "id" }); adsActive = Number(b?.[0]?.c || 0) } catch {}
  const nodes = [
    N("api", "ATR API (Medusa)", "core", "🧠", procStat("autorental-api")),
    N("storefront", "Website (Next.js)", "core", "🌐", sfR.ok ? { status: "ok", detail: `200 · ${sfR.ms}ms`, ms: sfR.ms } : { status: "down", detail: sfR.err || `HTTP ${sfR.code}` }),
    N("db", "PostgreSQL", "core", "🗄️", dbR.ok ? { status: "ok", detail: `${dbR.ms}ms`, ms: dbR.ms } : { status: "down", detail: dbR.err || "down" }),
    N("search", "MeiliSearch", "core", "🔎", meiliR.ok ? { status: "ok", detail: `${meiliR.ms}ms`, ms: meiliR.ms } : { status: "warn", detail: "no health endpoint" }),
    N("blog", "Blog", "core", "📝", procStat("storefront-blog")),
    N("media", "Media worker", "core", "🎞️", procStat("atr-media-worker")),
    N("mobile", "Mobile apps", "core", "📱", { status: "warn", detail: "iOS + Android (shipped)" }),
    N("livekit_token", "LiveKit token", "calls", "🎟️", procStat("livekit-token")),
    N("livekit", "LiveKit server", "calls", "📞", lkR.ok ? { status: "ok", detail: `${lkR.code} · ${lkR.ms}ms`, ms: lkR.ms } : { status: "down", detail: lkR.err || "unreachable" }),
    N("openai", "OpenAI (ChatGPT)", "ai", "🤖", deep(oaiR)),
    N("claude", "Claude (Anthropic)", "ai", "✨", deep(clR)),
    N("hf", "HuggingFace", "ai", "🧩", deep(hfR)),
    N("fal", "FAL (AI image/video)", "ai", "🎨", cfg(have("fal_api_key"))),
    N("aivideo", "AI Video (Luma/Runway)", "ai", "🎬", cfg(have("luma_api_key", "runway_api_key"))),
    N("cloudflare", "Cloudflare", "infra", "☁️", deep(cfR)),
    N("firebase", "Firebase (Push)", "infra", "🔥", fbR),
    N("google", "Google APIs", "infra", "🇬", gR),
    N("email", "Email (SMTP)", "infra", "📧", cfg(have("mail_smtp_host"))),
    N("clarity", "MS Clarity", "infra", "📊", claR),
    N("bing", "Bing Webmaster", "infra", "🔷", bR),
    N("rapidapi", "RapidAPI (VIN)", "infra", "🔌", cfg(have("rapidapi_key"))),
    N("mollie", "Mollie (payments)", "pay", "💳", deep(moR)),
    N("stripe", "Stripe", "pay", "💳", cfg(have("stripe_secret_key"))),
    N("ads_wallet", "Ad Wallet", "ads", "\uD83D\uDC5B", { status: "ok", detail: "prepaid AED wallet" }),
    N("ads_campaigns", "Ad Campaigns", "ads", "\uD83D\uDCE2", { status: adsTotal ? "ok" : "warn", detail: `${adsActive} active \u00b7 ${adsTotal} total` }),
    N("ads_manager", "Ads Manager", "ads", "\uD83C\uDF9B\uFE0F", { status: "ok", detail: "review + commission + notify" }),
    N("ads_sponsored", "Sponsored in app", "ads", "\u2728", { status: "ok", detail: "cars + reels \u00b7 live tracking" }),
    N("ig_ads", "Instagram Ads", "ads", "\uD83D\uDCF8", cfg(have("instagram_business_id"))),
    N("fb_ads", "Facebook Ads", "ads", "\uD83D\uDCD8", cfg(have("facebook_page_id", "meta_access_token"))),
    N("tiktok_ads", "TikTok Ads", "ads", "\uD83C\uDFB5", cfg(have("tiktok_access_token"))),
    N("snap_ads", "Snapchat Ads", "ads", "\uD83D\uDC7B", cfg(have("snapchat_access_token"))),
    N("google_ads", "Google Ads", "ads", "\uD83D\uDD0D", cfg(have("google_ads_id"))),
  ]

  const toApi = ["storefront", "blog", "media", "mobile", "livekit_token"]
  const ADS_IDS = ["ads_wallet", "ads_campaigns", "ads_manager", "ads_sponsored", "ig_ads", "fb_ads", "tiktok_ads", "snap_ads", "google_ads"]
  const fromApi = nodes.map((n) => n.id).filter((id) => id !== "api" && !toApi.includes(id) && !ADS_IDS.includes(id))
  const adsEdges = [
    { from: "api", to: "ads_campaigns" }, { from: "ads_wallet", to: "ads_campaigns" },
    { from: "ads_campaigns", to: "ads_manager" },
    { from: "ads_manager", to: "ig_ads" }, { from: "ads_manager", to: "fb_ads" }, { from: "ads_manager", to: "tiktok_ads" }, { from: "ads_manager", to: "snap_ads" }, { from: "ads_manager", to: "google_ads" },
    { from: "ads_manager", to: "ads_sponsored" }, { from: "ads_sponsored", to: "storefront" }, { from: "ads_sponsored", to: "mobile" },
  ]
  const edges = [...toApi.map((id) => ({ from: id, to: "api" })), ...fromApi.map((id) => ({ from: "api", to: id })), { from: "livekit_token", to: "livekit" }, ...adsEdges]
  const summary = { ok: 0, warn: 0, down: 0, off: 0 }
  nodes.forEach((n) => { (summary as any)[n.status]++ })
  return { nodes, edges, summary, checked_at: new Date().toISOString() }
}

let LAST: { data: any; ts: number } | null = null
export async function getSystemMap(pg: any, force = false): Promise<any> {
  if (!force && LAST && Date.now() - LAST.ts < 120000) return LAST.data
  const data = await runChecks(pg)
  LAST = { data, ts: Date.now() }
  return data
}
