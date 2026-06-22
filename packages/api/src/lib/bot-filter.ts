// Conservative bot/automation user-agent detection.
// IMPORTANT: this must NOT match our own mobile clients:
//   Android app -> "okhttp/x.y", iOS app -> "AutotoRental/N CFNetwork/... Darwin/..."
// So we never list okhttp / CFNetwork / Darwin here.
export const BOT_UA_REGEX =
  "googlebot|bingbot|yandexbot|duckduckbot|applebot|petalbot|ahrefsbot|semrushbot|mj12bot|dotbot|bytespider|gptbot|claudebot|ccbot|amazonbot|facebookexternalhit|facebot|ia_archiver|mediapartners|crawler|crawl|spider|spyder|slurp|curl/|wget|python-requests|python-urllib|aiohttp|scrapy|headlesschrome|headless|phantomjs|lighthouse|pingdom|uptimerobot|statuscake|gtmetrix|pagespeed|go-http-client|libwww|node-fetch|axios/"

const RE = new RegExp(BOT_UA_REGEX, "i")

/** True when a user-agent looks like an automated crawler/monitor (never our app). */
export function isBotUserAgent(ua?: string | null): boolean {
  if (!ua) return false
  return RE.test(ua)
}

/**
 * Knex modifier: exclude rows whose user_agent matches a known bot pattern.
 * NULL user_agent is kept (legitimate mobile clients can omit it).
 */
export function excludeBots<T>(q: T, column = "user_agent"): T {
  return (q as any).whereRaw(`(${column} IS NULL OR ${column} !~* ?)`, [BOT_UA_REGEX])
}
