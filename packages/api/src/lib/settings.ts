// Helper to fetch an integration secret from app_setting (with env-var fallback).
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const ENV_MAP: Record<string, string> = {
  openai_api_key: "OPENAI_API_KEY",
  stripe_secret_key: "STRIPE_SECRET_KEY",
  stripe_publishable_key: "STRIPE_PUBLISHABLE_KEY",
  stripe_webhook_secret: "STRIPE_WEBHOOK_SECRET",
  resend_api_key: "RESEND_API_KEY",
  resend_from_email: "RESEND_FROM_EMAIL",
  zoho_smtp_host: "ZOHO_SMTP_HOST",
  zoho_smtp_port: "ZOHO_SMTP_PORT",
  zoho_smtp_secure: "ZOHO_SMTP_SECURE",
  zoho_smtp_user: "ZOHO_SMTP_USER",
  zoho_smtp_pass: "ZOHO_SMTP_PASS",
  zoho_from_email: "ZOHO_FROM",
  mail_tls_servername: "MAIL_TLS_SERVERNAME",
  facebook_page_id: "FACEBOOK_PAGE_ID",
  facebook_page_token: "FACEBOOK_PAGE_TOKEN",
  instagram_business_id: "INSTAGRAM_BUSINESS_ID",
  google_business_account_id: "GOOGLE_BUSINESS_ACCOUNT_ID",
  google_business_location_id: "GOOGLE_BUSINESS_LOCATION_ID",
  google_business_oauth_token: "GOOGLE_BUSINESS_OAUTH_TOKEN",
  google_business_refresh_token: "GOOGLE_BUSINESS_REFRESH_TOKEN",
  google_client_id: "GOOGLE_CLIENT_ID",
  google_client_secret: "GOOGLE_CLIENT_SECRET",
  google_redirect_uri: "GOOGLE_REDIRECT_URI",
  google_firebase_redirect_uri: "GOOGLE_FIREBASE_REDIRECT_URI",
  dataforseo_login: "DATAFORSEO_LOGIN",
  dataforseo_password: "DATAFORSEO_PASSWORD",
  google_maps_api_key: "GOOGLE_MAPS_API_KEY",
  sendgrid_api_key: "SENDGRID_API_KEY",
  twilio_account_sid: "TWILIO_ACCOUNT_SID",
  twilio_auth_token: "TWILIO_AUTH_TOKEN",
  twilio_whatsapp_from: "TWILIO_WHATSAPP_FROM",
  firebase_project_id: "FIREBASE_PROJECT_ID",
  firebase_app_id: "FIREBASE_APP_ID",
  firebase_console_url: "FIREBASE_CONSOLE_URL",
  ga4_property_id: "GA4_PROPERTY_ID",
  ga4_measurement_id: "GA4_MEASUREMENT_ID",
  ga4_service_account_json: "GA4_SERVICE_ACCOUNT_JSON",
  ga4_looker_embed_url: "GA4_LOOKER_EMBED_URL",
  ga4_oauth_access_token: "GA4_OAUTH_ACCESS_TOKEN",
  ga4_oauth_refresh_token: "GA4_OAUTH_REFRESH_TOKEN",
  ga4_oauth_expires_at: "GA4_OAUTH_EXPIRES_AT",
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
  let fallback = envName ? (process.env[envName] || "") : ""
  if (!fallback && key === "resend_from_email") {
    fallback = process.env.RESEND_FROM || "Auto to Rental <no-reply@autotorental.com>"
  }
  if (!fallback && key === "resend_api_key") {
    fallback = process.env.RESEND_API_KEY || ""
  }
  if (!fallback && key === "zoho_from_email") {
    fallback = process.env.ZOHO_FROM || process.env.SMTP_FROM || ""
  }
  cache.set(key, { value: fallback, t: now })
  return fallback
}

export function invalidateSettings() { cache.clear() }
