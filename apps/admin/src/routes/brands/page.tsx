import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, FocusModal } from "@medusajs/ui"
import { Tag, Plus, Trash, PencilSquare, Photo } from "@medusajs/icons"

export const config: RouteConfig = { label: "Brands", icon: Tag }

const API = "https://api.autotorental.com"
type Brand = { id: string; name: string; slug: string; logo_url: string|null; origin_country: string|null; is_active: boolean; sort_order: number }

const emptyForm = { name: "", slug: "", origin_country: "", logo_url: "" }

const BrandForm = ({ brand, onSave, onClose }: { brand: Partial<Brand>|null; onSave: (data: any) => Promise<void>; onClose: () => void }) => {
  const [form, setForm] = useState(brand || emptyForm)
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
      <div className="grid grid-cols-2 gap-3">
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
            <img src={form.logo_url} alt="logo" style={{ width: 80, height: 80, objectFit: "contain", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }} />
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

const BrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Brand>|null>(null)
  const [showModal, setShowModal] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/catalog/brands`, { credentials: "include" })
      .then(r => r.json()).then(d => setBrands(d.brands || [])).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async (data: any) => {
    const isEdit = !!data.id
    const url = isEdit ? `${API}/admin/catalog/brands/${data.id}` : `${API}/admin/catalog/brands`
    await fetch(url, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    load()
  }
  const remove = async (id: string) => {
    if (!confirm("Delete this brand?")) return
    await fetch(`${API}/admin/catalog/brands/${id}`, { method: "DELETE", credentials: "include" })
    load()
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">🏷️ Car Brands</Heading>
          <Button onClick={() => { setEditing(null); setShowModal(true) }}><Plus /> Add Brand</Button>
        </div>
        <Text className="text-ui-fg-subtle">Brands shown on the storefront — sellers tag each vehicle with a brand.</Text>
      </Container>

      <Container className="p-0 divide-y">
        <div className="p-6 flex items-center justify-between">
          <Heading level="h2">{brands.length} Brands</Heading>
          <Badge color="blue">{brands.filter(b => b.is_active).length} active</Badge>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>#</Table.HeaderCell>
              <Table.HeaderCell>Logo</Table.HeaderCell>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Slug</Table.HeaderCell>
              <Table.HeaderCell>Origin</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={7}>Loading…</Table.Cell></Table.Row>}
            {brands.map((b, i) => (
              <Table.Row key={b.id}>
                <Table.Cell className="text-ui-fg-muted">{i + 1}</Table.Cell>
                <Table.Cell>
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} style={{ width: 40, height: 40, objectFit: "contain", background: "white", border: "1px solid #e5e7eb", borderRadius: 6 }} />
                  ) : <Text size="xsmall" className="text-ui-fg-muted">no logo</Text>}
                </Table.Cell>
                <Table.Cell className="font-medium">{b.name}</Table.Cell>
                <Table.Cell className="font-mono text-xs">{b.slug}</Table.Cell>
                <Table.Cell>{b.origin_country || "—"}</Table.Cell>
                <Table.Cell>{b.is_active ? <Badge color="green">Active</Badge> : <Badge color="grey">Off</Badge>}</Table.Cell>
                <Table.Cell className="text-right">
                  <Button size="small" variant="transparent" onClick={() => { setEditing(b); setShowModal(true) }}><PencilSquare /></Button>
                  <Button size="small" variant="transparent" onClick={() => remove(b.id)}><Trash /></Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>

      <FocusModal open={showModal} onOpenChange={setShowModal}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading>{editing?.id ? "Edit Brand" : "Add Brand"}</Heading>
          </FocusModal.Header>
          <FocusModal.Body>
            <BrandForm brand={editing} onSave={save} onClose={() => setShowModal(false)} />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default BrandsPage
