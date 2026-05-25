import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Input, Label, Button, Textarea, Switch, Badge } from "@medusajs/ui"
import { Sparkles, BoltSolid, CheckCircleSolid, XCircleSolid } from "@medusajs/icons"

export const config: RouteConfig = { label: "AI Settings", icon: Sparkles }

const API = "https://api.autotorental.com"

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
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <Heading level="h2" className="text-2xl">✨ AI Settings</Heading>
            <Text className="text-ui-fg-subtle">Configure the AI provider used for auto-generating car titles, short summaries, and descriptions on the vendor form.</Text>
          </div>
          {settings?.api_key_set ? <Badge color="green"><CheckCircleSolid /> Configured</Badge> : <Badge color="orange"><XCircleSolid /> Not configured</Badge>}
        </div>
      </Container>

      {/* Provider */}
      <Container className="p-6">
        <Heading level="h3">Provider</Heading>
        <Text size="small" className="text-ui-fg-subtle mb-4">Choose your AI provider. Any OpenAI-compatible endpoint works.</Text>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => onProviderChange(p.id)}
              className={`text-left p-4 rounded-xl border-2 transition ${provider === p.id ? "border-ui-tag-blue-bg-hover bg-ui-tag-blue-bg" : "border-ui-border-base bg-ui-bg-base hover:border-ui-fg-muted"}`}>
              <div className="font-bold text-ui-fg-base">{p.label}</div>
              <div className="text-xs text-ui-fg-subtle mt-1 truncate">{p.base_url || "Set your own"}</div>
              <div className="text-[10px] text-ui-fg-muted mt-1">{p.models.length ? p.models.length + " models" : "Custom model"}</div>
            </button>
          ))}
        </div>
      </Container>

      {/* Connection */}
      <Container className="p-6">
        <Heading level="h3">Connection</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <Label size="small">API Key</Label>
            <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={settings?.api_key_masked || "sk-..."}/>
            <Text size="xsmall" className="text-ui-fg-muted mt-1">
              {settings?.api_key_set ? <>Saved: <code className="bg-ui-bg-subtle px-1 rounded">{settings.api_key_masked}</code>. Leave empty to keep current.</> : "Paste your key. Saved encrypted in DB."}
            </Text>
          </div>
          <div>
            <Label size="small">Base URL</Label>
            <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1"/>
            <Text size="xsmall" className="text-ui-fg-muted mt-1">OpenAI-compatible endpoint. Don'\''t include /chat/completions.</Text>
          </div>
          <div>
            <Label size="small">Model</Label>
            {currentProvider && currentProvider.models.length > 0 ? (
              <select value={model} onChange={e => setModel(e.target.value)} className="w-full border border-ui-border-base rounded-md px-3 py-2 bg-ui-bg-base">
                {currentProvider.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            ) : (
              <Input value={model} onChange={e => setModel(e.target.value)} placeholder="model name"/>
            )}
          </div>
        </div>
      </Container>

      {/* Prompt */}
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h3">System Prompt</Heading>
          <Button variant="transparent" size="small" onClick={() => setPrompt(DEFAULT_PROMPT)}>Reset to default</Button>
        </div>
        <Text size="small" className="text-ui-fg-subtle mb-3">
          This is the instruction sent to the AI to control style and structure. The vendor form sends car details (brand, model, year, features, price) as the user message.
        </Text>
        <Textarea rows={10} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={DEFAULT_PROMPT}/>
      </Container>

      {/* Save + Test */}
      <Container className="p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save settings"}</Button>
          <Button variant="secondary" onClick={test} disabled={testing || !settings?.api_key_set}>
            <BoltSolid /> {testing ? "Testing..." : "Test with sample car"}
          </Button>
          {savedFlash && <Badge color="green">✓ Saved</Badge>}
        </div>
        {testResult && (
          <div className={`mt-5 p-5 rounded-xl border ${testResult.ok ? "bg-ui-tag-green-bg border-ui-tag-green-border" : "bg-ui-tag-red-bg border-ui-tag-red-border"}`}>
            <Heading level="h3" className="mb-3">{testResult.ok ? "✓ AI is working" : "✗ AI failed"}</Heading>
            {testResult.title && <div className="mb-3"><Label size="small">Title</Label><div className="text-ui-fg-base font-bold">{testResult.title}</div></div>}
            {testResult.short && <div className="mb-3"><Label size="small">Short description</Label><div className="text-ui-fg-base text-sm">{testResult.short}</div></div>}
            {testResult.description && <div className="mb-3"><Label size="small">Description</Label><Text size="small" className="text-ui-fg-base whitespace-pre-line">{testResult.description}</Text></div>}
            {testResult.message && <Text size="small" className="text-ui-fg-error">{testResult.message}</Text>}
            {testResult.detail && <pre className="mt-2 text-xs bg-ui-bg-subtle p-2 rounded overflow-x-auto">{testResult.detail}</pre>}
          </div>
        )}
      </Container>


      {/* DataForSEO Keyword Research */}
      <Container className="p-6">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
          <div>
            <Heading level="h3">🔍 DataForSEO (Keyword Research)</Heading>
            <Text size="small" className="text-ui-fg-subtle">Real Google search volume + competition + CPC for any keyword. Used in the SEO Manager when you click "Check volume".</Text>
          </div>
          {settings?.dataforseo_set ? <Badge color="green">Configured</Badge> : <Badge color="orange">Not set</Badge>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label size="small">DataForSEO Login (email)</Label>
            <Input value={d4sLogin} onChange={e => setD4sLogin(e.target.value)} placeholder="you@example.com"/>
          </div>
          <div>
            <Label size="small">DataForSEO Password</Label>
            <Input type="password" value={d4sPassword} onChange={e => setD4sPassword(e.target.value)} placeholder={settings?.dataforseo_set ? "•••••• (saved)" : "API password"}/>
          </div>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted mt-3">
          Don't have an account? Sign up at <a href="https://app.dataforseo.com" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">app.dataforseo.com</a>.
          They give $1 free credit. Each keyword lookup costs ~$0.0005. Cached for 24h.
        </Text>
      </Container>
      <Container className="p-6">
        <Heading level="h3">How it works</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm text-ui-fg-subtle">
          <div className="p-4 bg-ui-bg-subtle rounded-lg">
            <div className="font-bold text-ui-fg-base mb-1">1. Vendor opens vehicle form</div>
            They pick brand, model, year, color, features, price.
          </div>
          <div className="p-4 bg-ui-bg-subtle rounded-lg">
            <div className="font-bold text-ui-fg-base mb-1">2. Vendor clicks "Generate with AI"</div>
            Your prompt + the car specs are sent to the configured AI provider.
          </div>
          <div className="p-4 bg-ui-bg-subtle rounded-lg">
            <div className="font-bold text-ui-fg-base mb-1">3. AI returns JSON</div>
            With title, short, and description fields.
          </div>
          <div className="p-4 bg-ui-bg-subtle rounded-lg">
            <div className="font-bold text-ui-fg-base mb-1">4. Auto-filled in the form</div>
            Vendor can edit before publishing.
          </div>
        </div>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
