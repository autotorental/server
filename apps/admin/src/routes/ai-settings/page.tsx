import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { ReactNode } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Input, Label, Button, Textarea, Badge } from "@medusajs/ui"
import { Sparkles, BoltSolid, CheckCircleSolid, XCircleSolid } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("AI Settings", "إعدادات الذكاء الاصطناعي"), icon: Sparkles, rank: 52 }

const DEFAULT_PROMPT = `Generate JSON with three fields for a car rental listing:
- "title": under 70 characters, catchy headline (include year + model + city if useful)
- "short": under 160 characters, one-line summary for listing cards
- "description": 80-140 words, friendly tone, mention key features, lifestyle, who would enjoy it. Plain text, no markdown.

Never invent specs not provided. Use the details given below.`

const PROVIDERS = [
  { id: "openai", label: "OpenAI (GPT)", base_url: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"] },
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
  const [falApiKey, setFalApiKey] = useState("")
  const [videoPrompt, setVideoPrompt] = useState("")
  const [claudeApiKey, setClaudeApiKey] = useState("")
  const [aiProvider, setAiProvider] = useState("hermes3")
  const [claudeKeySet, setClaudeKeySet] = useState(false)
  const [openaiKey, setOpenaiKey] = useState("")
  const [openrouterKey, setOpenrouterKey] = useState("")
  const [huggingfaceKey, setHuggingfaceKey] = useState("")
  const [openaiKeySet, setOpenaiKeySet] = useState(false)
  const [openrouterKeySet, setOpenrouterKeySet] = useState(false)
  const [huggingfaceKeySet, setHuggingfaceKeySet] = useState(false)
  const [openaiModel, setOpenaiModel] = useState("")
  const [openrouterModel, setOpenrouterModel] = useState("")
  const [huggingfaceModel, setHuggingfaceModel] = useState("")
  const [rolePlanner, setRolePlanner] = useState("claude-haiku")
  const [roleCoder, setRoleCoder] = useState("qwen2.5-coder:14b")
  const [roleReviewer, setRoleReviewer] = useState("hermes3")
  const DEFAULT_VIDEO_PROMPT = "Cinematic luxury car rental advertisement. {COLOR}{TITLE} driving at high speed on {CITY} highway at night. Low-angle dramatic tracking shot, wheels spinning, motion blur, exhaust. {CITY} city lights and skyline. Professional car commercial. Ultra realistic 4K cinematography."

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
          if (d.settings.ai_provider) setAiProvider(d.settings.ai_provider)
          if (d.settings.claude_key_set) setClaudeKeySet(true)
          if (d.settings.openai_key_set) setOpenaiKeySet(true)
          if (d.settings.openrouter_key_set) setOpenrouterKeySet(true)
          if (d.settings.huggingface_key_set) setHuggingfaceKeySet(true)
          if (d.settings.openai_model) setOpenaiModel(d.settings.openai_model)
          if (d.settings.openrouter_model) setOpenrouterModel(d.settings.openrouter_model)
          if (d.settings.huggingface_model) setHuggingfaceModel(d.settings.huggingface_model)
          if (d.settings.ai_role_planner) setRolePlanner(d.settings.ai_role_planner)
          if (d.settings.ai_role_coder) setRoleCoder(d.settings.ai_role_coder)
          if (d.settings.ai_role_reviewer) setRoleReviewer(d.settings.ai_role_reviewer)
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
      if (d4sPassword) body.dataforseo_password = d4sPassword
      if (falApiKey) body.fal_api_key = falApiKey
      if (videoPrompt) body.video_prompt = videoPrompt
      if (claudeApiKey) body.claude_api_key = claudeApiKey
      if (openaiKey) body.openai_api_key = openaiKey
      if (openrouterKey) body.openrouter_api_key = openrouterKey
      if (huggingfaceKey) body.huggingface_api_key = huggingfaceKey
      body.openai_model = openaiModel
      body.openrouter_model = openrouterModel
      body.huggingface_model = huggingfaceModel
      body.ai_provider = aiProvider
      body.ai_role_planner = rolePlanner
      body.ai_role_coder = roleCoder
      body.ai_role_reviewer = roleReviewer
      const r = await fetch(`${API}/admin/ai/settings`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (r.ok) {
        if (claudeApiKey) setClaudeKeySet(true)
        if (openaiKey) setOpenaiKeySet(true)
        if (openrouterKey) setOpenrouterKeySet(true)
        if (huggingfaceKey) setHuggingfaceKeySet(true)
        setApiKey("")
        setClaudeApiKey("")
        setOpenaiKey("")
        setOpenrouterKey("")
        setHuggingfaceKey("")
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
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

      {/* FAL.ai Video Generation */}
      <Container className="p-6">
        <SectionHeader
          title="🎬 FAL.ai — AI Video Ads"
          desc="Generates cinematic car driving videos from photos using Kling AI. Used for the '🎬 Generate AI Video Ad' button in vehicle editing."
          badge={settings?.fal_key_set
            ? <Badge color="green" className="flex items-center gap-1"><CheckCircleSolid /> Configured</Badge>
            : <Badge color="orange" className="flex items-center gap-1"><XCircleSolid /> Not set</Badge>}
        />
        <div>
          <Label size="small" weight="plus">FAL.ai API Key</Label>
          <Input
            className="mt-1.5" type="password"
            value={falApiKey}
            onChange={e => setFalApiKey(e.target.value)}
            placeholder={settings?.fal_key_set ? "•••••• (saved — leave empty to keep)" : "c949f1f6-xxxx:yyyyyyy"}
            dir="ltr"
          />
          <Text size="xsmall" className="text-ui-fg-muted mt-1.5">
            Get your free key (+ $5 credit) at{" "}
            <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">fal.ai/dashboard/keys</a>.
            Each car video ~$0.07. $20 balance = ~285 videos.
          </Text>
        </div>

        {/* Video prompt script editor */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <Label size="small" weight="plus">🎬 Video Ad Script Prompt</Label>
            <Button variant="transparent" size="small" onClick={() => setVideoPrompt(DEFAULT_VIDEO_PROMPT)}>
              Reset to default
            </Button>
          </div>
          <Textarea
            rows={5}
            value={videoPrompt || (settings?.video_prompt || DEFAULT_VIDEO_PROMPT)}
            onChange={e => setVideoPrompt(e.target.value)}
            placeholder={DEFAULT_VIDEO_PROMPT}
          />
          <Text size="xsmall" className="text-ui-fg-muted mt-1.5">
            Available variables: <code className="bg-ui-bg-subtle px-1 rounded">{"{TITLE}"}</code>{" "}
            <code className="bg-ui-bg-subtle px-1 rounded">{"{BRAND}"}</code>{" "}
            <code className="bg-ui-bg-subtle px-1 rounded">{"{CITY}"}</code>{" "}
            <code className="bg-ui-bg-subtle px-1 rounded">{"{COLOR}"}</code>{" "}
            <code className="bg-ui-bg-subtle px-1 rounded">{"{YEAR}"}</code>{" "}
            — These are replaced with the actual car details when generating.
          </Text>
        </div>
      </Container>


      {/* ── Claude API (Anthropic) ── */}
      <Container className="p-6">
        <SectionHeader
          title="Claude API — Anthropic AI"
          desc="Use Claude (Haiku / Sonnet / Opus) as the AI engine for your admin assistant. Much more powerful than hermes3 for code analysis and complex tasks."
          badge={claudeKeySet
            ? <Badge color="green" className="flex items-center gap-1"><CheckCircleSolid /> Configured</Badge>
            : <Badge color="grey" className="flex items-center gap-1"><XCircleSolid /> Not configured</Badge>}
        />

        {/* Provider selector */}
        <div className="mb-5">
          <Label size="small" weight="plus" className="block mb-2">AI Assistant Engine</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
            {[
              { id: "local",              label: "Local AI (qwen2.5)", sub: "Free · Private · your server", color: "#059669" },
              { id: "qwen2.5-coder:14b",  label: "Qwen2.5 Coder",   sub: "Free · Best for code", color: "#059669" },
              { id: "claude-haiku",       label: "Claude Haiku",     sub: "~$0.001/msg",          color: "#1753b0" },
              { id: "claude-sonnet",      label: "Claude Sonnet",    sub: "~$0.015/msg",          color: "#7c3aed" },
              { id: "openai",             label: "OpenAI",           sub: "GPT-4o-mini",          color: "#10a37f" },
              { id: "openrouter",         label: "OpenRouter",       sub: "Any model",            color: "#6467f2" },
              { id: "huggingface",        label: "HuggingFace",      sub: "Llama 3.3 70B",        color: "#ffae00" },
            ].map(p => (
              <button key={p.id} onClick={() => setAiProvider(p.id)}
                className={"relative rounded-xl border-2 p-3 text-left transition " + (aiProvider === p.id ? "border-ui-fg-interactive bg-ui-bg-base" : "border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base-hover")}>
                {(p.id === "local" || p.id.indexOf("qwen") === 0 || (p.id.indexOf("claude") === 0 && claudeKeySet) || (p.id === "openai" && openaiKeySet) || (p.id === "openrouter" && openrouterKeySet) || (p.id === "huggingface" && huggingfaceKeySet)) && <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,.9)" }} title="Configured" />}
                <div className="font-semibold text-sm text-ui-fg-base">{p.label}</div>
                <div className="text-xs text-ui-fg-muted mt-0.5">{p.sub}</div>
                {aiProvider === p.id && <div className="mt-1.5 w-2 h-2 rounded-full" style={{background: p.color}}/>}
              </button>
            ))}
          </div>
        </div>

        {/* Claude API key (only show if Claude is selected) */}
        {aiProvider.startsWith("claude") && (
          <div className="space-y-3">
            <div>
              <Label size="small" weight="plus">Anthropic API Key</Label>
              <Input
                className="mt-1.5 font-mono"
                type="password"
                value={claudeApiKey}
                onChange={e => setClaudeApiKey(e.target.value)}
                placeholder={claudeKeySet ? "sk-ant-... (saved — leave empty to keep)" : "sk-ant-api03-..."}
                dir="ltr"
              />
            </div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Get your key at{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">
                console.anthropic.com
              </a>.
              Claude Haiku is cheapest (~$0.001/message). Your key is stored encrypted on your server — never sent anywhere else.
            </Text>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 text-sm">
              <div className="font-semibold text-ui-fg-base mb-2">Why use Claude?</div>
              <div className="space-y-1 text-ui-fg-subtle">
                <div>✓ Understands complex code — fixes real bugs automatically</div>
                <div>✓ Analyzes website screenshots with precision</div>
                <div>✓ Much better at multi-step reasoning and planning</div>
                <div>✓ Writes production-quality code changes</div>
                <div>✓ hermes3 stays active for vendor AI (free, private)</div>
              </div>
            </div>
          </div>
        )}

        {aiProvider === "openai" && (
          <div className="space-y-3">
            <div>
              <Label size="small" weight="plus">OpenAI API Key</Label>
              <Input
                className="mt-1.5 font-mono"
                type="password"
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
                placeholder={openaiKeySet ? "sk-... (saved — leave empty to keep)" : "sk-proj-..."}
                dir="ltr"
              />
            </div>
            <div>
              <Label size="small" weight="plus">Model (optional)</Label>
              <Input
                className="mt-1.5 font-mono"
                value={openaiModel}
                onChange={e => setOpenaiModel(e.target.value)}
                placeholder="gpt-4o-mini"
                dir="ltr"
              />
            </div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Get your key at{" "}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">platform.openai.com</a>.
              Default model: <code className="bg-ui-bg-subtle px-1 rounded">gpt-4o-mini</code>. Your key is stored encrypted on your server.
            </Text>
          </div>
        )}

        {aiProvider === "openrouter" && (
          <div className="space-y-3">
            <div>
              <Label size="small" weight="plus">OpenRouter API Key</Label>
              <Input
                className="mt-1.5 font-mono"
                type="password"
                value={openrouterKey}
                onChange={e => setOpenrouterKey(e.target.value)}
                placeholder={openrouterKeySet ? "sk-or-... (saved — leave empty to keep)" : "sk-or-v1-..."}
                dir="ltr"
              />
            </div>
            <div>
              <Label size="small" weight="plus">Model (optional)</Label>
              <Input
                className="mt-1.5 font-mono"
                value={openrouterModel}
                onChange={e => setOpenrouterModel(e.target.value)}
                placeholder="openai/gpt-4o-mini"
                dir="ltr"
              />
            </div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Get your key at{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">openrouter.ai/keys</a>.
              Default model: <code className="bg-ui-bg-subtle px-1 rounded">openai/gpt-4o-mini</code>. Access hundreds of models through one API.
            </Text>
          </div>
        )}

        {aiProvider === "huggingface" && (
          <div className="space-y-3">
            <div>
              <Label size="small" weight="plus">HuggingFace API Key</Label>
              <Input
                className="mt-1.5 font-mono"
                type="password"
                value={huggingfaceKey}
                onChange={e => setHuggingfaceKey(e.target.value)}
                placeholder={huggingfaceKeySet ? "hf_... (saved — leave empty to keep)" : "hf_..."}
                dir="ltr"
              />
            </div>
            <div>
              <Label size="small" weight="plus">Model (optional)</Label>
              <Input
                className="mt-1.5 font-mono"
                value={huggingfaceModel}
                onChange={e => setHuggingfaceModel(e.target.value)}
                placeholder="meta-llama/Llama-3.3-70B-Instruct"
                dir="ltr"
              />
            </div>
            <Text size="xsmall" className="text-ui-fg-muted">
              Get your token at{" "}
              <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">huggingface.co/settings/tokens</a>.
              Default model: <code className="bg-ui-bg-subtle px-1 rounded">meta-llama/Llama-3.3-70B-Instruct</code>. Runs via the HF Inference router.
            </Text>
          </div>
        )}

        {aiProvider === "local" && (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 text-sm">
            <div className="font-semibold text-green-800 dark:text-green-300 mb-1.5">✅ Local AI — Free &amp; Private (running now)</div>
            <div className="space-y-1 text-green-700 dark:text-green-400">
              <div>✓ Runs <strong>qwen2.5</strong> on THIS server (localhost) — no external API, no credits</div>
              <div>✓ Full agent tools: read/write files, query database, run builds, restart services</div>
              <div>✓ Zero cost · 100% private · works offline</div>
              <div>ℹ️ A 3B local model — great for ops &amp; simple fixes. For top-tier coding, add a Claude key below.</div>
            </div>
          </div>
        )}
        {aiProvider === "qwen2.5-coder:14b" && (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-4 text-sm">
            <div className="font-semibold text-green-800 dark:text-green-300 mb-2">✅ Qwen2.5-Coder 14B — Free & Private</div>
            <div className="space-y-1 text-green-700 dark:text-green-400">
              <div>✓ 14 billion parameters — 1.75× smarter than hermes3:8b</div>
              <div>✓ Specialized in code — reads, writes, and fixes code perfectly</div>
              <div>✓ Runs on your own server (localhost) — 100% private</div>
              <div>✓ Zero cost — no API charges, no limits</div>
              <div>✓ Context: 128K tokens — can read entire codebases</div>
            </div>
          </div>
        )}
      </Container>


      {/* ── AI Agent Roles ── */}
      <Container className="p-6">
        <SectionHeader
          title="AI Agent Roles"
          desc="Choose which model handles each phase of multi-step agent tasks. Each role uses a different model optimized for that job."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
          {/* Planner */}
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center text-base">🧠</div>
              <div>
                <div className="font-semibold text-sm text-ui-fg-base">Planner</div>
                <div className="text-xs text-ui-fg-muted">Plans tasks &amp; strategy</div>
              </div>
            </div>
            <select
              value={rolePlanner}
              onChange={e => setRolePlanner(e.target.value)}
              className="w-full border border-ui-border-base rounded-lg px-3 py-2 bg-ui-bg-field text-ui-fg-base text-sm focus:outline-none focus:border-ui-fg-interactive"
            >
              <option value="hermes3">hermes3 (Free · Local)</option>
              <option value="qwen2.5-coder:14b">Qwen2.5 Coder 14b (Free)</option>
              <option value="claude-haiku">Claude Haiku (~$0.001/msg)</option>
              <option value="claude-sonnet">Claude Sonnet (~$0.015/msg)</option>
              <option value="claude-opus">Claude Opus (~$0.075/msg)</option>
            </select>
          </div>

          {/* Coder */}
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center text-base">💻</div>
              <div>
                <div className="font-semibold text-sm text-ui-fg-base">Coder</div>
                <div className="text-xs text-ui-fg-muted">Writes &amp; edits code</div>
              </div>
            </div>
            <select
              value={roleCoder}
              onChange={e => setRoleCoder(e.target.value)}
              className="w-full border border-ui-border-base rounded-lg px-3 py-2 bg-ui-bg-field text-ui-fg-base text-sm focus:outline-none focus:border-ui-fg-interactive"
            >
              <option value="hermes3">hermes3 (Free · Local)</option>
              <option value="qwen2.5-coder:14b">Qwen2.5 Coder 14b (Free)</option>
              <option value="claude-haiku">Claude Haiku (~$0.001/msg)</option>
              <option value="claude-sonnet">Claude Sonnet (~$0.015/msg)</option>
              <option value="claude-opus">Claude Opus (~$0.075/msg)</option>
            </select>
          </div>

          {/* Reviewer */}
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center text-base">🔍</div>
              <div>
                <div className="font-semibold text-sm text-ui-fg-base">Reviewer</div>
                <div className="text-xs text-ui-fg-muted">Reviews &amp; validates</div>
              </div>
            </div>
            <select
              value={roleReviewer}
              onChange={e => setRoleReviewer(e.target.value)}
              className="w-full border border-ui-border-base rounded-lg px-3 py-2 bg-ui-bg-field text-ui-fg-base text-sm focus:outline-none focus:border-ui-fg-interactive"
            >
              <option value="hermes3">hermes3 (Free · Local)</option>
              <option value="qwen2.5-coder:14b">Qwen2.5 Coder 14b (Free)</option>
              <option value="claude-haiku">Claude Haiku (~$0.001/msg)</option>
              <option value="claude-sonnet">Claude Sonnet (~$0.015/msg)</option>
              <option value="claude-opus">Claude Opus (~$0.075/msg)</option>
            </select>
          </div>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted mt-4">
          Tips: Use <strong>Qwen2.5 Coder</strong> as Coder for best free code quality. Use <strong>Claude Haiku</strong> as Planner for fast strategic thinking. Use <strong>hermes3</strong> as Reviewer for free local validation.
        </Text>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
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
