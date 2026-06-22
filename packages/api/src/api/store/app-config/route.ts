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
}

// GET /store/app-config — public mobile-app config. If the App Builder has set
// `home_blocks`, we ALSO derive the legacy fields from them so the current app
// (which reads announcement/banners/featured) reflects the builder live, while a
// newer app build can render the full ordered block layout.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let cfg: any = {}
  try {
    const row = await pg("app_setting").where({ key: "mobile_app_config" }).first()
    cfg = row?.value ? JSON.parse(row.value) : {}
  } catch { cfg = {} }
  const merged: any = { ...DEFAULTS, ...cfg }

  const blocks: any[] = Array.isArray(merged.home_blocks) ? merged.home_blocks : []
  if (blocks.length) {
    const find = (t: string) => blocks.find((b) => b && b.type === t && b.enabled !== false)
    const ann = find("announcement")
    if (ann?.props?.text) merged.announcement = { enabled: true, text: ann.props.text, bg: ann.props.bg || "#1753b0", fg: ann.props.fg || "#ffffff" }
    const ban = find("banners")
    if (ban?.props?.items?.length) merged.banners = (ban.props.items || []).filter((x: any) => x?.image)
    const fc = find("featured_cars"); if (fc?.props?.ids?.length) merged.featured_vehicle_ids = fc.props.ids
    const fb = find("featured_brands"); if (fb?.props?.ids?.length) merged.featured_brand_ids = fb.props.ids
    const fco = find("featured_companies"); if (fco?.props?.ids?.length) merged.featured_seller_ids = fco.props.ids
  }
  res.json({ config: merged })
}
