import crypto from "crypto"

// Signs/verifies a short-lived `state` value for the OAuth flow (CSRF guard).
// Uses COOKIE_SECRET so no extra config is needed.
const TTL_MS = 10 * 60 * 1000

function secret(): string {
  return process.env.COOKIE_SECRET || process.env.JWT_SECRET || "social-state"
}

export function signState(payload: Record<string, unknown> = {}): string {
  const body = Buffer.from(
    JSON.stringify({ ...payload, ts: Date.now(), n: crypto.randomBytes(8).toString("hex") })
  ).toString("base64url")
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url")
  return `${body}.${sig}`
}

export function verifyState(state: string): { ok: boolean; payload?: any } {
  if (!state || !state.includes(".")) {
    return { ok: false }
  }
  const [body, sig] = state.split(".")
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url")
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { ok: false }
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"))
  if (Date.now() - payload.ts > TTL_MS) {
    return { ok: false }
  }
  return { ok: true, payload }
}
