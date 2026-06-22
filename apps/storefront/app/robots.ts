import type { MetadataRoute } from "next"

// Paths that should never be crawled/indexed by anyone (private/utility).
const DISALLOW = ["/api/", "/favorites", "/account"]

// AI search & answer engines we explicitly welcome so Auto to Rental content can
// be surfaced and cited in AI answers (ChatGPT Search, Perplexity, Gemini,
// Google AI Overviews, Apple Intelligence, Claude, Copilot, etc.).
const AI_CRAWLERS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",                     // OpenAI
  "ClaudeBot", "anthropic-ai", "Claude-Web", "Claude-User", "Claude-SearchBot", // Anthropic
  "PerplexityBot", "Perplexity-User",                            // Perplexity
  "Google-Extended",                                             // Gemini / Vertex grounding
  "Applebot-Extended", "Applebot",                               // Apple Intelligence / Siri
  "Amazonbot",                                                   // Amazon (Alexa / Rufus)
  "meta-externalagent", "FacebookBot",                           // Meta AI
  "Bytespider",                                                  // ByteDance / Doubao
  "cohere-ai", "cohere-training-data-crawler",                   // Cohere
  "DuckAssistBot",                                               // DuckDuckGo AI
  "YouBot", "Diffbot", "Timpibot", "Webzio-Extended", "PetalBot", // misc answer engines
  "CCBot",                                                       // Common Crawl (feeds many LLMs)
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: "Googlebot", allow: "/", disallow: DISALLOW },
      { userAgent: "Bingbot", allow: "/", disallow: DISALLOW },
      // Explicitly welcome AI search / citation crawlers.
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: ["https://autotorental.com/sitemap.xml", "https://autotorental.com/blog/sitemap.xml"],
    host: "https://autotorental.com",
  }
}
