// Meta (Facebook + Instagram) paid-ads automation via the Marketing API.
// When the owner approves a vendor campaign, this creates a REAL Campaign →
// Ad Set → Creative → Ad on Meta (PAUSED, so the owner reviews + activates in
// Meta — no spend until then). Fully no-op + "managed mode" until the owner adds
// their Meta keys in Settings (meta_ads_token + meta_ad_account_id + facebook_page_id).
import { getSetting } from "./settings"

const GRAPH = "https://graph.facebook.com/v20.0"

export async function getMetaAdsConfig(scope: any) {
  const token = (await getSetting(scope, "meta_ads_token").catch(() => "")) || ""
  const adAccount = (await getSetting(scope, "meta_ad_account_id").catch(() => "")) || ""
  const pageId = (await getSetting(scope, "facebook_page_id").catch(() => "")) || ""
  return { token, adAccount, pageId, configured: !!(token && adAccount && pageId) }
}

async function metaCall(path: string, token: string, params: Record<string, string>): Promise<any> {
  const body = new URLSearchParams({ ...params, access_token: token })
  const r = await fetch(`${GRAPH}/${path}`, { method: "POST", body })
  const d = await r.json()
  if (d.error) throw new Error(d.error.error_user_msg || d.error.message || "Meta API error")
  return d
}

export type MetaLaunchInput = {
  name: string
  landingUrl: string
  message: string
  headline?: string
  imageUrl?: string
  dailyBudgetMinor: number // account-currency minor units (AED fils). Min ~100.
  countries?: string[]
  active?: boolean
}

export type MetaLaunchResult =
  | { configured: false }
  | { configured: true; campaign_id: string; adset_id: string; creative_id: string; ad_id: string; status: string }

// Create the full Campaign → Ad Set → Creative → Ad chain on Meta.
export async function launchMetaCampaign(scope: any, input: MetaLaunchInput): Promise<MetaLaunchResult> {
  const { token, adAccount, pageId, configured } = await getMetaAdsConfig(scope)
  if (!configured) return { configured: false }
  const act = adAccount.startsWith("act_") ? adAccount : `act_${adAccount}`
  const status = input.active ? "ACTIVE" : "PAUSED"

  // 1) Campaign — traffic objective, no special ad category.
  const camp = await metaCall(`${act}/campaigns`, token, {
    name: input.name,
    objective: "OUTCOME_TRAFFIC",
    special_ad_categories: "[]",
    status,
  })

  // 2) Ad set — daily budget, geo targeting, optimise for link clicks.
  const countries = input.countries && input.countries.length ? input.countries : ["AE"]
  const targeting = JSON.stringify({ geo_locations: { countries }, age_min: 21, age_max: 60 })
  const adset = await metaCall(`${act}/adsets`, token, {
    name: `${input.name} — ad set`,
    campaign_id: camp.id,
    daily_budget: String(Math.max(100, Math.round(input.dailyBudgetMinor))),
    billing_event: "IMPRESSIONS",
    optimization_goal: "LINK_CLICKS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    targeting,
    status,
  })

  // 3) Creative — a link ad published from the Page (shows on FB + IG).
  const linkData: any = {
    message: input.message,
    link: input.landingUrl,
    name: input.headline || input.name,
    call_to_action: { type: "LEARN_MORE", value: { link: input.landingUrl } },
  }
  if (input.imageUrl) linkData.picture = input.imageUrl
  const creative = await metaCall(`${act}/adcreatives`, token, {
    name: `${input.name} — creative`,
    object_story_spec: JSON.stringify({ page_id: pageId, link_data: linkData }),
  })

  // 4) Ad
  const ad = await metaCall(`${act}/ads`, token, {
    name: `${input.name} — ad`,
    adset_id: adset.id,
    creative: JSON.stringify({ creative_id: creative.id }),
    status,
  })

  return { configured: true, campaign_id: camp.id, adset_id: adset.id, creative_id: creative.id, ad_id: ad.id, status }
}
