import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, Select, FocusModal } from "@medusajs/ui"
import { MapPin, Plus, Trash, PencilSquare, Photo } from "@medusajs/icons"
import { API, resolveMediaUrl } from "../../lib/api"

export const config: RouteConfig = { label: "Locations", icon: MapPin }

type City = { id?: string; country_code: string; name: string; name_ar: string|null; slug: string; is_active: boolean; sort_order: number; image_url?: string|null }

// Arab / GCC markets are shown first; every other country in the world follows.
const PRIORITY = ["ae", "sa", "kw", "qa", "om", "bh", "jo", "sy", "eg", "lb", "iq", "ye", "ma", "dz", "tn", "ly", "sd"]
const ALL_CC = "ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw".split(" ")

// 🇦🇪 flag from the 2-letter code (regional-indicator letters) — works for any country.
const flagEmoji = (cc: string) =>
  /^[a-z]{2}$/i.test(cc)
    ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : ""

let regionNames: any = null
try { regionNames = new (Intl as any).DisplayNames(["en"], { type: "region" }) } catch { /* older runtime */ }

const NAME_OVERRIDE: Record<string, string> = { ae: "UAE" }
const countryName = (cc: string) => {
  const lc = (cc || "").toLowerCase()
  if (NAME_OVERRIDE[lc]) return NAME_OVERRIDE[lc]
  const code = lc.toUpperCase()
  try { return regionNames?.of(code) || code } catch { return code }
}
const countryLabel = (cc: string) => `${flagEmoji(cc)} ${countryName(cc)}`.trim()

// Full world list: priority markets first, then everything else A→Z by name.
const COUNTRIES = [
  ...PRIORITY,
  ...ALL_CC.filter((c) => !PRIORITY.includes(c)).sort((a, b) => countryName(a).localeCompare(countryName(b))),
].map((code) => ({ code, label: countryLabel(code) }))

const Form = ({ item, onSave, onClose }: { item: Partial<City>|null; onSave: (d: any) => Promise<void>; onClose: () => void }) => {
  const [f, setF] = useState<any>(item || { country_code: "ae", name: "", name_ar: "", slug: "", sort_order: 0, is_active: true, image_url: "" })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch(`${API}/admin/uploads`, { method: "POST", credentials: "include", body: fd })
      const data = await res.json()
      const url = data.files?.[0]?.url
      if (url) setF((p: any) => ({ ...p, image_url: url }))
    } finally { setUploading(false) }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label size="small">Country</Label>
          <Select value={f.country_code} onValueChange={v => setF({...f, country_code: v})}>
            <Select.Trigger><Select.Value placeholder="Select a country" /></Select.Trigger>
            <Select.Content className="max-h-72">{COUNTRIES.map(c => <Select.Item key={c.code} value={c.code}>{c.label}</Select.Item>)}</Select.Content>
          </Select>
        </div>
        <div><Label size="small">Sort order</Label><Input type="number" value={f.sort_order||0} onChange={e => setF({...f, sort_order: parseInt(e.target.value,10)||0})} /></div>
        <div><Label size="small">Name (EN)</Label><Input value={f.name||""} onChange={e => setF({...f, name: e.target.value})} placeholder="Dubai" /></div>
        <div><Label size="small">الاسم (AR)</Label><Input value={f.name_ar||""} onChange={e => setF({...f, name_ar: e.target.value})} placeholder="دبي" dir="rtl" /></div>
        <div className="col-span-2"><Label size="small">Slug (URL)</Label><Input value={f.slug||""} onChange={e => setF({...f, slug: e.target.value})} placeholder="dubai" /></div>

        <div className="col-span-2">
          <Label size="small">City Photo (shown on storefront)</Label>
          <div className="flex items-start gap-3 mt-1">
            <div className="w-32 h-24 rounded-lg bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center overflow-hidden">
              {f.image_url ? <img src={resolveMediaUrl(f.image_url)} alt="" className="w-full h-full object-cover"/> : <Photo />}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])}/>
              <Button variant="secondary" size="small" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : (f.image_url ? "Replace photo" : "Upload photo")}
              </Button>
              {f.image_url && <Button variant="transparent" size="small" onClick={() => setF({...f, image_url: ""})}>Remove</Button>}
              <Text size="xsmall" className="text-ui-fg-muted">Recommended: 1200×800 landscape. JPG/PNG/WebP up to 10MB.</Text>
              <Input placeholder="Or paste an image URL…" value={f.image_url || ""} onChange={e => setF({...f, image_url: e.target.value})} />
            </div>
          </div>
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
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<City>|null>(null)
  const [open, setOpen] = useState(false)
  const load = () => { setLoading(true); fetch(`${API}/admin/locations/cities`, { credentials: "include" }).then(r => r.json()).then(d => setCities(d.cities || [])).catch(() => setCities([])).finally(() => setLoading(false)) }
  useEffect(load, [])
  const save = async (data: any) => {
    const url = data.id ? `${API}/admin/locations/cities/${data.id}` : `${API}/admin/locations/cities`
    await fetch(url, { method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify(data) })
    load()
  }
  const remove = async (id: string) => { if(!confirm("Delete?")) return; await fetch(`${API}/admin/locations/cities/${id}`, { method:"DELETE", credentials:"include" }); load() }

  const grouped: Record<string, City[]> = {}
  cities.forEach(c => { if (!grouped[c.country_code]) grouped[c.country_code] = []; grouped[c.country_code].push(c) })

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h1">📍 Locations</Heading>
          <Button onClick={() => { setEdit(null); setOpen(true) }}><Plus /> Add City</Button>
        </div>
        <Text className="text-ui-fg-subtle">Cities where rental companies operate. Used in storefront filters. Pick any country in the world, then upload a photo for each city to make it shine on the homepage.</Text>
      </Container>
      {Object.entries(grouped).map(([cc, list]) => {
        return (
          <Container key={cc} className="p-0 divide-y">
            <div className="p-6"><Heading level="h2">{countryLabel(cc)} ({list.length})</Heading></div>
            <Table>
              <Table.Header><Table.Row>
                <Table.HeaderCell>#</Table.HeaderCell>
                <Table.HeaderCell>Photo</Table.HeaderCell>
                <Table.HeaderCell>Name (EN)</Table.HeaderCell>
                <Table.HeaderCell>الاسم</Table.HeaderCell>
                <Table.HeaderCell>Slug</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
              </Table.Row></Table.Header>
              <Table.Body>
                {list.map((c, i) => (
                  <Table.Row key={c.id}>
                    <Table.Cell className="text-ui-fg-muted">{i + 1}</Table.Cell>
                    <Table.Cell>
                      {c.image_url ? <img src={resolveMediaUrl(c.image_url)} alt={c.name} className="w-16 h-10 object-cover rounded"/> : <div className="w-16 h-10 rounded bg-ui-bg-subtle flex items-center justify-center"><Photo /></div>}
                    </Table.Cell>
                    <Table.Cell className="font-medium">{c.name}</Table.Cell>
                    <Table.Cell dir="rtl">{c.name_ar || "—"}</Table.Cell>
                    <Table.Cell className="font-mono text-xs">{c.slug}</Table.Cell>
                    <Table.Cell>{c.is_active ? <Badge color="green">Active</Badge> : <Badge color="grey">Off</Badge>}</Table.Cell>
                    <Table.Cell className="text-right">
                      <Button size="small" variant="transparent" onClick={() => { setEdit(c); setOpen(true) }}><PencilSquare /></Button>
                      <Button size="small" variant="transparent" onClick={() => remove(c.id!)}><Trash /></Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Container>
        )
      })}
      {loading && <Container><Text>Loading…</Text></Container>}
      <FocusModal open={open} onOpenChange={setOpen}>
        <FocusModal.Content>
          <FocusModal.Header><Heading>{edit?.id ? "Edit City" : "Add City"}</Heading></FocusModal.Header>
          <FocusModal.Body><Form item={edit} onSave={save} onClose={() => setOpen(false)} /></FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </SingleColumnPage>
  )
}
export default Page
