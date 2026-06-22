import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const q = req.query as any

  const limit = Math.min(parseInt(q.limit, 10) || 50, 200)
  const offset = parseInt(q.offset, 10) || 0
  const search = String(q.q || "").trim().toLowerCase()

  const base = pg("customer").whereNull("deleted_at")
  if (search) {
    base.where((b: any) => {
      b.whereRaw("LOWER(email) like ?", [`%${search}%`])
        .orWhereRaw("LOWER(COALESCE(first_name,'')) like ?", [`%${search}%`])
        .orWhereRaw("LOWER(COALESCE(last_name,'')) like ?", [`%${search}%`])
        .orWhere("phone", "like", `%${search}%`)
        .orWhereRaw("metadata->>'last_ip' like ?", [`%${search}%`])
    })
  }

  const countRow = await base.clone().count("id as c").first()
  const count = parseInt(countRow?.c, 10) || 0

  const rows = await base
    .clone()
    .select(
      "id",
      "email",
      "first_name",
      "last_name",
      "phone",
      "metadata",
      "created_at"
    )
    .orderByRaw("(metadata->>'last_seen_at') desc nulls last")
    .orderBy("created_at", "desc")
    .limit(limit)
    .offset(offset)

  const customers = rows.map((c: any) => {
    const m = c.metadata || {}
    return {
      id: c.id,
      email: c.email,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || null,
      phone: c.phone || null,
      last_ip: m.last_ip || null,
      last_country: m.last_country || null,
      last_country_name: m.last_country_name || null,
      last_seen_at: m.last_seen_at || null,
      created_at: c.created_at,
    }
  })

  res.json({ customers, count, limit, offset })
}
