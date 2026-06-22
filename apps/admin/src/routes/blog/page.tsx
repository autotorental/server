import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import {
  Container, Heading, Text, Table, Badge, StatusBadge, Button, IconButton, DropdownMenu, Input, Label, Select, FocusModal, Textarea, toast,
} from "@medusajs/ui"
import { DocumentText, Plus, Trash, PencilSquare, Photo, ArrowUpRightOnBox, Sparkles, EllipsisHorizontal, Eye } from "@medusajs/icons"
import { API, resolveMediaUrl } from "../../lib/api"
import RichEditor from "../../components/rich-editor"

// Rank Math-style SEO length feedback
const seoStat = (val, min, max, hard) => {
  const n = (val || "").length
  let c = "text-ui-fg-muted", label = ""
  if (n > 0) {
    if (n < min) { c = "text-orange-500"; label = "Too short" }
    else if (n <= max) { c = "text-emerald-600"; label = "Good" }
    else if (n <= hard) { c = "text-orange-500"; label = "A bit long" }
    else { c = "text-red-500"; label = "Too long" }
  }
  return <span className={"text-[11px] tabular-nums font-medium " + c}>{label ? label + " · " : ""}{n}/{max}</span>
}
const seoBar = (val, min, max, hard) => {
  const n = (val || "").length
  const pct = Math.min(100, Math.round((n / hard) * 100))
  let color = "bg-ui-border-base"
  if (n > 0) color = n < min ? "bg-orange-400" : n <= max ? "bg-emerald-500" : n <= hard ? "bg-orange-400" : "bg-red-500"
  return <div className="mt-1 h-1 w-full rounded-full bg-ui-bg-subtle overflow-hidden"><div className={"h-full transition-all " + color} style={{ width: pct + "%" }} /></div>
}

export const config: RouteConfig = { label: tt("Blog", "المدوّنة"), icon: DocumentText, rank: 35 }

type Post = {
  id: string; slug: string; title: string; excerpt: string | null; body: string
  cover_image_url: string | null; status: "draft" | "published"; published_at: string | null
  meta_title: string | null; meta_description: string | null; focus_keyword: string | null
  author_name: string | null; sort_order: number; path: string
}

const emptyPost = (): Partial<Post> => ({
  title: "", slug: "", excerpt: "", body: "", cover_image_url: "", status: "draft",
  meta_title: "", meta_description: "", focus_keyword: "", author_name: "Auto to Rental", sort_order: 0,
})

function slugFromTitle(title: string) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120)
}

const COVER_STYLES = [
  { value: "photo", label: "Photo" },
  { value: "illustration", label: "Illustration" },
  { value: "cinematic", label: "Cinematic" },
  { value: "minimal", label: "Minimal" },
]

const Form = ({ item, onSave, onClose }: { item: Partial<Post> | null; onSave: (d: any) => Promise<void>; onClose: () => void }) => {
  const [f, setF] = useState<any>(item || emptyPost())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [genStyle, setGenStyle] = useState("photo")
  const [generatingCover, setGeneratingCover] = useState(false)
  // Live progress for AI ops — synthetic but realistic curve so the owner knows
  // it's working, not frozen. Updates every 250ms.
  const [coverProgress,   setCoverProgress]   = useState({ pct: 0, phase: "", elapsed: 0 })
  const [contentProgress, setContentProgress] = useState({ pct: 0, phase: "", elapsed: 0 })
  const [genOpen, setGenOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setF(item || emptyPost()) }, [item])

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file)
      })
      const res = await fetch(`${API}/admin/blog/cover-upload`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, content_base64: dataUrl }) })
      const data = await res.json()
      if (data.url) setF((p: any) => ({ ...p, cover_image_url: data.url }))
      else alert(data.message || "Upload failed")
    } finally { setUploading(false) }
  }

  // Synthetic progress ticker — climbs along a curve that approaches but never
  // reaches 100% until the request actually resolves. Phases roll over realistically.
  // After capping at 94%, the percent oscillates ±1 to PROVE we're not frozen.
  const startProgressTicker = (
    setProg: (v: { pct: number; phase: string; elapsed: number }) => void,
    phases: { until: number; label: string }[],
    estimateSeconds: number,
  ): (() => void) => {
    const t0 = Date.now()
    let tick = 0
    const id = window.setInterval(() => {
      tick++
      const elapsedMs = Date.now() - t0
      const elapsed   = Math.floor(elapsedMs / 1000)
      const tau = (estimateSeconds * 1000) / 2.3
      const raw = 1 - Math.exp(-elapsedMs / tau)
      let pct = Math.min(94, Math.max(1, Math.round(raw * 95)))
      // Once we hit 94, oscillate 93/94 so the user SEES movement (not frozen)
      if (pct >= 94) pct = 93 + (tick % 2)
      const phase = phases.find(p => elapsed < p.until)?.label || phases[phases.length - 1].label
      setProg({ pct, phase, elapsed })
    }, 350)
    return () => window.clearInterval(id)
  }

  const generateCover = async () => {
    const title = String(f.title || "").trim()
    if (!title) { alert("Write a post title first."); return }
    setGeneratingCover(true)
    setCoverProgress({ pct: 1, phase: "Submitting…", elapsed: 0 })
    const stopTicker = startProgressTicker(setCoverProgress, [
      { until: 3,  label: "Submitting to HuggingFace FLUX…" },
      { until: 8,  label: "Queued for GPU…" },
      { until: 20, label: "AI painting cover…" },
      { until: 35, label: "Refining details…" },
      { until: 999, label: "Almost done…" },
    ], 15)
    try {
      const res = await fetch(`${API}/admin/blog/generate-cover`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, style: genStyle }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.message || "Cover generation failed"
        if (msg.toLowerCase().includes("fal") || msg.toLowerCase().includes("key")) {
          alert("Configure FAL.ai key in AI Settings first")
        } else {
          alert(msg)
        }
        return
      }
      if (data.url) {
        setF((p: any) => ({ ...p, cover_image_url: data.url }))
        setGenOpen(false)
        if (data.source === "fleet-photo" && data.note) {
          alert("ℹ️ Used a fleet photo (AI providers unavailable):\n\n" + data.note)
        }
      }
    } catch (e: any) {
      const msg = e.message || "Cover generation failed"
      if (msg.toLowerCase().includes("fal") || msg.toLowerCase().includes("key")) {
        alert("Configure FAL.ai key in AI Settings first")
      } else {
        alert(msg)
      }
    } finally {
      stopTicker()
      setCoverProgress({ pct: 100, phase: "Done!", elapsed: 0 })
      setTimeout(() => setCoverProgress({ pct: 0, phase: "", elapsed: 0 }), 1200)
      setGeneratingCover(false)
    }
  }

  const generateBodyFromTitle = async () => {
    const title = String(f.title || "").trim()
    if (!title) { setAiError("Write a post title first."); return }
    setAiLoading(true); setAiError("")
    setContentProgress({ pct: 1, phase: "Researching topic…", elapsed: 0 })
    const stopTicker = startProgressTicker(setContentProgress, [
      { until: 5,   label: "Researching topic…" },
      { until: 15,  label: "Drafting outline…" },
      { until: 30,  label: "Writing intro & sections…" },
      { until: 50,  label: "Adding examples, data, prices…" },
      { until: 70,  label: "Writing FAQ section…" },
      { until: 90,  label: "Optimizing for SEO…" },
      { until: 110, label: "Final polish…" },
      { until: 999, label: "Almost done — Claude is finalizing the JSON…" },
    ], 60)
    try {
      const res = await fetch(`${API}/admin/blog/generate`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: title, keywords: String(f.focus_keyword || "").split(",").map((k: string) => k.trim()).filter(Boolean) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const realError = data.error || data.message || "AI generation failed"
        // Surface the actual cause: API key missing, model bad, quota exceeded, etc.
        setAiError(realError.length > 200 ? realError.slice(0, 200) + "…" : realError)
        return
      }
      setF((prev: any) => ({
        ...prev,
        body: data.body || prev.body || "",
        excerpt: prev.excerpt || data.excerpt || "",
        meta_title: prev.meta_title || data.meta_title || prev.title || "",
        meta_description: prev.meta_description || data.meta_description || "",
        focus_keyword: prev.focus_keyword || data.focus_keyword || "",
        slug: prev.id ? prev.slug : (prev.slug || slugFromTitle(data.title || title)),
      }))
    } catch (e: any) { setAiError(e.message || "AI generation failed") }
    finally {
      stopTicker()
      setContentProgress({ pct: 100, phase: "Done!", elapsed: 0 })
      setTimeout(() => setContentProgress({ pct: 0, phase: "", elapsed: 0 }), 1200)
      setAiLoading(false)
    }
  }

  const canSave = !!f.title?.trim() && !!f.slug?.trim()

  return (
    <div className="flex h-full max-h-[88vh] flex-col">
      {/* scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        <div className="mx-auto max-w-3xl flex flex-col gap-5">
          <div>
            <Label size="small">Post title *</Label>
            <Input
              value={f.title || ""}
              onChange={(e) => { const title = e.target.value; setF((p: any) => ({ ...p, title, slug: p.id ? p.slug : slugFromTitle(title) })) }}
              placeholder="e.g. Cheapest Car Rental in Dubai 2026"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
            <div>
              <Label size="small">URL slug *</Label>
              <Input value={f.slug || ""} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="cheapest-car-rental-dubai-2026" dir="ltr" />
              <Text size="xsmall" className="text-ui-fg-muted mt-1">autotorental.com/blog/{f.slug || "…"}</Text>
            </div>
            <div>
              <Label size="small">Status</Label>
              <Select value={f.status || "draft"} onValueChange={(v) => setF({ ...f, status: v })}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="draft">Draft</Select.Item>
                  <Select.Item value="published">Published</Select.Item>
                </Select.Content>
              </Select>
            </div>
          </div>

          <div>
            <Label size="small">Excerpt</Label>
            <Textarea rows={2} value={f.excerpt || ""} onChange={(e) => setF({ ...f, excerpt: e.target.value })} placeholder="Short summary for the blog list and Google results" />
          </div>

          {/* Cover image */}
          <div>
            <Label size="small">Cover image</Label>
            <div className="flex items-start gap-3 mt-1">
              <div
                className="rounded-lg bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center"
                style={{
                  width: 200,
                  height: 140,
                  minWidth: 200,
                  maxWidth: 200,
                  minHeight: 140,
                  maxHeight: 140,
                  flexShrink: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {f.cover_image_url ? (
                  <img
                    src={resolveMediaUrl(f.cover_image_url)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  />
                ) : (
                  <Photo />
                )}
              </div>
              <div className="flex flex-col gap-2" style={{ flex: 1, minWidth: 0 }}>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <Button variant="secondary" size="small" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? "Uploading…" : f.cover_image_url ? "Replace image" : "Upload image"}
                </Button>
                {/* Generate Photo button */}
                <Button
                  size="small"
                  onClick={() => setGenOpen((v) => !v)}
                  disabled={generatingCover}
                  style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", border: "none" }}
                >
                  <Sparkles /> {generatingCover ? `Generating ${coverProgress.pct}%…` : "✨ Generate Photo"}
                </Button>
                {/* Style selector pills */}
                {genOpen && !generatingCover && (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1">
                      {COVER_STYLES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setGenStyle(s.value)}
                          style={{
                            padding: "2px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            border: genStyle === s.value ? "2px solid #6366f1" : "2px solid #e5e7eb",
                            background: genStyle === s.value ? "#ede9fe" : "#f9fafb",
                            color: genStyle === s.value ? "#4f46e5" : "#374151",
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <Button
                      size="small"
                      onClick={generateCover}
                      disabled={generatingCover || !String(f.title || "").trim()}
                      style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", border: "none", alignSelf: "flex-start" }}
                    >
                      <Sparkles /> Generate
                    </Button>
                  </div>
                )}
                {generatingCover && (
                  <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <Text size="xsmall" className="text-ui-fg-muted font-medium">{coverProgress.phase || "Generating…"}</Text>
                        <Text size="xsmall" className="text-ui-fg-base font-bold tabular-nums">{coverProgress.pct}%</Text>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-ui-bg-subtle overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${coverProgress.pct}%`, background: "linear-gradient(90deg,#6366f1,#a855f7)" }} />
                      </div>
                      <Text size="xsmall" className="text-ui-fg-muted mt-1">
                        {coverProgress.elapsed > 0 ? `${coverProgress.elapsed}s elapsed — it'\''s working, not frozen` : "Working…"}
                      </Text>
                    </div>
                )}
                <Input placeholder="Or paste image URL…" value={f.cover_image_url || ""} onChange={(e) => setF({ ...f, cover_image_url: e.target.value })} dir="ltr" />
              </div>
            </div>
          </div>

          {/* Body — WYSIWYG */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label size="small">Post content</Label>
              <Button type="button" size="small" variant="secondary" onClick={generateBodyFromTitle} disabled={aiLoading || !String(f.title || "").trim()}>
                <Sparkles /> {aiLoading ? `Generating ${contentProgress.pct}%…` : "Generate from title"}
              </Button>
            </div>
            {aiError && <div className="mb-2 rounded-lg border border-ui-border-error bg-ui-bg-error-subtle px-3 py-2 text-sm text-ui-fg-error">{aiError}</div>}
            <RichEditor value={f.body || ""} onChange={(html) => setF((p: any) => ({ ...p, body: html }))} placeholder="Write your article here — use the toolbar for headings, lists, images…" minHeight={340} />
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-ui-border-base p-4 space-y-3">
            <div className="flex items-center gap-2"><Sparkles className="text-ui-fg-muted" /><Text weight="plus">SEO settings</Text></div>
            <div>
              <div className="flex items-center justify-between"><Label size="small">SEO title</Label>{seoStat(f.meta_title, 50, 60, 70)}</div>
              <Input value={f.meta_title || ""} onChange={(e) => setF({ ...f, meta_title: e.target.value })} placeholder={f.title || "Google title"} maxLength={70} />
              {seoBar(f.meta_title, 50, 60, 70)}
            </div>
            <div>
              <div className="flex items-center justify-between"><Label size="small">Meta description</Label>{seoStat(f.meta_description, 120, 160, 200)}</div>
              <Textarea rows={3} value={f.meta_description || ""} onChange={(e) => setF({ ...f, meta_description: e.target.value })} placeholder="120–160 characters for search results" maxLength={200} />
              {seoBar(f.meta_description, 120, 160, 200)}
            </div>
            <div>
              <Label size="small">Focus keyword</Label>
              <Input value={f.focus_keyword || ""} onChange={(e) => setF({ ...f, focus_keyword: e.target.value })} placeholder="car rental dubai" dir="ltr" />
            </div>
          </div>
        </div>
      </div>

      {/* pinned footer — always visible */}
      <div className="shrink-0 flex items-center justify-between gap-3 border-t border-ui-border-base bg-ui-bg-base px-5 py-3">
        <Text size="small" className="text-ui-fg-muted hidden sm:block">
          {!canSave ? "Add a title and slug to enable Save" : f.status === "published" ? "Will be visible on autotorental.com/blog" : "Saved as draft until you publish"}
        </Text>
        <div className="flex justify-end gap-2 ml-auto">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving || !canSave}
            onClick={async () => { setSaving(true); try { await onSave(f); onClose() } finally { setSaving(false) } }}
          >
            {saving ? "Saving…" : "Save post"}
          </Button>
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<Post> | null>(null)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState("all")
  const [aiOpen, setAiOpen] = useState(false)
  const [aiTopic, setAiTopic] = useState("")
  const [aiKeywords, setAiKeywords] = useState("")
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState("")

  const load = () => {
    setLoading(true)
    const q = filter !== "all" ? `?status=${filter}` : ""
    fetch(`${API}/admin/blog/posts${q}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(d.posts || []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [filter])

  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/blog/posts/${data.id}` : `${API}/admin/blog/posts`
    const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.message || "Save failed"); throw new Error("save failed") }
    toast.success("Post saved")
    load()
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return
    await fetch(`${API}/admin/blog/posts/${id}`, { method: "DELETE", credentials: "include" })
    toast.success("Post deleted")
    load()
  }

  const generateWithAi = async () => {
    const topic = aiTopic.trim()
    if (!topic) { setAiError("Topic/title is required"); return }
    setAiGenerating(true); setAiError("")
    try {
      const res = await fetch(`${API}/admin/blog/generate`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, keywords: aiKeywords.split(",").map((k) => k.trim()).filter(Boolean) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setAiError(data.message || "AI generation failed"); return }
      setAiOpen(false)
      setEdit({
        ...emptyPost(), title: data.title || topic, slug: data.slug || slugFromTitle(data.title || topic),
        excerpt: data.excerpt || "", body: data.body || "", meta_title: data.meta_title || "",
        meta_description: data.meta_description || "", focus_keyword: data.focus_keyword || "",
      })
      setOpen(true)
    } catch (e: any) { setAiError(e.message || "AI generation failed") } finally { setAiGenerating(false) }
  }

  const published = posts.filter((p) => p.status === "published").length

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-x-2">
              <Heading>Blog</Heading>
              <Badge size="2xsmall" color="grey" rounded="full">{posts.length}</Badge>
            </div>
            <Text size="small" className="text-ui-fg-subtle mt-1">Create and edit blog posts on autotorental.com/blog — content and SEO in one place.</Text>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <div className="w-[140px]">
              <Select value={filter} onValueChange={setFilter}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="all">All</Select.Item>
                  <Select.Item value="published">Published</Select.Item>
                  <Select.Item value="draft">Draft</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <a href="https://autotorental.com/blog" target="_blank" rel="noopener"><Button variant="secondary"><ArrowUpRightOnBox /> View blog</Button></a>
            <Button variant="secondary" onClick={() => { setAiError(""); setAiOpen(true) }}><Sparkles /> AI Generate</Button>
            <Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> New post</Button>
          </div>
        </div>
      </Container>

            <Container className="divide-y p-0">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell className="w-[1%] whitespace-nowrap"></Table.HeaderCell>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>URL</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell className="w-[1%]"></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading && (
              <Table.Row><Table.Cell colSpan={5}>
                <div className="flex items-center gap-2 py-2 text-ui-fg-subtle">
                  <div className="w-4 h-4 border-2 border-ui-border-strong border-t-transparent rounded-full animate-spin" /> Loading…
                </div>
              </Table.Cell></Table.Row>
            )}
            {!loading && posts.length === 0 && (
              <Table.Row><Table.Cell colSpan={5}>
                <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
                  <Photo className="text-ui-fg-muted" />
                  <Text className="text-ui-fg-base font-medium">No posts yet</Text>
                  <Text size="small" className="text-ui-fg-subtle">Click “New post” to write your first article.</Text>
                </div>
              </Table.Cell></Table.Row>
            )}
            {posts.map((p) => (
              <Table.Row key={p.id}>
                <Table.Cell className="w-[1%] whitespace-nowrap">
                  <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center">
                    {p.cover_image_url ? <img src={resolveMediaUrl(p.cover_image_url)} alt="" className="h-full w-full object-cover" /> : <Photo className="text-ui-fg-muted" />}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="font-medium text-ui-fg-base">{p.title}</div>
                  {p.focus_keyword && <div className="text-xs text-ui-fg-subtle mt-0.5">{p.focus_keyword}</div>}
                </Table.Cell>
                <Table.Cell><span className="font-mono text-xs text-ui-fg-subtle">/blog/{p.slug}</span></Table.Cell>
                <Table.Cell>
                  <StatusBadge color={p.status === "published" ? "green" : "orange"}>{p.status === "published" ? "Published" : "Draft"}</StatusBadge>
                </Table.Cell>
                <Table.Cell className="w-[1%] whitespace-nowrap text-right">
                  <DropdownMenu>
                    <DropdownMenu.Trigger asChild>
                      <IconButton variant="transparent"><EllipsisHorizontal /></IconButton>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item className="gap-x-2" onClick={() => { setEdit(p); setOpen(true) }}><PencilSquare className="text-ui-fg-subtle" /> Edit</DropdownMenu.Item>
                      <DropdownMenu.Item className="gap-x-2" onClick={() => window.open(`https://autotorental.com/blog/${p.slug}`, "_blank")}><Eye className="text-ui-fg-subtle" /> View on site</DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item className="gap-x-2 text-ui-fg-error" onClick={() => remove(p.id)}><Trash className="text-ui-fg-error" /> Delete</DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{edit?.id ? "Edit post" : "New post"}</Heading></FocusModal.Header>
          <FocusModal.Body className="p-0 overflow-hidden flex flex-col">
            <Form item={edit} onSave={save} onClose={() => setOpen(false)} />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <FocusModal open={aiOpen} onOpenChange={setAiOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>Generate blog post with AI</Heading></FocusModal.Header>
          <FocusModal.Body>
            <div className="p-4 space-y-4 max-w-xl mx-auto">
              <Text className="text-ui-fg-subtle">Generate a full draft between 1500 and 2000 words. You can edit everything before saving.</Text>
              <div>
                <Label size="small">Topic / title idea *</Label>
                <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="e.g. Monthly car rental in Dubai: complete guide" />
              </div>
              <div>
                <Label size="small">Keywords (optional)</Label>
                <Input value={aiKeywords} onChange={(e) => setAiKeywords(e.target.value)} placeholder="monthly car rental dubai, long term car rental dubai" />
                <Text size="xsmall" className="text-ui-fg-muted mt-1">Comma-separated keywords help guide SEO focus.</Text>
              </div>
              {aiError && <div className="rounded-lg border border-ui-border-error bg-ui-bg-error-subtle px-3 py-2 text-sm text-ui-fg-error">{aiError}</div>}
              <div className="flex justify-end gap-2 pt-2 border-t border-ui-border-base">
                <Button variant="secondary" onClick={() => setAiOpen(false)} disabled={aiGenerating}>Cancel</Button>
                <Button onClick={generateWithAi} disabled={aiGenerating || !aiTopic.trim()} isLoading={aiGenerating}><Sparkles /> {aiGenerating ? "Generating…" : "Generate draft"}</Button>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}

export default Page
