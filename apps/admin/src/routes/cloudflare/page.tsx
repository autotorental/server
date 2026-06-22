import { useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { tt } from "../../lib/lang"
import WebAnalytics from "../cloudflare-web-analytics/page"
import Analytics from "../cloudflare-analytics/page"
import Performance from "../pagespeed/page"
import Dns from "../cloudflare-dns/page"
import Security from "../cloudflare-security/page"
import Speed from "../cloudflare-speed/page"
import CountryBlock from "../country-block/page"

export const config: RouteConfig = { label: tt("Cloudflare", "Cloudflare"), icon: ShieldCheck, rank: 19 }

const TABS = [
  { id: "web", label: "👁️ " + tt("Web Analytics", "تحليلات الزوار"), C: WebAnalytics },
  { id: "analytics", label: "📊 " + tt("Edge Traffic", "حركة الحافة"), C: Analytics },
  { id: "performance", label: "🚀 " + tt("Performance", "الأداء"), C: Performance },
  { id: "security", label: "🛡️ " + tt("Security", "الحماية"), C: Security },
  { id: "dns", label: "🌐 " + tt("DNS", "DNS"), C: Dns },
  { id: "speed", label: "⚡ " + tt("Speed", "السرعة"), C: Speed },
  { id: "country", label: "🚫 " + tt("Country Block", "حظر الدول"), C: CountryBlock },
]

export default function Page() {
  const [tab, setTab] = useState("web")
  const Active = (TABS.find((t) => t.id === tab) || TABS[0]).C
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 flex-wrap px-6 py-3 border-b border-ui-border-base bg-ui-bg-base" style={{ position: "sticky", top: 0, zIndex: 5 }}>
        <span className="font-semibold text-ui-fg-base mr-1">☁️ Cloudflare</span>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-3.5 py-2 text-sm rounded-lg border transition " + (tab === t.id ? "border-ui-fg-interactive bg-ui-bg-subtle font-medium" : "border-ui-border-base text-ui-fg-subtle hover:border-ui-border-strong")}>
            {t.label}
          </button>
        ))}
      </div>
      <Active />
    </div>
  )
}
