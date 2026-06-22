import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Switch, Badge, Select, toast } from "@medusajs/ui"
import { ShieldCheck } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Cloudflare Security", "حماية Cloudflare"), icon: ShieldCheck, rank: 19 }

const META: Record<string, { label: string; desc: string; enum?: string[] }> = {
  security_level: { label: "Security Level", desc: "How aggressively to challenge suspicious visitors.", enum: ["essentially_off", "low", "medium", "high", "under_attack"] },
  ssl: { label: "SSL/TLS mode", desc: "Encryption between visitors, Cloudflare and your server.", enum: ["off", "flexible", "full", "strict"] },
  always_use_https: { label: "Always Use HTTPS", desc: "Redirect every HTTP request to HTTPS." },
  min_tls_version: { label: "Minimum TLS Version", desc: "Reject connections below this version.", enum: ["1.0", "1.1", "1.2", "1.3"] },
  automatic_https_rewrites: { label: "Automatic HTTPS Rewrites", desc: "Rewrite http:// links to https:// where safe." },
  browser_check: { label: "Browser Integrity Check", desc: "Block requests with suspicious headers." },
  email_obfuscation: { label: "Email Obfuscation", desc: "Hide email addresses from scrapers." },
  hotlink_protection: { label: "Hotlink Protection", desc: "Stop other sites embedding your images." },
  opportunistic_encryption: { label: "Opportunistic Encryption", desc: "Encrypt eligible HTTP/2 connections." },
}
const ORDER = ["security_level", "ssl", "always_use_https", "min_tls_version", "automatic_https_rewrites", "browser_check", "email_obfuscation", "hotlink_protection", "opportunistic_encryption"]

export default function Page() {
  const [st, setSt] = useState<Record<string, any> | null>(null)
  const [noToken, setNoToken] = useState(false); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState("")
  const load = async () => { setLoading(true); try { const d = await fetch(`${API}/admin/cloudflare`, { credentials: "include" }).then(r => r.json()); if (d.no_token) setNoToken(true); else if (d.ok) { setSt(d.settings || {}); setNoToken(false) } } catch {} setLoading(false) }
  useEffect(() => { load() }, [])
  const upd = async (id: string, value: any) => { setBusy(id); setSt(s => ({ ...(s || {}), [id]: { ...(s?.[id] || {}), value } })); try { const d = await fetch(`${API}/admin/cloudflare`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, value }) }).then(r => r.json()); d.ok ? toast.success("Updated ✓") : (toast.error(d.message || "Failed"), load()) } catch { toast.error("Failed"); load() } setBusy("") }
  const ua = st?.security_level?.value === "under_attack"

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#f6821f,#fbad41)" }}><ShieldCheck className="text-white" /></div>
          <div><Heading level="h1" className="text-xl">Cloudflare — Security &amp; SSL</Heading><Text className="text-ui-fg-subtle text-sm">Real protection settings for autotorental.com.</Text></div>
        </div>
        {loading && <div className="text-ui-fg-muted p-8 text-center">Loading…</div>}
        {noToken && <div className="mt-5 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5 text-sm text-ui-fg-subtle">🔌 Add your Cloudflare API token in <b>Settings → Integrations → Cloudflare</b>, then refresh.</div>}
        {!loading && !noToken && st && (<>
          <div className="mt-5 rounded-xl p-4 flex items-center gap-4" style={{ background: ua ? "rgba(220,38,38,.10)" : "var(--bg-subtle)", border: `1px solid ${ua ? "rgba(220,38,38,.35)" : "var(--border-base)"}` }}>
            <div className="flex-1"><div className="font-semibold text-ui-fg-base flex items-center gap-2">🛡️ Under Attack Mode {ua && <Badge size="2xsmall" color="red">ON</Badge>}</div><div className="text-xs text-ui-fg-subtle mt-0.5">Shows every visitor a 5-second challenge. Turn on only during an active attack.</div></div>
            <Switch checked={ua} disabled={busy === "security_level"} onCheckedChange={c => upd("security_level", c ? "under_attack" : "medium")} />
          </div>
          <div className="flex flex-col gap-2 mt-3">
            {ORDER.filter(id => st[id]).map(id => { const m = META[id]; const s = st[id]; const ed = s.editable !== false
              return (<div key={id} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0"><div className="font-medium text-ui-fg-base">{m.label}</div><div className="text-xs text-ui-fg-subtle mt-0.5">{m.desc}</div></div>
                {m.enum ? <Select value={String(s.value)} disabled={!ed || busy === id} onValueChange={v => upd(id, v)}><Select.Trigger className="w-[160px]"><Select.Value /></Select.Trigger><Select.Content>{m.enum.map(o => <Select.Item key={o} value={o}>{o}</Select.Item>)}</Select.Content></Select>
                 : <Switch checked={s.value === "on"} disabled={!ed || busy === id} onCheckedChange={c => upd(id, c ? "on" : "off")} />}
              </div>) })}
          </div>
        </>)}
      </Container>
    </SingleColumnPage>
  )
}
