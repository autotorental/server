import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Label, Input, Textarea, Button, Badge, toast } from "@medusajs/ui"
import { DocumentText, ArrowUpRightOnBox, CheckCircleSolid, Plus, Trash, ArrowLeft } from "@medusajs/icons"
import { API } from "../../lib/api"
import RichEditor from "../../components/rich-editor"

export const config: RouteConfig = { label: tt("Pages", "الصفحات"), icon: DocumentText, rank: 36 }

type Page = {
  id: string
  slug: string
  title: string
  content: string
  meta_title?: string | null
  meta_description?: string | null
  published: boolean
  updated_at?: string
}

const blank = (): Page => ({ id: "", slug: "", title: "", content: "", meta_title: "", meta_description: "", published: true })

export default function PagesAdmin() {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Page | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/pages`, { credentials: "include" })
      const d = await r.json()
      setPages(d.pages || [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editing) return
    if (!editing.title.trim()) { toast.error("Add a title first"); return }
    setSaving(true)
    try {
      const res = await fetch(`${API}/admin/pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.message || "save failed")
      toast.success("Page saved")
      setEditing(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: Page) => {
    if (!confirm(`Delete page "${p.title}"? This can't be undone.`)) return
    await fetch(`${API}/admin/pages/${p.id}`, { method: "DELETE", credentials: "include" })
    toast.success("Page deleted")
    await load()
  }

  const set = (patch: Partial<Page>) => setEditing((p) => (p ? { ...p, ...patch } : p))

  // ---------- Editor view ----------
  if (editing) {
    const liveUrl = editing.slug ? `https://autotorental.com/p/${editing.slug}` : null
    return (
      <SingleColumnPage>
        <Container className="p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button variant="transparent" onClick={() => setEditing(null)}><ArrowLeft /> Back to pages</Button>
            <div className="flex items-center gap-2">
              {liveUrl && editing.id && (
                <a href={liveUrl} target="_blank" rel="noopener"><Button variant="secondary" size="small"><ArrowUpRightOnBox /> View</Button></a>
              )}
              <Button onClick={save} isLoading={saving}><CheckCircleSolid /> Save page</Button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              <div>
                <Label size="small">Page title</Label>
                <Input value={editing.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Why rent with us" />
              </div>
              <div>
                <Label size="small">URL slug {editing.slug && <span className="text-ui-fg-muted">· /p/{editing.slug}</span>}</Label>
                <Input value={editing.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="auto from title if empty" dir="ltr" />
              </div>
            </div>

            <div>
              <Label size="small">Content</Label>
              <div className="mt-1">
                <RichEditor value={editing.content} onChange={(html: string) => set({ content: html })} placeholder="Write your page content here…" minHeight={420} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
              <div>
                <Label size="small">SEO title (optional)</Label>
                <Input value={editing.meta_title || ""} onChange={(e) => set({ meta_title: e.target.value })} placeholder="Defaults to the page title" />
              </div>
              <div>
                <Label size="small">SEO description (optional)</Label>
                <Textarea value={editing.meta_description || ""} onChange={(e) => set({ meta_description: e.target.value })} rows={2} placeholder="Shown in Google results" />
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-ui-border-base pt-4">
              <Button variant={editing.published ? "primary" : "secondary"} size="small" onClick={() => set({ published: !editing.published })}>
                {editing.published ? "Published ✓" : "Draft — click to publish"}
              </Button>
              {editing.id && (
                <Button variant="danger" size="small" onClick={() => remove(editing)}><Trash /> Delete</Button>
              )}
            </div>
          </div>
        </Container>
      </SingleColumnPage>
    )
  }

  // ---------- List view ----------
  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center rounded-xl text-white shrink-0 shadow-elevation-card-rest"
              style={{ width: 48, height: 48, backgroundImage: "linear-gradient(135deg,#1753b0,#0ea5e9)" }}>
              <DocumentText />
            </div>
            <div>
              <Heading level="h1" className="text-2xl font-semibold tracking-tight">Pages</Heading>
              <Text className="text-ui-fg-subtle mt-1 max-w-2xl">
                Create content pages with your website&apos;s design — no code. Each page goes live at autotorental.com/p/your-slug.
              </Text>
            </div>
          </div>
          <Button onClick={() => setEditing(blank())}><Plus /> New page</Button>
        </div>
      </Container>

      <Container className="p-6 pt-0">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden">
          {loading ? (
            <div className="p-6"><Text className="text-ui-fg-muted">Loading…</Text></div>
          ) : pages.length === 0 ? (
            <div className="py-14 text-center">
              <Text className="text-ui-fg-subtle font-medium">No pages yet</Text>
              <Text size="small" className="text-ui-fg-muted mt-1">Click “New page” to create your first one.</Text>
            </div>
          ) : (
            <div className="divide-y divide-ui-border-base">
              {pages.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Text weight="plus" className="truncate">{p.title || "Untitled"}</Text>
                      <Badge size="2xsmall" color={p.published ? "green" : "grey"}>{p.published ? "Published" : "Draft"}</Badge>
                    </div>
                    <Text size="small" className="text-ui-fg-muted font-mono">/p/{p.slug}</Text>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={`https://autotorental.com/p/${p.slug}`} target="_blank" rel="noopener"><Button variant="transparent" size="small"><ArrowUpRightOnBox /></Button></a>
                    <Button variant="secondary" size="small" onClick={() => setEditing({ ...p, meta_title: p.meta_title || "", meta_description: p.meta_description || "" })}>Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </SingleColumnPage>
  )
}
