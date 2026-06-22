import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { processSellerSignup } from "../../../lib/seller-signup"

import { rateLimited, clientIp } from "../../../lib/rate-limit"
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("seller_signup", clientIp(req), 5, 3600000)) return res.status(429).json({ message: "Too many signups from your network — try later" })
  try {
    const result = await processSellerSignup(req, req.body as any)
    return res.status(result.status).json(result.body)
  } catch (e: any) {
    console.error("[seller-signup]", e)
    return res.status(500).json({ message: e?.message || "Internal error" })
  }
}
