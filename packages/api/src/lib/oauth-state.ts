import crypto from "crypto"

type OauthProvider = "instagram" | "google_business" | "firebase"

type OauthStatePayload = {
  provider: OauthProvider
  ts: number
  nonce: string
  return_to?: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.COOKIE_SECRET
  if (!secret) {
    throw new Error("OAuth state secret is not configured (set JWT_SECRET or COOKIE_SECRET)")
  }
  return secret
}

function base64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input)
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function unbase64url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  return Buffer.from(normalized + pad, "base64")
}

function sign(encodedPayload: string): string {
  return base64url(crypto.createHmac("sha256", getSecret()).update(encodedPayload).digest())
}

export function createOauthState(provider: OauthProvider, returnTo?: string): string {
  const payload: OauthStatePayload = {
    provider,
    ts: Date.now(),
    nonce: crypto.randomBytes(8).toString("hex"),
    return_to: returnTo || undefined,
  }
  const encoded = base64url(JSON.stringify(payload))
  return `${encoded}.${sign(encoded)}`
}

export function verifyOauthState(rawState: string | undefined, expectedProvider: OauthProvider): OauthStatePayload {
  if (!rawState || !rawState.includes(".")) throw new Error("Missing OAuth state")
  const [encoded, sig] = rawState.split(".", 2)
  if (!encoded || !sig) throw new Error("Invalid OAuth state")
  const expectedSig = sign(encoded)
  if (sig !== expectedSig) throw new Error("Invalid OAuth state signature")
  const payload = JSON.parse(unbase64url(encoded).toString("utf8")) as OauthStatePayload
  if (payload.provider !== expectedProvider) throw new Error("OAuth state provider mismatch")
  const ageMs = Date.now() - (payload.ts || 0)
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 15 * 60 * 1000) {
    throw new Error("OAuth state expired")
  }
  return payload
}

export function normalizeReturnTo(returnTo: string | undefined): string {
  const fallback = "https://admin.autotorental.com/dashboard/integrations"
  if (!returnTo) return fallback
  try {
    const u = new URL(returnTo)
    if (!u.hostname.endsWith("autotorental.com")) return fallback
    return u.toString()
  } catch {
    return fallback
  }
}
