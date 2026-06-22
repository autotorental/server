import { useEffect, useRef, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { BellAlert } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Call Waiting Audio", "صوت انتظار المكالمة"), icon: BellAlert, rank: 35 }

const Page = () => {
  const [info, setInfo] = useState<any>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => { try { const r = await fetch(`${API}/admin/call-audio`, { credentials: "include" }); setInfo(await r.json()) } catch {} }
  useEffect(() => { load() }, [])

  const onFile = async (e: any) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 10 * 1024 * 1024) { toast.error(tt("Max 10 MB", "الحد 10 ميجا")); return }
    setBusy(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const r = await fetch(`${API}/admin/call-audio`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content_base64: String(reader.result) }) })
        const d = await r.json()
        if (r.ok) { toast.success(tt("Updated — callers hear it on the next call ✓", "تم التحديث — العملاء يسمعونه في المكالمة القادمة ✓")); load() }
        else toast.error(d.message || "Upload failed")
      } catch (e: any) { toast.error(e?.message || "error") } finally { setBusy(false); if (fileRef.current) fileRef.current.value = "" }
    }
    reader.readAsDataURL(f)
  }

  const kb = info?.size ? Math.round(info.size / 1024) : 0
  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-ui-bg-subtle"><BellAlert className="text-ui-fg-interactive" /></div>
          <Heading level="h1">🔊 {tt("Call Waiting Audio", "صوت انتظار المكالمة")}</Heading>
        </div>
        <Text size="small" className="text-ui-fg-subtle mb-5">{tt("The voice/music callers hear while waiting for the rental company to answer a free call. Change it anytime here — no app update needed.", "الصوت اللي يسمعه العميل أثناء انتظار رد شركة التأجير في المكالمة المجانية. غيّره من هنا أي وقت — بدون تحديث التطبيق.")}</Text>

        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between"><Text weight="plus">{tt("Current audio", "الصوت الحالي")}</Text>{info?.exists ? <Badge color="green">{tt("Active", "مفعّل")} · {kb} KB</Badge> : <Badge color="orange">{tt("Not set", "غير مضبوط")}</Badge>}</div>
          {info?.url ? <audio controls src={info.url} style={{ width: "100%" }} /> : <Text size="small" className="text-ui-fg-muted">{tt("Loading…", "جارٍ التحميل…")}</Text>}
          {info?.updated_at ? <Text size="xsmall" className="text-ui-fg-muted">{tt("Updated", "آخر تحديث")}: {new Date(info.updated_at).toLocaleString()}</Text> : null}
        </div>

        <div className="mt-4">
          <input ref={fileRef} type="file" accept="audio/*" onChange={onFile} style={{ display: "none" }} />
          <Button variant="primary" isLoading={busy} onClick={() => fileRef.current?.click()}>⬆ {tt("Upload new audio", "رفع صوت جديد")}</Button>
          <Text size="xsmall" className="text-ui-fg-muted mt-2">{tt("MP3 / M4A / WAV — up to 10 MB. Keep it short (15–30s); it loops while the phone rings.", "MP3 / M4A / WAV — حتى 10 ميجا. خلّيه قصير (15–30 ثانية)؛ يتكرّر أثناء الرنين.")}</Text>
        </div>
      </Container>
    </SingleColumnPage>
  )
}
export default Page
