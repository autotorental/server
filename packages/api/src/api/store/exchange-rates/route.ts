import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Static exchange rates — AED is base currency
const RATES: Record<string, number> = {
  AED: 1, USD: 0.272, EUR: 0.251, GBP: 0.215,
  SAR: 1.02, KWD: 0.084, BHD: 0.103, QAR: 0.991,
  OMR: 0.105, JOD: 0.193, EGP: 13.3, SYP: 3520,
  CNY: 1.98, INR: 22.7, PKR: 76.2, TRY: 8.9, RUB: 24.9,
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ rates: RATES, base: "AED", updated_at: new Date().toISOString() })
}
