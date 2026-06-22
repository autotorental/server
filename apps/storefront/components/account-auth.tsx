"use client"
import { useEffect, useState } from "react"
import { User, LogOut, Loader2, Mail, Lock, Building2, ShieldCheck, ArrowRight } from "lucide-react"
import { getMe, login, register, updateMe, clearToken, unifiedLogin, type Customer } from "@/lib/customer-auth"

export default function AccountAuth() {
  const [ready, setReady] = useState(false)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [mode, setMode] = useState<"login" | "register">("login")
  const [role, setRole] = useState<"customer" | "business" | "admin">("customer")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [ok, setOk] = useState("")

  // form fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")

  useEffect(() => {
    getMe().then((c) => { setCustomer(c); if (c) { setFirstName(c.first_name || ""); setLastName(c.last_name || ""); setPhone(c.phone || "") } }).finally(() => setReady(true))
  }, [])

  const submit = async () => {
    setErr(""); setOk(""); setBusy(true)
    try {
      if (mode === "register") {
        if (!firstName.trim()) throw new Error("Please enter your name")
        await register(email.trim(), password, firstName.trim(), lastName.trim(), phone.trim() || undefined)
      } else {
        const res = await unifiedLogin(email.trim(), password)
        if (res.role !== "customer" && res.redirect) {
          setOk(`Welcome back — opening your ${res.role === "admin" ? "admin" : "vendor"} dashboard…`)
          window.location.href = res.redirect
          return
        }
      }
      const c = await getMe()
      setCustomer(c)
      if (c) { setFirstName(c.first_name || ""); setLastName(c.last_name || ""); setPhone(c.phone || "") }
      setPassword("")
    } catch (e: any) {
      setErr(e?.message || "Something went wrong")
    } finally { setBusy(false) }
  }

  const save = async () => {
    setErr(""); setOk(""); setBusy(true)
    try {
      const c = await updateMe({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() })
      if (c) setCustomer(c)
      setOk("Profile saved.")
    } catch (e: any) { setErr(e?.message || "Could not save") } finally { setBusy(false) }
  }

  const logout = () => { clearToken(); setCustomer(null); setEmail(""); setPassword(""); setOk(""); setErr("") }

  const input = "w-full rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-4 py-3 text-sm text-ink-900 dark:text-ink-100 outline-none focus:border-brand-500"

  if (!ready) {
    return (
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4"><div className="surface-card p-6 flex items-center gap-3 text-ink-500"><Loader2 className="animate-spin" size={18}/> Loading your account…</div></div>
      </section>
    )
  }

  return (
    <section className="py-8 border-b border-ink-100 dark:border-ink-800">
      <div className="mx-auto max-w-7xl px-4">
        {customer ? (
          /* ---- Logged-in profile ---- */
          <div className="surface-card p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center"><User size={22}/></div>
                <div>
                  <div className="font-black text-lg text-ink-900 dark:text-ink-100">{customer.first_name ? `Hi, ${customer.first_name}` : "My profile"}</div>
                  <div className="text-sm text-ink-500">{customer.email}</div>
                </div>
              </div>
              <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 dark:border-ink-700 px-4 py-2 text-sm font-semibold text-ink-700 dark:text-ink-300 hover:border-red-300 hover:text-red-600"><LogOut size={15}/> Log out</button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><label className="block text-xs font-semibold text-ink-500 mb-1">First name</label><input className={input} value={firstName} onChange={(e)=>setFirstName(e.target.value)} /></div>
              <div><label className="block text-xs font-semibold text-ink-500 mb-1">Last name</label><input className={input} value={lastName} onChange={(e)=>setLastName(e.target.value)} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-semibold text-ink-500 mb-1">Phone</label><input className={input} value={phone} onChange={(e)=>setPhone(e.target.value)} dir="ltr" placeholder="+9715XXXXXXXX" /></div>
            </div>
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60">{busy && <Loader2 className="animate-spin" size={15}/>} Save profile</button>
              {ok && <span className="text-sm text-emerald-600 font-semibold">{ok}</span>}
              {err && <span className="text-sm text-red-600 font-semibold">{err}</span>}
            </div>
          </div>
        ) : (
          /* ---- Unified sign-in (Customer / Business / Admin) ---- */
          <div className="w-full max-w-md mx-auto rounded-2xl border border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-[0_8px_40px_rgba(15,27,52,0.08)] overflow-hidden">
            <div className="px-7 pt-7 pb-5 text-center border-b border-ink-100 dark:border-ink-800">
              <div className="mx-auto mb-3 w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,#1d4ed8,#3b82f6)" }}><Lock size={22}/></div>
              <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">Sign in to Auto to Rental</h2>
              <p className="text-sm text-ink-500 mt-1">One account · choose how you sign in</p>
            </div>

            <div className="px-7 pt-5">
              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-ink-100 dark:bg-ink-800 p-1">
                {[
                  { k: "customer", I: User, l: "Customer" },
                  { k: "business", I: Building2, l: "Business" },
                  { k: "admin", I: ShieldCheck, l: "Admin" },
                ].map((r:any)=>(
                  <button key={r.k} onClick={()=>{setRole(r.k);setErr("")}} className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-bold transition ${role===r.k?"bg-white dark:bg-ink-900 text-brand-700 shadow-sm":"text-ink-500 hover:text-ink-700"}`}>
                    <r.I size={17}/> {r.l}
                  </button>
                ))}
              </div>
            </div>

            {role === "customer" && (
              <div className="px-7 py-6 space-y-3">
                <div className="flex gap-2 rounded-xl bg-ink-100 dark:bg-ink-800 p-1">
                  <button onClick={()=>{setMode("login");setErr("")}} className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition ${mode==="login"?"bg-white dark:bg-ink-900 text-brand-700 shadow-sm":"text-ink-500"}`}>Sign in</button>
                  <button onClick={()=>{setMode("register");setErr("")}} className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition ${mode==="register"?"bg-white dark:bg-ink-900 text-brand-700 shadow-sm":"text-ink-500"}`}>Create account</button>
                </div>
                {mode === "register" && (
                  <div className="grid grid-cols-2 gap-3">
                    <input className={input} placeholder="First name" value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
                    <input className={input} placeholder="Last name" value={lastName} onChange={(e)=>setLastName(e.target.value)} />
                  </div>
                )}
                <div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"/><input className={`${input} pl-10`} type="email" placeholder="Email address" value={email} onChange={(e)=>setEmail(e.target.value)} dir="ltr" autoComplete="email" /></div>
                <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"/><input className={`${input} pl-10`} type="password" placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} dir="ltr" autoComplete={mode==="register"?"new-password":"current-password"} onKeyDown={(e)=>{ if (e.key==="Enter") void submit() }} /></div>
                {mode === "register" && <input className={input} placeholder="Phone (optional)" value={phone} onChange={(e)=>setPhone(e.target.value)} dir="ltr" />}
                {err && <div className="text-sm text-red-600 font-semibold">{err}</div>}
                <button onClick={submit} disabled={busy || !email || !password} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60 transition">{busy && <Loader2 className="animate-spin" size={15}/>} {mode==="register"?"Create my account":"Sign in"}</button>
                <p className="text-xs text-ink-500 text-center">{mode==="register"?"Save your favorites & follows to your account.":"Welcome back — sign in to your account."}</p>
              </div>
            )}

            {role === "business" && (
              <div className="px-7 py-7 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center"><Building2 size={26}/></div>
                <div>
                  <div className="font-black text-ink-900 dark:text-ink-100">Rental company portal</div>
                  <p className="text-sm text-ink-500 mt-1">Manage your fleet, leads, calls, reviews and analytics.</p>
                </div>
                <a href="https://partner.autotorental.com/rental" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-brand-700 transition">Continue to vendor dashboard <ArrowRight size={16}/></a>
                <p className="text-xs text-ink-500">New company? <a href="/list-your-car" className="text-brand-600 font-semibold">List your car free</a></p>
              </div>
            )}

            {role === "admin" && (
              <div className="px-7 py-7 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center"><ShieldCheck size={26}/></div>
                <div>
                  <div className="font-black text-ink-900 dark:text-ink-100">Platform administration</div>
                  <p className="text-sm text-ink-500 mt-1">Full control: vehicles, vendors, analytics, marketing and more.</p>
                </div>
                <a href="https://admin.autotorental.com/dashboard" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-ink-900 dark:bg-white dark:text-ink-900 px-5 py-3.5 text-sm font-bold text-white hover:opacity-90 transition">Continue to admin dashboard <ArrowRight size={16}/></a>
                <p className="text-xs text-ink-500">Staff access only.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
