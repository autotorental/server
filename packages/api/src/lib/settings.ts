// Helper to fetch an integration secret from app_setting (with env-var fallback).
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const ENV_MAP: Record<string, string> = {
  openai_api_key: "OPENAI_API_KEY",
  stripe_secret_key: "STRIPE_SECRET_KEY",
  stripe_publishable_key: "STRIPE_PUBLISHABLE_KEY",
  stripe_webhook_secret: "STRIPE_WEBHOOK_SECRET",
  resend_api_key: "RESEND_API_KEY",
  resend_from_email: "RESEND_FROM_EMAIL",
  facebook_page_id: "FACEBOOK_PAGE_ID",
  facebook_page_token: "FACEBOOK_PAGE_TOKEN",
  instagram_business_id: "INSTAGRAM_BUSINESS_ID",
  google_business_account_id: "GOOGLE_BUSINESS_ACCOUNT_ID",
  google_business_location_id: "GOOGLE_BUSINESS_LOCATION_ID",
  google_business_oauth_token: "GOOGLE_BUSINESS_OAUTH_TOKEN",
  dataforseo_login: "DATAFORSEO_LOGIN",
  dataforseo_password: "DATAFORSEO_PASSWORD",
  google_maps_api_key: "GOOGLE_MAPS_API_KEY",
  sendgrid_api_key: "SENDGRID_API_KEY",
  twilio_account_sid: "TWILIO_ACCOUNT_SID",
  twilio_auth_token: "TWILIO_AUTH_TOKEN",
  twilio_whatsapp_from: "TWILIO_WHATSAPP_FROM",
}

let cache: Map<string, { value: string; t: number }> = new Map()
const TTL = 60_000

export async function getSetting(scope: any, key: string): Promise<string> {
  const now = Date.now()
  const c = cache.get(key)
  if (c && (now - c.t) < TTL) return c.value
  try {
    const pg: any = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
    const row = await pg("app_setting").where({ key }).first()
    if (row?.value) {
      cache.set(key, { value: row.value, t: now })
      return row.value
    }
  } catch {}
  const envName = ENV_MAP[key]
  const fallback = envName ? (process.env[envName] || "") : ""
  cache.set(key, { value: fallback, t: now })
  return fallback
}

export function invalidateSettings() { cache.clear() }
