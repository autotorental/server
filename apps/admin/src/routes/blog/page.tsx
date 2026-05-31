import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import {
  Container, Heading, Text, Table, Badge, Button, Input, Label, Select, FocusModal, Textarea,
} from "@medusajs/ui"
import { DocumentText, Plus, Trash, PencilSquare, Photo, ArrowUpRightOnBox, Sparkles } from "@medusajs/icons"
import { API, resolveMediaUrl } from "../../lib/api"

export const config: RouteConfig = { label: "Blog", icon: DocumentText, rank: 8 }

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body: string
  cover_image_url: string | null
  status: "draft" | "published"
  published_at: string | null
  meta_title: string | null
  meta_description: string | null
  focus_keyword: string | null
  author_name: string | null
  sort_order: number
  path: string
}

const emptyPost = (): Partial<Post> => ({
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  cover_image_url: "",
  status: "draft",
  meta_title: "",
  meta_description: "",
  focus_keyword: "",
  author_name: "Auto to Rental",
  sort_order: 0,
})

function slugFromTitle(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
}

const Form = ({
  item,
  onSave,
  onClose,
}: {
  item: Partial<Post> | null
  onSave: (d: any) => Promise<void>
  onClose: () => void
}) => {
  const [f, setF] = useState<any>(item || emptyPost())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [bodyUploading, setBodyUploading] = useState(false)
  const [aiFromTitleLoading, setAiFromTitleLoading] = useState(false)
  const [aiFromTitleError, setAiFromTitleError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const bodyFileRef = useRef<HTMLInputElement>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setF(item || emptyPost())
  }, [item])

  const updateBody = (next: string) => setF((p: any) => ({ ...p, body: next }))

  const insertIntoBody = (snippet: string, selectOffset = 0) => {
    const el = bodyRef.current
    if (!el) {
      updateBody(`${f.body || ""}${snippet}`)
      return
    }
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const current = String(f.body || "")
    const next = `${current.slice(0, start)}${snippet}${current.slice(end)}`
    updateBody(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = Math.max(0, start + selectOffset)
      el.setSelectionRange(pos, pos)
    })
  }

  const insertHeading = (level: 1 | 2) => {
    const tag = `h${level}`
    const placeholder = level === 1 ? "Main heading" : "Section heading"
    insertIntoBody(`\n<${tag}>${placeholder}</${tag}>\n`, 5)
  }

  const insertParagraph = () => {
    insertIntoBody(`\n<p>Your paragraph here...</p>\n`, 4)
  }

  const insertList = (ordered: boolean) => {
    if (ordered) {
      insertIntoBody(`\n<ol>\n  <li>First point</li>\n  <li>Second point</li>\n</ol>\n`, 11)
      return
    }
    insertIntoBody(`\n<ul>\n  <li>First point</li>\n  <li>Second point</li>\n</ul>\n`, 11)
  }

  const insertQuote = () => {
    insertIntoBody(`\n<blockquote>Important quote...</blockquote>\n`, 13)
  }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const data = await res.json()
      const url = data.files?.[0]?.url
      if (url) setF((p: any) => ({ ...p, cover_image_url: url }))
    } finally {
      setUploading(false)
    }
  }

  const uploadMediaIntoBody = async (file: File) => {
    setBodyUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const data = await res.json()
      const url = data.files?.[0]?.url
      if (!url) return

      const lower = file.type.toLowerCase()
      const isImage = lower.startsWith("image/")
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")
      if (isImage) {
        insertIntoBody(`\n<figure>\n  <img src="${url}" alt="${alt}" />\n</figure>\n`, 22)
        return
      }
      insertIntoBody(`\n<video controls src="${url}" style="width:100%;max-width:100%"></video>\n`)
    } finally {
      setBodyUploading(false)
    }
  }

  const insertMediaFromUrl = () => {
    const url = prompt("Paste image or video URL")
    if (!url) return
    const clean = url.trim()
    if (!clean) return
    const isVideo = /\.(mp4|webm|ogg)(\?|#|$)/i.test(clean)
    if (isVideo) {
      insertIntoBody(`\n<video controls src="${clean}" style="width:100%;max-width:100%"></video>\n`)
      return
    }
    insertIntoBody(`\n<figure>\n  <img src="${clean}" alt="" />\n</figure>\n`, 22)
  }

  const generateBodyFromTitle = async () => {
    const title = String(f.title || "").trim()
    if (!title) {
      setAiFromTitleError("Write a post title first.")
      return
    }
    setAiFromTitleLoading(true)
    setAiFromTitleError("")
    try {
      const res = await fetch(`${API}/admin/blog/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: title,
          keywords: String(f.focus_keyword || "")
            .split(",")
            .map((k: string) => k.trim())
            .filter(Boolean),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAiFromTitleError(data.message || "AI generation failed")
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
    } catch (e: any) {
      setAiFromTitleError(e.message || "AI generation failed")
    } finally {
      setAiFromTitleLoading(false)
    }
  }

  return (
    <div className="flex flex-col max-h-[min(75vh,720px)]">
      <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1 min-h-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <Label size="small">Post title *</Label>
          <Input
            value={f.title || ""}
            onChange={e => {
              const title = e.target.value
              setF((p: any) => ({
                ...p,
                title,
                slug: p.id ? p.slug : slugFromTitle(title),
              }))
            }}
            placeholder="e.g. Cheapest Car Rental in Dubai 2026"
          />
        </div>
        <div>
          <Label size="small">URL slug *</Label>
          <Input
            value={f.slug || ""}
            onChange={e => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            placeholder="cheapest-car-rental-dubai-2026"
            dir="ltr"
          />
          <Text size="xsmall" className="text-ui-fg-muted mt-1">
            autotorental.com/blog/{f.slug || "…"}
          </Text>
        </div>
        <div>
          <Label size="small">Status</Label>
          <Select value={f.status || "draft"} onValueChange={v => setF({ ...f, status: v })}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="draft">Draft</Select.Item>
              <Select.Item value="published">Published</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Label size="small">Excerpt</Label>
          <Textarea rows={2} value={f.excerpt || ""} onChange={e => setF({ ...f, excerpt: e.target.value })} placeholder="Short summary for the blog list and Google results" />
        </div>
        <div className="md:col-span-2">
          <Label size="small">Post body (HTML allowed)</Label>
          <div className="rounded-lg border border-ui-border-base p-2 mt-1">
            <div className="flex flex-wrap gap-2 pb-2 border-b border-ui-border-base mb-2">
              <Button type="button" size="small" variant="secondary" onClick={() => insertHeading(1)}>H1</Button>
              <Button type="button" size="small" variant="secondary" onClick={() => insertHeading(2)}>H2</Button>
              <Button type="button" size="small" variant="secondary" onClick={insertParagraph}>P</Button>
              <Button type="button" size="small" variant="secondary" onClick={() => insertList(false)}>• List</Button>
              <Button type="button" size="small" variant="secondary" onClick={() => insertList(true)}>1. List</Button>
              <Button type="button" size="small" variant="secondary" onClick={insertQuote}>Quote</Button>
              <input
                ref={bodyFileRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={e => e.target.files?.[0] && uploadMediaIntoBody(e.target.files[0])}
              />
              <Button
                type="button"
                size="small"
                variant="secondary"
                onClick={() => bodyFileRef.current?.click()}
                disabled={bodyUploading}
              >
                {bodyUploading ? "Uploading media…" : "Add Media"}
              </Button>
              <Button type="button" size="small" variant="secondary" onClick={insertMediaFromUrl}>Media URL</Button>
              <Button
                type="button"
                size="small"
                variant="secondary"
                onClick={generateBodyFromTitle}
                disabled={aiFromTitleLoading || !String(f.title || "").trim()}
              >
                <Sparkles />
                {aiFromTitleLoading ? "Generating..." : "Generate from title"}
              </Button>
            </div>
            {aiFromTitleError && (
              <div className="mb-2 rounded-lg border border-ui-border-error bg-ui-bg-error-subtle px-3 py-2 text-sm text-ui-fg-error">
                {aiFromTitleError}
              </div>
            )}
            <Textarea
              rows={12}
              value={f.body || ""}
              ref={bodyRef}
              onChange={e => setF({ ...f, body: e.target.value })}
              placeholder="<p>Write your article here…</p>"
              dir="ltr"
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <Label size="small">Cover image</Label>
          <div className="flex items-start gap-3 mt-1">
            <div className="w-40 h-28 rounded-lg bg-ui-bg-subtle border border-ui-border-base overflow-hidden flex items-center justify-center">
              {f.cover_image_url ? (
                <img src={resolveMediaUrl(f.cover_image_url)} alt="" className="w-full h-full object-cover" />
              ) : (
                <Photo />
              )}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button variant="secondary" size="small" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : f.cover_image_url ? "Replace image" : "Upload image"}
              </Button>
              <Input placeholder="Or paste image URL…" value={f.cover_image_url || ""} onChange={e => setF({ ...f, cover_image_url: e.target.value })} dir="ltr" />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-ui-border-base p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-ui-fg-muted" />
          <Text weight="plus">SEO settings</Text>
        </div>
        <div>
          <Label size="small">SEO title</Label>
          <Input value={f.meta_title || ""} onChange={e => setF({ ...f, meta_title: e.target.value })} placeholder={f.title || "Google title"} maxLength={70} />
        </div>
        <div>
          <Label size="small">Meta description</Label>
          <Textarea rows={3} value={f.meta_description || ""} onChange={e => setF({ ...f, meta_description: e.target.value })} placeholder="120–160 characters for search results" maxLength={200} />
        </div>
        <div>
          <Label size="small">Focus keyword</Label>
          <Input value={f.focus_keyword || ""} onChange={e => setF({ ...f, focus_keyword: e.target.value })} placeholder="car rental dubai" dir="ltr" />
        </div>
      </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-ui-border-base bg-ui-bg-base px-4 py-3">
        <Text size="small" className="text-ui-fg-muted hidden sm:block">
          {(!f.title?.trim() || !f.slug?.trim())
            ? "Add a title and slug to enable Save"
            : f.status === "published" ? "Will be visible on autotorental.com/blog" : "Saved as draft until you publish"}
        </Text>
        <div className="flex justify-end gap-2 ml-auto">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={saving || !f.title?.trim() || !f.slug?.trim()}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave(f)
                onClose()
              } finally {
                setSaving(false)
              }
            }}
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
      .then(r => (r.ok ? r.json() : { posts: [] }))
      .then(d => setPosts(d.posts || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/blog/posts/${data.id}` : `${API}/admin/blog/posts`
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      alert(d.message || "Save failed")
      throw new Error("save failed")
    }
    load()
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return
    await fetch(`${API}/admin/blog/posts/${id}`, { method: "DELETE", credentials: "include" })
    load()
  }

  const generateWithAi = async () => {
    const topic = aiTopic.trim()
    if (!topic) {
      setAiError("Topic/title is required")
      return
    }

    setAiGenerating(true)
    setAiError("")
    try {
      const res = await fetch(`${API}/admin/blog/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          keywords: aiKeywords
            .split(",")
            .map(k => k.trim())
            .filter(Boolean),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setAiError(data.message || "AI generation failed")
        return
      }

      setAiOpen(false)
      setEdit({
        ...emptyPost(),
        title: data.title || topic,
        slug: data.slug || slugFromTitle(data.title || topic),
        excerpt: data.excerpt || "",
        body: data.body || "",
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        focus_keyword: data.focus_keyword || "",
      })
      setOpen(true)
    } catch (e: any) {
      setAiError(e.message || "AI generation failed")
    } finally {
      setAiGenerating(false)
    }
  }

  const published = posts.filter(p => p.status === "published").length

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Heading level="h1">Blog</Heading>
            <Text className="text-ui-fg-subtle mt-1 max-w-2xl">
              Create and edit blog posts on autotorental.com/blog — content and SEO in one place.
            </Text>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge color="green">{published} published</Badge>
              <Badge color="grey">{posts.length - published} draft</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
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
            <a href="https://autotorental.com/blog" target="_blank" rel="noopener">
              <Button variant="secondary"><ArrowUpRightOnBox /> View blog</Button>
            </a>
            <Button variant="secondary" onClick={() => { setAiError(""); setAiOpen(true) }}>
              <Sparkles /> AI Generate
            </Button>
            <Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> New post</Button>
          </div>
        </div>
      </Container>

      <Container className="p-0 divide-y">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Cover</Table.HeaderCell>
              <Table.HeaderCell>Title</Table.HeaderCell>
              <Table.HeaderCell>Slug</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading && (
              <Table.Row><Table.Cell colSpan={5}>Loading…</Table.Cell></Table.Row>
            )}
            {!loading && posts.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5} className="text-center py-10 text-ui-fg-muted">
                  No posts yet — click New post
                </Table.Cell>
              </Table.Row>
            )}
            {posts.map(p => (
              <Table.Row key={p.id}>
                <Table.Cell>
                  {p.cover_image_url ? (
                    <img src={resolveMediaUrl(p.cover_image_url)} alt="" className="w-16 h-11 object-cover rounded" />
                  ) : (
                    <span className="text-2xl">📄</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="font-medium">{p.title}</div>
                  {p.focus_keyword && <div className="text-xs text-ui-fg-muted">🔑 {p.focus_keyword}</div>}
                </Table.Cell>
                <Table.Cell>
                  <code className="text-xs">/blog/{p.slug}</code>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={p.status === "published" ? "green" : "orange"}>
                    {p.status === "published" ? "Published" : "Draft"}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-right">
                  <a href={`https://autotorental.com/blog/${p.slug}`} target="_blank" rel="noopener" className="inline-block mr-1">
                    <Button size="small" variant="secondary"><ArrowUpRightOnBox /></Button>
                  </a>
                  <Button size="small" variant="secondary" className="mr-1" onClick={() => { setEdit(p); setOpen(true) }}>
                    <PencilSquare />
                  </Button>
                  <Button size="small" variant="danger" onClick={() => remove(p.id)}><Trash /></Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading>{edit?.id ? "Edit post" : "New post"}</Heading>
          </FocusModal.Header>
          <FocusModal.Body>
            <Form item={edit} onSave={save} onClose={() => setOpen(false)} />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <FocusModal open={aiOpen} onOpenChange={setAiOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading>Generate blog post with AI</Heading>
          </FocusModal.Header>
          <FocusModal.Body>
            <div className="p-4 space-y-4">
              <Text className="text-ui-fg-subtle">
                Generate a full draft between 1500 and 2000 words. You can edit everything before saving.
              </Text>
              <div>
                <Label size="small">Topic / title idea *</Label>
                <Input
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="e.g. Monthly car rental in Dubai: complete guide"
                />
              </div>
              <div>
                <Label size="small">Keywords (optional)</Label>
                <Input
                  value={aiKeywords}
                  onChange={e => setAiKeywords(e.target.value)}
                  placeholder="monthly car rental dubai, long term car rental dubai"
                />
                <Text size="xsmall" className="text-ui-fg-muted mt-1">
                  Comma-separated keywords help guide SEO focus.
                </Text>
              </div>
              {aiError && (
                <div className="rounded-lg border border-ui-border-error bg-ui-bg-error-subtle px-3 py-2 text-sm text-ui-fg-error">
                  {aiError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-ui-border-base">
                <Button variant="secondary" onClick={() => setAiOpen(false)} disabled={aiGenerating}>
                  Cancel
                </Button>
                <Button onClick={generateWithAi} disabled={aiGenerating || !aiTopic.trim()} isLoading={aiGenerating}>
                  <Sparkles />
                  {aiGenerating ? "Generating…" : "Generate draft"}
                </Button>
              </div>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}

export default Page
