import { useEffect, useRef, useState, useCallback } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Button, Input, Label, Select, FocusModal, Badge } from "@medusajs/ui"
import { CheckCircleSolid, Plus, Trash, PencilSquare, Photo, FolderOpen } from "@medusajs/icons"

export const config: RouteConfig = { label: "Features", icon: CheckCircleSolid }

const API = "https://api.autotorental.com"
type F = { id?: string; name: string; name_ar: string|null; slug: string; category: string|null; icon: string|null; icon_url: string|null }

const CATEGORY_ICONS: Record<string, string> = {
  comfort: "🛋️", extras: "✨", performance: "🏁", safety: "🛡️", tech: "📱",
}

const Form = ({ item, onSave, onClose, categories }: any) => {
  const [f, setF] = useState<any>(item || { name: "", name_ar: "", slug: "", category: "comfort", icon: "", icon_url: "" })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatKey, setNewCatKey] = useState("")
  const [newCatLabel, setNewCatLabel] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const categoryOptions = categories.map((c: any) => ({
    value: c.key,
    label: `${CATEGORY_ICONS[c.key] || "📁"} ${c.key.charAt(0).toUpperCase() + c.key.slice(1)}`
  }))

  const addCategory = () => {
    if (!newCatKey.trim() || !newCatLabel.trim()) return
    setF({ ...f, category: newCatKey.trim() })
    categories.push({ key: newCatKey.trim(), label: newCatLabel.trim() })
    setNewCatOpen(false)
    setNewCatKey("")
    setNewCatLabel("")
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
      <div className="grid grid-cols-2 gap-3">
        <div><Label size="small">Name (EN)</Label><Input value={f.name||""} onChange={e => setF({...f, name: e.target.value})} placeholder="GPS" /></div>
        <div><Label size="small">الاسم (AR)</Label><Input value={f.name_ar||""} onChange={e => setF({...f, name_ar: e.target.value})} placeholder="ملاحة" dir="rtl" /></div>
        <div><Label size="small">Slug</Label><Input value={f.slug||""} onChange={e => setF({...f, slug: e.target.value})} placeholder="gps" /></div>
        <div>
          <Label size="small">Category</Label>
          {newCatOpen ? (
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Input value={newCatKey} onChange={e => setNewCatKey(e.target.value)} placeholder="key (e.g. interior)" size="small" />
                <Input value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)} placeholder="Label (e.g. Interior)" size="small" />
              </div>
              <Button size="small" variant="primary" onClick={addCategory}>Add</Button>
              <Button size="small" variant="secondary" onClick={() => setNewCatOpen(false)}>X</Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={f.category||"comfort"} onValueChange={v => setF({...f, category: v})}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    {categoryOptions.map((o: any) => <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>)}
                    <div className="border-t border-ui-border-base my-1" />
                    <Button size="small" variant="transparent" className="w-full justify-start" onClick={() => setNewCatOpen(true)}>
                      <Plus /> New category
                    </Button>
                  </Select.Content>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label size="small">Icon</Label>
        <div className="flex items-center gap-3">
          {f.icon_url ? (<>
            <img src={f.icon_url} style={{ width: 48, height: 48, objectFit: "contain", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 6 }} />
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
        <Button disabled={saving || !f.name || !f.slug} onClick={async () => { setSaving(true); try { await onSave(f); onClose() } finally { setSaving(false) } }}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  )
}

const Page = () => {
  const [items, setItems] = useState<F[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<F>|null>(null)
  const [open, setOpen] = useState(false)
  const [catManagerOpen, setCatManagerOpen] = useState(false)
  const [newCategoryKey, setNewCategoryKey] = useState("")
  const [newCategoryLabel, setNewCategoryLabel] = useState("")

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/catalog/features`, { credentials: "include" })
      .then(r => r.json()).then(d => setItems(d.features || []))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/catalog/features/${data.id}` : `${API}/admin/catalog/features`
    await fetch(url, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) })
    load()
  }

  const remove = async (id: string) => {
    if(!confirm("Delete this feature?")) return
    await fetch(`${API}/admin/catalog/features/${id}`, { method:"DELETE", credentials:"include" })
    load()
  }

  // Build categories from data
  const catMap = new Map<string, number>()
  items.forEach(it => {
    const c = it.category || "other"
    catMap.set(c, (catMap.get(c) || 0) + 1)
  })

  const categories = Array.from(catMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ key, count }))

  const grouped: Record<string, F[]> = {}
  items.forEach(it => {
    const c = it.category || "other"
    if (!grouped[c]) grouped[c] = []
    grouped[c].push(it)
  })

  const deleteCategory = async (catKey: string) => {
    const count = catMap.get(catKey) || 0
    if (count > 0) {
      const ok = confirm(`Delete category "${catKey}" and ALL ${count} features inside it?`)
      if (!ok) return
      // Delete all features in this category
      for (const f of grouped[catKey] || []) {
        if (f.id) await fetch(`${API}/admin/catalog/features/${f.id}`, { method: "DELETE", credentials: "include" })
      }
    }
    load()
  }

  const addCategory = () => {
    if (!newCategoryKey.trim() || !newCategoryLabel.trim()) return
    // Just close the modal - category will be created when first feature uses it
    setNewCategoryKey("")
    setNewCategoryLabel("")
    setCatManagerOpen(false)
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <Heading level="h1">✨ Features & Specs</Heading>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setCatManagerOpen(true)}>
              <FolderOpen /> Manage Categories
            </Button>
            <Button onClick={() => { setEdit(null); setOpen(true) }}>
              <Plus /> Add Feature
            </Button>
          </div>
        </div>
        <Text className="text-ui-fg-subtle mb-4">
          {items.length} features across {categories.length} categories
        </Text>
      </Container>

      {categories.length === 0 && !loading && (
        <Container className="p-10 text-center text-ui-fg-muted">
          <Text>No features yet. Click "Add Feature" to create one.</Text>
        </Container>
      )}

      {categories.map(({ key: cat, count }) => (
        <Container key={cat} className="p-0 divide-y">
          <div className="p-6 flex items-center justify-between">
            <Heading level="h2">
              {CATEGORY_ICONS[cat] || "📁"} {cat.charAt(0).toUpperCase() + cat.slice(1)} ({count})
            </Heading>
          </div>
          <Table>
            <Table.Header><Table.Row>
              <Table.HeaderCell>Icon</Table.HeaderCell><Table.HeaderCell>Name (EN)</Table.HeaderCell><Table.HeaderCell>الاسم</Table.HeaderCell>
              <Table.HeaderCell>Slug</Table.HeaderCell><Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row></Table.Header>
            <Table.Body>
              {(grouped[cat] || []).map(f => (
                <Table.Row key={f.id}>
                  <Table.Cell>{f.icon_url ? <img src={f.icon_url} style={{ width: 24, height: 24, objectFit: "contain" }} /> : <span style={{ fontSize: 20 }}>{f.icon || "•"}</span>}</Table.Cell>
                  <Table.Cell className="font-medium">{f.name}</Table.Cell>
                  <Table.Cell dir="rtl">{f.name_ar || "—"}</Table.Cell>
                  <Table.Cell className="font-mono text-xs">{f.slug}</Table.Cell>
                  <Table.Cell className="text-right">
                    <Button size="small" variant="transparent" onClick={() => { setEdit(f); setOpen(true) }}><PencilSquare /></Button>
                    <Button size="small" variant="transparent" onClick={() => remove(f.id!)}><Trash /></Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Container>
      ))}

      {/* Feature Add/Edit Modal */}
      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{edit?.id ? "Edit Feature" : "Add Feature"}</Heading></FocusModal.Header>
          <FocusModal.Body><Form item={edit} onSave={save} onClose={() => setOpen(false)} categories={categories} /></FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      {/* Manage Categories Modal */}
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
                disabled={!newCategoryKey.trim() || !newCategoryLabel.trim()}
                onClick={() => {
                  // Add the category by setting it in the state
                  // Category will actually be created when a feature uses it
                  setCatManagerOpen(false)
                  setEdit({ category: newCategoryKey.trim() })
                  setOpen(true)
                }}
              >
                <Plus /> Add
              </Button>
            </div>
            <div className="divide-y border-t border-ui-border-base">
              {categories.map(({ key: cat, count }) => (
                <div key={cat} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[cat] || "📁"}</span>
                    <span className="font-medium">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                    <Badge size="small">{count} features</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="small" variant="transparent" onClick={() => deleteCategory(cat)}>
                      <Trash />
                    </Button>
                  </div>
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
