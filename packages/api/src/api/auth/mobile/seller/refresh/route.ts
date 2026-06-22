import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import jwt from "jsonwebtoken"

// Re-mints a fresh 24h vendor (member) token from the caller's current token.
// The current token acts as its own refresh token within a grace window: a
// still-valid OR recently-expired token can be exchanged, but one expired
// longer than REFRESH_GRACE_MS must re-authenticate. This lets the mobile app
// keep a vendor signed in across days without storing their password.
const TOKEN_TTL = "24h"
const REFRESH_GRACE_MS = 14 * 24 * 60 * 60 * 1000 // 14 days past expiry

type MemberClaims = {
  actor_id?: string
  actor_type?: string
  auth_identity_id?: string
  app_metadata?: { seller_id?: string; member_id?: string }
  user_metadata?: Record<string, unknown>
  exp?: number
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const header = req.headers.authorization || ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""

  if (!token) {
    return res.status(401).json({ message: "Missing bearer token" })
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    return res.status(500).json({ message: "JWT secret is not configured" })
  }

  let claims: MemberClaims
  try {
    // Verify the signature but tolerate expiry so a recently-expired token can
    // still be exchanged within the grace window below.
    claims = jwt.verify(token, secret, { ignoreExpiration: true }) as MemberClaims
  } catch {
    return res.status(401).json({ message: "Invalid token" })
  }

  if (claims.actor_type !== "member" || !claims.app_metadata?.seller_id) {
    return res.status(401).json({ message: "Not a vendor token" })
  }

  if (typeof claims.exp === "number") {
    const expiredFor = Date.now() - claims.exp * 1000
    if (expiredFor > REFRESH_GRACE_MS) {
      return res.status(401).json({ message: "Session expired, please sign in again" })
    }
  }

  const newToken = jwt.sign(
    {
      actor_id: claims.actor_id,
      actor_type: "member",
      auth_identity_id: claims.auth_identity_id,
      app_metadata: {
        seller_id: claims.app_metadata.seller_id,
        member_id: claims.app_metadata.member_id,
      },
      user_metadata: claims.user_metadata ?? {},
    },
    secret,
    { expiresIn: TOKEN_TTL }
  )

  return res.json({
    token: newToken,
    seller_id: claims.app_metadata.seller_id,
    member_id: claims.app_metadata.member_id,
  })
}
