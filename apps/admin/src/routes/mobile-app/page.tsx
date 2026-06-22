import { useEffect, useRef, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { Phone, Trash, Plus } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

// FluxStore-style drag-drop App Builder. Edits an ordered list of home blocks
// saved to /admin/app-config (home_blocks). The app reads /store/app-config and
// renders the blocks; the legacy fields are derived so the current app already
// reflects announcement/banners/featured live.
export const config: RouteConfig = { label: tt("App Builder", "بنّاء التطبيق"), icon: Phone, rank: 56 }

type Block = { id: string; type: string; enabled?: boolean; props: any }
const C = { blue: "#1753b0", accent: "#3b82f6" }
const uid = () => "b" + Math.round(performance.now()) + Math.floor(Math.random() * 1000)

const META: Record<string, { icon: string; label: string; def: () => any }> = {
  announcement: { icon: "📣", label: tt("Announcement bar", "شريط إعلان"), def: () => ({ text: "", bg: "#1753b0", fg: "#ffffff" }) },
  banners: { icon: "🖼️", label: tt("Image banner", "بانر صور"), def: () => ({ items: [] }) },
  video: { icon: "🎬", label: tt("Video banner", "بانر فيديو"), def: () => ({ url: "", poster: "", link: "" }) },
  featured_cars: { icon: "🚗", label: tt("Featured cars", "سيارات مميّزة"), def: () => ({ ids: [], title: "Featured cars" }) },
  featured_brands: { icon: "🏷️", label: tt("Featured brands", "ماركات مميّزة"), def: () => ({ ids: [], title: "Top brands" }) },
  featured_companies: { icon: "🏢", label: tt("Featured companies", "شركات مميّزة"), def: () => ({ ids: [], title: "Top companies" }) },
  categories: { icon: "📂", label: tt("Categories", "الأقسام"), def: () => ({ title: "Browse by type" }) },
  ads: { icon: "⚡", label: tt("Sponsored / Ads", "إعلانات ممولة"), def: () => ({ title: "Sponsored", placement: "cars" }) },
  heading: { icon: "🔤", label: tt("Heading / text", "عنوان / نص"), def: () => ({ text: "" }) },
}
const ORDER = ["announcement", "banners", "video", "featured_cars", "featured_brands", "featured_companies", "categories", "ads", "heading"]

// Full-app theme tokens (map 1:1 to the mobile constants/theme.ts Colors).
// Accent/tint is handled by `primary` above; these recolour the rest of the app.
const THEME_TOKENS: { key: string; label: string; light: string; dark: string }[] = [
  { key: "background", label: tt("Background", "الخلفية"), light: "#FFFFFF", dark: "#000000" },
  { key: "cardBackground", label: tt("Cards", "البطاقات"), light: "#FFFFFF", dark: "#0A0A0A" },
  { key: "text", label: tt("Text", "النص"), light: "#111827", dark: "#FFFFFF" },
  { key: "icon", label: tt("Secondary text", "نص ثانوي"), light: "#6B7280", dark: "#9CA3AF" },
  { key: "border", label: tt("Borders", "الحدود"), light: "#E5E7EB", dark: "#1F2937" },
]
const SWATCH = { width: 34, height: 26, borderRadius: 7, cursor: "pointer", border: "1px solid rgba(120,120,140,.3)", padding: 0 } as const
type ThemeState = { light: Record<string, string>; dark: Record<string, string> }

const Page = () => {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [primary, setPrimary] = useState("")
  const [theme, setTheme] = useState<ThemeState>({ light: {}, dark: {} })
  const [brands, setBrands] = useState<any[]>([])
  const [sellers, setSellers] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [drag, setDrag] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadCtx = useRef<{ blockId: string; field: string; isItem?: boolean } | null>(null)

  useEffect(() => {
    const g = (u: string, fb: any) => fetch(`${API}${u}`, { credentials: "include" }).then((r) => (r.ok ? r.json() : fb)).catch(() => fb)
    Promise.all([
      g("/admin/app-config", { config: {} }),
      g("/admin/catalog/brands", { brands: [] }),
      g("/admin/sellers", { sellers: [] }),
      g("/admin/vehicles?limit=40", { vehicles: [] }),
    ]).then(([c, b, s, v]) => {
      // Load the DRAFT if one exists (keep editing unpublished work), else the live config.
      const cfg = c.draft || c.config || {}
      setHasDraft(!!c.has_draft)
      setPrimary(cfg.primary_color || "")
      const th = cfg.theme && typeof cfg.theme === "object" ? cfg.theme : {}
      setTheme({ light: th.light && typeof th.light === "object" ? th.light : {}, dark: th.dark && typeof th.dark === "object" ? th.dark : {} })
      setBlocks(Array.isArray(cfg.home_blocks) && cfg.home_blocks.length ? cfg.home_blocks : [])
      setBrands(b.brands || []); setSellers(s.sellers || []); setCars(v.vehicles || [])
    }).finally(() => setLoading(false))
  }, [])

  const addBlock = (type: string) => { const blk = { id: uid(), type, enabled: true, props: META[type].def() }; setBlocks((bs) => [...bs, blk]); setOpen(blk.id) }
  // One-tap starter so the builder opens with a real, editable home instead of a
  // blank screen — the owner then edits/reorders/removes each block.
  const startTemplate = () => {
    const t = [
      { id: uid(), type: "announcement", enabled: true, props: { text: tt("🚗 Welcome to Auto to Rental — verified rental cars", "🚗 أهلاً بك في Auto to Rental — سيارات إيجار موثّقة"), bg: "#1753b0", fg: "#ffffff" } },
      { id: uid(), type: "categories", enabled: true, props: { title: tt("Browse by type", "تصفّح حسب النوع") } },
      { id: uid(), type: "heading", enabled: true, props: { text: tt("Featured cars", "سيارات مميّزة") } },
      { id: uid(), type: "featured_cars", enabled: true, props: { ids: [], title: tt("Featured cars", "سيارات مميّزة") } },
      { id: uid(), type: "heading", enabled: true, props: { text: tt("Top brands", "أبرز الماركات") } },
      { id: uid(), type: "featured_brands", enabled: true, props: { ids: [], title: tt("Top brands", "أبرز الماركات") } },
      { id: uid(), type: "ads", enabled: true, props: { title: tt("Sponsored", "مُموّل"), placement: "cars" } },
    ]
    setBlocks(t); setOpen(t[3].id)
  }
  const update = (id: string, props: any) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...props } } : b)))
  const remove = (id: string) => setBlocks((bs) => bs.filter((b) => b.id !== id))
  const toggle = (id: string) => setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, enabled: b.enabled === false } : b)))
  const reorder = (src: string, dest: string) => setBlocks((bs) => { const a = [...bs]; const si = a.findIndex((b) => b.id === src); const di = a.findIndex((b) => b.id === dest); if (si < 0 || di < 0 || si === di) return bs; const [m] = a.splice(si, 1); a.splice(di, 0, m); return a })
  const toggleId = (id: string, key: string, val: string) => setBlocks((bs) => bs.map((b) => { if (b.id !== id) return b; const arr = Array.isArray(b.props[key]) ? b.props[key] : []; return { ...b, props: { ...b.props, [key]: arr.includes(val) ? arr.filter((x: string) => x !== val) : [...arr, val] } } }))

  const pickFile = (blockId: string, field: string, isItem?: boolean) => { uploadCtx.current = { blockId, field, isItem }; fileRef.current?.click() }
  const onFile = async (file: File) => {
    const ctx = uploadCtx.current; if (!file || !ctx) return
    try {
      const b64: string = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1] || ""); r.onerror = reject; r.readAsDataURL(file) })
      const r = await fetch(`${API}/admin/splash-upload`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, content_base64: b64 }) })
      const d = await r.json()
      if (!r.ok || !d.url) { toast.error(d?.message || "Upload failed"); return }
      if (ctx.isItem) setBlocks((bs) => bs.map((b) => (b.id === ctx.blockId ? { ...b, props: { ...b.props, items: [...(b.props.items || []), { image: d.url, link: "" }] } } : b)))
      else update(ctx.blockId, { [ctx.field]: d.url })
      toast.success(tt("Uploaded", "تم الرفع"))
    } catch { toast.error("Upload failed") }
  }

  // mode "draft" = save privately (live users unaffected); "publish" = push to ALL users.
  const save = async (mode: "draft" | "publish") => {
    if (mode === "publish" && !window.confirm(tt("Publish this design to ALL app users now?", "نشر هذا التصميم لكل مستخدمي التطبيق الآن؟"))) return
    setSaving(true)
    try {
      const r = await fetch(`${API}/admin/app-config`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ primary_color: primary, home_blocks: blocks, theme, mode }) })
      if (!r.ok) { toast.error(tt("Save failed", "فشل الحفظ")); return }
      if (mode === "publish") { setHasDraft(false); toast.success(tt("Published ✓ — live for all users within ~1 min", "تم النشر ✓ — مباشر لكل المستخدمين خلال ~دقيقة")) }
      else { setHasDraft(true); toast.success(tt("Draft saved ✓ — not live yet, only you see it", "حُفظت المسودة ✓ — غير منشورة، تراها أنت فقط")) }
    } catch { toast.error(tt("Network error", "خطأ في الشبكة")) } finally { setSaving(false) }
  }

  const nameOf = (list: any[], id: string) => (list.find((x) => x.id === id) || {}).name || (list.find((x) => x.id === id) || {}).title || id
  const carTitle = (id: string) => { const c = cars.find((x) => x.id === id); return c ? (c.title || c.name || id) : id }

  // ---- per-block editor ----
  const editor = (b: Block) => {
    const p = b.props
    if (b.type === "announcement") return (
      <div className="flex flex-col gap-2">
        <input value={p.text || ""} onChange={(e) => update(b.id, { text: e.target.value })} placeholder={tt("e.g. 🎉 Eid offer 20% off", "مثال: 🎉 عرض العيد 20%")} className={INP} />
        <div className="flex gap-3 flex-wrap items-center">
          <label className="text-xs flex items-center gap-1">{tt("Bg", "خلفية")} <input type="color" value={p.bg || "#1753b0"} onChange={(e) => update(b.id, { bg: e.target.value })} /></label>
          <label className="text-xs flex items-center gap-1">{tt("Text", "نص")} <input type="color" value={p.fg || "#ffffff"} onChange={(e) => update(b.id, { fg: e.target.value })} /></label>
        </div>
      </div>
    )
    if (b.type === "banners") return (
      <div className="flex flex-col gap-2">
        {(p.items || []).map((it: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <img src={it.image} alt="" style={{ width: 56, height: 32, objectFit: "cover", borderRadius: 6 }} />
            <input value={it.link || ""} onChange={(e) => update(b.id, { items: p.items.map((x: any, j: number) => (j === i ? { ...x, link: e.target.value } : x)) })} placeholder={tt("Link (optional)", "رابط (اختياري)")} className={INP} />
            <button onClick={() => update(b.id, { items: p.items.filter((_: any, j: number) => j !== i) })} style={BTN}><Trash /></button>
          </div>
        ))}
        <Button size="small" variant="secondary" onClick={() => pickFile(b.id, "items", true)}><Plus /> {tt("Add image", "أضف صورة")}</Button>
      </div>
    )
    if (b.type === "video") return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2"><Button size="small" variant="secondary" onClick={() => pickFile(b.id, "url")}>🎬 {tt("Upload video (mp4)", "ارفع فيديو")}</Button>{p.url ? <Badge color="green">{tt("video set", "فيديو محفوظ")}</Badge> : null}</div>
        <div className="flex items-center gap-2"><Button size="small" variant="secondary" onClick={() => pickFile(b.id, "poster")}>🖼️ {tt("Upload poster", "صورة الغلاف")}</Button>{p.poster ? <img src={p.poster} alt="" style={{ width: 56, height: 32, objectFit: "cover", borderRadius: 6 }} /> : null}</div>
        <input value={p.link || ""} onChange={(e) => update(b.id, { link: e.target.value })} placeholder={tt("Link when tapped (optional)", "رابط عند الضغط")} className={INP} />
      </div>
    )
    if (b.type === "featured_cars") return (
      <div className="flex flex-col gap-2">
        <input value={p.title || ""} onChange={(e) => update(b.id, { title: e.target.value })} placeholder={tt("Section title", "عنوان القسم")} className={INP} />
        <div className="flex flex-wrap gap-1.5" style={{ maxHeight: 120, overflowY: "auto" }}>
          {cars.map((c) => { const on = (p.ids || []).includes(c.id); return <button key={c.id} onClick={() => toggleId(b.id, "ids", c.id)} style={chip(on)}>{(c.title || c.name || c.id).slice(0, 22)}</button> })}
        </div>
        <Text size="small" className="text-ui-fg-muted">{(p.ids || []).length} {tt("selected · newest 40 shown", "محدّد · أحدث 40")}</Text>
      </div>
    )
    if (b.type === "featured_brands" || b.type === "featured_companies") {
      const list = b.type === "featured_brands" ? brands : sellers
      return (
        <div className="flex flex-col gap-2">
          <input value={p.title || ""} onChange={(e) => update(b.id, { title: e.target.value })} placeholder={tt("Section title", "عنوان القسم")} className={INP} />
          <div className="flex flex-wrap gap-1.5" style={{ maxHeight: 120, overflowY: "auto" }}>
            {list.map((x) => { const on = (p.ids || []).includes(x.id); return <button key={x.id} onClick={() => toggleId(b.id, "ids", x.id)} style={chip(on)}>{x.name}</button> })}
          </div>
        </div>
      )
    }
    if (b.type === "categories") return <input value={p.title || ""} onChange={(e) => update(b.id, { title: e.target.value })} placeholder={tt("Section title", "عنوان القسم")} className={INP} />
    if (b.type === "ads") return (
      <div className="flex flex-col gap-2">
        <input value={p.title || ""} onChange={(e) => update(b.id, { title: e.target.value })} placeholder={tt("Section title", "عنوان القسم")} className={INP} />
        <select value={p.placement || "cars"} onChange={(e) => update(b.id, { placement: e.target.value })} className={INP}>
          <option value="cars">{tt("Sponsored cars", "سيارات ممولة")}</option>
          <option value="videos">{tt("Sponsored videos", "فيديوهات ممولة")}</option>
        </select>
      </div>
    )
    if (b.type === "heading") return <input value={p.text || ""} onChange={(e) => update(b.id, { text: e.target.value })} placeholder={tt("Heading text", "نص العنوان")} className={INP} />
    return null
  }

  // ---- preview of one block ----
  const prev = (b: Block) => {
    if (b.enabled === false) return null
    const p = b.props
    if (b.type === "announcement" && p.text) return <div key={b.id} style={{ background: p.bg || "#1753b0", color: p.fg || "#fff", fontSize: 10, padding: "6px 8px", textAlign: "center", fontWeight: 600 }}>{p.text}</div>
    if (b.type === "banners") { const img = (p.items || [])[0]?.image; return <div key={b.id} style={{ padding: "8px 10px" }}><div style={{ height: 80, borderRadius: 10, background: "#eef2f7", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>{img ? <img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 10, color: "#9aa6b6" }}>banner</span>}</div></div> }
    if (b.type === "video") return <div key={b.id} style={{ padding: "8px 10px" }}><div style={{ height: 90, borderRadius: 10, background: p.poster ? `center/cover url(${p.poster})` : "#0b1220", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 22, color: "#fff" }}>▶</span></div></div>
    if (b.type === "heading" && p.text) return <div key={b.id} style={{ padding: "6px 12px", fontWeight: 800, fontSize: 14 }}>{p.text}</div>
    if (b.type === "featured_brands" || b.type === "featured_companies") { const list = b.type === "featured_brands" ? brands : sellers; const ids = (p.ids || []).length ? p.ids : list.slice(0, 4).map((x: any) => x.id); return <div key={b.id} style={{ padding: "6px 10px" }}>{p.title ? <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{p.title}</div> : null}<div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{ids.slice(0, 5).map((id: string, i: number) => <span key={i} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 99, background: `${primary || C.accent}1a`, color: primary || C.accent, fontWeight: 600 }}>{nameOf(list, id).slice(0, 12)}</span>)}</div></div> }
    if (b.type === "featured_cars") { const ids = (p.ids || []) as string[]; return <div key={b.id} style={{ padding: "6px 10px" }}><div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>⭐ {p.title || "Featured"}</div><div style={{ display: "flex", gap: 6, overflow: "hidden" }}>{(ids.length ? ids.slice(0, 3) : ["", ""]).map((id, i) => { const c = cars.find((x) => x.id === id); const ph = c?.photos; const img = Array.isArray(ph) ? ph[0] : null; return <div key={i} style={{ width: 78, flex: "none" }}><div style={{ height: 50, borderRadius: 8, background: img ? `center/cover url(${img})` : "#eef2f7" }} /><div style={{ fontSize: 8, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{id ? carTitle(id) : "Car"}</div></div> })}</div></div> }
    if (b.type === "categories") return <div key={b.id} style={{ padding: "6px 10px" }}>{p.title ? <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{p.title}</div> : null}<div style={{ display: "flex", gap: 5 }}>{["SUV", "Sedan", "Luxury", "Van"].map((t) => <span key={t} style={{ fontSize: 9, padding: "5px 9px", borderRadius: 8, background: "#f1f5f9" }}>{t}</span>)}</div></div>
    if (b.type === "ads") return <div key={b.id} style={{ padding: "6px 10px" }}><div style={{ borderRadius: 10, border: `1px dashed ${primary || C.accent}`, padding: 8, fontSize: 9, color: primary || C.accent, textAlign: "center" }}>⚡ {p.title || "Sponsored"} ({p.placement || "cars"})</div></div>
    return null
  }

  return (
    <SingleColumnPage>
      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = "" }} />
      <Container className="p-6">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">🧱 {tt("App Builder", "بنّاء التطبيق")}</h1>
          <Badge color="blue">{tt("Home page", "الصفحة الرئيسية")}</Badge>
        </div>
        <p className="text-sm mt-1.5 text-ui-fg-subtle">{tt("Design the app in the live phone preview → Save draft (only you see it) → Publish to push to ALL users. Colours recolour the whole app live.", "صمّم التطبيق في المعاينة الحيّة ← احفظ مسودة (تراها أنت فقط) ← انشر لدفعها لكل المستخدمين. الألوان تعيد تلوين كل التطبيق مباشرة.")}</p>
      </Container>

      {loading ? <Container className="p-6 pt-0"><Text className="text-ui-fg-muted">{tt("Loading…", "جارٍ التحميل…")}</Text></Container> : (
        <Container className="p-6 pt-0">
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 290px", gap: 22, alignItems: "start" }}>
            {/* Builder */}
            <div className="flex flex-col gap-4">
              {/* Theme & full-app colours */}
              <div className="rounded-xl border border-ui-border-base p-4">
                <Text size="small" weight="plus" className="block">🎨 {tt("Theme & colours (whole app)", "الثيم والألوان (التطبيق كامل)")}</Text>
                <Text size="xsmall" className="text-ui-fg-muted mb-3 block">{tt("Recolours every screen of the app — applied live, no app update.", "يعيد تلوين كل شاشات التطبيق — يُطبَّق مباشرةً بلا تحديث.")}</Text>

                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <Text size="small" weight="plus">{tt("Accent", "اللون الأساسي")}</Text>
                  <input type="color" value={primary || "#1753b0"} onChange={(e) => setPrimary(e.target.value)} style={SWATCH} />
                  {primary ? <button onClick={() => setPrimary("")} className="text-xs text-ui-fg-muted" style={BTN}>{tt("reset", "إرجاع")}</button> : null}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {(["light", "dark"] as const).map((mode) => (
                    <div key={mode} className="rounded-lg border border-ui-border-base p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Text size="xsmall" weight="plus">{mode === "light" ? tt("Light mode", "الوضع الفاتح") : tt("Dark mode", "الوضع الداكن")}</Text>
                        {Object.keys(theme[mode]).length ? <button onClick={() => setTheme((t) => ({ ...t, [mode]: {} }))} className="text-[11px] text-ui-fg-muted" style={BTN}>{tt("reset", "إرجاع")}</button> : null}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {THEME_TOKENS.map((tk) => (
                          <label key={tk.key} className="flex items-center justify-between text-xs gap-2">
                            <span>{tk.label}</span>
                            <input type="color" value={theme[mode][tk.key] || tk[mode]} onChange={(e) => setTheme((t) => ({ ...t, [mode]: { ...t[mode], [tk.key]: e.target.value } }))} style={SWATCH} />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-4 mb-2 gap-2 flex-wrap">
                  <Text size="small" weight="plus">{tt("Add a block", "أضف بلوك")}</Text>
                  {blocks.length === 0 && (
                    <button onClick={startTemplate} style={{ cursor: "pointer", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, border: "none", color: "#fff", background: primary || "#1753b0" }}>✨ {tt("Start with a ready design", "ابدأ بتصميم جاهز")}</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ORDER.map((t) => <button key={t} onClick={() => addBlock(t)} style={{ cursor: "pointer", borderRadius: 8, padding: "5px 10px", fontSize: 12, border: "1px solid rgba(120,120,140,.25)", background: "transparent" }}>{META[t].icon} {META[t].label}</button>)}
                </div>
              </div>

              {/* Blocks (drag to reorder) */}
              {blocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ui-border-base p-8 text-center">
                  <div className="text-3xl mb-2">📱</div>
                  <Text className="text-ui-fg-base font-medium mb-1 block">{tt("Design your app's home screen", "صمّم الشاشة الرئيسية لتطبيقك")}</Text>
                  <Text size="small" className="text-ui-fg-muted mb-4 block">{tt("Add blocks to lay out the home — or load a ready design and edit it. Colours above recolour the WHOLE app live.", "أضف بلوكات لترتيب الرئيسية — أو حمّل تصميمًا جاهزًا وعدّله. الألوان أعلاه تعيد تلوين كل التطبيق مباشرة.")}</Text>
                  <button onClick={startTemplate} style={{ cursor: "pointer", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, border: "none", color: "#fff", background: primary || "#1753b0" }}>✨ {tt("Start with a ready design", "ابدأ بتصميم جاهز")}</button>
                </div>
              ) : null}
              <div className="flex flex-col gap-2.5">
                {blocks.map((b) => (
                  <div key={b.id} draggable onDragStart={() => setDrag(b.id)} onDragEnd={() => setDrag(null)} onDragOver={(e) => { if (drag && drag !== b.id) e.preventDefault() }} onDrop={(e) => { e.preventDefault(); if (drag && drag !== b.id) reorder(drag, b.id); setDrag(null) }}
                    style={{ borderRadius: 12, border: "1px solid rgba(120,120,140,.18)", background: "var(--bg-base)", opacity: drag === b.id ? 0.4 : b.enabled === false ? 0.55 : 1 }} className="bg-ui-bg-base">
                    <div className="flex items-center gap-2 p-3" style={{ cursor: "grab" }}>
                      <span style={{ opacity: 0.4 }}>⠿</span>
                      <span style={{ fontWeight: 700, fontSize: 13.5 }}>{META[b.type]?.icon} {META[b.type]?.label}</span>
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                        <label className="text-xs flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={b.enabled !== false} onChange={() => toggle(b.id)} />{tt("on", "ظاهر")}</label>
                        <button onClick={() => setOpen(open === b.id ? null : b.id)} className="text-xs" style={BTN}>{open === b.id ? tt("Close", "إغلاق") : tt("Edit", "تعديل")}</button>
                        <button onClick={() => remove(b.id)} style={BTN}><Trash /></button>
                      </div>
                    </div>
                    {open === b.id ? <div className="px-3 pb-3">{editor(b)}</div> : null}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="secondary" onClick={() => save("draft")} isLoading={saving}>💾 {tt("Save draft", "حفظ مسودة")}</Button>
                <Button onClick={() => save("publish")} isLoading={saving}>🚀 {tt("Publish to all users", "نشر لكل المستخدمين")}</Button>
                {hasDraft ? <Badge color="orange">{tt("Unpublished draft", "مسودة غير منشورة")}</Badge> : <Badge color="green">{tt("Published · live", "منشور · مباشر")}</Badge>}
              </div>
            </div>

            {/* Live phone preview */}
            <div style={{ position: "sticky", top: 16 }}>
              <Text size="small" weight="plus" className="mb-2 block text-center">{tt("Live preview", "معاينة حيّة")}</Text>
              <div style={{ margin: "0 auto", width: 260, borderRadius: 32, border: "10px solid #0b1220", background: "#0b1220", overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,.3)" }}>
                <div style={{ height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 66, height: 5, borderRadius: 9, background: "#33405a" }} /></div>
                <div style={{ background: theme.light.background || "#fff", height: 462, overflowY: "auto" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 11px" }}><span style={{ fontWeight: 800, fontSize: 13, color: theme.light.text || "#111827" }}>Auto to Rental</span><span style={{ width: 22, height: 22, borderRadius: 7, background: primary || "#1753b0" }} /></div>
                  {blocks.map(prev)}
                  {blocks.filter((b) => b.enabled !== false).length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "#9aa6b6", fontSize: 11 }}>{tt("Add blocks to preview", "أضف بلوكات للمعاينة")}</div> : null}
                </div>
                {/* Simulator-style bottom tab bar (reflects the live theme). */}
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", height: 46, borderTop: `1px solid ${theme.light.border || "#e5e7eb"}`, background: theme.light.cardBackground || "#ffffff" }}>
                  {["🚗", "🏷️", "🎬", "🏢", "👤"].map((ic, i) => (
                    <span key={i} style={{ fontSize: 15, filter: i === 0 ? "none" : "grayscale(1)", opacity: i === 0 ? 1 : 0.45 }}>{ic}</span>
                  ))}
                </div>
              </div>
              <Text size="small" className="text-ui-fg-muted mt-2 block text-center">{tt("Updates as you build", "يتحدّث أثناء البناء")}</Text>
            </div>
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}

const INP = "w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
const BTN = { background: "none", border: "none", cursor: "pointer", opacity: 0.7 } as const
const chip = (on: boolean) => ({ cursor: "pointer", borderRadius: 99, padding: "4px 10px", fontSize: 11.5, border: `1px solid ${on ? "#3b82f6" : "rgba(120,120,140,.3)"}`, background: on ? "#3b82f6" : "transparent", color: on ? "#fff" : "inherit" } as const)

export default Page
