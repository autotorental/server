// Helpers for the Facebook/Instagram OAuth "Connect" flow (Graph API).
// One Meta app (FACEBOOK_APP_ID / FACEBOOK_APP_SECRET) backs the button.
const GRAPH = "https://graph.facebook.com/v21.0"
const DIALOG = "https://www.facebook.com/v21.0/dialog/oauth"

const SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
]

export function appId(): string {
  const id = process.env.FACEBOOK_APP_ID
  if (!id) throw new Error("FACEBOOK_APP_ID is not set")
  return id
}

export function appSecret(): string {
  const s = process.env.FACEBOOK_APP_SECRET
  if (!s) throw new Error("FACEBOOK_APP_SECRET is not set")
  return s
}

export function redirectUri(): string {
  return (
    process.env.FACEBOOK_REDIRECT_URI ||
    `${(process.env.BACKEND_URL || "").replace(/\/$/, "")}/social/oauth/facebook/callback`
  )
}

// URL the admin's browser is sent to in order to log in / grant access.
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: appId(),
    redirect_uri: redirectUri(),
    state,
    response_type: "code",
    scope: SCOPES.join(","),
  })
  return `${DIALOG}?${params.toString()}`
}

async function graphGet(path: string, params: Record<string, string>): Promise<any> {
  const url = `${GRAPH}/${path}?${new URLSearchParams(params).toString()}`
  const res = await fetch(url)
  const json: any = await res.json()
  if (!res.ok || json?.error) {
    throw new Error(json?.error?.message || res.statusText)
  }
  return json
}

// Exchange the short-lived code for a long-lived user access token.
export async function exchangeCodeForToken(code: string): Promise<string> {
  const short = await graphGet("oauth/access_token", {
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: redirectUri(),
    code,
  })
  const long = await graphGet("oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId(),
    client_secret: appSecret(),
    fb_exchange_token: short.access_token,
  })
  return long.access_token
}

export interface DiscoveredAccount {
  platform: "facebook" | "instagram"
  name: string
  external_id: string
  access_token: string
}

// Given a user token, return all Pages the user manages plus any linked
// Instagram business accounts — each ready to be stored as a SocialAccount.
export async function discoverAccounts(userToken: string): Promise<DiscoveredAccount[]> {
  const out: DiscoveredAccount[] = []
  const pages = await graphGet("me/accounts", {
    access_token: userToken,
    fields: "id,name,access_token,instagram_business_account",
    limit: "100",
  })

  for (const page of pages.data || []) {
    out.push({
      platform: "facebook",
      name: page.name,
      external_id: page.id,
      access_token: page.access_token, // long-lived page token
    })

    if (page.instagram_business_account?.id) {
      const igId = page.instagram_business_account.id
      let igName = "Instagram"
      try {
        const ig = await graphGet(igId, {
          access_token: page.access_token,
          fields: "username",
        })
        igName = ig.username ? `@${ig.username}` : igName
      } catch {
        // username is best-effort
      }
      out.push({
        platform: "instagram",
        name: igName,
        external_id: igId,
        access_token: page.access_token, // IG publishes with the page token
      })
    }
  }
  return out
}
