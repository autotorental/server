import { useEffect, useState } from "react"
import { Heading, Text, Badge } from "@medusajs/ui"
import { API } from "../lib/api"

type Overview = {
  days: number; total_views: number; visitors: number
  series: { date: string; views: number }[]
  by_country: { country: string; views: number }[]
  by_device: { device: string; views: number }[]
  top_pages: { path: string; views: number }[]
}
const flag = (cc?: string) => {
  const c = (cc || "").toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return "🌐"
  return String.fromCodePoint(...[...c].map((x) => 0x1f1e6 + x.charCodeAt(0) - 65))
}

export function WebsiteTraffic() {
  const [d, setD] = useState<Overview | null>(null)
  const [days, setDays] = useState(30)
  useEffect(() => {
    fetch(`${API}/admin/analytics/pageview-overview?days=${days}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null)).then(setD).catch(() => {})
  }, [days])

  const maxDay = Math.max(1, ...(d?.series || []).map((x) => x.views))
  const maxPage = Math.max(1, ...(d?.top_pages || []).map((x) => x.views))

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden">
      <div className="px-5 py-4 border-b border-ui-border-base flex items-center justify-between flex-wrap gap-2">
        <Heading level="h2" className="text-base font-semibold">🌍 Website Traffic <span className="text-ui-fg-subtle font-normal">· real visits</span></Heading>
        <div className="flex rounded-lg border border-ui-border-base overflow-hidden text-sm">
          {[7, 30, 90].map((n) => (
            <button key={n} onClick={() => setDays(n)} className={`px-3 py-1.5 ${days === n ? "bg-ui-bg-base-hover font-semibold" : "text-ui-fg-subtle"}`}>{n}d</button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {!d ? <Text className="text-ui-fg-muted">Loading real traffic…</Text> : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              <div className="rounded-xl border border-ui-border-base p-4"><div className="text-[11px] uppercase tracking-wider text-ui-fg-muted">Page views</div><div className="text-3xl font-bold tabular-nums mt-1">{d.total_views.toLocaleString()}</div></div>
              <div className="rounded-xl border border-ui-border-base p-4"><div className="text-[11px] uppercase tracking-wider text-ui-fg-muted">Visitors</div><div className="text-3xl font-bold tabular-nums mt-1">{d.visitors.toLocaleString()}</div></div>
              <div className="rounded-xl border border-ui-border-base p-4"><div className="text-[11px] uppercase tracking-wider text-ui-fg-muted">Countries</div><div className="text-3xl font-bold tabular-nums mt-1">{d.by_country.length}</div></div>
              <div className="rounded-xl border border-ui-border-base p-4"><div className="text-[11px] uppercase tracking-wider text-ui-fg-muted">Views/visitor</div><div className="text-3xl font-bold tabular-nums mt-1">{d.visitors ? (d.total_views / d.visitors).toFixed(1) : "0"}</div></div>
            </div>

            {d.series.length > 0 && (
              <div className="mb-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted mb-2">Views over {days} days</div>
                <div className="flex items-end gap-0.5 h-24">
                  {d.series.map((s, i) => (
                    <div key={i} title={`${s.date} · ${s.views}`} className="flex-1 rounded-t bg-ui-fg-interactive transition-all" style={{ height: `${Math.max(4, (s.views / maxDay) * 100)}%`, opacity: 0.4 + 0.6 * (s.views / maxDay) }} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted mb-2">Top countries</div>
                <div className="flex flex-wrap gap-2">
                  {d.by_country.map((c, i) => <Badge key={i} color="grey">{flag(c.country)} {c.country || "??"} · {c.views}</Badge>)}
                  {d.by_device.map((x, i) => <Badge key={`d${i}`} color="blue">{x.device} · {x.views}</Badge>)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ui-fg-muted mb-2">Top pages</div>
                <div className="space-y-2">
                  {d.top_pages.map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between gap-2 mb-0.5"><span className="truncate font-mono text-xs">{p.path}</span><span className="text-sm font-semibold tabular-nums">{p.views}</span></div>
                      <div className="h-1.5 rounded-full bg-ui-bg-subtle overflow-hidden"><div className="h-full rounded-full bg-ui-fg-interactive" style={{ width: `${(p.views / maxPage) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
