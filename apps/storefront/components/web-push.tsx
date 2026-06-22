"use client"
import { useEffect, useState } from "react"

const CFG = {
  apiKey: "AIzaSyAtJbz9F1FIAp1Q03_Sg8-1Q2FLU_Sgw-Y",
  authDomain: "auto-to-rental.firebaseapp.com",
  projectId: "auto-to-rental",
  storageBucket: "auto-to-rental.firebasestorage.app",
  messagingSenderId: "92546169504",
  appId: "1:92546169504:web:d4777694f582d34308a7c5",
}
const VAPID = "BOLT-YB_r9P1KbGHo5iPcMCjGCw5z1Zju3S8_4a9L7CEXUovJBuDWHmUktKF4KfNkde-0RqSP3KV71D3sPKCcGl"
const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PKEY = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement("script"); s.src = src
    s.onload = () => resolve(); s.onerror = () => reject(new Error("load"))
    document.head.appendChild(s)
  })
}

export default function WebPush() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [ar, setAr] = useState(true)

  useEffect(() => {
    try {
      setAr((document.documentElement.lang || "ar").startsWith("ar"))
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !window.isSecureContext) return
      if (Notification.permission === "granted") { register(true); return }
      const dismissed = localStorage.getItem("atr_push_dismissed_v2")
      if (Notification.permission === "default" && !dismissed) {
        const t = setTimeout(() => setShow(true), 6000); return () => clearTimeout(t)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function register(silent: boolean) {
    if (!silent) setShow(false) // hide on click; only mark "done" on real success below
    const report = (msg: string) => { try { fetch(`${API}/store/push-token`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", "x-publishable-api-key": PKEY }, body: JSON.stringify({ error: msg.slice(0, 200) }) }).catch(() => {}) } catch {} }
    try {
      setBusy(true)
      await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js")
      await loadScript("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js")
      const fb = (window as any).firebase
      if (!fb?.apps?.length) fb.initializeApp(CFG)
      if (!silent) {
        const perm = await Notification.requestPermission()
        if (perm !== "granted") { report("permission:" + perm); return }
      }
      const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js")
      await navigator.serviceWorker.ready
      const token = await fb.messaging().getToken({ vapidKey: VAPID, serviceWorkerRegistration: reg })
      if (token) {
        await fetch(`${API}/store/push-token`, { method: "POST", headers: { "Content-Type": "application/json", "x-publishable-api-key": PKEY }, body: JSON.stringify({ token, platform: "web" }) }).catch(() => {})
        try { localStorage.setItem("atr_push_dismissed_v2", "1") } catch {}
      } else {
        report("getToken returned empty")
      }
    } catch (e: any) {
      report("getToken threw: " + String((e && e.message) || e))
    } finally { setBusy(false) }
  }

  if (!show) return null
  return (
    <div style={{ position: "fixed", bottom: 16, left: 16, zIndex: 9998, background: "#fff", color: "#111827", border: "1px solid #e5e7eb", borderRadius: 14, boxShadow: "0 10px 35px rgba(0,0,0,.15)", padding: "12px 14px", maxWidth: 320, display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ fontSize: 22 }}>🔔</span>
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{ar ? "فعّل الإشعارات لأحدث العروض والسيارات الجديدة" : "Get notified about new cars & best deals"}</div>
      <button onClick={() => register(false)} disabled={busy} style={{ background: "#1753b0", color: "#fff", border: 0, borderRadius: 8, padding: "7px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{busy ? "..." : (ar ? "تفعيل" : "Enable")}</button>
      <button aria-label="close" onClick={() => { try { localStorage.setItem("atr_push_dismissed_v2", "1") } catch {}; setShow(false) }} style={{ background: "transparent", border: 0, color: "#9ca3af", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  )
}
