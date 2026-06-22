/**
 * Read app_setting without Medusa request scope (password-reset subscriber, etc.).
 */
import { execFileSync } from "node:child_process"
import { ENV_MAP, invalidateSettings } from "./settings"

const TTL = 60_000
const cache = new Map<string, { value: string; t: number }>()

function readFromDb(key: string): string {
  const url = process.env.DATABASE_URL
  if (!url) return ""
  try {
    const out = execFileSync(
      "psql",
      [url, "-tAc", `SELECT value FROM app_setting WHERE key='${key.replace(/'/g, "''")}' LIMIT 1`],
      { encoding: "utf8", timeout: 5000 }
    )
    return (out || "").trim()
  } catch {
    return ""
  }
}

export async function getGlobalSetting(key: string): Promise<string> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && now - hit.t < TTL) return hit.value

  let value = readFromDb(key)
  if (!value) {
    const envName = ENV_MAP[key]
    value = envName ? process.env[envName] || "" : ""
    if (!value && key === "mail_from_email") {
      value = process.env.MAIL_FROM || process.env.SMTP_FROM || ""
    }
  }

  cache.set(key, { value, t: now })
  return value
}

export function invalidateGlobalSettings() {
  cache.clear()
  invalidateSettings()
}
