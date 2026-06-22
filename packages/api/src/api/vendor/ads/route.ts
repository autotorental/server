import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"

const mkid = (p: string) => p + crypto.randomUUID().replace(/-/g, "")

function ser(c: any) {
  let platforms: any[] = []
  try { platforms = typeof c.platforms === "string" ? JSON.parse(c.platforms) : (c.platforms || []) } catch {}
  return { ...c, platforms, budget: Number(c.budget_cents) / 100, spend: Number(c.spend_cents) / 100,
    impressions: Number(c.impressions), clicks: Number(c.clicks), reach: Number(c.reach), leads: Number(c.leads),
    commission_pct: Number(c.commission_pct) }
}

async function ensureWallet(pg: any, sellerId: string) {
  let w = await pg("ad_wallet").where({ seller_id: sellerId }).first()
  if (!w) {
    await pg("ad_wallet").insert({ seller_id: sellerId, balance_cents: 0, currency: "aed" }).onConflict("seller_id").ignore()
    w = await pg("ad_wallet").where({ seller_id: sellerId }).first()
  }
  return w
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const wallet = await ensureWallet(pg, sellerId)
  const campaigns = await pg("ad_campaign").where({ seller_id: sellerId }).orderBy("created_at", "desc").limit(100)
  res.json({
    wallet: { balance: Number(wallet.balance_cents) / 100, currency: wallet.currency },
    campaigns: campaigns.map(ser),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "unauthenticated" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b: any = req.body || {}
  const name = String(b.name || "").trim()
  const platforms = Array.isArray(b.platforms) ? b.platforms.map((x: any) => String(x)).filter(Boolean) : []
  const target_type = ["store", "car", "category", "whatsapp"].includes(b.target_type) ? b.target_type : "store"
  const budget = Math.round(Number(b.budget || 0) * 100)
  if (!name) return res.status(400).json({ message: "Name is required" })
  if (!platforms.length) return res.status(400).json({ message: "Select at least one platform" })
  if (budget < 100) return res.status(400).json({ message: "Budget too low" })
  await ensureWallet(pg, sellerId)
  try {
    const camp = await pg.transaction(async (trx: any) => {
      const w = await trx("ad_wallet").where({ seller_id: sellerId }).forUpdate().first()
      const bal = w ? Number(w.balance_cents) : 0
      if (bal < budget) { const e: any = new Error("INSUFFICIENT_FUNDS"); e.code = "INSUFFICIENT"; throw e }
      const newBal = bal - budget
      await trx("ad_wallet").where({ seller_id: sellerId }).update({ balance_cents: newBal, updated_at: trx.fn.now() })
      await trx("ad_wallet_txn").insert({ id: mkid("adtx_"), seller_id: sellerId, kind: "debit", amount_cents: budget, balance_after_cents: newBal, note: `Ad budget: ${name}` })
      const cid = mkid("adc_")
      await trx("ad_campaign").insert({
        id: cid, seller_id: sellerId, name, platforms: JSON.stringify(platforms), target_type,
        target_id: b.target_id || null, target_url: b.target_url || null, budget_cents: budget,
        headline: b.headline || null, body_text: b.body_text || null, image_url: b.image_url || null,
        status: "pending_review",
      })
      return await trx("ad_campaign").where({ id: cid }).first()
    })
    res.json({ campaign: ser(camp) })
  } catch (e: any) {
    if (e.code === "INSUFFICIENT") return res.status(402).json({ message: "INSUFFICIENT_FUNDS", code: "INSUFFICIENT_FUNDS" })
    res.status(500).json({ message: String(e?.message || e) })
  }
}
