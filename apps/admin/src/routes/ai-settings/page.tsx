import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Input, Label, Button, Textarea, Badge } from "@medusajs/ui"
import { Sparkles, BoltSolid, CheckCircleSolid, XCircleSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "AI Settings", icon: Sparkles }

const DEFAULT_PROMPT = `Generate JSON with three fields for a car rental listing:
- "title": under 70 characters, catchy headline (include year + model + city if useful)
- "short": under 160 characters, one-line summary for listing cards
- "description": 80-140 words, friendly tone, mention key features, lifestyle, who would enjoy it. Plain text, no markdown.

Never invent specs not provided. Use the details given below.`

const PROVIDERS = [
  { id: "openai", label: "OpenAI", base_url: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] },
  { id: "sirizone", label: "Sirizone AI (Ollama)", base_url: "https://ai.sirizone.com/v1", models: ["llava", "llama3.2-vision", "moondream", "qwen2.5"] },
  { id: "custom", label: "Custom OpenAI-compatible", base_url: "", models: [] },
]

const SectionHeader = ({ title, desc, badge }: { title: string; desc?: ReactNode; badge?: ReactNode }) => (
  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
    <div>
      <Heading level="h3" className="text-ui-fg-base">{title}</Heading>
      {desc && <Text size="small" className="text-ui-fg-subtle mt-1">{desc}</Text>}
    </div>
    {badge}
  </div>
)

const STEPS = [
  { n: 1, t: "Vendor opens vehicle form", d: "They pick brand, model, year, color, features, and price." },
  { n: 2, t: 'Vendor clicks "Generate with AI"', d: "Your prompt plus the car specs are sent to the configured AI provider." },
  { n: 3, t: "AI returns structured JSON", d: "With title, short summary, and full description fields." },
  { n: 4, t: "Auto-filled in the form", d: "The vendor can review and edit everything before publishing." },
]

const Page = () => {
  const [settings, setSettings] = useState<any>(null)
  const [apiKey, setApiKey] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [model, setModel] = useState("gpt-4o-mini")
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [provider, setProvider] = useState("openai")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [savedFlash, setSavedFlash] = useState(false)
  const [d4sLogin, setD4sLogin] = useState("")
  const [d4sPassword, setD4sPassword] = useState("")

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/ai/settings`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.settings) {
          setSettings(d.settings)
          setBaseUrl(d.settings.base_url || "")
          setModel(d.settings.model || "gpt-4o-mini")
          setPrompt(d.settings.description_prompt || DEFAULT_PROMPT)
          // Detect provider from base_url
          const found = PROVIDERS.find(p => p.base_url === d.settings.base_url)
          if (d.settings.dataforseo_login) setD4sLogin(d.settings.dataforseo_login)
          if (found) setProvider(found.id)
          else if (d.settings.base_url) setProvider("custom")
        }
      }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async () => {
    setSaving(true)
    setSavedFlash(false)
    try {
      const body: any = { base_url: baseUrl, model, description_prompt: prompt }
      if (apiKey) body.api_key = apiKey
      if (d4sLogin) body.dataforseo_login = d4sLogin
      if (d4sPassword) body.dataforseo_password = d4sPassword // only update key if user entered a new one
      const r = await fetch(`${API}/admin/ai/settings`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        setApiKey("")
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 3000)
        load()
      }
    } finally { setSaving(false) }
  }

  const onProviderChange = (id: string) => {
    setProvider(id)
    const p = PROVIDERS.find(x => x.id === id)
    if (p) {
      setBaseUrl(p.base_url)
      if (p.models.length) setModel(p.models[0])
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch(`${API}/admin/ai/generate-description`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: "Toyota", model: "Land Cruiser", year: 2024,
          body_type: "SUV", transmission: "automatic", fuel_type: "petrol",
          seats: 7, color: "Pearl White",
          features: ["360° Camera", "Cruise Control", "Airbags"],
          price_daily: 650, city: "Dubai", currency: "AED",
        }),
      })
      const d = await r.json()
      setTestResult({ ok: r.ok, ...d })
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message })
    } finally { setTesting(false) }
  }

  const currentProvider = PROVIDERS.find(p => p.id === provider)

  return (
    <SingleColumnPage>
      {/* Hero header */}
      <Container className="p-0 overflow-hidden">
        <div
          className="flex items-start justify-between flex-wrap gap-4 p-6 border-b border-ui-border-base"
          style={{ backgroundImage: "linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.06))" }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex items-center justify-center rounded-xl text-white shrink-0 shadow-elevation-card-rest"
              style={{ width: 48, height: 48, backgroundImage: "linear-gradient(135deg, #6366f1, #a855f7)" }}
            >
              <Sparkles />
            </div>
            <div>
              <Heading level="h2" className="text-xl">AI Settings</Heading>
              <Text className="text-ui-fg-subtle mt-1" size="small">
                Configure the AI provider used for auto-generating car titles, short summaries, and descriptions on the vendor form.
              </Text>
            </div>
          </div>
          {settings?.api_key_set
            ? <Badge color="green" className="flex items-center gap-1"><CheckCircleSolid /> Configured</Badge>
            : <Badge color="orange" className="flex items-center gap-1"><XCircleSolid /> Not configured</Badge>}
        </div>
      </Container>

      {/* Provider */}
      <Container className="p-6">
        <SectionHeader title="Provider" desc="Choose your AI provider. Any OpenAI-compatible endpoint works." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PROVIDERS.map(p => {
            const active = provider === p.id
            return (
              <button key={p.id} type="button" onClick={() => onProviderChange(p.id)}
                className={`relative text-left p-4 rounded-xl border-2 transition ${active
                  ? "border-ui-fg-interactive bg-ui-tag-blue-bg"
                  : "border-ui-border-base bg-ui-bg-base hover:border-ui-fg-muted hover:bg-ui-bg-base-hover"}`}>
                {active && (
                  <div className="absolute top-3 right-3 text-ui-fg-interactive"><CheckCircleSolid /></div>
                )}
                <div className="font-semibold text-ui-fg-base pr-6">{p.label}</div>
                <div className="text-xs text-ui-fg-subtle mt-1 truncate">{p.base_url || "Set your own endpoint"}</div>
                <div className="mt-2">
                  <Badge size="2xsmall" color={active ? "blue" : "grey"}>
                    {p.models.length ? `${p.models.length} models` : "Custom model"}
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>
      </Container>

      {/* Connection */}
      <Container className="p-6">
        <SectionHeader title="Connection" desc="Credentials and endpoint for the selected provider." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label size="small" weight="plus">API Key</Label>
            <Input className="mt-1.5" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={settings?.api_key_masked || "sk-..."}/>
            <Text size="xsmall" className="text-ui-fg-muted mt-1.5">
              {settings?.api_key_set ? <>Saved: <code className="bg-ui-bg-subtle px-1 rounded">{settings.api_key_masked}</code>. Leave empty to keep current.</> : "Paste your key. Stored encrypted in the database."}
            </Text>
          </div>
          <div>
            <Label size="small" weight="plus">Base URL</Label>
            <Input className="mt-1.5" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1"/>
            <Text size="xsmall" className="text-ui-fg-muted mt-1.5">OpenAI-compatible endpoint. Don&apos;t include /chat/completions.</Text>
          </div>
          <div>
            <Label size="small" weight="plus">Model</Label>
            {currentProvider && currentProvider.models.length > 0 ? (
              <select value={model} onChange={e => setModel(e.target.value)} className="w-full mt-1.5 border border-ui-border-base rounded-md px-3 py-2 bg-ui-bg-field text-ui-fg-base text-sm shadow-buttons-neutral focus:outline-none">
                {currentProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <Input className="mt-1.5" value={model} onChange={e => setModel(e.target.value)} placeholder="model name"/>
            )}
          </div>
        </div>
      </Container>

      {/* Prompt */}
      <Container className="p-6">
        <SectionHeader
          title="System Prompt"
          desc="The instruction sent to the AI to control style and structure. The vendor form sends car details (brand, model, year, features, price) as the user message."
          badge={<Button variant="transparent" size="small" onClick={() => setPrompt(DEFAULT_PROMPT)}>Reset to default</Button>}
        />
        <Textarea rows={10} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={DEFAULT_PROMPT}/>
      </Container>

      {/* Save + Test */}
      <Container className="p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={save} isLoading={saving}>Save settings</Button>
            <Button variant="secondary" onClick={test} isLoading={testing} disabled={!settings?.api_key_set}>
              <BoltSolid /> Test with sample car
            </Button>
          </div>
          {savedFlash && <Badge color="green" className="flex items-center gap-1"><CheckCircleSolid /> Saved</Badge>}
        </div>
        {testResult && (
          <div className={`mt-5 p-5 rounded-xl border ${testResult.ok ? "bg-ui-tag-green-bg border-ui-tag-green-border" : "bg-ui-tag-red-bg border-ui-tag-red-border"}`}>
            <div className="flex items-center gap-2 mb-3">
              {testResult.ok ? <span className="text-ui-tag-green-icon"><CheckCircleSolid /></span> : <span className="text-ui-tag-red-icon"><XCircleSolid /></span>}
              <Heading level="h3" className={testResult.ok ? "text-ui-tag-green-text" : "text-ui-tag-red-text"}>{testResult.ok ? "AI is working" : "AI failed"}</Heading>
            </div>
            {testResult.title && <div className="mb-3"><Label size="small" className="text-ui-fg-subtle">Title</Label><div className="text-ui-fg-base font-semibold">{testResult.title}</div></div>}
            {testResult.short && <div className="mb-3"><Label size="small" className="text-ui-fg-subtle">Short description</Label><div className="text-ui-fg-base text-sm">{testResult.short}</div></div>}
            {testResult.description && <div className="mb-3"><Label size="small" className="text-ui-fg-subtle">Description</Label><Text size="small" className="text-ui-fg-base whitespace-pre-line">{testResult.description}</Text></div>}
            {testResult.message && <Text size="small" className="text-ui-fg-error">{testResult.message}</Text>}
            {testResult.detail && <pre className="mt-2 text-xs bg-ui-bg-subtle p-2 rounded overflow-x-auto">{testResult.detail}</pre>}
          </div>
        )}
      </Container>

      {/* DataForSEO Keyword Research */}
      <Container className="p-6">
        <SectionHeader
          title="DataForSEO — Keyword Research"
          desc={'Real Google search volume, competition, and CPC for any keyword. Used in the SEO Manager when you click "Check volume".'}
          badge={settings?.dataforseo_set
            ? <Badge color="green" className="flex items-center gap-1"><CheckCircleSolid /> Configured</Badge>
            : <Badge color="orange" className="flex items-center gap-1"><XCircleSolid /> Not set</Badge>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label size="small" weight="plus">DataForSEO Login (email)</Label>
            <Input className="mt-1.5" value={d4sLogin} onChange={e => setD4sLogin(e.target.value)} placeholder="you@example.com"/>
          </div>
          <div>
            <Label size="small" weight="plus">DataForSEO Password</Label>
            <Input className="mt-1.5" type="password" value={d4sPassword} onChange={e => setD4sPassword(e.target.value)} placeholder={settings?.dataforseo_set ? "•••••• (saved)" : "API password"}/>
          </div>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted mt-3">
          Don&apos;t have an account? Sign up at <a href="https://app.dataforseo.com" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">app.dataforseo.com</a>.
          They give $1 free credit. Each keyword lookup costs ~$0.0005. Cached for 24h.
        </Text>
      </Container>

      {/* How it works */}
      <Container className="p-6">
        <SectionHeader title="How it works" desc="From the vendor's click to a ready-to-publish listing." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STEPS.map(s => (
            <div key={s.n} className="flex gap-3 p-4 bg-ui-bg-subtle rounded-xl border border-ui-border-base">
              <div
                className="flex items-center justify-center rounded-full text-white shrink-0 font-semibold"
                style={{ width: 28, height: 28, fontSize: 13, backgroundImage: "linear-gradient(135deg, #6366f1, #a855f7)" }}
              >{s.n}</div>
              <div>
                <div className="font-semibold text-ui-fg-base mb-0.5">{s.t}</div>
                <Text size="small" className="text-ui-fg-subtle">{s.d}</Text>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
