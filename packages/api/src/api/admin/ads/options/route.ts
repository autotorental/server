import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const COUNTRIES = ["United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman", "Egypt", "Jordan", "Lebanon", "United Kingdom", "United States", "India", "Pakistan", "Philippines"]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  let companies: any[] = [], categories: string[] = []
  try { companies = await pg("seller").whereNull("deleted_at").select("id", "name").orderBy("name").limit(100) } catch {}
  try { const rows = await pg("body_type").select("name").orderBy("name"); categories = rows.map((r: any) => r.name).filter(Boolean) } catch {}
  res.json({
    companies, categories, countries: COUNTRIES,
    goals: [
      { id: "whatsapp", label: "WhatsApp leads" },
      { id: "call", label: "Phone calls" },
      { id: "view", label: "Car page views" },
      { id: "traffic", label: "Website visits" },
    ],
  })
}
