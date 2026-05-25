import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Button, Input, Label, FocusModal } from "@medusajs/ui"
import { TagSolid, Plus, Trash, PencilSquare, Photo } from "@medusajs/icons"

export const config: RouteConfig = { label: "Vehicle Types", icon: TagSolid }

const API = "https://api.autotorental.com"
type BT = { id?: string; name: string; name_ar: string|null; slug: string; icon: string|null; icon_url: string|null; sort_order: number }

const Form = ({ item, onSave, onClose }: any) => {
  const [f, setF] = useState<any>(item || { name: "", name_ar: "", slug: "", icon: "", icon_url: "", sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const d = await res.json()
      const url = d.files?.[0]?.url
      if (url) setF((x: any) => ({ ...x, icon_url: url }))
    } finally { setUploading(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label size="small">Name (EN)</Label><Input value={f.name||""} onChange={e => setF({...f, name: e.target.value})} placeholder="SUV" /></div>
        <div><Label size="small">الاسم (AR)</Label><Input value={f.name_ar||""} onChange={e => setF({...f, name_ar: e.target.value})} placeholder="دفع رباعي" dir="rtl" /></div>
        <div><Label size="small">Slug</Label><Input value={f.slug||""} onChange={e => setF({...f, slug: e.target.value})} placeholder="suv" /></div>
        <div><Label size="small">Sort order</Label><Input type="number" value={f.sort_order||0} onChange={e => setF({...f, sort_order: parseInt(e.target.value,10)||0})} /></div>
      </div>

      <div className="flex flex-col gap-2">
        <Label size="small">Icon</Label>
        <div className="flex items-center gap-3">
          {f.icon_url ? (
            <>
              <img src={f.icon_url} alt="icon" style={{ width: 64, height: 64, objectFit: "contain", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8 }} />
              <Button size="small" variant="secondary" onClick={() => setF({...f, icon_url: ""})}>Remove</Button>
            </>
          ) : (
            <>
              <Input value={f.icon||""} onChange={e => setF({...f, icon: e.target.value})} placeholder="🚙 (or upload below)" style={{ width: 100, fontSize: 24, textAlign: "center" }} />
              <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                <Photo /> {uploading ? "Uploading..." : "Upload Icon Image"}
              </Button>
            </>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
            onChange={e => { const file = e.target.files?.[0]; if (file) upload(file) }} />
        </div>
        <Text size="xsmall" className="text-ui-fg-muted">Use emoji OR upload an icon (PNG/SVG, transparent background)</Text>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={saving || !f.name || !f.slug} onClick={async () => { setSaving(true); try { await onSave(f); onClose() } finally { setSaving(false) } }}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  )
}

const Page = () => {
  const [items, setItems] = useState<BT[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<BT>|null>(null)
  const [open, setOpen] = useState(false)
  const load = () => { setLoading(true); fetch(`${API}/admin/catalog/body-types`, { credentials: "include" }).then(r => r.json()).then(d => setItems(d.body_types || [])).finally(() => setLoading(false)) }
  useEffect(load, [])
  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/catalog/body-types/${data.id}` : `${API}/admin/catalog/body-types`
    await fetch(url, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) })
    load()
  }
  const remove = async (id: string) => { if(!confirm("Delete?")) return; await fetch(`${API}/admin/catalog/body-types/${id}`, { method:"DELETE", credentials:"include" }); load() }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">🚗 Vehicle Types</Heading>
          <Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> Add Vehicle Type</Button>
        </div>
        <Text className="text-ui-fg-subtle">Body styles. Each can have an emoji OR an uploaded icon image.</Text>
      </Container>
      <Container className="p-0 divide-y">
        <Table>
          <Table.Header><Table.Row>
            <Table.HeaderCell>Icon</Table.HeaderCell>
            <Table.HeaderCell>Name (EN)</Table.HeaderCell>
            <Table.HeaderCell>الاسم</Table.HeaderCell>
            <Table.HeaderCell>Slug</Table.HeaderCell>
            <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
          </Table.Row></Table.Header>
          <Table.Body>
            {loading && <Table.Row><Table.Cell colSpan={5}>Loading…</Table.Cell></Table.Row>}
            {items.map(b => (
              <Table.Row key={b.id}>
                <Table.Cell>
                  {b.icon_url ? <img src={b.icon_url} style={{ width: 32, height: 32, objectFit: "contain" }} /> : <span style={{ fontSize: 24 }}>{b.icon || "🚗"}</span>}
                </Table.Cell>
                <Table.Cell className="font-medium">{b.name}</Table.Cell>
                <Table.Cell dir="rtl">{b.name_ar || "—"}</Table.Cell>
                <Table.Cell className="font-mono text-xs">{b.slug}</Table.Cell>
                <Table.Cell className="text-right">
                  <Button size="small" variant="transparent" onClick={() => { setEdit(b); setOpen(true) }}><PencilSquare /></Button>
                  <Button size="small" variant="transparent" onClick={() => remove(b.id!)}><Trash /></Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Container>
      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{edit?.id ? "Edit Vehicle Type" : "Add Vehicle Type"}</Heading></FocusModal.Header>
          <FocusModal.Body><Form item={edit} onSave={save} onClose={() => setOpen(false)} /></FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
