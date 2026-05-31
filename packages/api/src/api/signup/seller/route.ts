import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { processSellerSignup } from "../../../lib/seller-signup"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const result = await processSellerSignup(req, req.body as any)
    return res.status(result.status).json(result.body)
  } catch (e: any) {
    console.error("[seller-signup]", e)
    return res.status(500).json({ message: e?.message || "Internal error" })
  }
}
