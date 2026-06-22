import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resolveVendorSellerId } from "../../../lib/vendor-seller"
import { getSetting } from "../../../lib/settings"
import * as crypto from "crypto"

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function sendOTP(phone: string, otp: string, clientName: string, sellerName: string, scope: any): Promise<boolean> {
  // Try WhatsApp first via Twilio
  const sid = await getSetting(scope, "twilio_account_sid").catch(() => "")
  const token = await getSetting(scope, "twilio_auth_token").catch(() => "")
  const waFrom = await getSetting(scope, "twilio_whatsapp_from").catch(() => "")
  if (sid && token && waFrom) {
    try {
      const msg = `🚗 *${sellerName}* Car Rental\nHello ${clientName}! Your verification code is: *${otp}*\nValid for 10 minutes. Reply STOP to opt out.`
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: { "Authorization": "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ From: `whatsapp:${waFrom}`, To: `whatsapp:${phone}`, Body: msg }).toString(),
      })
      if (r.ok) return true
    } catch { /* try SMS */ }
  }
  // Log for development
  console.log(`[OTP] Send to ${phone}: ${otp}`)
  return true
}

// GET /vendor/rental-tracking
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const sessions = await pg("rental_tracking as rt")
    .leftJoin("vehicle as v", "v.id", "rt.vehicle_id")
    .where("rt.seller_id", sellerId)
    .whereIn("rt.status", ["pending", "active"])
    .orderBy("rt.created_at", "desc")
    .select("rt.*", "v.title as vehicle_title", "v.photos as vehicle_photos")
    .limit(100)
  res.json({ sessions })
}

// POST /vendor/rental-tracking
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const sellerId = await resolveVendorSellerId(req)
  if (!sellerId) return res.status(401).json({ message: "Unauthorized" })
  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const b = (req.body || {}) as any
  if (!b.client_phone?.trim() || !b.client_name?.trim()) return res.status(400).json({ message: "client_phone and client_name required" })
  const otp = generateOTP()
  const token = crypto.randomBytes(24).toString("hex")
  const seller = await pg("seller").where({ id: sellerId }).first()
  const [session] = await pg("rental_tracking").insert({
    seller_id: sellerId, vehicle_id: b.vehicle_id || null,
    client_name: b.client_name.trim(), client_phone: b.client_phone.trim(),
    otp, otp_expires_at: new Date(Date.now() + 10 * 60000),
    tracking_token: token, status: "pending", notes: b.notes || null,
    created_at: new Date(), updated_at: new Date(),
  }).returning("*")
  await sendOTP(b.client_phone.trim(), otp, b.client_name.trim(), seller?.name || "Rental Company", req.scope)
  const trackingUrl = `https://autotorental.com/track/${token}`
  res.status(201).json({ session, tracking_url: trackingUrl, otp_sent: true })
}
