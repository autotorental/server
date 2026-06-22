import { useCallback, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Badge } from "@medusajs/ui"
import { Key } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Vendor Email", "بريد التجّار"), icon: Key, rank: 41 }

type Result = { email?: string; password?: string; message?: string; error?: string }

const VendorEmailPage = () => {
  const [mailboxName, setMailboxName] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const create = useCallback(async () => {
    if (!mailboxName.trim()) return
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/email/create-vendor-mailbox`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mailbox_name: mailboxName.trim().toLowerCase() }),
      })
      const d = await r.json()
      setResult(d)
      if (d.email) setMailboxName("")
    } catch (e: any) {
      setResult({ error: e?.message || "Failed" })
    } finally {
      setLoading(false)
    }
  }, [mailboxName])

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: "#10b98116", color: "#10b981" }}>
            <Key />
          </div>
          <div>
            <Heading level="h1">Vendor Email Setup</Heading>
            <Text size="small" className="text-ui-fg-subtle">Create professional email accounts for vendors (vendor@autotorental.com)</Text>
          </div>
        </div>
      </Container>

      <Container className="p-6 max-w-2xl">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-6">
          <Text className="text-sm font-semibold mb-2">Create New Mailbox</Text>
          <Text size="small" className="text-ui-fg-muted mb-4">Enter a name (alphanumeric). Full email: <strong>name@autotorental.com</strong></Text>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="e.g. vendor1, sales-team"
              value={mailboxName}
              onChange={(e) => setMailboxName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              disabled={loading}
            />
            <Button onClick={create} disabled={loading || !mailboxName.trim()}>
              {loading ? "Creating…" : "Create"}
            </Button>
          </div>

          {result?.error && (
            <div className="bg-ui-tag-red-bg border border-ui-tag-red-border rounded-lg p-4 text-ui-fg-error text-sm mb-4">
              ❌ {result.error}
            </div>
          )}

          {result?.email && (
            <div className="bg-ui-tag-green-bg border border-ui-tag-green-border rounded-lg p-4 space-y-2">
              <div className="text-ui-tag-green-text font-semibold">✅ Mailbox created!</div>
              <div className="bg-ui-bg-base p-3 rounded text-xs font-mono text-ui-fg-base">
                <div className="mb-1"><strong>Email:</strong> {result.email}</div>
                <div><strong>Password:</strong> {result.password}</div>
              </div>
              <div className="text-xs text-ui-fg-muted">Share with vendor → they add in Mail Settings</div>
            </div>
          )}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default VendorEmailPage
