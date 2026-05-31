import { useEffect, useMemo, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button, Input, Label, Select, FocusModal } from "@medusajs/ui"
import { Tag, Plus, Trash, PencilSquare, Photo, TriangleRightMini, TriangleDownMini, DotsSix, MagnifyingGlass } from "@medusajs/icons"
import { API, resolveMediaUrl } from "../../lib/api"

export const config: RouteConfig = { label: "Brands", icon: Tag }

type Brand = { id: string; name: string; slug: string; logo_url: string|null; origin_country: string|null; is_active: boolean; sort_order: number }
type BodyType = { id: string; name: string; icon: string|null }
type Model = { id?: string; brand_id: string; name: string; slug: string; year_from?: number|null; year_to?: number|null; body_type_id?: string|null; colors?: string[]|null; is_active: boolean; sort_order: number }

const byOrder = <T extends { sort_order: number; name: string }>(a: T, b: T) =>
  (a.sort_order - b.sort_order) || a.name.localeCompare(b.name)

/* ------------------------------- Brand form ------------------------------- */
const emptyBrand = { name: "", slug: "", origin_country: "", logo_url: "", sort_order: 0 }

const BrandForm = ({ brand, onSave, onClose }: { brand: Partial<Brand>|null; onSave: (data: any) => Promise<void>; onClose: () => void }) => {
  const [form, setForm] = useState<any>(brand || emptyBrand)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const data = await res.json()
      const url = data.files?.[0]?.url
      if (url) setForm((f: any) => ({ ...f, logo_url: url }))
    } finally { setUploading(false) }
  }

  const submit = async () => {
    if (!form.name || !form.slug) return
    setSaving(true)
    try { await onSave(form); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Label size="small">Name</Label>
          <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Toyota" />
        </div>
        <div className="flex flex-col gap-1">
          <Label size="small">Slug</Label>
          <Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="toyota" />
        </div>
        <div className="flex flex-col gap-1">
          <Label size="small">Origin (country code, 2 letters)</Label>
          <Input value={form.origin_country || ""} onChange={e => setForm({ ...form, origin_country: e.target.value.toUpperCase() })} maxLength={2} placeholder="JP" />
        </div>
        <div className="flex flex-col gap-1">
          <Label size="small">Sort order</Label>
          <Input type="number" value={form.sort_order || 0} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label size="small">Logo</Label>
        {form.logo_url ? (
          <div className="flex items-center gap-3">
            <img src={resolveMediaUrl(form.logo_url)} alt="logo" style={{ width: 80, height: 80, objectFit: "contain", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }} />
            <Button size="small" variant="secondary" onClick={() => setForm((f: any) => ({ ...f, logo_url: "" }))}>Remove</Button>
          </div>
        ) : (
          <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Photo /> {uploading ? "Uploading..." : "Upload Logo"}
          </Button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f) }} />
        <Text size="xsmall" className="text-ui-fg-muted">PNG/SVG/JPG · transparent background recommended</Text>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} disabled={saving || !form.name || !form.slug}>{saving ? "Saving..." : "Save Brand"}</Button>
      </div>
    </div>
  )
}

/* ------------------------------ Model form -------------------------------- */
const SeriesForm = ({ item, brands, bodyTypes, onSave, onClose }: { item: Partial<Model>|null; brands: Brand[]; bodyTypes: BodyType[]; onSave: (d: any) => Promise<void>; onClose: () => void }) => {
  const [f, setF] = useState<any>(item || { brand_id: brands[0]?.id || "", name: "", slug: "", year_from: null, year_to: null, sort_order: 0, is_active: true })
  const [saving, setSaving] = useState(false)
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 flex flex-col gap-1"><Label size="small">Brand</Label>
          <Select value={f.brand_id} onValueChange={v => setF({ ...f, brand_id: v })}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>{brands.map(b => <Select.Item key={b.id} value={b.id}>{b.name}</Select.Item>)}</Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-1"><Label size="small">Model name</Label><Input value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} placeholder="A4, X5, 911..." /></div>
        <div className="flex flex-col gap-1"><Label size="small">Slug</Label><Input value={f.slug || ""} onChange={e => setF({ ...f, slug: e.target.value })} placeholder="audi-a4" /></div>
        <div className="flex flex-col gap-1"><Label size="small">Year from</Label><Input type="number" value={f.year_from || ""} onChange={e => setF({ ...f, year_from: e.target.value ? parseInt(e.target.value, 10) : null })} placeholder="2020" /></div>
        <div className="flex flex-col gap-1"><Label size="small">Year to</Label><Input type="number" value={f.year_to || ""} onChange={e => setF({ ...f, year_to: e.target.value ? parseInt(e.target.value, 10) : null })} placeholder="2025" /></div>
        <div className="sm:col-span-2 flex flex-col gap-1"><Label size="small">Body type (auto-fills on vehicles using this model)</Label>
          <Select value={f.body_type_id || ""} onValueChange={v => setF({ ...f, body_type_id: v || null })}>
            <Select.Trigger><Select.Value placeholder="None — leave blank" /></Select.Trigger>
            <Select.Content>{bodyTypes.map(b => <Select.Item key={b.id} value={b.id}>{b.icon || "🚗"} {b.name}</Select.Item>)}</Select.Content>
          </Select>
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1">
          <Label size="small">Available colors</Label>
          <Input value={(f.colors || []).join(", ")} onChange={e => setF({ ...f, colors: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean) })} placeholder="White, Black, Silver, Red, Blue" />
          <Text size="small" className="text-ui-fg-muted mt-1">Comma-separated. Leave empty to allow any color.</Text>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={saving || !f.name || !f.slug || !f.brand_id} onClick={async () => { setSaving(true); try { await onSave(f); onClose() } finally { setSaving(false) } }}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  )
}

/* --------------------------------- Page ----------------------------------- */
const BrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")

  const [editBrand, setEditBrand] = useState<Partial<Brand>|null>(null)
  const [showBrandModal, setShowBrandModal] = useState(false)
  const [editSeries, setEditSeries] = useState<Partial<Model>|null>(null)
  const [showSeriesModal, setShowSeriesModal] = useState(false)

  // drag state
  const [dragId, setDragId] = useState<string|null>(null)
  const [overBrand, setOverBrand] = useState<string|null>(null)
  const [overModel, setOverModel] = useState<string|null>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [bRes, mRes, btRes] = await Promise.all([
        fetch(`${API}/admin/catalog/brands`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/catalog/models`, { credentials: "include" }).then(r => r.json()),
        fetch(`${API}/admin/catalog/body-types`, { credentials: "include" }).then(r => r.json()),
      ])
      const bs: Brand[] = bRes.brands || []
      setBrands(bs)
      setModels(mRes.models || [])
      setBodyTypes(btRes.body_types || [])
    } catch {
      setBrands([]); setModels([]); setBodyTypes([])
    } finally {
      if (!silent) setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  /* ----- brand CRUD ----- */
  const saveBrand = async (data: any) => {
    const url = data.id ? `${API}/admin/catalog/brands/${data.id}` : `${API}/admin/catalog/brands`
    await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    load()
  }
  const removeBrand = async (b: Brand) => {
    const n = models.filter(m => m.brand_id === b.id).length
    if (!confirm(n > 0 ? `Delete "${b.name}"? It still has ${n} models — move them first.` : `Delete "${b.name}"?`)) return
    await fetch(`${API}/admin/catalog/brands/${b.id}`, { method: "DELETE", credentials: "include" })
    load()
  }

  /* ----- model CRUD ----- */
  const saveSeries = async (data: any) => {
    const url = data.id ? `${API}/admin/catalog/models/${data.id}` : `${API}/admin/catalog/models`
    await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    load()
  }
  const removeSeries = async (m: Model) => {
    if (!confirm(`Delete model "${m.name}"?`)) return
    await fetch(`${API}/admin/catalog/models/${m.id}`, { method: "DELETE", credentials: "include" })
    load()
  }

  /* ----- drag & drop reorder / move ----- */
  const persistChanges = async (prev: Model[], next: Model[]) => {
    const changed = next.filter(m => {
      const o = prev.find(x => x.id === m.id)
      return o && (o.brand_id !== m.brand_id || o.sort_order !== m.sort_order)
    })
    await Promise.all(changed.map(m =>
      fetch(`${API}/admin/catalog/models/${m.id}`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(m),
      })
    ))
    load(true)
  }

  // Move a model into targetBrand, inserting before beforeModelId (or append when null)
  const moveModel = async (modelId: string, targetBrandId: string, beforeModelId: string|null) => {
    const dragged = models.find(m => m.id === modelId)
    if (!dragged) return
    if (dragged.brand_id === targetBrandId && beforeModelId === modelId) return

    const targetList = models.filter(m => m.brand_id === targetBrandId && m.id !== modelId).sort(byOrder)
    let insertAt = targetList.length
    if (beforeModelId) {
      const idx = targetList.findIndex(m => m.id === beforeModelId)
      if (idx >= 0) insertAt = idx
    }
    targetList.splice(insertAt, 0, { ...dragged, brand_id: targetBrandId })

    const newOrder = new Map<string, { brand_id: string; sort_order: number }>()
    targetList.forEach((m, i) => newOrder.set(m.id!, { brand_id: targetBrandId, sort_order: i }))
    if (dragged.brand_id !== targetBrandId) {
      const sourceList = models.filter(m => m.brand_id === dragged.brand_id && m.id !== modelId).sort(byOrder)
      sourceList.forEach((m, i) => newOrder.set(m.id!, { brand_id: dragged.brand_id, sort_order: i }))
    }

    const next = models.map(m => {
      const o = newOrder.get(m.id!)
      return o ? { ...m, brand_id: o.brand_id, sort_order: o.sort_order } : m
    })
    const prev = models
    setModels(next)            // optimistic
    setExpanded(s => new Set(s).add(targetBrandId))
    await persistChanges(prev, next)
  }

  const clearDrag = () => { setDragId(null); setOverBrand(null); setOverModel(null) }
  const toggle = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const brandList = useMemo(() => [...brands].sort(byOrder), [brands])
  const modelsOf = (brandId: string) => models.filter(m => m.brand_id === brandId).sort(byOrder)
  const bodyName = (id?: string|null) => bodyTypes.find(b => b.id === id)?.name

  const totalSeries = models.length

  /* ----- search / filtering ----- */
  const q = search.trim().toLowerCase()
  const searching = q.length > 0
  const modelMatch = (m: Model) =>
    m.name.toLowerCase().includes(q) || (m.slug || "").toLowerCase().includes(q)
  const brandSelfMatch = (b: Brand) =>
    b.name.toLowerCase().includes(q) ||
    (b.slug || "").toLowerCase().includes(q) ||
    (b.origin_country || "").toLowerCase().includes(q)
  // When searching: a brand that itself matches shows all its models;
  // otherwise only the models that match the query are shown.
  const visibleModelsOf = (b: Brand) => {
    const list = modelsOf(b.id)
    if (!searching || brandSelfMatch(b)) return list
    return list.filter(modelMatch)
  }
  const visibleBrands = useMemo(() => {
    if (!searching) return brandList
    return brandList.filter(b => brandSelfMatch(b) || modelsOf(b.id).some(modelMatch))
  }, [brandList, models, q])
  const matchCount = searching
    ? visibleBrands.reduce((n, b) => n + (brandSelfMatch(b) ? 1 : 0) + visibleModelsOf(b).length, 0)
    : 0

  return (
    <SingleColumnPage>
      <Container className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <Heading level="h1">🏷️ Car Brands &amp; Models</Heading>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setEditSeries(null); setShowSeriesModal(true) }}><Plus /> Add Model</Button>
            <Button onClick={() => { setEditBrand(null); setShowBrandModal(true) }}><Plus /> Add Brand</Button>
          </div>
        </div>
        <Text className="text-ui-fg-subtle">
          Each brand holds its models. <span className="text-ui-fg-base font-medium">Drag a model</span> by its handle and drop it onto another brand to move it, or reorder models inside a brand.
        </Text>

        <div className="mt-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-fg-muted pointer-events-none"><MagnifyingGlass /></span>
            <Input
              className="pl-9"
              placeholder="Search brands or models…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Badge color="blue">{brands.length} brands</Badge>
          <Badge color="green">{brands.filter(b => b.is_active).length} active</Badge>
          <Badge color="grey">{totalSeries} models</Badge>
          {searching && <Badge color="orange">{matchCount} match{matchCount === 1 ? "" : "es"}</Badge>}
          <div className="flex-1" />
          <Button size="small" variant="transparent" onClick={() => setExpanded(new Set(brands.map(b => b.id)))}>Expand all</Button>
          <Button size="small" variant="transparent" onClick={() => setExpanded(new Set())}>Collapse all</Button>
        </div>
      </Container>

      <Container className="p-4 sm:p-6">
        {loading && <Text className="text-ui-fg-muted">Loading…</Text>}
        {!loading && brandList.length === 0 && (
          <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle p-10 text-center">
            <Tag className="mx-auto mb-2 text-ui-fg-muted" />
            <Text className="text-ui-fg-subtle font-medium">No brands yet</Text>
            <Text size="small" className="text-ui-fg-muted mt-1">Add your first brand to start building the tree.</Text>
          </div>
        )}
        {!loading && brandList.length > 0 && searching && visibleBrands.length === 0 && (
          <div className="rounded-lg border border-dashed border-ui-border-base bg-ui-bg-subtle p-10 text-center">
            <MagnifyingGlass className="mx-auto mb-2 text-ui-fg-muted" />
            <Text className="text-ui-fg-subtle font-medium">No matches for “{search}”</Text>
            <Text size="small" className="text-ui-fg-muted mt-1">Try a different brand or model name.</Text>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {visibleBrands.map(b => {
            const list = visibleModelsOf(b)
            const isOpen = expanded.has(b.id) || searching
            const isDropTarget = overBrand === b.id && dragId != null
            return (
              <div
                key={b.id}
                className="rounded-xl border bg-ui-bg-base shadow-elevation-card-rest overflow-hidden transition-colors"
                style={{ borderColor: isDropTarget ? "#1753b0" : "var(--border-base, #e5e7eb)", boxShadow: isDropTarget ? "0 0 0 1px #1753b0" : undefined }}
                onDragOver={e => { if (dragId) { e.preventDefault(); setOverBrand(b.id); setOverModel(null) } }}
                onDrop={e => { if (dragId) { e.preventDefault(); moveModel(dragId, b.id, null); clearDrag() } }}
              >
                {/* Brand header */}
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-ui-bg-subtle border-b border-ui-border-base">
                  <button onClick={() => toggle(b.id)} className="flex items-center justify-center text-ui-fg-muted hover:text-ui-fg-base" style={{ width: 24, height: 24 }} aria-label="toggle">
                    {isOpen ? <TriangleDownMini /> : <TriangleRightMini />}
                  </button>
                  {b.logo_url
                    ? <img src={resolveMediaUrl(b.logo_url)} alt={b.name} style={{ width: 36, height: 36, objectFit: "contain", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 3 }} />
                    : <div className="flex items-center justify-center rounded-lg bg-ui-bg-base border border-ui-border-base text-ui-fg-muted" style={{ width: 36, height: 36 }}><Tag /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Text className="font-semibold text-ui-fg-base truncate">{b.name}</Text>
                      {!b.is_active && <Badge size="2xsmall" color="grey">Off</Badge>}
                    </div>
                    <Text size="xsmall" className="text-ui-fg-muted font-mono truncate">{b.slug}{b.origin_country ? ` · ${b.origin_country}` : ""}</Text>
                  </div>
                  <Badge color={list.length ? "blue" : "grey"}>{list.length} {list.length === 1 ? "model" : "models"}</Badge>
                  <Button size="small" variant="transparent" onClick={() => { setEditSeries({ brand_id: b.id } as any); setShowSeriesModal(true) }} title="Add model"><Plus /></Button>
                  <Button size="small" variant="transparent" onClick={() => { setEditBrand(b); setShowBrandModal(true) }} title="Edit brand"><PencilSquare /></Button>
                  <Button size="small" variant="transparent" onClick={() => removeBrand(b)} title="Delete brand"><Trash /></Button>
                </div>

                {/* Model children */}
                {isOpen && (
                  <div className="p-2 sm:p-3">
                    {list.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-ui-border-base p-5 text-center">
                        <Text size="small" className="text-ui-fg-muted">No models yet — drag one here, or click “+”.</Text>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {list.map(m => {
                          const isOverThis = overModel === m.id && dragId != null && dragId !== m.id
                          const isDragging = dragId === m.id
                          return (
                            <div
                              key={m.id}
                              draggable
                              onDragStart={e => { setDragId(m.id!); e.dataTransfer.effectAllowed = "move" }}
                              onDragEnd={clearDrag}
                              onDragOver={e => { if (dragId && dragId !== m.id) { e.preventDefault(); e.stopPropagation(); setOverModel(m.id!); setOverBrand(b.id) } }}
                              onDrop={e => { if (dragId) { e.preventDefault(); e.stopPropagation(); moveModel(dragId, b.id, m.id!); clearDrag() } }}
                              className="group flex items-center gap-3 rounded-lg border bg-ui-bg-base px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all"
                              style={{
                                opacity: isDragging ? 0.4 : 1,
                                borderColor: isOverThis ? "#1753b0" : "var(--border-base, #e5e7eb)",
                                boxShadow: isOverThis ? "inset 0 2px 0 #1753b0" : undefined,
                              }}
                            >
                              <span className="text-ui-fg-muted group-hover:text-ui-fg-base shrink-0"><DotsSix /></span>
                              <div className="flex-1 min-w-0">
                                <Text size="small" className="font-medium text-ui-fg-base truncate">{m.name}</Text>
                                <Text size="xsmall" className="text-ui-fg-muted font-mono truncate">{m.slug}</Text>
                              </div>
                              {(m.year_from || m.year_to) && (
                                <Badge size="2xsmall" color="grey">{m.year_from || "…"}{m.year_to ? `–${m.year_to}` : "+"}</Badge>
                              )}
                              {bodyName(m.body_type_id) && <Badge size="2xsmall" color="blue">{bodyName(m.body_type_id)}</Badge>}
                              {m.colors && m.colors.length > 0 && <Badge size="2xsmall" color="purple">{m.colors.length} colors</Badge>}
                              <Button size="small" variant="transparent" onClick={() => { setEditSeries(m); setShowSeriesModal(true) }} title="Edit model"><PencilSquare /></Button>
                              <Button size="small" variant="transparent" onClick={() => removeSeries(m)} title="Delete model"><Trash /></Button>
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

      <FocusModal open={showBrandModal} onOpenChange={setShowBrandModal}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{editBrand?.id ? "Edit Brand" : "Add Brand"}</Heading></FocusModal.Header>
          <FocusModal.Body><BrandForm brand={editBrand} onSave={saveBrand} onClose={() => setShowBrandModal(false)} /></FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>

      <FocusModal open={showSeriesModal} onOpenChange={setShowSeriesModal}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{editSeries?.id ? "Edit Model" : "Add Model"}</Heading></FocusModal.Header>
          <FocusModal.Body><SeriesForm item={editSeries} brands={brandList} bodyTypes={bodyTypes} onSave={saveSeries} onClose={() => setShowSeriesModal(false)} /></FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default BrandsPage
