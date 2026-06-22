import { useEffect, useMemo, useState } from "react"
import { Heading, Text, Badge, Button, FocusModal } from "@medusajs/ui"
import { PencilSquare } from "@medusajs/icons"
import { API } from "../lib/api"
import { tt } from "../lib/lang"

const STATUS_COLORS: Record<string, any> = {
  pending_approval: "orange", active: "green", rejected: "red",
  draft: "grey", paused: "grey", unavailable: "red", rented: "blue",
}

function SectionTitle({ children }: { children: any }) {
  return <div className="text-xs font-semibold uppercase tracking-wider text-ui-fg-muted mb-3 mt-1">{children}</div>
}
function Row({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === "") return null
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ui-border-base last:border-b-0">
      <span className="text-ui-fg-subtle text-sm shrink-0">{label}</span>
      <span className="text-ui-fg-base text-sm text-right font-medium break-words">{value}</span>
    </div>
  )
}
function Section({ title, children }: any) {
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-4">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  )
}

export function VehicleProfileModal({ vehicle, brands = [], models = [], cities = [], features = [], sellers = [], bodyTypes = [], onClose, onEdit }: any) {
  const id = vehicle?.id
  const [full, setFull] = useState<any>(vehicle)
  const [mainImg, setMainImg] = useState(0)

  useEffect(() => {
    if (!id) return
    setFull(vehicle); setMainImg(0)
    fetch(`${API}/admin/vehicles/${id}`, { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (d.vehicle) setFull(d.vehicle) }).catch(() => {})
  }, [id])

  const map = (list: any[]) => { const m: Record<string, any> = {}; (list || []).forEach((x: any) => { if (x?.id) m[x.id] = x }); return m }
  const brandMap = useMemo(() => map(brands), [brands])
  const modelMap = useMemo(() => map(models), [models])
  const cityMap = useMemo(() => map(cities), [cities])
  const bodyMap = useMemo(() => map(bodyTypes), [bodyTypes])
  const sellerMap = useMemo(() => map(sellers), [sellers])
  const featMap = useMemo(() => map(features), [features])

  const v = full || {}
  const cur = (v.currency_code || "aed").toUpperCase()
  const photos: string[] = Array.isArray(v.photos) ? v.photos.filter(Boolean) : []
  const videos: any[] = Array.isArray(v.videos) ? v.videos.filter(Boolean) : []
  const featNames = (Array.isArray(v.feature_ids) ? v.feature_ids : []).map((fid: string) => featMap[fid]?.name).filter(Boolean)
  const price = (n: any) => (n ? `${Number(n).toLocaleString()} ${cur}` : null)
  const fmtDate = (d: any) => { try { return d ? new Date(d).toLocaleDateString() : null } catch { return null } }
  const heroImg = photos[mainImg] || photos[0] || ""
  const subtitle = [brandMap[v.brand_id]?.name, modelMap[v.model_id]?.name, v.year, cityMap[v.city_id]?.name].filter(Boolean).join(" · ")

  return (
    <FocusModal open={!!vehicle} onOpenChange={(o: boolean) => !o && onClose()}>
      <FocusModal.Content style={{ maxWidth: 760 }}>
        <FocusModal.Header>
          <Heading>{tt("Vehicle profile", "ملف السيارة")}</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="p-0">
          <div className="flex flex-col" style={{ maxHeight: "80vh" }}>
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

              {/* HERO — plain <img>, reliable */}
              <div>
                {heroImg ? (
                  <img src={heroImg} alt={v.title || ""} className="w-full rounded-xl border border-ui-border-base" style={{ height: 230, objectFit: "cover", background: "#0f172a" }} />
                ) : (
                  <div className="w-full rounded-xl border border-ui-border-base flex items-center justify-center" style={{ height: 230, fontSize: 56, background: "linear-gradient(120deg,#1e293b,#334155)" }}>🚗</div>
                )}
                <div className="mt-3 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <Heading level="h2" className="text-xl">{v.title || "—"}</Heading>
                    {subtitle && <Text size="small" className="text-ui-fg-subtle">{subtitle}</Text>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <Badge color={STATUS_COLORS[v.status] || "grey"}>{v.status}</Badge>
                    {v.is_featured && <Badge color="purple">★ {tt("Featured", "مميّزة")}</Badge>}
                    {v.discount_percent ? <Badge color="red">-{v.discount_percent}%</Badge> : null}
                  </div>
                </div>
                {/* thumbnails */}
                {photos.length > 1 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {photos.map((p, i) => (
                      <button key={i} type="button" onClick={() => setMainImg(i)} className={"rounded-md overflow-hidden border-2 transition " + (i === mainImg ? "border-ui-fg-interactive" : "border-transparent hover:border-ui-border-strong")} style={{ width: 76, height: 54 }}>
                        <img src={p} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
                {videos.length > 0 && <Text size="xsmall" className="text-ui-fg-muted mt-2 block">🎬 {videos.length} {tt("video(s)", "فيديو")}</Text>}
              </div>

              {/* Specifications */}
              <Section title={`⚙️ ${tt("Specifications", "المواصفات")}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label={tt("Brand", "الماركة")} value={brandMap[v.brand_id]?.name} />
                    <Row label={tt("Model", "الموديل")} value={modelMap[v.model_id]?.name} />
                    <Row label={tt("Body type", "نوع الهيكل")} value={bodyMap[v.body_type_id]?.name} />
                    <Row label={tt("Year", "السنة")} value={v.year} />
                    <Row label={tt("Color", "اللون")} value={v.color} />
                    <Row label={tt("Mileage", "المسافة")} value={v.mileage_km ? `${Number(v.mileage_km).toLocaleString()} km` : null} />
                  </div>
                  <div>
                    <Row label={tt("Fuel", "الوقود")} value={v.fuel_type} />
                    <Row label={tt("Transmission", "ناقل الحركة")} value={v.transmission} />
                    <Row label={tt("Seats", "المقاعد")} value={v.seats} />
                    <Row label={tt("Doors", "الأبواب")} value={v.doors} />
                    <Row label={tt("VIN", "رقم الهيكل")} value={v.vin} />
                    <Row label={tt("Plate", "اللوحة")} value={v.plate_number} />
                  </div>
                </div>
              </Section>

              {/* Pricing */}
              <Section title={`💰 ${tt("Pricing", "التسعير")}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label={tt("Daily", "يومي")} value={price(v.daily_price)} />
                    <Row label={tt("Weekly", "أسبوعي")} value={price(v.weekly_price)} />
                    <Row label={tt("Monthly", "شهري")} value={price(v.monthly_price)} />
                  </div>
                  <div>
                    <Row label={tt("Sale daily", "يومي بعد الخصم")} value={price(v.sale_daily_price)} />
                    <Row label={tt("Sale monthly", "شهري بعد الخصم")} value={price(v.sale_monthly_price)} />
                    <Row label={tt("Deposit", "التأمين")} value={price(v.security_deposit)} />
                  </div>
                </div>
              </Section>

              {v.description && (
                <Section title={`📝 ${tt("Description", "الوصف")}`}>
                  <Text size="small" className="text-ui-fg-subtle whitespace-pre-wrap">{v.description}</Text>
                </Section>
              )}

              {featNames.length > 0 && (
                <Section title={`✨ ${tt("Features", "المزايا")} (${featNames.length})`}>
                  <div className="flex flex-wrap gap-1.5">{featNames.map((n: string, i: number) => <Badge key={i} size="2xsmall" color="grey">{n}</Badge>)}</div>
                </Section>
              )}

              <Section title={`🏢 ${tt("Company & contact", "الشركة والتواصل")}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label={tt("Rental company", "شركة التأجير")} value={sellerMap[v.seller_id]?.name || v.seller_id} />
                    <Row label={tt("City", "المدينة")} value={cityMap[v.city_id]?.name} />
                  </div>
                  <div>
                    <Row label={tt("Phone", "الهاتف")} value={v.phone_number} />
                    <Row label="WhatsApp" value={v.whatsapp_number} />
                    <Row label={tt("Free call", "مكالمة مجانية")} value={v.livekit_enabled ? "✅" : "—"} />
                  </div>
                </div>
              </Section>

              <Section title={`📊 ${tt("Activity", "النشاط")}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                  <div>
                    <Row label={tt("Views", "المشاهدات")} value={v.view_count ?? 0} />
                    <Row label={tt("Created", "أُنشئت")} value={fmtDate(v.created_at)} />
                  </div>
                  <div>
                    <Row label={tt("Approved", "اعتُمدت")} value={fmtDate(v.approved_at)} />
                    <Row label={tt("Slug", "المعرّف")} value={v.slug} />
                  </div>
                </div>
              </Section>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t border-ui-border-base bg-ui-bg-base">
              {v.slug && <a href={`https://autotorental.com/cars/${v.slug}`} target="_blank" rel="noopener"><Button variant="secondary">{tt("View on site", "في الموقع")}</Button></a>}
              <Button variant="primary" onClick={() => onEdit?.(v)}><PencilSquare /> {tt("Edit", "تعديل")}</Button>
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
