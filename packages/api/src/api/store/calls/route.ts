import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendPushToSeller } from "../../../lib/push"
import { rateLimited, clientIp as rlIp } from "../../../lib/rate-limit"

function getCustomerId(req: MedusaRequest): string | null {
  const auth = (req as any).auth_context
  return auth?.actor_id || null
}

function getClientIp(req: MedusaRequest): string | null {
  const fwd = (req.headers["x-forwarded-for"] as string) || ""
  const first = fwd.split(",")[0]?.trim()
  if (first) return first
  return (req.socket as any)?.remoteAddress || null
}

async function lookupCountry(ip: string | null): Promise<string | null> {
  if (!ip) return null
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1)/.test(ip)) return null
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const r = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country`, { signal: ctrl.signal })
    clearTimeout(t)
    const j: any = await r.json()
    if (j?.status === "success" && j?.country) return j.country as string
  } catch {}
  return null
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("store_calls", rlIp(req), 6, 60000)) return res.status(429).json({ message: "Too many call attempts — please wait a moment" })
  const body = req.body as any
  if (!body?.seller_id || !body?.vehicle_id) {
    return res.status(400).json({ message: "seller_id and vehicle_id required" })
  }

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const seller = await pg("seller").where({ id: body.seller_id }).first()
  if (!seller) return res.status(404).json({ message: "Seller not found" })
  if (seller.status === "rejected" || seller.status === "suspended") {
    return res.status(403).json({ message: "Company is not available" })
  }

  const vehicle = await pg("vehicle").where({ id: body.vehicle_id }).first()
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" })
  if (vehicle.seller_id !== body.seller_id) {
    return res.status(400).json({ message: "Vehicle does not belong to this company" })
  }
  if (vehicle.status !== "active") {
    return res.status(400).json({ message: "Vehicle is not available for calls" })
  }

  const clientId = body.client_id || getCustomerId(req) || null

  if (clientId) {
    const own = await pg("seller_seller_customer_customer")
      .where({ seller_id: body.seller_id, customer_id: clientId })
      .whereNull("deleted_at")
      .first()
    if (own) {
      return res.status(400).json({ message: "You can't call your own listing" })
    }
  }

  const clientIp = getClientIp(req)
  const clientCountry = await lookupCountry(clientIp)

  const callId = "call_" + Math.random().toString(36).slice(2, 14) + Date.now().toString(36)
  const roomName = "veh-" + body.vehicle_id

  await pg("vendor_call").insert({
    id: callId,
    vehicle_id: body.vehicle_id,
    seller_id: body.seller_id,
    client_id: clientId,
    room_name: roomName,
    client_name: body.client_name || null,
    client_phone: body.client_phone || null,
    client_ip: clientIp,
    client_country: clientCountry,
    direction: "inbound",
    status: "ringing",
    created_at: new Date(),
    updated_at: new Date(),
  })

  void sendPushToSeller(pg, body.seller_id, {
    title: "Incoming call",
    body: body.client_name || vehicle.title || "You have an incoming call",
    dataOnly: true,
    data: { type: "incoming_call", callId, title: "Incoming call", client_name: body.client_name || "" },
  }).catch(() => {})

  res.status(201).json({
    call: {
      id: callId,
      room: roomName,
      vehicle_id: body.vehicle_id,
      status: "ringing",
    },
  })
}
