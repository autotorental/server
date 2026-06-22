import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const url = String(req.query.url || "").trim()
  try {
    const rows = await pg("pagespeed_history")
      .modify((q: any) => { if (url) q.where({ url }) })
      .orderBy("created_at", "desc").limit(30)
    res.json({ history: rows })
  } catch(e: any) { res.status(500).json({ history: [], error: e.message }) }
}
