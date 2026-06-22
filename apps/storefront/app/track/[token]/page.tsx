"use client"
import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import { MapPin, Shield, CheckCircle2, Loader2, AlertCircle } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK  = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""
const H   = { "Content-Type": "application/json", "x-publishable-api-key": PK }

export default function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("")
  const [session, setSession] = useState<any>(null)
  const [step, setStep] = useState<"loading"|"otp"|"tracking"|"error">("loading")
  const [otp, setOtp] = useState("")
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  const [coords, setCoords] = useState<{lat:number;lng:number;acc:number}|null>(null)
  const watchRef = useRef<number|null>(null)

  useEffect(() => {
    params.then(p => {
      setToken(p.token)
      fetch(`${API}/store/rental-tracking/${p.token}`, { headers: H })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d?.session) { setStep("error"); setMsg("Tracking session not found or expired."); return }
          setSession(d.session)
          setStep(d.session.otp_verified ? "tracking" : "otp")
          if (d.session.otp_verified) startTracking(p.token)
        })
        .catch(() => { setStep("error"); setMsg("Could not connect. Please try again.") })
    })
  }, [])

  const verifyOTP = async () => {
    if (otp.length < 6) { setMsg("Enter the 6-digit code."); return }
    setBusy(true); setMsg("")
    const r = await fetch(`${API}/store/rental-tracking/${token}`, { method: "POST", headers: H, body: JSON.stringify({ otp }) })
    const d = await r.json()
    if (r.ok) { setStep("tracking"); startTracking(token) }
    else setMsg(d.message || "Invalid code")
    setBusy(false)
  }

  const startTracking = (tok: string) => {
    if (!navigator.geolocation) { setMsg("Your browser doesn't support GPS."); return }
    watchRef.current = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords
        setCoords({ lat, lng, acc })
        fetch(`${API}/store/rental-tracking/${tok}`, {
          method: "PUT", headers: H,
          body: JSON.stringify({ lat, lng, accuracy: Math.round(acc) })
        }).catch(() => {})
      },
      err => setMsg("GPS error: " + err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    )
  }

  useEffect(() => () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current) }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-ink-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-ink-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
        {/* Logo */}
        <img src="/logo.png" alt="Auto to Rental" className="h-8 w-auto mx-auto mb-6"/>

        {step === "loading" && <><Loader2 size={40} className="mx-auto text-brand-600 animate-spin mb-4"/><p className="text-ink-600">Loading…</p></>}

        {step === "error" && <>
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4"/>
          <h1 className="text-xl font-black text-ink-900 mb-2">Session Not Found</h1>
          <p className="text-ink-600 text-sm">{msg}</p>
        </>}

        {step === "otp" && session && <>
          <Shield size={48} className="mx-auto text-brand-600 mb-4"/>
          <h1 className="text-2xl font-black text-ink-900 mb-1">Verify Your Identity</h1>
          <p className="text-ink-500 text-sm mb-2">
            <strong>{session.seller_name}</strong> wants to track your location during the rental for your safety.
          </p>
          <p className="text-ink-600 text-sm mb-6">Enter the 6-digit code sent to your WhatsApp/SMS.</p>
          <input
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
            className="w-full text-center text-3xl font-black tracking-[0.5em] border-2 border-ink-200 rounded-xl px-4 py-4 mb-4 focus:border-brand-500 outline-none"
            placeholder="000000" maxLength={6} inputMode="numeric"
          />
          {msg && <p className="text-red-600 text-sm mb-3">{msg}</p>}
          <button onClick={verifyOTP} disabled={busy || otp.length<6}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-lg transition">
            {busy ? "Verifying…" : "Verify & Enable Tracking"}
          </button>
          <p className="text-xs text-ink-400 mt-4">
            <MapPin size={12} className="inline mr-1"/>Your GPS location will be shared with the rental company only during your rental period.
          </p>
        </>}

        {step === "tracking" && <>
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 size={36} className="text-green-600"/>
          </div>
          <h1 className="text-2xl font-black text-ink-900 mb-2">Location Active ✅</h1>
          <p className="text-ink-600 text-sm mb-4">Your location is being shared with <strong>{session?.seller_name}</strong>.</p>
          {coords && <div className="bg-ink-50 rounded-xl p-4 text-left text-xs text-ink-600 mb-4">
            <div>📍 Lat: {coords.lat.toFixed(6)}</div>
            <div>📍 Lng: {coords.lng.toFixed(6)}</div>
            <div>🎯 Accuracy: ±{Math.round(coords.acc)}m</div>
          </div>}
          <div className="flex items-center gap-2 justify-center text-green-600 text-sm font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>Live · updating every 15s
          </div>
          <p className="text-xs text-ink-400 mt-4">Keep this page open to continue sharing location. Close when rental ends.</p>
        </>}
      </div>
    </main>
  )
}
