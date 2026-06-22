// Social media auto-post — Facebook Page, Instagram Business, Google Business Profile,
// LinkedIn Company Page, and Pinterest Board.
// Triggered when an admin approves a vehicle (status → active).
//
// All credentials are pulled from the app_setting table (admin UI: /dashboard/integrations).
// If credentials are missing for a network, that network is silently skipped.

import { getSetting } from "./settings"

export type VehicleForPost = {
  id: string
  title: string
  description?: string | null
  daily_price?: number | null
  currency_code?: string | null
  photos?: string[] | null
  slug?: string | null
  city_name?: string | null
  brand_name?: string | null
  model_name?: string | null
}

function buildCaption(v: VehicleForPost): string {
  const lines: string[] = []
  lines.push(`🚗 ${v.title}`)
  if (v.city_name) lines.push(`📍 ${v.city_name}`)
  if (v.daily_price) lines.push(`💰 from ${v.daily_price} ${(v.currency_code || "AED").toUpperCase()} / day`)
  if (v.description) {
    const short = v.description.length > 280 ? v.description.slice(0, 277) + "…" : v.description
    lines.push("")
    lines.push(short)
  }
  lines.push("")
  lines.push("👉 https://autotorental.com/cars/" + (v.slug || v.id))
  lines.push("")
  const tags = ["#CarRental", "#UAE", "#Dubai"]
  if (v.brand_name) tags.push("#" + v.brand_name.replace(/\s+/g, ""))
  if (v.model_name) tags.push("#" + v.model_name.replace(/\s+/g, ""))
  if (v.city_name) tags.push("#" + v.city_name.replace(/\s+/g, ""))
  lines.push(tags.join(" "))
  return lines.join("\n")
}

function buildHtmlCaption(v: VehicleForPost): string {
  const url = "https://autotorental.com/cars/" + (v.slug || v.id)
  let html = `<h3>${v.title}</h3>`
  if (v.city_name) html += `<p>📍 ${v.city_name}</p>`
  if (v.daily_price) html += `<p>💰 from ${v.daily_price} ${(v.currency_code || "AED").toUpperCase()} / day</p>`
  if (v.description) html += `<p>${v.description.slice(0, 500)}</p>`
  html += `<p><a href="${url}">👉 View details</a></p>`
  return html
}

// FACEBOOK PAGE — photo post via Graph API
async function postFacebook(scope: any, v: VehicleForPost): Promise<{ ok: boolean; id?: string; error?: string }> {
  const pageId = await getSetting(scope, "facebook_page_id")
  const token = await getSetting(scope, "facebook_page_token")
  if (!pageId || !token) return { ok: false, error: "facebook credentials missing" }
  const photo = v.photos?.[0]
  if (!photo) return { ok: false, error: "no photo" }
  const url = `https://graph.facebook.com/v19.0/${pageId}/photos`
  const body = new URLSearchParams({
    url: photo,
    caption: buildCaption(v),
    access_token: token,
  })
  const res = await fetch(url, { method: "POST", body })
  const data: any = await res.json()
  if (!res.ok || data.error) return { ok: false, error: data.error?.message || "facebook post failed" }
  return { ok: true, id: data.id || data.post_id }
}

// INSTAGRAM BUSINESS — 2-step: create container then publish
async function postInstagram(scope: any, v: VehicleForPost): Promise<{ ok: boolean; id?: string; error?: string }> {
  const igId = await getSetting(scope, "instagram_business_id")
  const token = await getSetting(scope, "facebook_page_token")
  if (!igId || !token) return { ok: false, error: "instagram credentials missing" }
  const photo = v.photos?.[0]
  if (!photo) return { ok: false, error: "no photo" }
  const createRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
    method: "POST",
    body: new URLSearchParams({ image_url: photo, caption: buildCaption(v), access_token: token }),
  })
  const created: any = await createRes.json()
  if (!createRes.ok || !created.id) return { ok: false, error: created.error?.message || "ig container failed" }
  const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: created.id, access_token: token }),
  })
  const pub: any = await pubRes.json()
  if (!pubRes.ok || !pub.id) return { ok: false, error: pub.error?.message || "ig publish failed" }
  return { ok: true, id: pub.id }
}

// GOOGLE BUSINESS PROFILE — localPosts API
async function postGoogleBusiness(scope: any, v: VehicleForPost): Promise<{ ok: boolean; id?: string; error?: string }> {
  const accountId = await getSetting(scope, "google_business_account_id")
  const locationId = await getSetting(scope, "google_business_location_id")
  const token = await getSetting(scope, "google_business_oauth_token")
  if (!accountId || !locationId || !token) return { ok: false, error: "gbp credentials missing" }
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`
  const body: any = {
    languageCode: "en",
    summary: buildCaption(v),
    callToAction: {
      actionType: "LEARN_MORE",
      url: "https://autotorental.com/cars/" + (v.slug || v.id),
    },
    topicType: "STANDARD",
  }
  if (v.photos?.[0]) body.media = [{ mediaFormat: "PHOTO", sourceUrl: v.photos[0] }]
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data: any = await res.json()
  if (!res.ok || data.error) return { ok: false, error: data.error?.message || "gbp post failed" }
  return { ok: true, id: data.name }
}

// LINKEDIN COMPANY PAGE — share post via LinkedIn API (v2)
async function postLinkedIn(scope: any, v: VehicleForPost): Promise<{ ok: boolean; id?: string; error?: string }> {
  const companyId = await getSetting(scope, "linkedin_company_id")
  const token = await getSetting(scope, "linkedin_access_token")
  if (!companyId || !token) return { ok: false, error: "linkedin credentials missing" }
  const photo = v.photos?.[0]
  const url = "https://api.linkedin.com/v2/ugcPosts"
  const urn = `urn:li:organization:${companyId}`
  const body: any = {
    author: urn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: buildCaption(v).slice(0, 3000) },
        shareMediaCategory: photo ? "IMAGE" : "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  }
  if (photo) {
    body.specificContent["com.linkedin.ugc.ShareContent"].media = [{
      status: "READY",
      description: { text: v.title },
      media: photo,
      title: { text: v.title.slice(0, 200) },
    }]
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify(body),
  })
  const data: any = await res.json()
  if (!res.ok) return { ok: false, error: data.message || data.error?.message || "linkedin post failed" }
  return { ok: true, id: data.id }
}

// PINTEREST BOARD — pin create via Pinterest API v5
async function postPinterest(scope: any, v: VehicleForPost): Promise<{ ok: boolean; id?: string; error?: string }> {
  const boardId = await getSetting(scope, "pinterest_board_id")
  const token = await getSetting(scope, "pinterest_access_token")
  if (!boardId || !token) return { ok: false, error: "pinterest credentials missing" }
  const photo = v.photos?.[0]
  if (!photo) return { ok: false, error: "no photo" }
  const body: any = {
    board_id: boardId,
    media_source: { source_type: "image_url", url: photo },
    title: v.title.slice(0, 100),
    description: buildCaption(v).slice(0, 500),
    link: "https://autotorental.com/cars/" + (v.slug || v.id),
  }
  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const data: any = await res.json()
  if (!res.ok) return { ok: false, error: data.message || data.error?.message || "pinterest post failed" }
  return { ok: true, id: data.id }
}

export type PostResults = {
  facebook?: { ok: boolean; id?: string; error?: string }
  instagram?: { ok: boolean; id?: string; error?: string }
  google?: { ok: boolean; id?: string; error?: string }
  linkedin?: { ok: boolean; id?: string; error?: string }
  pinterest?: { ok: boolean; id?: string; error?: string }
}

export async function postVehicleToSocial(scope: any, v: VehicleForPost): Promise<PostResults> {
  const out: PostResults = {}
  const enabled = async (key: string) => (await getSetting(scope, key)) === "1"
  out.facebook = (await enabled("facebook_auto_post_enabled")) ? await postFacebook(scope, v).catch(e => ({ ok: false, error: e.message })) : { ok: false, error: "disabled" }
  out.instagram = (await enabled("instagram_auto_post_enabled")) ? await postInstagram(scope, v).catch(e => ({ ok: false, error: e.message })) : { ok: false, error: "disabled" }
  out.google = (await enabled("google_business_auto_post_enabled")) ? await postGoogleBusiness(scope, v).catch(e => ({ ok: false, error: e.message })) : { ok: false, error: "disabled" }
  out.linkedin = (await enabled("linkedin_auto_post_enabled")) ? await postLinkedIn(scope, v).catch(e => ({ ok: false, error: e.message })) : { ok: false, error: "disabled" }
  out.pinterest = (await enabled("pinterest_auto_post_enabled")) ? await postPinterest(scope, v).catch(e => ({ ok: false, error: e.message })) : { ok: false, error: "disabled" }
  return out
}
