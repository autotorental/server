import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const b = req.body as any
  const upd: any = {}
  for (const k of ["emoji", "text", "text_ar", "link"]) if (typeof b[k] === "string") upd[k] = b[k].slice(0, 200)
  if (typeof b.active === "boolean") upd.active = b.active
  if (b.sort != null) upd.sort = Number(b.sort) || 0
  if (Object.keys(upd).length) await pg("ticker_news").where({ id }).update(upd)
  res.json({ ok: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  await pg("ticker_news").where({ id: (req.params as any).id }).del()
  res.json({ ok: true })
}
