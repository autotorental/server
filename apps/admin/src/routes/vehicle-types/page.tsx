import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, FocusModal, toast } from "@medusajs/ui"
import { TagSolid, Plus, Trash, PencilSquare, Photo, Sparkles } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Vehicle Types", "أنواع المركبات"), icon: TagSolid, rank: 13 }

type BT = { id?: string; name: string; name_ar: string|null; slug: string; icon: string|null; icon_url: string|null; sort_order: number }

const Form = ({ item, onSave, onClose }: any) => {
  const [f, setF] = useState<any>(item || { name: "", name_ar: "", slug: "", icon: "", icon_url: "", sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generatingIcon, setGeneratingIcon] = useState(false)
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

  const generateIcon = async () => {
    const name = String(f.name || "").trim()
    if (!name) { alert("Enter vehicle type name first."); return }
    setGeneratingIcon(true)
    try {
      const res = await fetch(`${API}/admin/catalog/body-types/generate-icon`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data.message || "Icon generation failed"
        if (msg.toLowerCase().includes("fal") || msg.toLowerCase().includes("key")) {
          alert("Requires FAL.ai key in AI Settings")
        } else {
          alert(msg)
        }
        return
      }
      if (data.url) {
        setF((x: any) => ({ ...x, icon_url: data.url }))
      }
    } catch (e: any) {
      const msg = e.message || "Icon generation failed"
      if (msg.toLowerCase().includes("fal") || msg.toLowerCase().includes("key")) {
        alert("Requires FAL.ai key in AI Settings")
      } else {
        alert(msg)
      }
    } finally { setGeneratingIcon(false) }
  }

  return (
    <div className="flex flex-col gap-5 p-5 max-w-lg mx-auto">
      <div className="grid grid-cols-2 gap-3">
        <div><Label size="small">Name (EN)</Label><Input value={f.name||""} onChange={e => setF({...f, name: e.target.value})} placeholder="SUV" /></div>
        <div><Label size="small">الاسم (AR)</Label><Input value={f.name_ar||""} onChange={e => setF({...f, name_ar: e.target.value})} placeholder="دفع رباعي" dir="rtl" /></div>
        <div><Label size="small">Slug</Label><Input value={f.slug||""} onChange={e => setF({...f, slug: e.target.value})} placeholder="suv" /></div>
        <div><Label size="small">Sort order</Label><Input type="number" value={f.sort_order||0} onChange={e => setF({...f, sort_order: parseInt(e.target.value,10)||0})} /></div>
      </div>

      {/* Icon section — redesigned */}
      <div className="rounded-xl border border-ui-border-base p-4 flex flex-col gap-3">
        <Label size="small">Vehicle Type Icon</Label>
        <div className="flex items-center gap-4">
          {/* Large preview */}
          <div className="flex items-center justify-center w-16 h-16 rounded-xl shrink-0"
            style={{ background: "#f3f4f6", border: "2px dashed #d1d5db", fontSize: f.icon_url ? undefined : 32 }}>
            {f.icon_url
              ? <img src={f.icon_url} alt="icon" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8 }} />
              : <span>{f.icon || "🚗"}</span>}
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {!f.icon_url && (
              <Input
                value={f.icon||""}
                onChange={e => setF({...f, icon: e.target.value})}
                placeholder="🚙 emoji"
                style={{ width: 80, fontSize: 22, textAlign: "center" }}
              />
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { const file = e.target.files?.[0]; if (file) upload(file) }} />
            <div className="flex flex-wrap gap-2">
              {f.icon_url ? (
                <Button size="small" variant="secondary" onClick={() => setF({...f, icon_url: ""})}>Remove image</Button>
              ) : (
                <Button size="small" variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  <Photo /> {uploading ? "Uploading..." : "Upload Icon"}
                </Button>
              )}
              {/* AI Generate Icon button */}
              <Button
                size="small"
                onClick={generateIcon}
                disabled={generatingIcon || !String(f.name || "").trim()}
                style={{ background: "linear-gradient(135deg,#6366f1,#a855f7)", color: "#fff", border: "none" }}
              >
                <Sparkles /> {generatingIcon ? "Generating…" : "✨ AI Generate Icon"}
              </Button>
            </div>
            {generatingIcon && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <Text size="xsmall" className="text-ui-fg-muted">{tt("Generating icon…", "جارٍ إنشاء الأيقونة…")}</Text>
              </div>
            )}
          </div>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted">Use emoji OR upload/generate an icon (PNG/SVG, transparent background recommended)</Text>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-ui-border-base">
        <Button variant="secondary" onClick={onClose}>{tt("Cancel", "إلغاء")}</Button>
        <Button disabled={saving || !f.name || !f.slug} onClick={async () => { setSaving(true); try { await onSave(f); onClose() } finally { setSaving(false) } }}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  )
}

const Page = () => {
  const [items, setItems] = useState<BT[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<BT>|null>(null)
  const [open, setOpen] = useState(false)

  const load = () => {
    setLoading(true)
    fetch(`${API}/admin/catalog/body-types`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setItems(d.body_types || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/catalog/body-types/${data.id}` : `${API}/admin/catalog/body-types`
    await fetch(url, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) })
    toast.success(data.id ? "Vehicle type updated" : "Vehicle type created")
    load()
  }

  const remove = async (id: string) => {
    if(!confirm("Delete this vehicle type?")) return
    await fetch(`${API}/admin/catalog/body-types/${id}`, { method:"DELETE", credentials:"include" })
    toast.success("Vehicle type deleted")
    load()
  }

  return (
    <SingleColumnPage>
      {/* Header card */}
      <Container className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)" }}>
              <TagSolid className="text-white" />
            </div>
            <div>
              <Heading level="h1">{tt("Vehicle Types", "أنواع المركبات")}</Heading>
              <Text className="text-ui-fg-subtle mt-1">{tt("Body styles used to categorize vehicles in the catalog.", "أنماط الهياكل المستخدمة لتصنيف المركبات في الكتالوج.")}</Text>
              <div className="mt-2">
                <Badge color="orange">{items.length} types</Badge>
              </div>
            </div>
          </div>
          <Button onClick={() => { setEdit(null); setOpen(true) }}>
            <Plus /> Add Vehicle Type
          </Button>
        </div>
      </Container>

            {/* Card list — same style as Brands */}
      <Container className="p-6">
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-ui-fg-muted">
            <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ui-border-base bg-ui-bg-subtle p-10 text-center text-ui-fg-muted">
            {tt("No vehicle types yet — click Add Vehicle Type", "لا توجد أنواع مركبات بعد — اضغط إضافة نوع")}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(b => (
              <div key={b.id} className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden transition-colors">
                <div className="flex items-center gap-3 p-3 sm:p-4 bg-ui-bg-subtle border-b border-ui-border-base">
                  <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, background: "white", border: "1px solid #e5e7eb", borderRadius: 8 }}>
                    {b.icon_url
                      ? <img src={b.icon_url} alt={b.name} style={{ width: 28, height: 28, objectFit: "contain" }} />
                      : <span style={{ fontSize: 20 }}>{b.icon || "🚗"}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-sans txt-medium font-semibold text-ui-fg-base truncate">{b.name}</p>
                      {b.name_ar && <span className="text-ui-fg-muted text-sm truncate" dir="rtl">{b.name_ar}</span>}
                    </div>
                    <p className="font-normal txt-xsmall text-ui-fg-muted font-mono truncate">{b.slug}</p>
                  </div>
                  <Badge color="grey">Order {b.sort_order}</Badge>
                  <Button size="small" variant="transparent" title="Edit type" onClick={() => { setEdit(b); setOpen(true) }}><PencilSquare /></Button>
                  <Button size="small" variant="transparent" title="Delete type" onClick={() => remove(b.id!)}><Trash /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{edit?.id ? "Edit Vehicle Type" : "Add Vehicle Type"}</Heading></FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <Form item={edit} onSave={save} onClose={() => setOpen(false)} />
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
