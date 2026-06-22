import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Input, Select, Switch, Button, IconButton, Badge, toast } from "@medusajs/ui"
import { Bolt, Trash, Plus } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Cloudflare DNS", "Cloudflare DNS"), icon: Bolt, rank: 19 }
const TYPES = ["A", "AAAA", "CNAME", "TXT", "MX", "NS"]

export default function Page() {
  const [recs, setRecs] = useState<any[]>([]); const [noToken, setNoToken] = useState(false); const [loading, setLoading] = useState(true)
  const [type, setType] = useState("A"); const [name, setName] = useState(""); const [content, setContent] = useState(""); const [proxied, setProxied] = useState(true); const [busy, setBusy] = useState(false)
  const load = async () => { setLoading(true); try { const d = await fetch(`${API}/admin/cloudflare/dns`, { credentials: "include" }).then(r => r.json()); if (d.no_token) setNoToken(true); else if (d.ok) { setRecs(d.records || []); setNoToken(false) } } catch {} setLoading(false) }
  useEffect(() => { load() }, [])
  const add = async () => { if (!name.trim() || !content.trim()) return; setBusy(true); try { const d = await fetch(`${API}/admin/cloudflare/dns`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, name, content, proxied, ttl: 1 }) }).then(r => r.json()); if (d.ok) { setName(""); setContent(""); toast.success("Record added ✓"); load() } else toast.error(d.message || "Failed") } catch { toast.error("Failed") } setBusy(false) }
  const toggleProxy = async (r: any) => { try { const d = await fetch(`${API}/admin/cloudflare/dns/${r.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ proxied: !r.proxied }) }).then(x => x.json()); d.ok ? load() : toast.error(d.message || "Failed") } catch { toast.error("Failed") } }
  const del = async (r: any) => { if (!window.confirm(`Delete ${r.type} ${r.name}?`)) return; try { const d = await fetch(`${API}/admin/cloudflare/dns/${r.id}`, { method: "DELETE", credentials: "include" }).then(x => x.json()); d.ok ? (toast.success("Deleted"), load()) : toast.error(d.message || "Failed") } catch { toast.error("Failed") } }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3 mb-1"><div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#f6821f,#fbad41)" }}><Bolt className="text-white" /></div><div><Heading level="h1" className="text-xl">Cloudflare — DNS</Heading><Text className="text-ui-fg-subtle text-sm">Manage real DNS records for autotorental.com.</Text></div></div>
        {loading && <div className="text-ui-fg-muted p-8 text-center">Loading…</div>}
        {noToken && <div className="mt-5 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5 text-sm text-ui-fg-subtle">🔌 Add your Cloudflare API token in <b>Settings → Integrations → Cloudflare</b> (needs DNS:Edit), then refresh.</div>}
        {!loading && !noToken && (<>
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 mt-4 flex gap-2 flex-wrap items-center">
            <Select value={type} onValueChange={setType}><Select.Trigger className="w-[90px]"><Select.Value /></Select.Trigger><Select.Content>{TYPES.map(t => <Select.Item key={t} value={t}>{t}</Select.Item>)}</Select.Content></Select>
            <Input placeholder="Name (e.g. www or @)" value={name} onChange={e => setName(e.target.value)} style={{ width: 180 }} />
            <Input placeholder="Content (IP / target)" value={content} onChange={e => setContent(e.target.value)} className="flex-1" style={{ minWidth: 200 }} />
            <span className="flex items-center gap-2 text-sm text-ui-fg-subtle">Proxy <Switch checked={proxied} onCheckedChange={setProxied} /></span>
            <Button variant="primary" isLoading={busy} onClick={add}><Plus /> Add</Button>
          </div>
          <div className="flex flex-col gap-2 mt-4">
            {recs.length === 0 && <div className="text-ui-fg-muted text-center p-6">No DNS records.</div>}
            {recs.map(r => (<div key={r.id} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-3 flex items-center gap-3">
              <Badge size="2xsmall" color="blue">{r.type}</Badge>
              <div className="min-w-0 flex-1"><div className="font-medium text-ui-fg-base truncate">{r.name}</div><div className="text-xs text-ui-fg-muted font-mono truncate">{r.content}</div></div>
              {r.proxiable && <span className="flex items-center gap-1.5 text-xs text-ui-fg-subtle">{r.proxied ? "🟧 Proxied" : "DNS only"}<Switch checked={r.proxied} onCheckedChange={() => toggleProxy(r)} /></span>}
              <IconButton variant="transparent" onClick={() => del(r)} title="Delete"><Trash /></IconButton>
            </div>))}
          </div>
        </>)}
      </Container>
    </SingleColumnPage>
  )
}
