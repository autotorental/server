import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const DEFAULTS = {
  primary_color: "",
  announcement: { enabled: false, text: "", bg: "#1753b0", fg: "#ffffff" },
  banners: [] as { image: string; link?: string }[],
  featured_brand_ids: [] as string[],
  featured_vehicle_ids: [] as string[],
  featured_seller_ids: [] as string[],
  home_blocks: [] as any[],
  theme: { light: {}, dark: {} } as { light: Record<string, string>; dark: Record<string, string> },
}

const LIVE_KEY = "mobile_app_config"
const DRAFT_KEY = "mobile_app_config_draft"

async function read(pg: any, key = LIVE_KEY) {
  try {
    const row = await pg("app_setting").where({ key }).first()
    return row?.value ? { ...DEFAULTS, ...JSON.parse(row.value) } : null
  } catch { return null }
}

// GET returns the PUBLISHED (live) config + the DRAFT (unpublished edits) if any,
// so the App Builder loads the draft to keep editing and shows draft-vs-live.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const config = (await read(pg, LIVE_KEY)) || { ...DEFAULTS }
  const draft = await read(pg, DRAFT_KEY)
  res.json({ config, draft, has_draft: !!draft })
}

const BLOCK_TYPES = ["announcement", "banners", "video", "featured_cars", "featured_brands", "featured_companies", "categories", "ads", "heading"]

// POST /admin/app-config — save the mobile app config + drag-drop home_blocks.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = (req.body || {}) as any
  const str = (v: any, n = 200) => String(v ?? "").trim().slice(0, n)
  const arr = (v: any) => (Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 50) : [])

  const sanitizeBlock = (blk: any, i: number) => {
    const type = String(blk?.type || "")
    if (!BLOCK_TYPES.includes(type)) return null
    const p = blk?.props || {}
    const props: any = {}
    if (type === "announcement") { props.text = str(p.text, 300); props.bg = str(p.bg, 9) || "#1753b0"; props.fg = str(p.fg, 9) || "#ffffff" }
    else if (type === "banners") { props.items = (Array.isArray(p.items) ? p.items : []).map((x: any) => ({ image: str(x?.image, 500), link: str(x?.link, 300) })).filter((x: any) => x.image).slice(0, 12) }
    else if (type === "video") { props.url = str(p.url, 500); props.poster = str(p.poster, 500); props.link = str(p.link, 300) }
    else if (type === "featured_cars" || type === "featured_brands" || type === "featured_companies") { props.ids = arr(p.ids); props.title = str(p.title, 80) }
    else if (type === "categories") { props.title = str(p.title, 80) }
    else if (type === "ads") { props.title = str(p.title, 80); props.placement = str(p.placement, 20) || "cars" }
    else if (type === "heading") { props.text = str(p.text, 120) }
    return { id: str(blk?.id, 40) || `b${i}`, type, enabled: blk?.enabled !== false, props }
  }

  const cur = (await read(pg, LIVE_KEY)) || { ...DEFAULTS }
  const cfg: any = {
    ...cur,
    primary_color: b.primary_color !== undefined ? str(b.primary_color, 9) : cur.primary_color,
    home_blocks: Array.isArray(b.home_blocks) ? b.home_blocks.slice(0, 30).map(sanitizeBlock).filter(Boolean) : cur.home_blocks,
  }
  // Keep legacy fields editable too (older page / direct API), if sent.
  if (b.announcement) cfg.announcement = { enabled: !!b.announcement.enabled, text: str(b.announcement.text, 300), bg: str(b.announcement.bg, 9) || "#1753b0", fg: str(b.announcement.fg, 9) || "#ffffff" }
  if (Array.isArray(b.banners)) cfg.banners = b.banners.map((x: any) => ({ image: str(x?.image, 500), link: str(x?.link, 300) })).filter((x: any) => x.image).slice(0, 12)
  if (Array.isArray(b.featured_brand_ids)) cfg.featured_brand_ids = arr(b.featured_brand_ids)
  if (Array.isArray(b.featured_vehicle_ids)) cfg.featured_vehicle_ids = arr(b.featured_vehicle_ids)
  if (Array.isArray(b.featured_seller_ids)) cfg.featured_seller_ids = arr(b.featured_seller_ids)

  // Full-app theme overrides — only known colour tokens with a valid hex.
  if (b.theme && typeof b.theme === "object") {
    const isHex = (v: any) => typeof v === "string" && /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v)
    const ALLOWED = ["tint", "background", "cardBackground", "text", "icon", "border", "tabIconDefault", "tabIconSelected", "error", "warning", "success", "imagePlaceholder"]
    const clean = (m: any) => {
      const out: Record<string, string> = {}
      if (m && typeof m === "object") for (const k of ALLOWED) if (isHex(m[k])) out[k] = m[k]
      return out
    }
    cfg.theme = { light: clean(b.theme.light), dark: clean(b.theme.dark) }
  }

  // mode: "draft" → save to draft only (live users unaffected).
  //       "publish" (default) → push live to ALL users; draft mirrors live.
  const mode = String(b.mode || "publish") === "draft" ? "draft" : "publish"
  const json = JSON.stringify(cfg)
  const writeKey = async (key: string) => {
    await pg("app_setting").insert({ key, value: json, is_secret: false, updated_at: new Date() }).onConflict("key").merge({ value: json, updated_at: new Date() })
  }
  try {
    if (mode === "draft") {
      await writeKey(DRAFT_KEY)
    } else {
      await writeKey(LIVE_KEY)
      await writeKey(DRAFT_KEY) // keep draft in sync after publishing
    }
    res.json({ config: cfg, mode, published: mode === "publish" })
  } catch (e: any) {
    res.status(500).json({ message: "Could not save app config" })
  }
}
