import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

function ser(c: any) {
  let platforms: any[] = []
  try { platforms = typeof c.platforms === "string" ? JSON.parse(c.platforms) : (c.platforms || []) } catch {}
  return { ...c, platforms, budget: Number(c.budget_cents) / 100, spend: Number(c.spend_cents) / 100,
    impressions: Number(c.impressions), clicks: Number(c.clicks), reach: Number(c.reach), leads: Number(c.leads),
    commission_pct: Number(c.commission_pct) }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any
  const status = q.status ? String(q.status) : null
  const sellerId = q.seller_id ? String(q.seller_id) : null
  const search = q.q ? String(q.q).trim() : null
  const limit = Math.min(Number(q.limit) || 50, 200)
  const offset = Number(q.offset) || 0

  let base = pg("ad_campaign as c").leftJoin("seller as s", "s.id", "c.seller_id")
  if (status) base = base.where("c.status", status)
  if (sellerId) base = base.where("c.seller_id", sellerId)
  if (search) base = base.where((b: any) => b.whereILike("c.name", `%${search}%`).orWhereILike("s.name", `%${search}%`))

  const rows = await base.clone().orderBy("c.created_at", "desc").limit(limit).offset(offset)
    .select("c.*", "s.name as seller_name", "s.email as seller_email")
  const countRow = await base.clone().count({ n: "c.id" }).first()

  const summaryRows = await pg("ad_campaign").select("status").count({ n: "id" }).groupBy("status")
  const summary: Record<string, number> = {}
  for (const r of summaryRows) summary[r.status] = Number(r.n)

  res.json({
    campaigns: rows.map((r: any) => ({ ...ser(r), seller_name: r.seller_name, seller_email: r.seller_email })),
    count: Number(countRow?.n || 0), summary, limit, offset,
  })
}
