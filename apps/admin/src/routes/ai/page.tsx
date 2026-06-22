import { useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Sparkles } from "@medusajs/icons"
import { tt } from "../../lib/lang"
import AIChat from "../ai-assistant/page"
import AutoFixPage from "../auto-fix/page"
import AiSettings from "../ai-settings/page"
import AiControl from "../ai-control/page"

export const config: RouteConfig = { label: tt("AI", "الذكاء الاصطناعي"), icon: Sparkles, rank: 50 }

const TABS = [
  { id: "assistant", label: "💬 " + tt("Assistant", "المساعد"), C: AIChat },
  { id: "control", label: "🎛️ " + tt("Control Center", "مركز التحكم"), C: AiControl },
  { id: "autofix", label: "🛠️ " + tt("Auto-fix", "الإصلاح التلقائي"), C: AutoFixPage },
  { id: "settings", label: "⚙️ " + tt("AI Settings", "إعدادات الذكاء"), C: AiSettings },
]

export default function Page() {
  const [tab, setTab] = useState("assistant")
  const Active = (TABS.find((t) => t.id === tab) || TABS[0]).C
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 flex-wrap px-6 py-3 border-b border-ui-border-base bg-ui-bg-base" style={{ position: "sticky", top: 0, zIndex: 5 }}>
        <span className="font-semibold text-ui-fg-base mr-1">🤖 {tt("AI", "الذكاء الاصطناعي")}</span>
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
