import crypto from "crypto"

// AES-256-GCM encryption for social tokens at rest. Mirrors the intent of the
// WordPress plugin's Hash util but uses an authenticated cipher (GCM).
//
// The key is derived from SOCIAL_ENC_KEY when set, otherwise it falls back to
// COOKIE_SECRET / JWT_SECRET so the module works out of the box. Set a
// dedicated SOCIAL_ENC_KEY in production.
const ALGO = "aes-256-gcm"

function getKey(): Buffer {
  const secret =
    process.env.SOCIAL_ENC_KEY ||
    process.env.COOKIE_SECRET ||
    process.env.JWT_SECRET

  if (!secret) {
    throw new Error(
      "[social] No encryption secret found. Set SOCIAL_ENC_KEY (or COOKIE_SECRET/JWT_SECRET)."
    )
  }
  // Normalise any-length secret to 32 bytes.
  return crypto.createHash("sha256").update(secret).digest()
}

export function encrypt(plain: string): string {
  if (plain == null) {
    return plain
  }
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  // Stored as base64(iv | tag | ciphertext).
  return Buffer.concat([iv, tag, enc]).toString("base64")
}

export function decrypt(payload: string): string {
  if (!payload) {
    return payload
  }
  const raw = Buffer.from(payload, "base64")
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(12, 28)
  const enc = raw.subarray(28)
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8")
}
