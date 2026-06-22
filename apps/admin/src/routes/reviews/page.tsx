import { useEffect, useMemo, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Textarea, Select, Badge, IconButton } from "@medusajs/ui"
import { Star, StarSolid, Trash } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("Reviews", "التقييمات"), icon: Star, rank: 34 }

type MReview = { id: string; name: string; rating: number; text: string; created_at: string }
type Company = { id: string; name: string; handle?: string; photo?: string; metadata?: any }

const Stars = ({ value, onChange }: { value: number; onChange?: (n: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        disabled={!onChange}
        onClick={() => onChange?.(n)}
        className={onChange ? "cursor-pointer" : "cursor-default"}
        aria-label={`${n} stars`}
      >
        {n <= value
          ? <StarSolid className="text-ui-tag-orange-icon" />
          : <Star className="text-ui-fg-muted" />}
      </button>
    ))}
  </div>
)

const Page = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [sellerId, setSellerId] = useState<string>("")
  const [companySearch, setCompanySearch] = useState("")
  const [reviews, setReviews] = useState<MReview[]>([])
  const [name, setName] = useState("")
  const [rating, setRating] = useState(5)
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)

  const loadCompanies = () => {
    setLoading(true)
    fetch(`${API}/admin/sellers?limit=200`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list: Company[] = d.sellers || []
        setCompanies(list)
        if (list.length && !sellerId) setSellerId(list[0].id)
      })
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false))
  }
  useEffect(loadCompanies, [])

  const selected = useMemo(() => companies.find((c) => c.id === sellerId), [companies, sellerId])
  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase()
    if (!q) return companies
    return companies.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.handle || "").toLowerCase().includes(q))
  }, [companies, companySearch])

  useEffect(() => {
    const list = selected?.metadata?.manual_reviews
    setReviews(Array.isArray(list) ? list : [])
  }, [selected])

  const add = async () => {
    if (!name.trim() || !rating || !sellerId) return
    setSaving(true)
    try {
      const r = await fetch(`${API}/admin/sellers/${sellerId}/manual-reviews`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rating, text: text.trim() }),
      })
      const d = await r.json()
      if (r.ok) {
        setReviews(d.manual_reviews || [])
        setName(""); setText(""); setRating(5)
      } else {
        alert(d.message || "Failed to add review")
      }
    } finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return
    const r = await fetch(`${API}/admin/sellers/${sellerId}/manual-reviews?review_id=${encodeURIComponent(id)}`, {
      method: "DELETE", credentials: "include",
    })
    const d = await r.json()
    if (r.ok) setReviews(d.manual_reviews || [])
  }

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0

  return (
    <SingleColumnPage>
      {/* Header */}
      <Container className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <div
            className="flex items-center justify-center rounded-xl text-white shrink-0 shadow-elevation-card-rest"
            style={{ width: 48, height: 48, backgroundImage: "linear-gradient(135deg,#f59e0b,#f97316)" }}
          >
            <StarSolid />
          </div>
          <div>
            <Heading level="h1" className="text-2xl font-semibold tracking-tight">Reviews</Heading>
            <Text className="text-ui-fg-subtle mt-1 max-w-2xl">
              Public reviews are disabled to block spam. The reviews shown on the website are curated here by your team.
            </Text>
          </div>
        </div>
      </Container>

      {/* Company + add review */}
      <Container className="p-6 pt-0">
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5 shadow-elevation-card-rest">
          <Label size="small" className="text-ui-fg-muted font-medium">Company</Label>
          <div className="mt-1.5 max-w-md flex flex-col gap-2">
            <Input value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder={`Search ${companies.length} companies…`} />
            <Select value={sellerId} onValueChange={setSellerId}>
              <Select.Trigger><Select.Value placeholder={loading ? "Loading…" : "Select a company"} /></Select.Trigger>
              <Select.Content>
                {filteredCompanies.length === 0
                  ? <div className="px-3 py-2 text-ui-fg-muted text-sm">No match</div>
                  : filteredCompanies.map((c) => <Select.Item key={c.id} value={c.id}>{c.name}</Select.Item>)}
              </Select.Content>
            </Select>
            {companySearch && filteredCompanies.length > 0 && (
              <div className="flex flex-col gap-1 rounded-lg border border-ui-border-base p-1 max-h-56 overflow-auto">
                {filteredCompanies.slice(0, 30).map((c) => (
                  <button key={c.id} type="button" onClick={() => { setSellerId(c.id); setCompanySearch("") }}
                    className={`text-left px-3 py-1.5 rounded text-sm hover:bg-ui-bg-base-hover ${sellerId === c.id ? "bg-ui-bg-base-hover font-semibold" : ""}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {sellerId && (
            <div className="mt-5 border-t border-ui-border-base pt-5">
              <Text weight="plus" className="mb-3">Add a review</Text>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" }}>
                <div>
                  <Label size="small" className="text-ui-fg-muted">Reviewer name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ahmad K." />
                </div>
                <div>
                  <Label size="small" className="text-ui-fg-muted">Rating</Label>
                  <div className="h-9 flex items-center"><Stars value={rating} onChange={setRating} /></div>
                </div>
              </div>
              <div className="mt-4">
                <Label size="small" className="text-ui-fg-muted">Review text (optional)</Label>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Great service, clean car, smooth pickup…" rows={3} />
              </div>
              <div className="flex justify-end mt-4">
                <Button disabled={saving || !name.trim() || !sellerId} onClick={add}>{saving ? "Saving…" : "Add review"}</Button>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Reviews list */}
      {sellerId && (
        <Container className="p-6 pt-0">
          <div className="rounded-xl border border-ui-border-base bg-ui-bg-base shadow-elevation-card-rest overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-ui-border-base">
              <div>
                <Heading level="h2" className="text-base font-semibold">Reviews for {selected?.name || "—"}</Heading>
                <Text size="small" className="text-ui-fg-subtle">{reviews.length} review{reviews.length === 1 ? "" : "s"} shown on the website</Text>
              </div>
              {reviews.length > 0 && (
                <div className="flex items-center gap-2.5 rounded-xl bg-ui-tag-orange-bg px-3.5 py-2">
                  <span className="text-2xl font-bold tabular-nums text-ui-tag-orange-text">{avg.toFixed(1)}</span>
                  <div className="flex flex-col"><Stars value={Math.round(avg)} /></div>
                </div>
              )}
            </div>

            {reviews.length === 0 ? (
              <div className="py-14 text-center">
                <div className="mx-auto mb-2 flex justify-center text-ui-fg-muted"><Star /></div>
                <Text className="text-ui-fg-subtle font-medium">No reviews yet</Text>
                <Text size="small" className="text-ui-fg-muted mt-1">Add the first review using the form above.</Text>
              </div>
            ) : (
              <div className="divide-y divide-ui-border-base">
                {reviews.map((rv) => (
                  <div key={rv.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-bg-subtle text-sm font-bold uppercase text-ui-fg-subtle">
                      {(rv.name || "?").trim().charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Text weight="plus">{rv.name}</Text>
                        <Stars value={rv.rating} />
                      </div>
                      {rv.text && <Text size="small" className="text-ui-fg-subtle mt-1">{rv.text}</Text>}
                      <Text size="xsmall" className="text-ui-fg-muted mt-1">{new Date(rv.created_at).toLocaleDateString()}</Text>
                    </div>
                    <IconButton variant="transparent" onClick={() => remove(rv.id)} aria-label="Delete"><Trash /></IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Container>
      )}
    </SingleColumnPage>
  )
}

export default Page
