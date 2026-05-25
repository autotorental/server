import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const handle = req.params.handle
  if (!handle) return res.status(400).json({ message: "Handle is required" })

  try {
    const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const [seller] = await pg("seller").where({ handle }).select("*")

    if (!seller) return res.status(404).json({ message: "Seller not found" })

    return res.json({ seller })
  } catch (e: any) {
    console.error("[by-handle]", e)
    return res.status(500).json({ message: e?.message || "Internal error" })
  }
}
