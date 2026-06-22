import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { Container, Heading, Text, Button, Badge, Switch, Input } from "@medusajs/ui"
import { BoltSolid } from "@medusajs/icons"
import { tt } from "../../lib/lang"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("AI Control Center", "مركز التحكم بالذكاء"), icon: BoltSolid, rank: 49 }

type Item = [string, string, string]
const GROUPS: Array<{ title: string; note?: string; items: Item[] }> = [
  { title: tt("Content & SEO", "المحتوى و SEO"), items: [
    ["descriptions", tt("Car descriptions", "أوصاف السيارات"), tt("AI writes car titles & descriptions", "يكتب عناوين وأوصاف السيارات")],
    ["blog", tt("Blog writer", "كاتب المدونة"), tt("Generate blog posts & cover images", "توليد المقالات وصور الأغلفة")],
    ["seo", tt("SEO optimizer", "محسّن SEO"), tt("Optimize titles, meta & keywords", "تحسين العناوين والكلمات")],
    ["images", tt("Image optimizer", "محسّن الصور"), tt("Auto alt text & enhancement", "نص بديل وتحسين الصور")],
    ["video", tt("Video ads", "إعلانات فيديو"), tt("AI-generated video ads", "إعلانات فيديو بالذكاء")],
    ["legal", tt("Legal pages", "الصفحات القانونية"), tt("Generate terms & privacy text", "توليد الشروط والخصوصية")],
  ]},
  { title: tt("Assistants", "المساعدون"), items: [
    ["public_chat", tt("Website AI chat", "شات الموقع الذكي"), tt("Public assistant on your site", "المساعد العام على موقعك")],
    ["assistant", tt("Admin / vendor AI assistant", "مساعد الأدمن/التاجر"), tt("Your dashboard AI agent", "وكيل الذكاء داخل لوحتك")],
  ]},
  { title: tt("Performance & Ops", "الأداء والتشغيل"), items: [
    ["pagespeed", tt("PageSpeed autofix", "إصلاح السرعة"), tt("AI fixes Core Web Vitals", "إصلاح أداء الموقع")],
    ["sentry", tt("Error autofix", "إصلاح الأخطاء"), tt("AI proposes fixes for Sentry errors", "إصلاح أخطاء Sentry")],
    ["autofix", tt("Site autofix", "الإصلاح العام"), tt("General AI auto-fixes", "إصلاحات ذكية عامة")],
  ]},
  { title: tt("Insights — activating soon", "التحليلات — قيد التفعيل"), note: tt("Saved now; activate as each tool ships.", "تُحفظ الآن وتُفعَّل مع إطلاق كل أداة."), items: [
    ["pricing", tt("Smart pricing", "التسعير الذكي"), tt("AI price suggestions", "اقتراحات أسعار ذكية")],
    ["market_analytics", tt("Market & orders analytics", "تحليلات السوق"), tt("AI insights on demand & sales", "رؤى ذكية")],
    ["search_console", tt("Google Search insights", "رؤى Google Search"), tt("AI reads Search Console", "قراءة Search Console")],
    ["cloudflare", tt("Cloudflare AI actions", "إجراءات Cloudflare"), tt("AI tuning of speed & security", "ضبط السرعة والحماية")],
  ]},
]

const OPTS: Array<[string, string]> = [
  ["off", tt("Off", "موقوف")],
  ["openai", "OpenAI (GPT)"],
  ["ollama_cloud", "Ollama Cloud"],
  ["claude", "Claude"],
  ["local", tt("Local Ollama", "أولاما محلي")],
]
const SEL = "bg-ui-bg-field border border-ui-border-base rounded-lg px-2.5 py-1.5 text-sm text-ui-fg-base outline-none focus:border-ui-fg-interactive shrink-0"

const Page = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [master, setMaster] = useState(true)
  const [providers, setProviders] = useState<any>({})
  const [ollamaModel, setOllamaModel] = useState("")
  const [ollamaKey, setOllamaKey] = useState("")
  const [tasks, setTasks] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch(`${API}/admin/ai/control`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { setMaster(d.master !== false); setProviders(d.providers || {}); setOllamaModel(d.ollama_model || ""); setTasks(d.tasks || {}) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/admin/ai/control`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ master, tasks, ollama_model: ollamaModel, ollama_cloud_api_key: ollamaKey || undefined }) })
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2200)
    } finally { setSaving(false) }
  }
  const setTask = (k: string, v: string) => setTasks((t) => ({ ...t, [k]: v }))

  if (loading) return <Container className="p-8"><Text>{tt("Loading…", "جارٍ التحميل…")}</Text></Container>

  return (
    <div className="flex flex-col gap-3">
      <Container className="divide-y p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <BoltSolid className="text-ui-fg-interactive" />
            <div>
              <Heading level="h2">{tt("AI Control Center", "مركز التحكم بالذكاء")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">{tt("Assign each task to the AI that should run it.", "عيّن لكل مهمة الذكاء الذي ينفّذها.")}</Text>
            </div>
          </div>
          <Button onClick={save} isLoading={saving} variant="primary">{savedFlash ? tt("Saved ✓", "تم الحفظ ✓") : tt("Save changes", "حفظ التغييرات")}</Button>
        </div>

        <div className="flex items-center justify-between px-6 py-5 bg-ui-bg-subtle gap-4">
          <div>
            <Text weight="plus">{tt("Master AI switch", "المفتاح الرئيسي للذكاء")}</Text>
            <Text size="small" className="text-ui-fg-subtle">{tt("Off = all AI disabled instantly.", "إيقاف = يتعطّل كل الذكاء فوراً.")}</Text>
          </div>
          <Switch checked={master} onCheckedChange={setMaster} />
        </div>

        <div className="px-6 py-5">
          <Text weight="plus" className="mb-3">{tt("AI providers & keys", "مزوّدات الذكاء والمفاتيح")}</Text>
          <div className="flex flex-wrap gap-2 mb-3">
            {([["OpenAI (GPT)", providers.openai_set], ["Claude", providers.claude_set], ["Ollama Cloud", providers.ollama_cloud_set], [tt("Local Ollama", "أولاما محلي"), true]] as any[]).map(([n, ok]) => (
              <Badge key={n} size="small" color={ok ? "green" : "orange"}>{n} · {ok ? tt("ready", "جاهز") : tt("no key", "بدون مفتاح")}</Badge>
            ))}
          </div>
          <div className="flex flex-col gap-2 max-w-md">
            <Input placeholder="Ollama model — e.g. gpt-oss:120b" value={ollamaModel} onChange={(e) => setOllamaModel(e.target.value)} />
            <Input type="password" placeholder={providers.ollama_cloud_set ? "Ollama Cloud API key (saved ✓ — blank = keep)" : "Ollama Cloud API key (from ollama.com)"} value={ollamaKey} onChange={(e) => setOllamaKey(e.target.value)} />
          </div>
          <Text size="small" className="text-ui-fg-subtle mt-2">{tt("OpenAI / Claude keys are managed in AI Settings.", "مفاتيح OpenAI / Claude من صفحة إعدادات الذكاء.")}</Text>
        </div>

        {GROUPS.map((g) => (
          <div key={g.title} className={"px-6 py-5 " + (master ? "" : "opacity-60")}>
            <Text weight="plus" className="mb-1">{g.title}</Text>
            {g.note && <Text size="small" className="text-ui-fg-subtle mb-2">{g.note}</Text>}
            <div className="flex flex-col">
              {g.items.map(([key, label, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-3 border-b border-ui-border-base last:border-0">
                  <div className="min-w-0">
                    <Text weight="plus" size="small">{label}</Text>
                    <Text size="small" className="text-ui-fg-subtle">{desc}</Text>
                  </div>
                  <select className={SEL} disabled={!master} value={tasks[key] || "openai"} onChange={(e) => setTask(key, e.target.value)}>
                    {OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center justify-end gap-3 px-6 py-4">
          {savedFlash && <Text size="small" className="text-ui-fg-interactive">{tt("All changes saved", "تم حفظ كل التغييرات")}</Text>}
          <Button onClick={save} isLoading={saving} variant="primary">{tt("Save changes", "حفظ التغييرات")}</Button>
        </div>
      </Container>
    </div>
  )
}

export default Page
