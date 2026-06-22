import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import jwt from "jsonwebtoken"
import { linkSellerAuthIdentity, resolveSellerAuthByEmail, resolveSellerAuthByIdentity } from "../../../../../lib/link-seller-auth"
import { rateLimited, clientIp } from "../../../../../lib/rate-limit"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (rateLimited("seller_login", clientIp(req), 10, 60000)) return res.status(429).json({ message: "Too many login attempts — please wait a minute" })
  const body = (req.body || {}) as { email?: string; password?: string }
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  const authService = req.scope.resolve(Modules.AUTH)
  const authResult = await authService.authenticate("emailpass", {
    url: req.url,
    headers: req.headers as Record<string, string>,
    query: req.query as Record<string, string>,
    body: { email, password },
    protocol: req.protocol,
  })

  if (!authResult.success || !authResult.authIdentity?.id) {
    return res.status(401).json({ message: authResult.error || "Invalid email or password" })
  }

  const pg: any = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  // Prefer the seller_id already linked on the authenticated identity, then fall
  // back to matching by email (seller contact email OR member login email).
  const resolved =
    (await resolveSellerAuthByIdentity(pg, authResult.authIdentity)) ||
    (await resolveSellerAuthByEmail(pg, email))

  if (!resolved) {
    return res.status(404).json({ message: "No vendor company profile linked to this account yet" })
  }

  await linkSellerAuthIdentity(pg, authResult.authIdentity.id, resolved.seller_id, resolved.member_id)

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).json({ message: "JWT secret is not configured" })
  }

  const token = jwt.sign(
    {
      actor_id: resolved.member_id,
      actor_type: "member",
      auth_identity_id: authResult.authIdentity.id,
      app_metadata: {
        seller_id: resolved.seller_id,
        member_id: resolved.member_id,
      },
      user_metadata: {},
    },
    secret,
    { expiresIn: "24h" }
  )

  return res.json({
    token,
    seller_id: resolved.seller_id,
    member_id: resolved.member_id,
    user: {
      id: resolved.seller_id,
      email: resolved.seller.email,
      name: resolved.seller.name,
      role: "vendor",
      seller_id: resolved.seller_id,
      company_name: resolved.seller.name,
    },
    seller: resolved.seller,
  })
}
