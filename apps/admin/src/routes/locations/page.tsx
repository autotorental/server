import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Table, Badge, Button, Input, Label, Select, FocusModal, Tabs } from "@medusajs/ui"
import { MapPin, Plus, Trash, PencilSquare, Photo, Globe } from "@medusajs/icons"
import { API, resolveMediaUrl } from "../../lib/api"

export const config: RouteConfig = { label: tt("Locations", "المواقع"), icon: MapPin, rank: 17 }

type City = { id?: string; country_code: string; name: string; name_ar: string | null; slug: string; is_active: boolean; sort_order: number; image_url?: string | null }

// Arab / GCC markets first; every other country in the world follows.
const PRIORITY = ["ae", "sa", "kw", "qa", "om", "bh", "jo", "sy", "eg", "lb", "iq", "ye", "ma", "dz", "tn", "ly", "sd"]
const ALL_CC = "ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bl bm bn bo bq br bs bt bv bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg eh er es et fi fj fk fm fo fr ga gb gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mf mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sj sk sl sm sn so sr ss st sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug um us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw".split(" ")

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

const COUNTRIES = [
  ...PRIORITY,
  ...ALL_CC.filter((c) => !PRIORITY.includes(c)).sort((a, b) => countryName(a).localeCompare(countryName(b))),
].map((code) => ({ code, label: countryLabel(code) }))

const Form = ({ item, onSave, onClose }: { item: Partial<City> | null; onSave: (d: any) => Promise<void>; onClose: () => void }) => {
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
    <div className="flex flex-col gap-4 p-4 max-h-[80vh] overflow-y-auto">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "12px" }}>
        <div><Label size="small">Country</Label>
          <Select value={f.country_code} onValueChange={v => setF({ ...f, country_code: v })}>
            <Select.Trigger><Select.Value placeholder="Select a country" /></Select.Trigger>
            <Select.Content className="max-h-72">{COUNTRIES.map(c => <Select.Item key={c.code} value={c.code}>{c.label}</Select.Item>)}</Select.Content>
          </Select>
        </div>
        <div><Label size="small">Sort order</Label><Input type="number" value={f.sort_order || 0} onChange={e => setF({ ...f, sort_order: parseInt(e.target.value, 10) || 0 })} /></div>
        <div><Label size="small">Name (EN)</Label><Input value={f.name || ""} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Dubai" /></div>
        <div><Label size="small">الاسم (AR)</Label><Input value={f.name_ar || ""} onChange={e => setF({ ...f, name_ar: e.target.value })} placeholder="دبي" dir="rtl" /></div>
        <div className="col-span-2"><Label size="small">Slug (URL)</Label><Input value={f.slug || ""} onChange={e => setF({ ...f, slug: e.target.value })} placeholder="dubai" /></div>

        <div className="col-span-2">
          <Label size="small">City Photo (shown on storefront)</Label>
          <div className="flex items-start gap-3 mt-1">
            <div className="w-32 h-24 rounded-lg bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center overflow-hidden">
              {f.image_url ? <img src={resolveMediaUrl(f.image_url)} alt="" className="w-full h-full object-cover" /> : <Photo />}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
              <Button variant="secondary" size="small" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? "Uploading…" : (f.image_url ? "Replace photo" : "Upload photo")}
              </Button>
              {f.image_url && <Button variant="transparent" size="small" onClick={() => setF({ ...f, image_url: "" })}>Remove</Button>}
              <Text size="xsmall" className="text-ui-fg-muted">Recommended: 1200×800 landscape. JPG/PNG/WebP up to 10MB.</Text>
              <Input placeholder="Or paste an image URL…" value={f.image_url || ""} onChange={e => setF({ ...f, image_url: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-3 sticky bottom-0 bg-ui-bg-base border-t border-ui-border-base -mx-4 px-4 -mb-4 pb-4">
        <Button variant="secondary" onClick={onClose}>{tt("Cancel", "إلغاء")}</Button>
        <Button disabled={saving} onClick={async () => { if (!f.name || !String(f.name).trim()) { alert("Name (EN) is required"); return } if (!f.slug || !String(f.slug).trim()) { alert("Slug is required"); return } setSaving(true); try { await onSave(f); onClose() } catch (e) { /* onSave shows the error */ } finally { setSaving(false) } }}>{saving ? "Saving..." : "Save"}</Button>
      </div>
    </div>
  )
}

const Page = () => {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [edit, setEdit] = useState<Partial<City> | null>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState("countries")

  const load = () => { setLoading(true); fetch(`${API}/admin/locations/cities`, { credentials: "include" }).then(r => r.json()).then(d => setCities(d.cities || [])).catch(() => setCities([])).finally(() => setLoading(false)) }
  useEffect(load, [])

  const save = async (data: any) => {
    const { id, created_at, updated_at, ...rest } = data
    const url = id ? `${API}/admin/locations/cities/${id}` : `${API}/admin/locations/cities`
    const res = await fetch(url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(rest) })
    if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.message || "Save failed"); throw new Error(e.message || "save failed") }
    load()
  }
  const remove = async (id: string) => { if (!confirm("Delete?")) return; await fetch(`${API}/admin/locations/cities/${id}`, { method: "DELETE", credentials: "include" }); load() }

  const grouped: Record<string, City[]> = {}
  cities.forEach(c => { if (!grouped[c.country_code]) grouped[c.country_code] = []; grouped[c.country_code].push(c) })
  const countryStats = Object.entries(grouped)
    .map(([cc, list]) => ({ cc, total: list.length, active: list.filter(c => c.is_active).length }))
    .sort((a, b) => b.total - a.total)

  const addCityFor = (cc?: string) => { setEdit(cc ? ({ country_code: cc } as any) : null); setOpen(true) }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between mb-1">
          <Heading level="h1" className="flex items-center gap-2"><MapPin /> Locations</Heading>
          <Button onClick={() => addCityFor()}><Plus /> Add City</Button>
        </div>
        <Text className="text-ui-fg-subtle">{tt("International marketplace — add any country and its cities. They appear in storefront filters and the country switcher automatically.", "سوق دولي — أضف أي دولة ومدنها. تظهر تلقائياً في فلاتر الموقع ومبدّل الدول.")}</Text>
      </Container>

      <Container className="p-0">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="px-6 pt-4">
            <Tabs.List>
              <Tabs.Trigger value="countries"><Globe className="mr-1.5" /> Countries ({countryStats.length})</Tabs.Trigger>
              <Tabs.Trigger value="cities"><MapPin className="mr-1.5" /> Cities ({cities.length})</Tabs.Trigger>
            </Tabs.List>
          </div>

          {/* ===== COUNTRIES TAB ===== */}
          <Tabs.Content value="countries" className="p-6">
            {loading ? <Text>Loading…</Text> : countryStats.length === 0 ? (
              <div className="text-center py-12">
                <Text className="text-ui-fg-muted mb-3">{tt("No countries yet. Add your first city to launch a country.", "لا توجد دول بعد. أضف أول مدينة لإطلاق دولة.")}</Text>
                <Button onClick={() => addCityFor()}><Plus /> Add City</Button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                {countryStats.map(({ cc, total, active }) => (
                  <div key={cc} className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl leading-none">{flagEmoji(cc)}</span>
                      <div>
                        <div className="font-semibold text-ui-fg-base">{countryName(cc)}</div>
                        <div className="text-xs text-ui-fg-muted uppercase">{cc}</div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-lg font-bold">{total}</div>
                        <div className="text-[11px] text-ui-fg-muted">cities</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={active > 0 ? "green" : "grey"}>{active} active</Badge>
                      {total - active > 0 && <Badge color="grey">{total - active} off</Badge>}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <Button size="small" variant="secondary" className="flex-1" onClick={() => setTab("cities")}>View cities</Button>
                      <Button size="small" className="flex-1" onClick={() => addCityFor(cc)}><Plus /> Add city</Button>
                    </div>
                  </div>
                ))}
                {/* Add a brand-new country */}
                <button onClick={() => addCityFor()}
                  className="rounded-xl border-2 border-dashed border-ui-border-strong bg-transparent p-4 flex flex-col items-center justify-center gap-2 text-ui-fg-muted hover:text-ui-fg-base hover:border-ui-fg-muted transition min-h-[140px]">
                  <Globe className="w-7 h-7" />
                  <span className="font-semibold">Add a new country</span>
                  <span className="text-xs">Pick any country in the world</span>
                </button>
              </div>
            )}
          </Tabs.Content>

          {/* ===== CITIES TAB ===== */}
          <Tabs.Content value="cities" className="p-0">
            {loading && <div className="p-6"><Text>Loading…</Text></div>}
            {Object.entries(grouped).map(([cc, list]) => (
              <div key={cc} className="border-t border-ui-border-base">
                <div className="px-6 py-4 flex items-center justify-between">
                  <Heading level="h2">{countryLabel(cc)} ({list.length})</Heading>
                  <Button size="small" variant="secondary" onClick={() => addCityFor(cc)}><Plus /> Add city</Button>
                </div>
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
                          {c.image_url ? <img src={resolveMediaUrl(c.image_url)} alt={c.name} className="w-16 h-10 object-cover rounded" /> : <div className="w-16 h-10 rounded bg-ui-bg-subtle flex items-center justify-center"><Photo /></div>}
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
              </div>
            ))}
            {!loading && cities.length === 0 && <div className="p-6 text-center"><Text className="text-ui-fg-muted">{tt("No cities yet.", "لا توجد مدن بعد.")}</Text></div>}
          </Tabs.Content>
        </Tabs>
      </Container>

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
