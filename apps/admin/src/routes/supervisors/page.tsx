import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, Input, Label, Checkbox, toast } from "@medusajs/ui"
import { Users } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Supervisors", "المشرفون"), icon: Users, rank: 16 }

const PERM_LABEL: Record<string, string> = {
  reset_password: tt("Reset vendor password", "إعادة تعيين كلمة مرور الفيندور"),
  vip: tt("Set VIP / Premium", "تفعيل VIP / Premium"),
  verified: tt("Verify company", "توثيق الشركة"),
  featured: tt("Feature company", "تمييز الشركة"),
  suspend: tt("Suspend (non-payment)", "إيقاف (عدم الدفع)"),
}

type Sup = { id: string; email: string; name: string; countries: string[]; perms: Record<string, boolean>; nav: string[] }
type Meta = { supervisors: Sup[]; perm_keys: string[]; nav_catalog: { key: string; label: string; ar: string }[]; countries: string[] }

const box: React.CSSProperties = { border: "1px solid var(--border-base)", borderRadius: 10, padding: 16 }

export default function Page() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [busy, setBusy] = useState(false)
  // new supervisor form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [countries, setCountries] = useState("")
  const [perms, setPerms] = useState<Record<string, boolean>>({})
  const [nav, setNav] = useState<Record<string, boolean>>({})

  const load = async () => {
    const r = await fetch(`${API}/admin/supervisors`, { credentials: "include" })
    if (r.status === 403) { setForbidden(true); return }
    const d = await r.json()
    setMeta(d)
  }
  useEffect(() => { load() }, [])

  const toggle = (set: any, obj: any, k: string) => set({ ...obj, [k]: !obj[k] })

  const create = async () => {
    if (!email.trim()) { toast.error(tt("Email required", "الإيميل مطلوب")); return }
    setBusy(true)
    try {
      const d = await fetch(`${API}/admin/supervisors`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(), password: password.trim() || undefined, name: name.trim(),
          countries: countries.split(",").map(s => s.trim().toUpperCase()).filter(Boolean),
          perms, nav: Object.keys(nav).filter(k => nav[k]),
        }),
      }).then(r => r.json())
      if (!d.success) { toast.error(d.message || tt("Failed", "فشل")); setBusy(false); return }
      toast.success(tt("Supervisor created", "تم إنشاء المشرف"))
      if (d.new_password) alert(`${tt("Login", "الدخول")}: ${d.login_email}\n${tt("Password", "كلمة المرور")}: ${d.new_password}\n\n${tt("Send these to the supervisor.", "أرسلها للمشرف.")}`)
      setName(""); setEmail(""); setPassword(""); setCountries(""); setPerms({}); setNav({})
      load()
    } catch (e: any) { toast.error(e?.message || "Failed") }
    setBusy(false)
  }

  const saveOne = async (s: Sup) => {
    const d = await fetch(`${API}/admin/supervisors/${s.id}`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countries: s.countries, perms: s.perms, nav: s.nav }),
    }).then(r => r.json())
    if (d.success) { toast.success(tt("Saved", "تم الحفظ")) } else toast.error(d.message || "Failed")
  }
  const resetPw = async (s: Sup) => {
    const d = await fetch(`${API}/admin/supervisors/${s.id}`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: Math.random().toString(36).slice(2, 10) + "A1" }),
    }).then(r => r.json())
    if (d.new_password) alert(`${tt("New password for", "كلمة مرور جديدة لـ")} ${s.email}:\n${d.new_password}`)
  }
  const remove = async (s: Sup) => {
    if (!confirm(tt(`Revoke supervisor access for ${s.email}?`, `سحب صلاحية المشرف من ${s.email}؟`))) return
    const d = await fetch(`${API}/admin/supervisors/${s.id}`, { method: "DELETE", credentials: "include" }).then(r => r.json())
    if (d.success) { toast.success(tt("Revoked", "تم السحب")); load() } else toast.error(d.message || "Failed")
  }
  const patch = (idx: number, fn: (s: Sup) => Sup) => {
    if (!meta) return
    const next = [...meta.supervisors]; next[idx] = fn(next[idx]); setMeta({ ...meta, supervisors: next })
  }

  if (forbidden) return (
    <SingleColumnPage><Container className="p-6"><Heading>{tt("Owner only", "للمالك فقط")}</Heading>
      <Text className="text-ui-fg-subtle mt-1">{tt("Only the owner can manage supervisors.", "فقط المالك يقدر يدير المشرفين.")}</Text></Container></SingleColumnPage>
  )
  if (!meta) return <SingleColumnPage><Container className="p-6"><Text>{tt("Loading…", "تحميل…")}</Text></Container></SingleColumnPage>

  return (
    <SingleColumnPage>
      <Container className="p-0 overflow-hidden">
        <div className="px-6 py-5 border-b">
          <Heading level="h1">{tt("Supervisors & Permissions", "المشرفون والصلاحيات")}</Heading>
          <Text className="text-ui-fg-subtle mt-1" size="small">
            {tt("Create supervisors for each country and choose exactly what they can do and see.",
                "أنشئ مشرفين لكل دولة واختر بالضبط وش يقدرون يسوون ويشوفون.")}
          </Text>
        </div>

        {/* Create */}
        <div className="px-6 py-5 border-b flex flex-col gap-4" style={{ maxWidth: 720 }}>
          <Heading level="h3">{tt("Add a supervisor", "إضافة مشرف")}</Heading>
          <div className="grid grid-cols-2 gap-3">
            <div><Label size="small">{tt("Name", "الاسم")}</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div><Label size="small">{tt("Email (login)", "الإيميل (الدخول)")}</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" /></div>
            <div><Label size="small">{tt("Password (blank = auto)", "كلمة المرور (فاضي = تلقائي)")}</Label><Input value={password} onChange={e => setPassword(e.target.value)} /></div>
            <div><Label size="small">{tt("Countries (ISO codes, comma)", "الدول (رموز ISO، فاصلة)")}</Label><Input value={countries} onChange={e => setCountries(e.target.value)} placeholder="AE, SA, QA" /></div>
          </div>
          {meta.countries.length > 0 && (
            <Text size="xsmall" className="text-ui-fg-subtle">{tt("Detected:", "المكتشفة:")} {meta.countries.join(", ")}</Text>
          )}
          <div>
            <Label size="small">{tt("Permissions", "الصلاحيات")}</Label>
            <div className="flex flex-col gap-2 mt-1">
              {meta.perm_keys.map(k => (
                <label key={k} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={!!perms[k]} onCheckedChange={() => toggle(setPerms, perms, k)} />
                  <Text size="small">{PERM_LABEL[k] || k}</Text>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label size="small">{tt("Pages they can see", "الصفحات اللي يشوفها")}</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {meta.nav_catalog.map(n => (
                <label key={n.key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={!!nav[n.key]} onCheckedChange={() => toggle(setNav, nav, n.key)} />
                  <Text size="small">{tt(n.label, n.ar)}</Text>
                </label>
              ))}
            </div>
          </div>
          <div><Button onClick={create} disabled={busy} isLoading={busy}>{tt("Create supervisor", "إنشاء مشرف")}</Button></div>
        </div>

        {/* List */}
        <div className="px-6 py-5 flex flex-col gap-4">
          <Heading level="h3">{tt("Current supervisors", "المشرفون الحاليون")} ({meta.supervisors.length})</Heading>
          {meta.supervisors.length === 0 && <Text size="small" className="text-ui-fg-subtle">{tt("No supervisors yet.", "لا يوجد مشرفون بعد.")}</Text>}
          {meta.supervisors.map((s, idx) => (
            <div key={s.id} style={box} className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div><Text weight="plus">{s.name}</Text><Text size="small" className="text-ui-fg-subtle">{s.email}</Text></div>
                <div className="flex gap-2">
                  <Button size="small" variant="secondary" onClick={() => resetPw(s)}>{tt("Reset password", "كلمة مرور")}</Button>
                  <Button size="small" variant="danger" onClick={() => remove(s)}>{tt("Revoke", "سحب")}</Button>
                </div>
              </div>
              <div>
                <Label size="small">{tt("Countries", "الدول")}</Label>
                <Input value={(s.countries || []).join(", ")} onChange={e => patch(idx, x => ({ ...x, countries: e.target.value.split(",").map(c => c.trim().toUpperCase()).filter(Boolean) }))} placeholder="AE, SA" />
              </div>
              <div className="flex flex-wrap gap-3">
                {meta.perm_keys.map(k => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={!!s.perms?.[k]} onCheckedChange={() => patch(idx, x => ({ ...x, perms: { ...x.perms, [k]: !x.perms?.[k] } }))} />
                    <Text size="xsmall">{PERM_LABEL[k] || k}</Text>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {meta.nav_catalog.map(n => (
                  <label key={n.key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={(s.nav || []).includes(n.key)} onCheckedChange={() => patch(idx, x => ({ ...x, nav: (x.nav || []).includes(n.key) ? x.nav.filter(v => v !== n.key) : [...(x.nav || []), n.key] }))} />
                    <Text size="xsmall">{tt(n.label, n.ar)}</Text>
                  </label>
                ))}
              </div>
              <div><Button size="small" onClick={() => saveOne(s)}>{tt("Save changes", "حفظ التغييرات")}</Button></div>
            </div>
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}
