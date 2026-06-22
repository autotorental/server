import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { launchMetaCampaign } from "../../../../lib/meta-ads"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import crypto from "crypto"
import { notifyAdStatus } from "../../../../lib/ad-notify"

const mkid = (p: string) => p + crypto.randomUUID().replace(/-/g, "")
const VALID = ["pending_review", "approved", "active", "paused", "completed", "rejected"]

function ser(c: any) {
  let platforms: any[] = []
  try { platforms = typeof c.platforms === "string" ? JSON.parse(c.platforms) : (c.platforms || []) } catch {}
  return { ...c, platforms, budget: Number(c.budget_cents) / 100, spend: Number(c.spend_cents) / 100,
    impressions: Number(c.impressions), clicks: Number(c.clicks), reach: Number(c.reach), leads: Number(c.leads),
    commission_pct: Number(c.commission_pct) }
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const c = await pg("ad_campaign as c").leftJoin("seller as s", "s.id", "c.seller_id")
    .where("c.id", (req.params as any).id).select("c.*", "s.name as seller_name", "s.email as seller_email").first()
  if (!c) return res.status(404).json({ message: "Not found" })
  const wallet = await pg("ad_wallet").where({ seller_id: c.seller_id }).first()
  res.json({ campaign: { ...ser(c), seller_name: c.seller_name, seller_email: c.seller_email }, wallet: wallet ? { balance: Number(wallet.balance_cents) / 100 } : null })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const id = (req.params as any).id
  const b: any = req.body || {}
  const existing = await pg("ad_campaign").where({ id }).first()
  if (!existing) return res.status(404).json({ message: "Not found" })

  const upd: any = { updated_at: pg.fn.now() }
  if (b.commission_pct != null) upd.commission_pct = Math.max(0, Math.min(100, Number(b.commission_pct)))
  if (b.impressions != null) upd.impressions = Math.max(0, Math.round(Number(b.impressions)))
  if (b.clicks != null) upd.clicks = Math.max(0, Math.round(Number(b.clicks)))
  if (b.reach != null) upd.reach = Math.max(0, Math.round(Number(b.reach)))
  if (b.leads != null) upd.leads = Math.max(0, Math.round(Number(b.leads)))
  if (b.spend != null) upd.spend_cents = Math.max(0, Math.round(Number(b.spend) * 100))
  if (b.admin_note != null) upd.admin_note = String(b.admin_note).slice(0, 1000)
  if (b.headline != null) upd.headline = String(b.headline).slice(0, 300)
  if (b.body_text != null) upd.body_text = String(b.body_text).slice(0, 2000)
  if (b.image_url != null) upd.image_url = String(b.image_url).slice(0, 1000)
  if (b.video_url != null) upd.video_url = String(b.video_url).slice(0, 1000)
  if (b.start_at != null) upd.start_at = b.start_at ? new Date(b.start_at) : null
  if (b.end_at != null) upd.end_at = b.end_at ? new Date(b.end_at) : null

  let statusChanged: string | null = null
  const newStatus = b.status ? String(b.status) : null
  if (newStatus && VALID.includes(newStatus) && newStatus !== existing.status) {
    upd.status = newStatus
    statusChanged = newStatus
    if (newStatus === "active" && !existing.activated_at) upd.activated_at = pg.fn.now()
    if (newStatus === "rejected") {
      upd.reject_reason = String(b.reject_reason || b.admin_note || "").slice(0, 500)
      // refund full budget back to wallet
      await pg.transaction(async (trx: any) => {
        const w = await trx("ad_wallet").where({ seller_id: existing.seller_id }).forUpdate().first()
        const bal = (w ? Number(w.balance_cents) : 0) + Number(existing.budget_cents)
        if (w) await trx("ad_wallet").where({ seller_id: existing.seller_id }).update({ balance_cents: bal, updated_at: trx.fn.now() })
        else await trx("ad_wallet").insert({ seller_id: existing.seller_id, balance_cents: bal, currency: "aed" })
        await trx("ad_wallet_txn").insert({ id: mkid("adtx_"), seller_id: existing.seller_id, kind: "refund", amount_cents: Number(existing.budget_cents), balance_after_cents: bal, note: `Refund (rejected): ${existing.name}` })
      })
    }
    if (newStatus === "completed") {
      const remaining = Number(existing.budget_cents) - Number(upd.spend_cents != null ? upd.spend_cents : existing.spend_cents)
      if (remaining > 0) {
        await pg.transaction(async (trx: any) => {
          const w = await trx("ad_wallet").where({ seller_id: existing.seller_id }).forUpdate().first()
          const bal = (w ? Number(w.balance_cents) : 0) + remaining
          if (w) await trx("ad_wallet").where({ seller_id: existing.seller_id }).update({ balance_cents: bal, updated_at: trx.fn.now() })
          else await trx("ad_wallet").insert({ seller_id: existing.seller_id, balance_cents: bal, currency: "aed" })
          await trx("ad_wallet_txn").insert({ id: mkid("adtx_"), seller_id: existing.seller_id, kind: "refund", amount_cents: remaining, balance_after_cents: bal, note: `Unspent refund: ${existing.name}` })
        })
      }
    }
  }

  await pg("ad_campaign").where({ id }).update(upd)
  const updated = await pg("ad_campaign").where({ id }).first()

  // When approved/activated for Meta (Facebook/Instagram), create the REAL ad on
  // the Meta Marketing API. No-op (managed mode) until Meta keys are added in Settings.
  // Always PAUSED on Meta so the owner reviews + activates there (no spend until then).
  if (statusChanged === "active" && !updated.meta_ref) {
    try {
      const platforms = Array.isArray(updated.platforms)
        ? updated.platforms
        : (typeof updated.platforms === "string" ? JSON.parse(updated.platforms || "[]") : [])
      const wantsMeta = (platforms || []).some((p: any) => p === "facebook" || p === "instagram")
      if (wantsMeta) {
        const daysRaw = updated.start_at && updated.end_at
          ? Math.ceil((new Date(updated.end_at).getTime() - new Date(updated.start_at).getTime()) / 86400000)
          : 7
        const days = Math.max(1, daysRaw || 7)
        const r = await launchMetaCampaign(req.scope, {
          name: updated.name || "Auto to Rental campaign",
          landingUrl: updated.target_url || "https://autotorental.com",
          message: updated.body_text || updated.headline || updated.name || "Rent your next car with Auto to Rental.",
          headline: updated.headline || undefined,
          imageUrl: updated.image_url || undefined,
          dailyBudgetMinor: Math.max(100, Math.round(Number(updated.budget_cents || 0) / days)) || 2000,
          countries: ["AE"],
          active: false,
        })
        if ((r as any).configured) {
          await pg("ad_campaign").where({ id }).update({ meta_ref: JSON.stringify(r), updated_at: pg.fn.now() })
        }
      }
    } catch (e) { /* never block approval on a Meta API error */ }
  }
  if (statusChanged) { try { await notifyAdStatus(req, updated, statusChanged, upd.reject_reason) } catch {} }
  res.json({ campaign: ser(updated), notified: !!statusChanged })
}
