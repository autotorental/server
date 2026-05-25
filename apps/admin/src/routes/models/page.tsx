import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, Select, FocusModal } from "@medusajs/ui"
import { Buildings, Plus, Trash, PencilSquare, MagnifyingGlass } from "@medusajs/icons"

export const config: RouteConfig = { label: "Models", icon: Buildings }

const API = "https://api.autotorental.com"
type Brand = { id: string; name: string; slug: string; logo_url: string|null }
type BodyType = { id: string; name: string; icon: string|null }
type Model = { id?: string; brand_id: string; name: string; slug: string; year_from?: number|null; year_to?: number|null; body_type_id?: string|null; colors?: string[]|null; is_active: boolean; sort_order: number }

const Form = ({ item, brands, bodyTypes, onSave, onClose }: { item: Partial<Model>|null; brands: Brand[]; bodyTypes: BodyType[]; onSave: (d: any) => Promise<void>; onClose: () => void }) => {
  const [f, setF] = useState<any>(item || { brand_id: brands[0]?.id || "", name: "", slug: "", year_from: null, year_to: null, sort_order: 0, is_active: true })
  const [saving, setSaving] = useState(false)
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label size="small">Brand</Label>
          <Select value={f.brand_id} onValueChange={v => setF({...f, brand_id: v})}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>{brands.map(b => <Select.Item key={b.id} value={b.id}>{b.name}</Select.Item>)}</Select.Content>
          </Select>
        </div>
        <div><Label size="small">Model name</Label><Input value={f.name||""} onChange={e => setF({...f, name: e.target.value})} placeholder="A4, X5, 911..." /></div>
        <div><Label size="small">Slug</Label><Input value={f.slug||""} onChange={e => setF({...f, slug: e.target.value})} placeholder="audi-a4" /></div>
        <div><Label size="small">Year from</Label><Input type="number" value={f.year_from||""} onChange={e => setF({...f, year_from: e.target.value ? parseInt(e.target.value,10) : null})} placeholder="2020" /></div>
        <div><Label size="small">Year to</Label><Input type="number" value={f.year_to||""} onChange={e => setF({...f, year_to: e.target.value ? parseInt(e.target.value,10) : null})} placeholder="2025" /></div>
        <div className="col-span-2"><Label size="small">Body Type (auto-fills on vehicles using this model)</Label>
          <Select value={f.body_type_id || ""} onValueChange={v => setF({...f, body_type_id: v || null})}>
            <Select.Trigger><Select.Value placeholder="None — leave blank" /></Select.Trigger>
            <Select.Content>{bodyTypes.map(b => <Select.Item key={b.id} value={b.id}>{b.icon || "🚗"} {b.name}</Select.Item>)}</Select.Content>
          </Select>
        </div>
        <div className="col-span-2">
          <Label size="small">Available colors (sellers will only be able to pick from these)</Label>
          <Input value={(f.colors || []).join(", ")} onChange={e => setF({...f, colors: e.target.value.split(",").map((x: string) => x.trim()).filter(Boolean)})} placeholder="White, Black, Silver, Red, Blue" />
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

const ModelsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [bodyTypes, setBodyTypes] = useState<BodyType[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<Model>|null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")

  const load = async () => {
    setLoading(true)
    const [bRes, mRes, btRes] = await Promise.all([
      fetch(`${API}/admin/catalog/brands`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/admin/catalog/models`, { credentials: "include" }).then(r => r.json()),
      fetch(`${API}/admin/catalog/body-types`, { credentials: "include" }).then(r => r.json()),
    ])
    setBrands(bRes.brands || [])
    setModels(mRes.models || [])
    setBodyTypes(btRes.body_types || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/catalog/models/${data.id}` : `${API}/admin/catalog/models`
    await fetch(url, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) })
    load()
  }
  const remove = async (id: string) => { if(!confirm("Delete?")) return; await fetch(`${API}/admin/catalog/models/${id}`, { method:"DELETE", credentials:"include" }); load() }

  const brandMap = useMemo(() => Object.fromEntries(brands.map(b => [b.id, b])), [brands])
  const filtered = useMemo(() => {
    let out = models
    if (brandFilter !== "all") out = out.filter(m => m.brand_id === brandFilter)
    if (search) {
      const q = search.toLowerCase()
      out = out.filter(m => m.name.toLowerCase().includes(q) || (brandMap[m.brand_id]?.name || "").toLowerCase().includes(q))
    }
    return out
  }, [models, brandFilter, search, brandMap])

  // Group by brand
  const grouped: Record<string, Model[]> = {}
  filtered.forEach(m => { if (!grouped[m.brand_id]) grouped[m.brand_id] = []; grouped[m.brand_id].push(m) })

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">🚙 Car Models</Heading>
          <Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> Add Model</Button>
        </div>
        <Text className="text-ui-fg-subtle mb-4">All car models grouped by brand. Sellers pick a model when listing a vehicle.</Text>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label size="small">Search</Label>
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="A4, BMW, X5..." />
          </div>
          <div>
            <Label size="small">Filter by brand</Label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All brands</Select.Item>
                {brands.map(b => <Select.Item key={b.id} value={b.id}>{b.name}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div className="flex items-end">
            <Badge color="blue">{filtered.length} models · {Object.keys(grouped).length} brands</Badge>
          </div>
        </div>
      </Container>

      {loading && <Container><Text>Loading…</Text></Container>}
      {Object.entries(grouped).map(([brandId, list]) => {
        const brand = brandMap[brandId]
        return (
          <Container key={brandId} className="p-0 divide-y">
            <div className="p-4 flex items-center gap-3">
              {brand?.logo_url && <img src={brand.logo_url} alt={brand.name} style={{ width: 32, height: 32, objectFit: "contain" }} />}
              <Heading level="h2">{brand?.name || brandId}</Heading>
              <Badge>{list.length} models</Badge>
            </div>
            <Table>
              <Table.Header><Table.Row>
                <Table.HeaderCell>#</Table.HeaderCell><Table.HeaderCell>Model</Table.HeaderCell>
                <Table.HeaderCell>Slug</Table.HeaderCell><Table.HeaderCell>Years</Table.HeaderCell><Table.HeaderCell>Body</Table.HeaderCell><Table.HeaderCell>Colors</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row></Table.Header>
              <Table.Body>
                {list.map((m, i) => (
                  <Table.Row key={m.id}>
                    <Table.Cell className="text-ui-fg-muted">{i + 1}</Table.Cell>
                    <Table.Cell className="font-medium">{m.name}</Table.Cell>
                    <Table.Cell className="font-mono text-xs">{m.slug}</Table.Cell>
                    <Table.Cell>{m.year_from || "—"}{m.year_to ? `→${m.year_to}` : ""}</Table.Cell>
                    <Table.Cell>{m.body_type_id ? "✓" : "—"}</Table.Cell>
                    <Table.Cell>{m.colors && m.colors.length > 0 ? `${m.colors.length} colors` : "any"}</Table.Cell>
                    <Table.Cell className="text-right">
                      <Button size="small" variant="transparent" onClick={() => { setEdit(m); setOpen(true) }}><PencilSquare /></Button>
                      <Button size="small" variant="transparent" onClick={() => remove(m.id!)}><Trash /></Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        )
      })}

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{edit?.id ? "Edit Model" : "Add Model"}</Heading></FocusModal.Header>
          <FocusModal.Body><Form item={edit} brands={brands} bodyTypes={bodyTypes} onSave={save} onClose={() => setOpen(false)} /></FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default ModelsPage
