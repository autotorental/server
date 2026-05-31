import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Label, Textarea, Input, Button } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: "Legal Pages", icon: DocumentText, rank: 7 }

type PageData = { content: string; updated_at: string }

const today = () => new Date().toISOString().slice(0, 10)

export default function LegalPagesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<null | "terms" | "privacy" | "cookies">(null)
  const [terms, setTerms] = useState<PageData>({ content: "", updated_at: today() })
  const [privacy, setPrivacy] = useState<PageData>({ content: "", updated_at: today() })
  const [cookies, setCookies] = useState<PageData>({ content: "", updated_at: today() })

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch(`${API}/admin/legal-pages`, { credentials: "include" })
      const d = await r.json()
      setTerms({
        content: d?.pages?.terms?.content || "",
        updated_at: d?.pages?.terms?.updated_at?.slice?.(0, 10) || today(),
      })
      setPrivacy({
        content: d?.pages?.privacy?.content || "",
        updated_at: d?.pages?.privacy?.updated_at?.slice?.(0, 10) || today(),
      })
      setCookies({
        content: d?.pages?.cookies?.content || "",
        updated_at: d?.pages?.cookies?.updated_at?.slice?.(0, 10) || today(),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const save = async (slug: "terms" | "privacy" | "cookies", data: PageData) => {
    setSaving(slug)
    try {
      await fetch(`${API}/admin/legal-pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content: data.content, updated_at: data.updated_at }),
      })
      await load()
      alert(`${slug === "terms" ? "Terms" : slug === "privacy" ? "Privacy" : "Cookies"} saved`)
    } finally {
      setSaving(null)
    }
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">Legal Pages</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          Edit website legal pages shown at <strong>/terms</strong>, <strong>/privacy</strong>, and <strong>/cookies</strong>.
          HTML is supported.
        </Text>
      </Container>

      {loading ? (
        <Container className="p-6">Loading…</Container>
      ) : (
        <>
          <Container className="p-6 space-y-4">
            <Heading level="h2">Terms of Service (/terms)</Heading>
            <div>
              <Label size="small">Last updated date</Label>
              <Input
                type="date"
                value={terms.updated_at}
                onChange={(e) => setTerms((x) => ({ ...x, updated_at: e.target.value }))}
              />
            </div>
            <div>
              <Label size="small">HTML content</Label>
              <Textarea
                rows={18}
                value={terms.content}
                onChange={(e) => setTerms((x) => ({ ...x, content: e.target.value }))}
                placeholder="<h2>1. ...</h2><p>...</p>"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => save("terms", terms)}
                isLoading={saving === "terms"}
                disabled={saving !== null}
              >
                Save Terms
              </Button>
            </div>
          </Container>

          <Container className="p-6 space-y-4">
            <Heading level="h2">Privacy Policy (/privacy)</Heading>
            <div>
              <Label size="small">Last updated date</Label>
              <Input
                type="date"
                value={privacy.updated_at}
                onChange={(e) => setPrivacy((x) => ({ ...x, updated_at: e.target.value }))}
              />
            </div>
            <div>
              <Label size="small">HTML content</Label>
              <Textarea
                rows={18}
                value={privacy.content}
                onChange={(e) => setPrivacy((x) => ({ ...x, content: e.target.value }))}
                placeholder="<h2>1. ...</h2><p>...</p>"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => save("privacy", privacy)}
                isLoading={saving === "privacy"}
                disabled={saving !== null}
              >
                Save Privacy
              </Button>
            </div>
          </Container>

          <Container className="p-6 space-y-4">
            <Heading level="h2">Cookie Policy (/cookies)</Heading>
            <div>
              <Label size="small">Last updated date</Label>
              <Input
                type="date"
                value={cookies.updated_at}
                onChange={(e) => setCookies((x) => ({ ...x, updated_at: e.target.value }))}
              />
            </div>
            <div>
              <Label size="small">HTML content</Label>
              <Textarea
                rows={18}
                value={cookies.content}
                onChange={(e) => setCookies((x) => ({ ...x, content: e.target.value }))}
                placeholder="<h2>What are cookies?</h2><p>...</p>"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => save("cookies", cookies)}
                isLoading={saving === "cookies"}
                disabled={saving !== null}
              >
                Save Cookies
              </Button>
            </div>
          </Container>
        </>
      )}
    </SingleColumnPage>
  )
}
