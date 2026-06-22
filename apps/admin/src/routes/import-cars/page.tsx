import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, Input, Label, Checkbox, toast } from "@medusajs/ui"
import { CloudArrowDown } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Import Cars", "استيراد سيارات"), icon: CloudArrowDown, rank: 18 }

type Seller = { id: string; name: string }
type Car = { title: string; price?: number | null; currency?: string; photos?: string[]; url?: string }

const sel: React.CSSProperties = { height: 40, borderRadius: 8, border: "1px solid var(--border-base)", background: "var(--bg-base)", color: "var(--fg-base)", padding: "0 10px", fontSize: 14, width: "100%" }

export default function Page() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [sellerId, setSellerId] = useState("")
  const [domain, setDomain] = useState("")
  const [cars, setCars] = useState<Car[]>([])
  const [picked, setPicked] = useState<boolean[]>([])
  const [busy, setBusy] = useState(false)
  const [previewed, setPreviewed] = useState(false)

  useEffect(() => {
    fetch(`${API}/admin/import-vehicles`, { credentials: "include" }).then(r => r.json())
      .then(d => { setSellers(d.sellers || []); if ((d.sellers || []).length === 1) setSellerId(d.sellers[0].id) }).catch(() => {})
  }, [])

  const sorted = useMemo(() => [...sellers].sort((a, b) => (a.name || "").localeCompare(b.name || "")), [sellers])
  const pickedCount = picked.filter(Boolean).length

  const preview = async () => {
    if (!sellerId) { toast.error(tt("Choose a rental company first", "اختر شركة تأجير أولاً")); return }
    if (!domain.trim()) { toast.error(tt("Enter the website", "أدخل الموقع")); return }
    setBusy(true); setPreviewed(false)
    try {
      const d = await fetch(`${API}/admin/import-vehicles`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: sellerId, domain: domain.trim(), action: "preview" }),
      }).then(r => r.json())
      if (!d.ok) { toast.error(d.message || tt("Failed", "فشل")); setBusy(false); return }
      setCars(d.cars || []); setPicked((d.cars || []).map(() => true)); setPreviewed(true)
      toast.success(tt(`Found ${d.found} cars — pick which to import`, `وجدنا ${d.found} سيارة — اختر اللي تبيها`))
    } catch (e: any) { toast.error(e?.message || "Failed") }
    setBusy(false)
  }

  const importSelected = async () => {
    const chosen = cars.filter((_, i) => picked[i])
    if (!chosen.length) { toast.error(tt("Select at least one car", "اختر سيارة واحدة على الأقل")); return }
    setBusy(true)
    try {
      const d = await fetch(`${API}/admin/import-vehicles`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_id: sellerId, domain: domain.trim(), action: "import", cars: chosen }),
      }).then(r => r.json())
      if (!d.ok) { toast.error(d.message || tt("Failed", "فشل")); setBusy(false); return }
      toast.success(tt(`Imported ${d.imported} cars as drafts`, `تم استيراد ${d.imported} سيارة كمسودات`))
      setCars([]); setPicked([]); setPreviewed(false)
    } catch (e: any) { toast.error(e?.message || "Failed") }
    setBusy(false)
  }

  const setAll = (v: boolean) => setPicked(cars.map(() => v))

  return (
    <SingleColumnPage>
      <Container className="p-0 overflow-hidden">
        <div className="px-6 py-5 border-b">
          <Heading level="h1">{tt("Import Cars from a Website", "استيراد سيارات من موقع")}</Heading>
          <Text className="text-ui-fg-subtle mt-1" size="small">
            {tt("Pick a company, paste their website, preview, tick the cars you want, then import. Imported cars are saved as drafts for review.",
                "اختر شركة، الصق موقعها، عاين، علّم السيارات اللي تبيها، ثم استورد. تُحفظ كمسودات للمراجعة.")}
          </Text>
        </div>

        <div className="px-6 py-5 border-b grid gap-4" style={{ maxWidth: 720, gridTemplateColumns: "1fr 1fr" }}>
          <div><Label size="small">{tt("Rental company", "شركة التأجير")}</Label>
            <select style={sel} value={sellerId} onChange={e => setSellerId(e.target.value)}>
              <option value="">{tt("— Select —", "— اختر —")}</option>
              {sorted.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div><Label size="small">{tt("Website / domain", "الموقع / الدومين")}</Label>
            <Input placeholder="example.com" value={domain} onChange={e => setDomain(e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <Button variant="secondary" onClick={preview} disabled={busy} isLoading={busy && !previewed}>
              🔍 {tt("Preview cars", "معاينة السيارات")}
            </Button>
          </div>
        </div>

        {previewed && (
          <div className="px-6 py-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Heading level="h3">{tt("Found cars", "السيارات الموجودة")}</Heading>
                <Badge color="blue">{pickedCount}/{cars.length} {tt("selected", "مختارة")}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="small" variant="transparent" onClick={() => setAll(true)}>{tt("Select all", "اختيار الكل")}</Button>
                <Button size="small" variant="transparent" onClick={() => setAll(false)}>{tt("Clear", "إلغاء")}</Button>
                <Button size="small" variant="primary" onClick={importSelected} disabled={busy || !pickedCount} isLoading={busy && previewed}>
                  ⬇️ {tt(`Import ${pickedCount} selected`, `استيراد ${pickedCount} مختارة`)}
                </Button>
              </div>
            </div>

            {cars.length === 0 && <Text size="small" className="text-ui-fg-subtle">{tt("No cars found on that site.", "ما لقينا سيارات في هذا الموقع.")}</Text>}

            <div className="flex flex-col gap-2">
              {cars.map((c, i) => (
                <label key={i} className="flex items-center gap-3 border rounded-lg p-2 cursor-pointer" style={{ borderColor: picked[i] ? "var(--border-interactive,#3b82f6)" : "var(--border-base)" }}>
                  <Checkbox checked={!!picked[i]} onCheckedChange={() => setPicked(p => p.map((v, j) => j === i ? !v : v))} />
                  {c.photos && c.photos[0]
                    ? <img src={c.photos[0]} alt="" style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    : <div style={{ width: 64, height: 44, borderRadius: 6, background: "var(--bg-subtle)", flexShrink: 0 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="small" weight="plus" className="truncate">{c.title}</Text>
                    {c.price
                      ? <Text size="xsmall" className="text-ui-fg-interactive">{c.currency || "AED"} {c.price}/{tt("day", "يوم")}</Text>
                      : <Text size="xsmall" className="text-ui-fg-muted">{tt("no price — add it after import", "بدون سعر — أضفه بعد الاستيراد")}</Text>}
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </Container>
    </SingleColumnPage>
  )
}
