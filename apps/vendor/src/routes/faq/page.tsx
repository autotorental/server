import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Textarea, Label } from "@medusajs/ui"
import { DocumentText, Plus, Trash } from "@medusajs/icons"
import { API } from "../../lib/api"

// Vendor-managed FAQ. Saves to the seller via POST /vendor/profile (faqs jsonb),
// so the Q&A render on the public storefront company page (with FAQPage schema).
// Mirrors the mobile app's FAQ editor for full mobile/web parity.
export const config: RouteConfig = { label: "FAQ", icon: DocumentText, nested: "/settings" }

type Faq = { question: string; answer: string }

const Page = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [faqs, setFaqs] = useState<Faq[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const p = await fetch(`${API}/vendor/profile`, { credentials: "include" }).then((r) => (r.ok ? r.json() : null))
      let raw: any = p?.seller?.faqs
      if (typeof raw === "string") { try { raw = JSON.parse(raw) } catch { raw = [] } }
      setFaqs(
        Array.isArray(raw)
          ? raw.map((f: any) => ({ question: String(f?.question || ""), answer: String(f?.answer || "") }))
          : []
      )
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const update = (i: number, key: keyof Faq, v: string) =>
    setFaqs((arr) => arr.map((f, idx) => (idx === i ? { ...f, [key]: v } : f)))
  const remove = (i: number) => setFaqs((arr) => arr.filter((_, idx) => idx !== i))
  const add = () => setFaqs((arr) => (arr.length >= 20 ? arr : [...arr, { question: "", answer: "" }]))

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      const clean = faqs
        .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
        .filter((f) => f.question && f.answer)
        .slice(0, 20)
      const res = await fetch(`${API}/vendor/profile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faqs: clean }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.message || "Save failed")
      setMsg({ type: "ok", text: "Saved — your FAQ is now live on your public company page." })
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Save failed" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SingleColumnPage><Container className="p-6"><Text>Loading…</Text></Container></SingleColumnPage>

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">❓ FAQ</Heading>
        <Text className="text-ui-fg-subtle">
          Add questions &amp; answers shown on your public company page. Great for SEO — Google can show them directly in search results.
        </Text>
      </Container>

      <Container className="p-6">
        <div className="flex flex-col gap-4">
          {faqs.length === 0 && (
            <Text size="small" className="text-ui-fg-muted">No FAQ yet. Add your first question below.</Text>
          )}
          {faqs.map((f, i) => (
            <div key={i} className="rounded-lg border border-ui-border-base p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label size="small" className="text-ui-fg-subtle">Question {i + 1}</Label>
                <Button variant="transparent" size="small" onClick={() => remove(i)}>
                  <Trash className="text-ui-fg-error" />
                </Button>
              </div>
              <Input
                value={f.question}
                onChange={(e) => update(i, "question", e.target.value)}
                placeholder="Question (e.g. Do you offer delivery to the airport?)"
              />
              <Textarea
                value={f.answer}
                onChange={(e) => update(i, "answer", e.target.value)}
                placeholder="Answer"
                rows={3}
              />
            </div>
          ))}
          <Button variant="secondary" onClick={add} disabled={faqs.length >= 20}>
            <Plus /> Add question
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
          {msg
            ? <Text size="small" className={msg.type === "ok" ? "text-ui-fg-interactive" : "text-ui-fg-error"}>{msg.text}</Text>
            : <span />}
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export default Page
