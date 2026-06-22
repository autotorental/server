"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Loader2, Upload, ArrowLeft, ArrowRight, ShieldCheck, Globe2, Zap, Star } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

const INP = "w-full px-3.5 py-3 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition"
const flagEmoji = (cc: string) => { const c = (cc || "").toUpperCase(); return /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(...[...c].map((x) => 0x1f1e6 + x.charCodeAt(0) - 65)) : "🌐" }
const ALL_CC = "ae sa kw qa om bh jo sy eg lb iq ye ma dz tn ly sd us gb ca au de fr it es nl be ch se no dk fi pt ie at pl cz gr tr ru ua in pk bd lk ph id my sg th vn cn jp kr hk tw ng ke za gh tz ug et br mx ar cl co pe nz".split(" ")
const countryName = (cc: string) => { const o: Record<string, string> = { ae: "United Arab Emirates", sy: "Syria" }; const lc = (cc || "").toLowerCase(); if (o[lc]) return o[lc]; try { return new (Intl as any).DisplayNames(["en"], { type: "region" }).of(lc.toUpperCase()) || lc.toUpperCase() } catch { return lc.toUpperCase() } }
type City = { id: string; country_code: string; name: string }

const STEPS = ["Account", "Company", "Verify license"]

export default function SignupPage() {
  const [cities, setCities] = useState<City[]>([])
  const [globalCities, setGlobalCities] = useState<string[]>([])
  const [cityQuery, setCityQuery] = useState("")
  const [cityOpen, setCityOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState("")
  const [ok, setOk] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [f, setF] = useState({
    email: "", password: "", confirm: "",
    name: "", handle: "",
    phone: "", whatsapp: "",
    country: "",
    city_name: "",
    default_city_id: "",
    trade_license_number: "", trade_license_expiry: "", trade_license_url: "",
    accept: false,
  })

  useEffect(() => {
    fetch(`${API}/store/catalog/cities`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.ok ? r.json() : { cities: [] })
      .then(d => setCities(d.cities || []))
      .catch(() => {})
  }, [])

  const upload = async (files: FileList) => {
    setUploading(true); setErr("")
    try {
      const file = files[0]
      if (!file) { setErr("No file selected"); return }
      if (file.size > 8 * 1024 * 1024) { setErr("File too large (max 8 MB)"); return }
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result || ""))
        r.onerror = () => reject(new Error("Could not read file"))
        r.readAsDataURL(file)
      })
      const res = await fetch(`${API}/signup/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify({ filename: file.name, content_base64: dataUrl }),
      })
      const d = await res.json()
      if (!res.ok) { setErr(d.message || "Upload failed"); return }
      const url = d.url || d.files?.[0]?.url
      if (url) setF(x => ({ ...x, trade_license_url: url }))
      else setErr("Upload returned no URL")
    } catch (e: any) {
      setErr(e.message || "Upload error")
    } finally { setUploading(false) }
  }

  // Per-step validation
  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!f.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return "Enter a valid business email"
      if (f.password.length < 8) return "Password must be at least 8 characters"
      if (f.password !== f.confirm) return "Passwords do not match"
    }
    if (s === 1) {
      if (!f.name.trim()) return "Company name is required"
      if (!f.country) return "Select your country"
      if (!f.default_city_id && !f.city_name.trim()) return "Enter your city"
      if (!f.phone.match(/^\+?\d{8,15}$/)) return "Phone must be like +971508989060"
      if (f.whatsapp && !f.whatsapp.match(/^\+?\d{8,15}$/)) return "WhatsApp must be like +971508989060"
    }
    if (s === 2) {
      if (!f.trade_license_number.trim()) return "Trade license number is required"
      if (!f.trade_license_expiry) return "Trade license expiry date is required"
      if (!f.trade_license_url) return "Upload your trade license document"
      if (!f.accept) return "You must accept the Terms of Service"
    }
    return null
  }

  const next = () => {
    const v = validateStep(step)
    if (v) { setErr(v); return }
    setErr(""); setStep(s => Math.min(STEPS.length - 1, s + 1))
  }
  const back = () => { setErr(""); setStep(s => Math.max(0, s - 1)) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    for (let s = 0; s <= 2; s++) { const v = validateStep(s); if (v) { setErr(v); setStep(s); return } }
    setBusy(true); setErr("")
    try {
      const handle = f.handle.trim() || f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40)
      const res = await fetch(`${API}/signup/seller`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-publishable-api-key": PK },
        body: JSON.stringify({
          email: f.email, password: f.password,
          name: f.name, handle,
          phone: f.phone,
          whatsapp: f.whatsapp || f.phone,
          default_city_id: f.default_city_id || undefined,
          country: f.country,
          city_name: f.city_name || undefined,
          trade_license_number: f.trade_license_number,
          trade_license_expiry: f.trade_license_expiry,
          trade_license_url: f.trade_license_url,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data.message || data.type || "Signup failed"
        if (/unauthor/i.test(msg)) throw new Error("Your browser cached an old page. Press Cmd+Shift+R (or Ctrl+Shift+R) and try again.")
        throw new Error(msg)
      }
      setOk(true)
      setTimeout(() => { window.location.href = "https://partner.autotorental.com/rental/login" }, 3000)
    } catch (e: any) {
      setErr(e.message || "Something went wrong")
    } finally { setBusy(false) }
  }

  if (ok) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-6">
        <div className="bg-white dark:bg-ink-900 rounded-3xl p-8 sm:p-10 max-w-md text-center shadow-2xl">
          <img src="/logo.png" alt="Auto to Rental" className="h-8 w-auto mx-auto mb-6 dark:hidden"/>
          <img src="/logo-dark.png" alt="Auto to Rental" className="h-8 w-auto mx-auto mb-6 hidden dark:block"/>
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-4">
            <CheckCircle2 size={36} className="text-emerald-500"/>
          </div>
          <h1 className="text-2xl font-black text-ink-900 dark:text-white">Application received! 🎉</h1>
          <p className="text-ink-600 dark:text-ink-300 mt-2.5 leading-relaxed text-[15px]">
            We got your details and trade license. Our team will verify and activate your company within <strong>24 hours</strong>.
            We'll email <strong>{f.email}</strong> the moment you're live.
          </p>
          <p className="text-ink-400 dark:text-ink-500 text-sm mt-5 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> Taking you to sign in…</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1fr_460px]">
      {/* LEFT — form */}
      <div className="flex flex-col px-5 sm:px-10 lg:px-16 py-8 bg-white dark:bg-ink-950">
        <div className="w-full max-w-xl mx-auto flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <Link href="/list-your-car" className="inline-flex items-center gap-2 text-ink-500 hover:text-ink-800 dark:hover:text-ink-200 text-sm font-medium">
              <ArrowLeft size={16}/> Back
            </Link>
            <a href="https://partner.autotorental.com/rental/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">Sign in</a>
          </div>

          {/* Brand + heading */}
          <div className="mb-8">
            <Link href="/" className="inline-block mb-6">
              <img src="/logo.png" alt="Auto to Rental" className="h-11 sm:h-12 w-auto dark:hidden" />
              <img src="/logo-dark.png" alt="Auto to Rental" className="h-11 sm:h-12 w-auto hidden dark:block" />
            </Link>
            <h1 className="text-[26px] sm:text-[32px] leading-[1.1] font-black text-ink-900 dark:text-white tracking-tight">Start renting out<br/>your cars</h1>
            <p className="text-ink-500 dark:text-ink-400 mt-2.5 text-[15px]">Create your rental company in 3 quick steps — <span className="font-semibold text-ink-700 dark:text-ink-200">0% commission</span>, ever.</p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2 mb-7">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`flex items-center gap-2 ${i <= step ? "text-brand-600" : "text-ink-400 dark:text-ink-600"}`}>
                  <span className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 border-2 transition ${i < step ? "bg-brand-600 border-brand-600 text-white" : i === step ? "border-brand-600 text-brand-600" : "border-ink-200 dark:border-ink-700"}`}>
                    {i < step ? <CheckCircle2 size={15}/> : i + 1}
                  </span>
                  <span className="text-xs font-semibold hidden sm:block">{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-800"}`}/>}
              </div>
            ))}
          </div>

          <form onSubmit={submit} className="flex-1 flex flex-col">
            {err && (
              <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 px-4 py-3 rounded-xl mb-5 text-sm font-medium">
                {err}
              </div>
            )}

            {/* STEP 0 — Account */}
            {step === 0 && (
              <div className="space-y-4">
                <Field label="Business email" required>
                  <input type="email" dir="ltr" value={f.email} onChange={e => setF({...f, email: e.target.value})} placeholder="info@yourcompany.com" className={INP}/>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Password" required>
                    <input type="password" dir="ltr" value={f.password} onChange={e => setF({...f, password: e.target.value})} placeholder="Min 8 characters" className={INP}/>
                  </Field>
                  <Field label="Confirm password" required>
                    <input type="password" dir="ltr" value={f.confirm} onChange={e => setF({...f, confirm: e.target.value})} className={INP}/>
                  </Field>
                </div>
                <p className="text-xs text-ink-400 dark:text-ink-500">We'll send your verification and login details to this email.</p>
              </div>
            )}

            {/* STEP 1 — Company */}
            {step === 1 && (
              <div className="space-y-4">
                <Field label="Company name" required>
                  <input value={f.name} onChange={e => setF({...f, name: e.target.value})} placeholder="Al Khudari Rentals LLC" className={INP}/>
                </Field>
                <Field label="Storefront handle" hint="Used in your public URL — leave blank to auto-generate">
                  <input dir="ltr" value={f.handle} onChange={e => setF({...f, handle: e.target.value})} placeholder="al-khudari-rentals" className={INP}/>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Country" required>
                    <select value={f.country} onChange={e => { const cc = e.target.value; setF({...f, country: cc, default_city_id: "", city_name: ""}); setCityQuery(""); setGlobalCities([]); if (cc) fetch(`/api/cities?country=${cc.toUpperCase()}`).then(r => r.json()).then(d => setGlobalCities(d.cities || [])).catch(() => {}); }} className={INP}>
                      <option value="">Pick your country…</option>
                      {ALL_CC.map(cc => (<option key={cc} value={cc}>{flagEmoji(cc)} {countryName(cc)}</option>))}
                    </select>
                  </Field>
                  <Field label="City" required hint={f.country && globalCities.length ? `${globalCities.length.toLocaleString()} cities — type to search` : undefined}>
                    <div className="relative">
                      <input
                        value={cityQuery}
                        onChange={e => { setCityQuery(e.target.value); setCityOpen(true); setF(prev => ({...prev, city_name: e.target.value, default_city_id: ""})) }}
                        onFocus={() => setCityOpen(true)}
                        onBlur={() => setTimeout(() => setCityOpen(false), 150)}
                        placeholder={f.country ? "Start typing your city…" : "Pick country first"}
                        disabled={!f.country}
                        autoComplete="off"
                        className={INP}
                      />
                      {cityOpen && f.country && (() => {
                        const q = cityQuery.trim().toLowerCase()
                        const matches = globalCities.filter(c => !q || c.toLowerCase().includes(q)).slice(0, 80)
                        if (!matches.length) return null
                        return (
                          <div className="absolute z-30 mt-1.5 w-full max-h-64 overflow-auto rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 shadow-2xl ring-1 ring-black/5">
                            {matches.map(c => (
                              <button
                                type="button"
                                key={c}
                                onMouseDown={ev => { ev.preventDefault(); const pc = cities.find(x => x.country_code.toLowerCase() === f.country && x.name.toLowerCase() === c.toLowerCase()); setF(prev => ({...prev, city_name: c, default_city_id: pc?.id || ""})); setCityQuery(c); setCityOpen(false) }}
                                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-800 dark:text-ink-100 hover:bg-brand-50 dark:hover:bg-ink-700/60 transition"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0 text-ink-400"><path d="M12 21s-7-6.5-7-11a7 7 0 1114 0c0 4.5-7 11-7 11z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
                                {c}
                              </button>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </Field>
                  <Field label="Phone" required>
                    <input dir="ltr" value={f.phone} onChange={e => setF({...f, phone: e.target.value})} placeholder="+971508989060" className={INP}/>
                  </Field>
                  <Field label="WhatsApp" hint="Leave blank to use Phone">
                    <input dir="ltr" value={f.whatsapp} onChange={e => setF({...f, whatsapp: e.target.value})} placeholder="+971508989060" className={INP}/>
                  </Field>
                </div>
              </div>
            )}

            {/* STEP 2 — License */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl bg-ink-50 dark:bg-ink-900/60 border border-ink-100 dark:border-ink-800 px-4 py-3 text-sm text-ink-600 dark:text-ink-300">
                  Your listings stay in <strong>draft</strong> until our team verifies your trade license — usually within 24 hours.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="License number" required>
                    <input dir="ltr" value={f.trade_license_number} onChange={e => setF({...f, trade_license_number: e.target.value})} placeholder="CN-1234567" className={INP}/>
                  </Field>
                  <Field label="Expiry date" required>
                    <input type="date" dir="ltr" value={f.trade_license_expiry} onChange={e => setF({...f, trade_license_expiry: e.target.value})} className={INP}/>
                  </Field>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-1.5">Upload trade license (PDF or photo) <span className="text-red-500">*</span></label>
                  <div onClick={() => fileRef.current?.click()} className="cursor-pointer rounded-xl border-2 border-dashed border-ink-200 dark:border-ink-700 hover:border-brand-400 px-4 py-6 flex flex-col items-center justify-center text-center transition">
                    {f.trade_license_url ? (
                      <span className="inline-flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-semibold"><CheckCircle2 size={18}/> License uploaded — tap to replace</span>
                    ) : uploading ? (
                      <span className="inline-flex items-center gap-2 text-sm text-ink-500"><Loader2 size={18} className="animate-spin"/> Uploading…</span>
                    ) : (
                      <>
                        <Upload size={22} className="text-ink-400 mb-1.5"/>
                        <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">Tap to upload</span>
                        <span className="text-xs text-ink-400 mt-0.5">PDF, JPG or PNG · max 8 MB</span>
                      </>
                    )}
                  </div>
                  {f.trade_license_url && <a href={f.trade_license_url} target="_blank" rel="noopener" className="inline-block mt-2 text-sm text-brand-600 underline">View uploaded file</a>}
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { if (e.target.files?.length) upload(e.target.files) }}/>
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                  <input type="checkbox" checked={f.accept} onChange={e => setF({...f, accept: e.target.checked})} className="mt-1 accent-brand-600"/>
                  <span className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
                    I agree to the <Link href="/terms" target="_blank" className="text-brand-600 underline">Terms of Service</Link> and
                    {" "}<Link href="/privacy" target="_blank" className="text-brand-600 underline">Privacy Policy</Link>, and confirm the trade license belongs to my company.
                  </span>
                </label>
              </div>
            )}

            {/* Nav buttons */}
            <div className="mt-auto pt-7 flex items-center gap-3">
              {step > 0 && (
                <button type="button" onClick={back} className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl border border-ink-200 dark:border-ink-700 text-ink-700 dark:text-ink-200 font-semibold text-sm hover:bg-ink-50 dark:hover:bg-ink-900">
                  <ArrowLeft size={16}/> Back
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl text-sm transition">
                  Continue <ArrowRight size={16}/>
                </button>
              ) : (
                <button type="submit" disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl text-sm transition">
                  {busy ? <><Loader2 size={18} className="animate-spin"/> Creating account…</> : <>Create my company 🚀</>}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* RIGHT — value panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5"/>
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/5"/>
        <div className="relative">
          <img src="/logo-dark.png" alt="Auto to Rental" className="h-10 w-auto mb-8 brightness-0 invert opacity-95"/>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">The Shopify for car rental</span>
          <h2 className="text-3xl font-black mt-5 leading-tight">Grow your rental business — online.</h2>
          <p className="text-white/80 mt-3 leading-relaxed">Get discovered by renters around the world, take bookings, video-call clients, and manage everything from one dashboard.</p>

          <div className="mt-8 space-y-4">
            <Benefit icon={<Globe2 size={18}/>} title="Reach renters worldwide" desc="Your cars listed on a marketplace built for international visibility & SEO."/>
            <Benefit icon={<Zap size={18}/>} title="0% commission" desc="Keep every dirham. Simple flat subscription — no per-booking fees."/>
            <Benefit icon={<ShieldCheck size={18}/>} title="Verified & trusted" desc="Trade-license verification builds renter trust and ranks you higher."/>
          </div>
        </div>

        <div className="relative mt-10 rounded-2xl bg-white/10 backdrop-blur p-5 border border-white/10">
          <div className="flex gap-0.5 mb-2">{[0,1,2,3,4].map(i => <Star key={i} size={15} className="fill-yellow-400 text-yellow-400"/>)}</div>
          <p className="text-sm text-white/90 leading-relaxed">“Setup took five minutes and we had our first booking the same week. The dashboard is genuinely like Shopify for cars.”</p>
          <p className="text-xs text-white/60 mt-2 font-semibold">— Early rental partner</p>
        </div>
      </aside>
    </main>
  )
}

function Benefit({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">{icon}</div>
      <div>
        <div className="font-bold text-sm">{title}</div>
        <div className="text-white/70 text-sm leading-snug">{desc}</div>
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink-700 dark:text-ink-200 mb-1.5">{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
      {hint && <p className="text-xs text-ink-400 dark:text-ink-500 mt-1">{hint}</p>}
    </div>
  )
}
