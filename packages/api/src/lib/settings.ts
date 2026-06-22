// Helper to fetch an integration secret from app_setting (with env-var fallback).
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const ENV_MAP: Record<string, string> = {
  openai_api_key: "OPENAI_API_KEY",
  openai_admin_key: "OPENAI_ADMIN_KEY",
  claude_admin_key: "CLAUDE_ADMIN_KEY",
  stripe_secret_key: "STRIPE_SECRET_KEY",
  stripe_publishable_key: "STRIPE_PUBLISHABLE_KEY",
  stripe_webhook_secret: "STRIPE_WEBHOOK_SECRET",
  payment_provider: "PAYMENT_PROVIDER",
  mollie_api_key: "MOLLIE_API_KEY",
  mollie_currency: "MOLLIE_CURRENCY",
  mollie_price_monthly: "MOLLIE_PRICE_MONTHLY",
  mollie_price_yearly: "MOLLIE_PRICE_YEARLY",
  mollie_testmode: "MOLLIE_TESTMODE",
  cloudflare_api_token: "CLOUDFLARE_API_TOKEN",
  cloudflare_email: "CLOUDFLARE_EMAIL",
  cloudflare_zone_id: "CLOUDFLARE_ZONE_ID",
  bing_webmaster_api_key: "BING_WEBMASTER_API_KEY",
  bing_site_url: "BING_SITE_URL",
  yandex_webmaster_token: "YANDEX_WEBMASTER_TOKEN",
  yandex_host_id: "YANDEX_HOST_ID",
  resend_api_key: "RESEND_API_KEY",
  resend_from_email: "RESEND_FROM_EMAIL",
  mail_smtp_host: "MAIL_SMTP_HOST",
  mail_smtp_port: "MAIL_SMTP_PORT",
  mail_smtp_secure: "MAIL_SMTP_SECURE",
  mail_smtp_user: "MAIL_SMTP_USER",
  mail_smtp_pass: "MAIL_SMTP_PASS",
  mail_from_email: "MAIL_FROM",
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
  fal_api_key: "FAL_API_KEY",
  luma_api_key: "LUMA_API_KEY",
  runway_api_key: "RUNWAY_API_KEY",
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
  if (!fallback && key === "mail_from_email") {
    fallback = process.env.MAIL_FROM || process.env.SMTP_FROM || ""
  }
  cache.set(key, { value: fallback, t: now })
  return fallback
}

export function invalidateSettings() { cache.clear() }
