import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ipToCountry, getClientIp } from "../../../../lib/geoip"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const ip = getClientIp(req)
  const countryCode = await ipToCountry(ip, req.headers as Record<string, unknown>)

  res.json({
    ip,
    country_code: countryCode || "ae",
    detected: !!countryCode,
  })
}
