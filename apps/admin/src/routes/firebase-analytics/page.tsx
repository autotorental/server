import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { ChartBar, ArrowUpRightOnBox } from "@medusajs/icons"

export const config: RouteConfig = { label: "Firebase Analytics", icon: ChartBar, rank: 9 }

const API = "https://api.autotorental.com"

type Data = {
  configured: boolean
  project_id?: string | null
  app_id?: string | null
  property_id?: string | null
  console_url: string
  live_metrics_available: boolean
  totals?: { active_users: number; page_views: number; sessions: number; avg_session_sec: number }
  by_country?: { country: string; users: number }[]
  by_device?: { device: string; users: number }[]
  top_pages?: { path: string; views: number }[]
  fetched_at?: string
  error?: string
}

const Page = () => {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/admin/analytics/firebase`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <SingleColumnPage><Container className="p-6"><Text>Loading…</Text></Container></SingleColumnPage>

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <Heading level="h1">🔥 Firebase Analytics</Heading>
            <Text className="text-ui-fg-subtle">Real visitor metrics from the autotorental.com Firebase project, pulled live from GA4 Data API.</Text>
          </div>
          {data?.configured && (
            <a href={data.console_url} target="_blank" rel="noopener">
              <Button><ArrowUpRightOnBox /> Open Firebase Console</Button>
            </a>
          )}
        </div>
      </Container>

      {!data?.configured && (
        <Container className="p-6">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
            <Heading level="h2">⚙️ Connect Firebase</Heading>
            <Text className="mt-2 text-ui-fg-subtle">
              Paste your Firebase project ID and GA4 property ID + service account JSON in Integrations to see live metrics here.
            </Text>
            <ol className="list-decimal pl-5 mt-4 space-y-2 text-sm text-ui-fg-base">
              <li>Create a Firebase project at <a href="https://console.firebase.google.com/" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">console.firebase.google.com</a> and add your app.</li>
              <li>In Firebase → Analytics → enable Google Analytics. Note the <strong>GA4 Property ID</strong> (12-digit number).</li>
              <li>Go to <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener" className="text-ui-fg-interactive underline">Cloud Console → IAM → Service Accounts</a>. Create a service account with role <strong>Analytics Viewer</strong>. Generate a JSON key, download it.</li>
              <li>In GA4 Admin → Property Access Management, add the service account email with <strong>Viewer</strong> role.</li>
              <li>In our admin → <a href="/dashboard/integrations" className="text-ui-fg-interactive underline">Integrations</a> → Firebase section, paste: project_id, app_id, ga4_property_id, and the full service-account JSON.</li>
            </ol>
            <div className="mt-5">
              <a href="/dashboard/integrations" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-semibold text-sm">Go to Integrations →</a>
            </div>
          </div>
        </Container>
      )}

      {data?.configured && !data.live_metrics_available && (
        <Container className="p-6">
          <div className="bg-ui-bg-subtle border border-ui-border-base rounded-xl p-6">
            <Heading level="h2">📊 Live metrics not connected</Heading>
            <Text className="text-ui-fg-subtle mt-2">Project info is set, but to show live metrics here we need <code>ga4_property_id</code> + <code>ga4_service_account_json</code> in <a href="/dashboard/integrations" className="text-ui-fg-interactive underline">Integrations</a>.</Text>
            <Text size="small" className="text-ui-fg-muted mt-4">In the meantime, use the "Open Firebase Console" button above to access the full Firebase dashboard.</Text>
          </div>
        </Container>
      )}

      {data?.error && (
        <Container className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-800">
            <strong>GA4 error:</strong> {data.error}
          </div>
        </Container>
      )}

      {data?.totals && (
        <Container className="p-6">
          <Heading level="h3" className="mb-3">Last 28 days</Heading>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Active users</div>
              <div className="text-3xl font-black mt-2 tabular-nums">{data.totals.active_users.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Page views</div>
              <div className="text-3xl font-black mt-2 tabular-nums">{data.totals.page_views.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-violet-500 to-violet-700 text-white rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Sessions</div>
              <div className="text-3xl font-black mt-2 tabular-nums">{data.totals.sessions.toLocaleString()}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-2xl p-5">
              <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Avg. session</div>
              <div className="text-3xl font-black mt-2 tabular-nums">{Math.floor(data.totals.avg_session_sec / 60)}m {data.totals.avg_session_sec % 60}s</div>
            </div>
          </div>
        </Container>
      )}

      {data?.by_country && data.by_country.length > 0 && (
        <Container className="p-6">
          <Heading level="h3" className="mb-3">🌍 Top countries</Heading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.by_country.map((c, i) => {
              const max = Math.max(...data.by_country!.map(x => x.users))
              const pct = max > 0 ? (c.users / max) * 100 : 0
              return (
                <div key={c.country} className="bg-ui-bg-base border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium">{i + 1}. {c.country || "Unknown"}</span>
                    <span className="text-sm font-bold tabular-nums">{c.users.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-ui-bg-subtle rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-brand-700" style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </Container>
      )}

      {data?.top_pages && data.top_pages.length > 0 && (
        <Container className="p-6">
          <Heading level="h3" className="mb-3">📄 Top pages</Heading>
          <div className="space-y-1.5">
            {data.top_pages.map((p, i) => (
              <div key={p.path} className="flex items-center justify-between bg-ui-bg-base border rounded-lg px-3 py-2 text-sm">
                <span className="font-mono text-xs truncate flex-1">{i + 1}. {p.path}</span>
                <span className="font-bold tabular-nums ml-2">{p.views.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Container>
      )}

      {data?.by_device && data.by_device.length > 0 && (
        <Container className="p-6">
          <Heading level="h3" className="mb-3">📱 Devices</Heading>
          <div className="flex gap-3 flex-wrap">
            {data.by_device.map(d => (
              <div key={d.device} className="bg-ui-bg-base border rounded-xl p-4 min-w-[140px]">
                <div className="text-xs uppercase text-ui-fg-muted font-bold">{d.device}</div>
                <div className="text-2xl font-black mt-1 tabular-nums">{d.users.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </Container>
      )}

      {data?.fetched_at && (
        <Container className="p-6">
          <Text size="small" className="text-ui-fg-muted">Last refreshed {new Date(data.fetched_at).toLocaleString()}</Text>
        </Container>
      )}
    </SingleColumnPage>
  )
}
export default Page
