import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getSystemMap } from "../../../lib/system-map-checks"

// GET /admin/system-map[?force=1] — live connection map with real status checks (2-min cached).
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const force = (req.query as any).force === "1"
  try {
    res.json(await getSystemMap(pg, force))
  } catch (e: any) {
    res.status(500).json({ message: String(e?.message || e).slice(0, 200) })
  }
}
