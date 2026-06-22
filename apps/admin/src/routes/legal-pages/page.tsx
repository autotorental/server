import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Label, Input, Button, Badge, toast } from "@medusajs/ui"
import { DocumentText, ArrowUpRightOnBox, CheckCircleSolid, Sparkles } from "@medusajs/icons"
import { API } from "../../lib/api"
import RichEditor from "../../components/rich-editor"

export const config: RouteConfig = { label: tt("Legal Pages", "الصفحات القانونية"), icon: DocumentText, nested: "/settings", rank: 56 }

type Slug = "terms" | "privacy" | "cookies"
type PageData = { content: string; updated_at: string }
const today = () => new Date().toISOString().slice(0, 10)

const TABS: { slug: Slug; label: string; path: string; description: string }[] = [
  { slug: "terms", label: "Terms of Service", path: "/terms", description: "User agreement and usage rules" },
  { slug: "privacy", label: "Privacy Policy", path: "/privacy", description: "Data collection and usage" },
  { slug: "cookies", label: "Cookie Policy", path: "/cookies", description: "Cookie usage and consent" },
]

export default function LegalPagesPage() {
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<Slug>("terms")
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [data, setData] = useState<Record<Slug, PageData>>({
    terms: { content: "", updated_at: today() },
    privacy: { content: "", updated_at: today() },
    cookies: { content: "", updated_at: today() },
  })

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/legal-pages`, { credentials: "include" })
      const d = await r.json()
      const next = {} as Record<Slug, PageData>
      for (const { slug } of TABS) {
        next[slug] = {
          content: d?.pages?.[slug]?.content || "",
          updated_at: d?.pages?.[slug]?.updated_at?.slice?.(0, 10) || today(),
        }
      }
      setData(next)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const cur = data[active]
  const setCur = (patch: Partial<PageData>) =>
    setData((p) => ({ ...p, [active]: { ...p[active], ...patch } }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/admin/legal-pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: active, content: cur.content, updated_at: cur.updated_at }),
      })
      if (!res.ok) throw new Error()
      toast.success(`${TABS.find((t) => t.slug === active)!.label} saved`)
    } catch {
      toast.error("Save failed — please try again")
    } finally {
      setSaving(false)
    }
  }

  const generateContent = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`${API}/admin/legal-pages/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: active }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(d.message || "Generation failed")
        return
      }
      setCur({ content: d.content || "" })
      toast.success(`${TABS.find((t) => t.slug === active)!.label} generated successfully`)
    } catch {
      toast.error("Generation failed — please try again")
    } finally {
      setGenerating(false)
    }
  }

  const tab = TABS.find((t) => t.slug === active)!

  return (
    <SingleColumnPage>
      {/* Header card */}
      <Container className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)" }}>
              <DocumentText className="text-white" />
            </div>
            <div>
              <Heading level="h1">Legal Pages</Heading>
              <Text className="text-ui-fg-subtle mt-1 max-w-2xl">
                Write your legal pages visually — no HTML needed. Content shows on the website (auto-translated for every language).
              </Text>
              <div className="flex items-center gap-2 mt-2">
                <Badge color="purple">3 pages</Badge>
                <Text size="xsmall" className="text-ui-fg-muted">
                  Live at{" "}
                  <a href={`https://autotorental.com${tab.path}`} target="_blank" rel="noopener" className="underline text-ui-fg-interactive">
                    autotorental.com{tab.path}
                  </a>
                </Text>
              </div>
            </div>
          </div>
          <a href={`https://autotorental.com${tab.path}`} target="_blank" rel="noopener">
            <Button variant="secondary" size="small"><ArrowUpRightOnBox /> View {tab.label}</Button>
          </a>
        </div>

        {/* Tab bar */}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-ui-border-base pb-0">
          {TABS.map((t) => (
            <button
              key={t.slug}
              onClick={() => setActive(t.slug)}
              className="relative flex flex-col items-start px-4 py-3 transition-colors"
              style={{
                background: "none",
                border: "none",
                borderBottom: active === t.slug ? "2px solid #6366f1" : "2px solid transparent",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              <span style={{
                fontSize: 14,
                fontWeight: active === t.slug ? 600 : 400,
                color: active === t.slug ? "#6366f1" : "#6b7280",
              }}>{t.label}</span>
              <span style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>{t.description}</span>
            </button>
          ))}
        </div>
      </Container>

      {/* Editor card */}
      <Container className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Text className="text-ui-fg-muted">Loading…</Text>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Date + AI Generate row */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="sm:w-56">
                <Label size="small">"Last updated" date</Label>
                <Input
                  type="date"
                  value={cur.updated_at}
                  onChange={(e) => setCur({ updated_at: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 sm:pb-1">
                <Text size="small" className="text-ui-fg-muted">
                  Shown at{" "}
                  <strong>autotorental.com{tab.path}</strong>
                </Text>
              </div>
              <div className="sm:ml-auto">
                <Button
                  size="small"
                  onClick={generateContent}
                  disabled={generating}
                  style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", border: "none" }}
                >
                  <Sparkles /> {generating ? "Generating professional content…" : "🤖 AI Generate"}
                </Button>
              </div>
            </div>

            {generating && (
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle px-4 py-3 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />
                <Text size="small" className="text-ui-fg-subtle">Generating professional {tab.label} content…</Text>
              </div>
            )}

            <div>
              <Label size="small">Page content</Label>
              <div className="mt-1">
                <RichEditor
                  key={active}
                  value={cur.content}
                  onChange={(html) => setCur({ content: html })}
                  placeholder={`Write the ${tab.label} here…`}
                  minHeight={420}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-ui-border-base pt-4">
              <Text size="small" className="text-ui-fg-muted">
                Changes save immediately and reflect on autotorental.com
              </Text>
              <Button onClick={save} isLoading={saving}>
                <CheckCircleSolid /> Save {tab.label}
              </Button>
            </div>
          </div>
        )}
      </Container>
    </SingleColumnPage>
  )
}
