import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { tt } from "../../lib/lang"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { Sparkles, ArrowDownTray, ArrowUpRightOnBox } from "@medusajs/icons"

export const config: RouteConfig = { label: tt("Sales Toolkit", "أدوات المبيعات"), icon: Sparkles, rank: 33 }

const FEATURES = [
  {
    section: "🚗 Core Marketplace",
    items: [
      { icon: "📋", title: "Unlimited Vehicle Listings", desc: "List as many cars as you want. Daily/weekly/monthly rates, photos, features, and contact options per car." },
      { icon: "✅", title: "Admin Approval Workflow", desc: "Every new listing goes through admin approval. Trust and quality on the marketplace." },
      { icon: "🌍", title: "Multi-Country Coverage", desc: "Launched across 16 cities in the UAE & Syria — and built to add any country in minutes." },
      { icon: "💰", title: "Zero Commission, Ever", desc: "We never take a percentage of bookings. Vendors keep 100% of every rental." },
    ],
  },
  {
    section: "📞 Direct Customer Contact",
    items: [
      { icon: "💬", title: "WhatsApp Integration", desc: "Customers click WhatsApp → message goes direct to the rental company. No middleman." },
      { icon: "📱", title: "Direct Phone Calls", desc: "tel: links open the dialer instantly. One tap = one call." },
      { icon: "🌍", title: "Free International Call (LiveKit)", desc: "Customers abroad can call vendors via browser. Zero international charges. Powerful for tourist conversions." },
      { icon: "🔔", title: "Follow Rental Company", desc: "Customers can follow vendors to track new listings. Build a loyal audience." },
    ],
  },
  {
    section: "💳 Subscription & Pricing",
    items: [
      { icon: "🎁", title: "30-Day Free Trial", desc: "New rental companies start with 30 days completely free. No credit card upfront." },
      { icon: "📊", title: "Simple Subscription", desc: "AED 99/month or AED 990/year (save ~17%) — unlimited listings, analytics & follower alerts." },
      { icon: "💳", title: "Stripe Integration", desc: "Auto-renew via Stripe Checkout. Manual extension by admin for bank transfers." },
      { icon: "🚫", title: "Auto-Hide Expired Listings", desc: "When subscription expires, cars instantly stop showing on storefront. Renews instantly when paid." },
    ],
  },
  {
    section: "🤖 AI-Powered Features",
    items: [
      { icon: "✨", title: "AI Description Generator", desc: "One-click button auto-writes catchy title + short summary + 80-140 word description from car specs. Uses OpenAI or any compatible LLM." },
      { icon: "🖼️", title: "Automatic Image Optimization", desc: "Every photo uploaded gets resized, compressed to WebP at 82% quality. 70-85% smaller files = faster pages = better SEO." },
      { icon: "🎯", title: "AI SEO Optimizer", desc: "On every page, click '✨ Optimize with AI' → AI rewrites title, meta description, focus keyword for max search ranking." },
      { icon: "🌐", title: "Multi-Provider Support", desc: "OpenAI, Sirizone AI (Ollama), any OpenAI-compatible endpoint. Configure once, use everywhere." },
    ],
  },
  {
    section: "🔎 SEO & Discovery",
    items: [
      { icon: "📈", title: "Built-in SEO Manager", desc: "Like Yoast/Rank Math: per-page title, description, focus keyword, OG image, with Google snippet preview and score 0-100." },
      { icon: "🗺️", title: "Dynamic Sitemap.xml", desc: "Auto-generated XML sitemap of every vehicle, brand, city, blog post. Submit to Google Search Console once → indexed forever." },
      { icon: "🏷️", title: "JSON-LD Structured Data", desc: "Every page tagged with Vehicle, Offer, LocalBusiness, FAQPage schemas. Eligible for rich snippets in Google." },
      { icon: "📊", title: "DataForSEO Integration", desc: "Real Google search volume + keyword difficulty + CPC next to every focus keyword. ~$1-5/month for full team." },
      { icon: "🔗", title: "Clean Slug URLs", desc: "/cars/brand/toyota and /cars/city/dubai instead of ugly query parameters. 301 redirects from old URLs." },
      { icon: "📝", title: "7 Real Blog Posts (1500 words each)", desc: "Original content targeting top keywords: cheapest car rental, monthly rental, Lamborghini in Dubai, tourist guide, SUV desert, long-term comparison." },
    ],
  },
  {
    section: "🎨 Branding & UX",
    items: [
      { icon: "🌓", title: "Day & Night Mode", desc: "Toggle on every page. Auto-detects user's OS preference. Saves choice in browser." },
      { icon: "🌍", title: "Country Switcher", desc: "🇦🇪 UAE / 🇸🇾 Syria with cookie persistence. Storefront filters cars + cities per country." },
      { icon: "🗣️", title: "English + Arabic", desc: "Full RTL support. Translation system for UI. Vehicle data supports name_ar fields." },
      { icon: "💵", title: "Multi-Currency", desc: "AED / SYP / USD / EUR / GBP. Live conversion on every price display." },
      { icon: "❤️", title: "Favorites & Recent Views", desc: "Browser-local. No account required. Users save cars + see recent views in /account page." },
    ],
  },
  {
    section: "📊 Analytics & Insights",
    items: [
      { icon: "📈", title: "Per-Vendor Analytics", desc: "Each rental company sees their own: calls, WhatsApp clicks, free calls, page views, daily trends, sparklines per metric." },
      { icon: "🌍", title: "Geographic Tracking", desc: "Detects visitor country from IP (GeoLite2). Shows top countries on admin + vendor dashboards." },
      { icon: "🕒", title: "Heatmap Activity", desc: "7-day × 24-hour heatmap showing when customers contact vendors. UAE timezone." },
      { icon: "📱", title: "Device Breakdown", desc: "Mobile / Desktop / Tablet distribution. Optimize for the right form factor." },
      { icon: "🔥", title: "Top Vehicles", desc: "Most-contacted listings ranked by event type. Identify your stars." },
      { icon: "🏷️", title: "UTM Campaign Tracking", desc: "Track which ad campaign drives which contact. Calls/WhatsApp/Free-call attributed back to source." },
    ],
  },
  {
    section: "📣 Marketing Stack",
    items: [
      { icon: "📦", title: "Catalog XML Feed", desc: "Auto-generated /catalog.xml in Meta + Google Merchant format. Submit once → ads dynamically personalize per visitor." },
      { icon: "🎯", title: "Multi-Platform Pixels", desc: "Google Analytics 4, Google Ads, Meta Pixel, TikTok Pixel — all wired with custom conversion events (Contact = high-intent lead)." },
      { icon: "🔗", title: "UTM Link Builder", desc: "Built-in tool in Marketing page. Pick source/medium/campaign → copy ready URL for ads." },
      { icon: "🍪", title: "GDPR Cookie Consent", desc: "Banner with Accept All / Essential Only. Only loads analytics + ads after consent." },
      { icon: "🚀", title: "10 Ready-Made Reel/TikTok Scripts", desc: "Professional ad scripts for vendors: Lamborghini, Land Cruiser family, monthly rental, luxury, airport pickup, vendor spotlight." },
    ],
  },
  {
    section: "🔐 Security & Trust",
    items: [
      { icon: "🛡️", title: "Verified Vendor Badge", desc: "Trade license check + identity verification per rental company. Blue checkmark on profile." },
      { icon: "🚨", title: "Customer Report Flagging", desc: "Customers can report bad listings. Admin sees in /dashboard/reports with one-click moderation." },
      { icon: "⭐", title: "Google Reviews Integration", desc: "Each vendor's Google Business Profile rating + review count pulled into their marketplace profile." },
      { icon: "🔒", title: "SSH Hardening", desc: "Password-auth disabled. Fail2ban active. Cloudflare DNS + Let's Encrypt SSL on all subdomains." },
    ],
  },
  {
    section: "🛠️ Vendor Tools",
    items: [
      { icon: "🏢", title: "Public Company Profile", desc: "Each rental company gets /companies/[id] with banner, logo, description, social media icons, full inventory." },
      { icon: "👥", title: "Followers List", desc: "Vendors see who's following them. Build a customer base." },
      { icon: "🎁", title: "Promotions Engine", desc: "Bulk discount % or specific sale prices, with optional expiry date and custom labels." },
      { icon: "🔍", title: "Instant Search (Meilisearch)", desc: "Sub-1ms search across all listings. Self-hosted, no per-search fees." },
      { icon: "🌐", title: "PWA-Ready Seller Dashboard", desc: "Installable on phone/tablet/desktop as a native app." },
      { icon: "🔄", title: "Password Reset via Email", desc: "Branded HTML emails via Resend. Different flows for admin vs seller." },
    ],
  },
  {
    section: "📨 Communications",
    items: [
      { icon: "📧", title: "Resend Email Provider", desc: "Transactional emails for password reset, contact form, subscription receipts. Branded HTML templates." },
      { icon: "📥", title: "Built-in Inbox", desc: "Every contact form submission appears in admin /dashboard/inbox. Reply via Email or WhatsApp in one click." },
      { icon: "🔔", title: "Webhook Notifications", desc: "Stripe webhooks for subscription events. Custom subscriber pattern for any future events." },
    ],
  },
]

const STATS = [
  { label: "Total features built", value: "70+" },
  { label: "Admin pages", value: "20+" },
  { label: "Vendor pages", value: "10+" },
  { label: "Storefront pages", value: "25+" },
  { label: "API endpoints", value: "60+" },
  { label: "Languages", value: "EN + AR" },
  { label: "Currencies", value: "5" },
  { label: "Ad platforms wired", value: "4" },
]

const Page = () => {
  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Heading level="h2" className="text-2xl flex items-center gap-2"><Sparkles/> Sales Toolkit</Heading>
            <Text className="text-ui-fg-subtle">Every feature built. Use this to pitch rental companies. Show them what they get when they join Auto to Rental.</Text>
          </div>
          <Button variant="secondary" onClick={() => window.print()}><ArrowDownTray /> Print / Save as PDF</Button>
        </div>
      </Container>

      <Container className="p-6">
        <div className="bg-gradient-to-br from-brand-50 to-brand-100 dark:from-ui-tag-blue-bg dark:to-ui-bg-base rounded-xl p-6">
          <Heading level="h3">The pitch in one sentence</Heading>
          <Text className="mt-3 text-lg">
            <strong>Auto to Rental</strong> is the car rental marketplace where <strong>vendors keep 100% of every rental</strong> — we charge zero commission, just a flat monthly subscription. You get unlimited listings, direct customer contact (WhatsApp/Phone/Free International Call), built-in SEO that gets you to Google page 1, ad-ready catalog feeds for Meta + Google, and AI tools that write your listings automatically.
          </Text>
        </div>
      </Container>

      <Container className="p-6">
        <Heading level="h3">📊 By the numbers</Heading>
        <div className="mt-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {STATS.map(s => (
            <div key={s.label} className="bg-ui-bg-subtle rounded-lg p-4 text-center">
              <div className="text-3xl font-black text-ui-fg-base">{s.value}</div>
              <div className="text-xs text-ui-fg-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </Container>

      {FEATURES.map((sec, i) => (
        <Container key={i} className="p-6">
          <Heading level="h3" className="mb-4">{sec.section}</Heading>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            {sec.items.map((f, j) => (
              <div key={j} className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4 hover:border-ui-fg-muted transition">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-bold text-ui-fg-base">{f.title}</div>
                <div className="text-xs text-ui-fg-subtle mt-1 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </Container>
      ))}

      <Container className="p-6">
        <div className="bg-gradient-to-br from-ui-tag-green-bg to-ui-bg-base rounded-xl p-6">
          <Heading level="h3">💼 The 30-second close for sales calls</Heading>
          <ol className="mt-3 space-y-2 text-sm text-ui-fg-base list-decimal pl-5">
            <li><strong>"We charge zero commission."</strong> Other marketplaces take 10-25% of every booking. We take nothing.</li>
            <li><strong>"You'll be on Google page 1."</strong> 7 real blog articles, structured data, dynamic sitemap — already built.</li>
            <li><strong>"Your ads will perform better."</strong> Our catalog feed lets Meta + Google show YOUR exact car to people who searched for it.</li>
            <li><strong>"You can write listings in 10 seconds."</strong> AI auto-writes the title, summary, and description. Vendor adds photos, done.</li>
            <li><strong>"30 days completely free."</strong> No credit card. Try the whole platform. Then AED 99/month if they like it.</li>
          </ol>
        </div>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
