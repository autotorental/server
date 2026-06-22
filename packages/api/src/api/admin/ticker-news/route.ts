import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import * as crypto from "crypto"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const items = await pg("ticker_news").select("*").orderBy([{ column: "sort", order: "asc" }, { column: "created_at", order: "desc" }])
  res.json({ items })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = req.body as any
  if (!b?.text || typeof b.text !== "string" || !b.text.trim()) return res.status(400).json({ message: "text is required" })
  const item = {
    id: "tkn_" + crypto.randomUUID().replace(/-/g, ""),
    emoji: (b.emoji || "📣").slice(0, 8),
    text: b.text.trim().slice(0, 200),
    text_ar: (b.text_ar || "").trim().slice(0, 200) || null,
    link: (b.link || "").trim() || null,
    active: b.active !== false,
    sort: Number(b.sort) || 0,
    created_at: new Date(),
  }
  await pg("ticker_news").insert(item)
  res.json({ item })
}
