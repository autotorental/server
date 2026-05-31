import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Select, FocusModal, Badge } from "@medusajs/ui"
import { CheckCircleSolid, Plus, Trash, PencilSquare, Photo, FolderOpen, TriangleRightMini, TriangleDownMini, DotsSix } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Features", icon: CheckCircleSolid }

type F = { id?: string; name: string; name_ar: string|null; slug: string; category: string|null; icon: string|null; icon_url: string|null }
type Cat = { id: string; key: string; label: string; sort_order?: number }

const CATEGORY_ICONS: Record<string, string> = {
  comfort: "🛋️", extras: "✨", performance: "🏁", safety: "🛡️", tech: "📱",
}

const catEmoji = (key: string) => CATEGORY_ICONS[key] || "📁"
const catLabel = (cat: Cat) => `${catEmoji(cat.key)} ${cat.label}`

const Form = ({ item, onSave, onClose, categories, onAddCategory }: {
  item: Partial<F> | null
  onSave: (data: any) => Promise<void>
  onClose: () => void
  categories: Cat[]
  onAddCategory: (key: string, label: string) => Promise<Cat | null>
}) => {
  const defaultCat = item?.category || categories[0]?.key || "comfort"
  const [f, setF] = useState<any>(item || { name: "", name_ar: "", slug: "", category: defaultCat, icon: "", icon_url: "" })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatKey, setNewCatKey] = useState("")
  const [newCatLabel, setNewCatLabel] = useState("")
  const [addingCat, setAddingCat] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (item) setF({ name: "", name_ar: "", slug: "", icon: "", icon_url: "", ...item })
  }, [item])

  const categoryOptions = categories.map(c => ({ value: c.key, label: catLabel(c) }))

  const submitNewCategory = async () => {
    const key = newCatKey.trim().toLowerCase().replace(/\s+/g, "_")
    const label = newCatLabel.trim()
    if (!key || !label) return
    setAddingCat(true)
    try {
      const created = await onAddCategory(key, label)
      if (created) {
        setF({ ...f, category: created.key })
        setNewCatOpen(false)
        setNewCatKey("")
        setNewCatLabel("")
      }
    } finally {
      setAddingCat(false)
    }
  }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData(); fd.append("files", file)
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const d = await res.json()
      const url = d.files?.[0]?.url
      if (url) setF((x: any) => ({ ...x, icon_url: url }))
    } finally { setUploading(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1"><Label size="small">Name (EN)</Label><Input value={f.name||""} onChange={e => setF({...f, name: e.target.value})} placeholder="GPS" /></div>
        <div className="flex flex-col gap-1"><Label size="small">الاسم (AR)</Label><Input value={f.name_ar||""} onChange={e => setF({...f, name_ar: e.target.value})} placeholder="ملاحة" dir="rtl" /></div>
        <div className="flex flex-col gap-1"><Label size="small">Slug</Label><Input value={f.slug||""} onChange={e => setF({...f, slug: e.target.value})} placeholder="gps" /></div>
        <div className="flex flex-col gap-1">
          <Label size="small">Category</Label>
          {newCatOpen ? (
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Input value={newCatKey} onChange={e => setNewCatKey(e.target.value)} placeholder="key (e.g. interior)" size="small" />
                <Input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="Label (e.g. Interior)" size="small" />
              </div>
              <Button size="small" variant="primary" disabled={addingCat} onClick={submitNewCategory}>{addingCat ? "..." : "Add"}</Button>
              <Button size="small" variant="secondary" onClick={() => setNewCatOpen(false)}>X</Button>
            </div>
          ) : (
            <Select value={f.category || categories[0]?.key} onValueChange={v => setF({...f, category: v})}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                {categoryOptions.map(o => <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>)}
              </Select.Content>
            </Select>
          )}
          {!newCatOpen && (
            <Button size="small" variant="transparent" className="mt-1 self-start" onClick={() => setNewCatOpen(true)}>
              <Plus /> New category
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label size="small">Icon</Label>
        <div className="flex items-center gap-3">
          {f.icon_url ? (<>
            <img src={f.icon_url} style={{ width: 48, height: 48, objectFit: "contain", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 6 }} alt="" />
            <Button size="small" variant="secondary" onClick={() => setF({...f, icon_url: ""})}>Remove</Button>
          </>) : (<>
            <Input value={f.icon||""} onChange={e => setF({...f, icon: e.target.value})} placeholder="🗺️" style={{ width: 80, fontSize: 20, textAlign: "center" }} />
            <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Photo /> {uploading ? "Uploading..." : "Upload Icon"}
            </Button>
          </>)}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const file = e.target.files?.[0]; if (file) upload(file) }} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={saving || !f.name || !f.slug || !f.category} onClick={async () => { setSaving(true); try { await onSave(f); onClose() } finally { setSaving(false) } }}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  )
}

const Page = () => {
  const [items, setItems] = useState<F[]>([])
  const [categoryDefs, setCategoryDefs] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<F>|null>(null)
  const [open, setOpen] = useState(false)
  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [newCategoryKey, setNewCategoryKey] = useState("")
  const [newCategoryLabel, setNewCategoryLabel] = useState("")
  const [savingCat, setSavingCat] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // drag state
  const [dragId, setDragId] = useState<string|null>(null)
  const [overCat, setOverCat] = useState<string|null>(null)

  const load = (silent = false) => {
    if (!silent) setLoading(true)
    Promise.all([
      fetch(`${API}/admin/catalog/features`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/admin/catalog/feature-categories`, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([fd, cd]) => {
        setItems(fd.features || [])
        setCategoryDefs(cd.categories || [])
      })
      .catch(() => { setItems([]); setCategoryDefs([]) })
      .finally(() => { if (!silent) setLoading(false) })
  }
  useEffect(() => load(), [])

  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/catalog/features/${data.id}` : `${API}/admin/catalog/features`
    await fetch(url, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) })
    load()
  }

  const remove = async (f: F) => {
    if(!confirm(`Delete feature "${f.name}"?`)) return
    await fetch(`${API}/admin/catalog/features/${f.id}`, { method:"DELETE", credentials:"include" })
    load()
  }

  const grouped: Record<string, F[]> = {}
  items.forEach(it => {
    const c = it.category || "other"
    if (!grouped[c]) grouped[c] = []
    grouped[c].push(it)
  })

  const createCategory = async (key: string, label: string): Promise<Cat | null> => {
    const res = await fetch(`${API}/admin/catalog/feature-categories`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, label }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(err.message || "Could not create category")
      return null
    }
    const d = await res.json()
    await load()
    return d.category
  }

  const deleteCategory = async (cat: Cat) => {
    const count = (grouped[cat.key] || []).length
    const msg = count > 0
      ? `Delete category "${cat.label}" and ALL ${count} features inside it?`
      : `Delete empty category "${cat.label}"?`
    if (!confirm(msg)) return
    await fetch(`${API}/admin/catalog/feature-categories/${cat.id}`, { method: "DELETE", credentials: "include" })
    load()
  }

  const openAddFeature = (categoryKey: string) => {
    setEdit({ category: categoryKey })
    setOpen(true)
  }

  // drag & drop: move a feature into another category
  const moveFeature = async (featId: string, targetCat: string) => {
    const feat = items.find(x => x.id === featId)
    if (!feat || feat.category === targetCat) return
    const updated = { ...feat, category: targetCat }
    setItems(prev => prev.map(x => (x.id === featId ? updated : x)))   // optimistic
    setExpanded(s => new Set(s).add(targetCat))
    await fetch(`${API}/admin/catalog/features/${featId}`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    })
    load(true)
  }

  const clearDrag = () => { setDragId(null); setOverCat(null) }
  const toggle = (key: string) => setExpanded(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  return (
    <SingleColumnPage>
      <Container className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center rounded-xl text-white" style={{ width: 44, height: 44, backgroundImage: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
              <CheckCircleSolid />
            </div>
            <Heading level="h1">✨ Features &amp; Specs</Heading>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setCatManagerOpen(true)}><FolderOpen /> Manage Categories</Button>
            <Button onClick={() => { setEdit({ category: categoryDefs[0]?.key || "comfort" }); setOpen(true) }}><Plus /> Add Feature</Button>
          </div>
        </div>
        <Text className="text-ui-fg-subtle">
          Each category holds its features. <span className="text-ui-fg-base font-medium">Drag a feature</span> by its handle onto another category to move it.
        </Text>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge color="blue">{categoryDefs.length} categories</Badge>
          <Badge color="grey">{items.length} features</Badge>
          <div className="flex-1" />
          <Button size="small" variant="transparent" onClick={() => setExpanded(new Set(categoryDefs.map(c => c.key)))}>Expand all</Button>
          <Button size="small" variant="transparent" onClick={() => setExpanded(new Set())}>Collapse all</Button>
        </div>
      </Container>

      <Container className="p-4 sm:p-6">
        {loading && <Text className="text-ui-fg-muted">Loading…</Text>}
        {!loading && categoryDefs.length === 0 && (
          <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle p-10 text-center">
            <FolderOpen className="mx-auto mb-2 text-ui-fg-muted" />
            <Text className="text-ui-fg-subtle font-medium">No categories yet</Text>
            <Text size="small" className="text-ui-fg-muted mt-1">Open “Manage Categories” to add one, then add features inside it.</Text>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {categoryDefs.map(cat => {
            const list = grouped[cat.key] || []
            const isOpen = expanded.has(cat.key)
            const isDropTarget = overCat === cat.key && dragId != null
            return (
              <div
                key={cat.id}
                className="rounded-xl border bg-ui-bg-base shadow-elevation-card-rest overflow-hidden transition-colors"
                style={{ borderColor: isDropTarget ? "#6366f1" : "var(--border-base, #e5e7eb)", boxShadow: isDropTarget ? "0 0 0 1px #6366f1" : undefined }}
                onDragOver={e => { if (dragId) { e.preventDefault(); setOverCat(cat.key) } }}
                onDrop={e => { if (dragId) { e.preventDefault(); moveFeature(dragId, cat.key); clearDrag() } }}
              >
                {/* Category header */}
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-ui-bg-subtle border-b border-ui-border-base">
                  <button onClick={() => toggle(cat.key)} className="flex items-center justify-center text-ui-fg-muted hover:text-ui-fg-base" style={{ width: 24, height: 24 }} aria-label="toggle">
                    {isOpen ? <TriangleDownMini /> : <TriangleRightMini />}
                  </button>
                  <div className="flex items-center justify-center rounded-lg bg-ui-bg-base border border-ui-border-base" style={{ width: 36, height: 36, fontSize: 18 }}>{catEmoji(cat.key)}</div>
                  <div className="flex-1 min-w-0">
                    <Text className="font-semibold text-ui-fg-base truncate">{cat.label}</Text>
                    <Text size="xsmall" className="text-ui-fg-muted font-mono truncate">{cat.key}</Text>
                  </div>
                  <Badge color={list.length ? "blue" : "grey"}>{list.length} features</Badge>
                  <Button size="small" variant="transparent" onClick={() => openAddFeature(cat.key)} title="Add feature"><Plus /></Button>
                  <Button size="small" variant="transparent" onClick={() => deleteCategory(cat)} title="Delete category"><Trash /></Button>
                </div>

                {/* Feature children */}
                {isOpen && (
                  <div className="p-2 sm:p-3">
                    {list.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-ui-border-base p-5 text-center">
                        <Text size="small" className="text-ui-fg-muted">No features yet — drag one here, or click “+”.</Text>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {list.map(f => {
                          const isDragging = dragId === f.id
                          return (
                            <div
                              key={f.id}
                              draggable
                              onDragStart={e => { setDragId(f.id!); e.dataTransfer.effectAllowed = "move" }}
                              onDragEnd={clearDrag}
                              className="group flex items-center gap-3 rounded-lg border border-ui-border-base bg-ui-bg-base px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all"
                              style={{ opacity: isDragging ? 0.4 : 1 }}
                            >
                              <span className="text-ui-fg-muted group-hover:text-ui-fg-base shrink-0"><DotsSix /></span>
                              <div className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, fontSize: 18 }}>
                                {f.icon_url ? <img src={f.icon_url} style={{ width: 24, height: 24, objectFit: "contain" }} alt="" /> : <span>{f.icon || "•"}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <Text size="small" className="font-medium text-ui-fg-base truncate">{f.name}</Text>
                                <Text size="xsmall" className="text-ui-fg-muted font-mono truncate">{f.slug}</Text>
                              </div>
                              {f.name_ar ? <Text size="small" className="text-ui-fg-subtle hidden sm:block" >{f.name_ar}</Text> : null}
                              <Button size="small" variant="transparent" onClick={() => { setEdit(f); setOpen(true) }} title="Edit feature"><PencilSquare /></Button>
                              <Button size="small" variant="transparent" onClick={() => remove(f)} title="Delete feature"><Trash /></Button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Container>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{edit?.id ? "Edit Feature" : "Add Feature"}</Heading></FocusModal.Header>
          <FocusModal.Body>
            <Form
              item={edit}
              onSave={save}
              onClose={() => setOpen(false)}
              categories={categoryDefs}
              onAddCategory={createCategory}
            />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <FocusModal open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <FocusModal.Content style={{ maxWidth: 520 }}>
          <FocusModal.Header><Heading>📂 Manage Categories</Heading></FocusModal.Header>
          <FocusModal.Body className="p-6 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Category key (e.g. exterior)"
                  value={newCategoryKey}
                  onChange={e => setNewCategoryKey(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Label (e.g. Exterior)"
                  value={newCategoryLabel}
                  onChange={e => setNewCategoryLabel(e.target.value)}
                />
              </div>
              <Button
                disabled={savingCat || !newCategoryKey.trim() || !newCategoryLabel.trim()}
                onClick={async () => {
                  setSavingCat(true)
                  const created = await createCategory(newCategoryKey, newCategoryLabel)
                  setSavingCat(false)
                  if (created) {
                    setNewCategoryKey("")
                    setNewCategoryLabel("")
                  }
                }}
              >
                <Plus /> Add
              </Button>
            </div>
            <div className="divide-y border-t border-ui-border-base">
              {categoryDefs.map(cat => (
                <div key={cat.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{catEmoji(cat.key)}</span>
                    <span className="font-medium">{cat.label}</span>
                    <Badge size="small">{(grouped[cat.key] || []).length} features</Badge>
                  </div>
                  <Button size="small" variant="transparent" onClick={() => deleteCategory(cat)}>
                    <Trash />
                  </Button>
                </div>
              ))}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
