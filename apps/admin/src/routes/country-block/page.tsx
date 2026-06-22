import { useEffect, useMemo, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { Globe } from "@medusajs/icons"
import { API } from "../../lib/api"
import { tt } from "../../lib/lang"

export const config: RouteConfig = { label: tt("Country Block", "حظر الدول"), icon: Globe, rank: 20 }

// ISO-3166 alpha-2 codes offered in the picker. Names + flags are derived, so this
// list is the only thing to extend if a country is ever missing.
const CODES = "AE SA QA KW OM BH YE IQ SY JO LB IL PS IR TR EG LY TN DZ MA SD SS MR NG ET KE ZA GH TZ UG CI CM SN ML BF NE TD SO ZM ZW AO MZ MG RW BJ BI GN SL LR TG CF CG CD GA BW NA MW LS SZ GM GW GQ DJ ER MU KM CV GB IE FR DE IT ES PT NL BE LU CH AT RU UA BY PL CZ SK HU RO BG GR HR RS SI BA AL MK ME XK MD LT LV EE FI SE NO DK IS MT CY IN PK BD LK NP AF BT MV KZ UZ TM KG TJ AZ GE AM MN CN JP KR KP TW HK MO TH VN PH ID MY SG MM KH LA BN TL AU NZ PG FJ US CA MX GT BZ SV HN NI CR PA CO VE EC PE BO BR PY UY AR CL CU DO HT JM PR TT BS BB GY SR".split(" ")

let RDN: any = null
try { RDN = new (Intl as any).DisplayNames(["en"], { type: "region" }) } catch { RDN = null }
const nameOf = (c: string) => { try { const n = RDN ? RDN.of(c) : null; return n && n !== c ? n : c } catch { return c } }
const flagOf = (c: string) => {
  try { return /^[A-Z]{2}$/.test(c) ? String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65, 0x1f1e6 + c.charCodeAt(1) - 65) : "\u{1F310}" } catch { return "\u{1F310}" }
}

type Rule = { id: string; country: string; mode: string; notes?: string }

const selStyle: React.CSSProperties = {
  height: 36, borderRadius: 8, border: "1px solid var(--border-base)",
  background: "var(--bg-base)", color: "var(--fg-base)", padding: "0 10px", fontSize: 13,
}

export default function Page() {
  const [blocked, setBlocked] = useState<Rule[]>([])
  const [yourCountry, setYourCountry] = useState("")
  const [noToken, setNoToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [country, setCountry] = useState("SG")
  const [mode, setMode] = useState("block")

  const options = useMemo(
    () => CODES.map((c) => ({ code: c, name: nameOf(c), flag: flagOf(c) })).sort((a, b) => a.name.localeCompare(b.name)),
    []
  )
  const blockedSet = useMemo(() => new Set(blocked.map((b) => b.country)), [blocked])

  const load = async () => {
    setLoading(true)
    try {
      const d = await fetch(`${API}/admin/cloudflare/country-block`, { credentials: "include" }).then((r) => r.json())
      setYourCountry(d.your_country || "")
      if (d.no_token) setNoToken(true)
      else if (d.ok) { setBlocked(d.blocked || []); setNoToken(false) }
    } catch { /* noop */ }
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!country) return
    if (blockedSet.has(country)) { toast.error(tt("Already in the list", "موجودة بالقائمة")); return }
    // Lockout guard: blocking your OWN country (or the UAE home market) can cut off
    // your own access to the site and this dashboard.
    if (mode === "block" && (country === yourCountry || country === "AE")) {
      const ok = window.confirm(
        tt(
          `Blocking ${nameOf(country)} can lock YOU out of the site and this dashboard if you are there. Continue?`,
          `حظر ${nameOf(country)} قد يقطع وصولك أنت للموقع وللوحة التحكم إذا كنت هناك. متأكد؟`
        )
      )
      if (!ok) return
    }
    setBusy(true)
    try {
      const d = await fetch(`${API}/admin/cloudflare/country-block`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, mode }),
      }).then((r) => r.json())
      if (d.ok) { toast.success(tt("Rule added ✓", "تمت الإضافة ✓")); load() }
      else if (d.no_token) setNoToken(true)
      else toast.error(d.message || tt("Failed", "فشل"))
    } catch { toast.error(tt("Failed", "فشل")) }
    setBusy(false)
  }

  const remove = async (id: string) => {
    setBusy(true)
    try {
      const d = await fetch(`${API}/admin/cloudflare/country-block`, {
        method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then((r) => r.json())
      if (d.ok) { setBlocked((b) => b.filter((x) => x.id !== id)); toast.success(tt("Removed ✓", "تم الحذف ✓")) }
      else toast.error(d.message || tt("Failed", "فشل"))
    } catch { toast.error(tt("Failed", "فشل")) }
    setBusy(false)
  }

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0" style={{ background: "linear-gradient(135deg,#f6821f,#fbad41)" }}>
            <Globe className="text-white" />
          </div>
          <div>
            <Heading level="h1" className="text-xl">{tt("Block traffic by country", "حظر الزيارات حسب الدولة")}</Heading>
            <Text className="text-ui-fg-subtle text-sm">{tt("Stop visitors from a country reaching autotorental.com — enforced at Cloudflare's edge, instantly.", "امنع زوّار دولة معيّنة من الوصول لموقعك — يُطبّق على حافة Cloudflare فوراً.")}</Text>
          </div>
        </div>

        {loading && <div className="text-ui-fg-muted p-8 text-center">{tt("Loading…", "جارٍ التحميل…")}</div>}

        {noToken && !loading && (
          <div className="mt-5 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-5 text-sm text-ui-fg-subtle">
            🔌 {tt("Add your Cloudflare API token in", "أضف توكن Cloudflare في")} <b>Settings → Integrations → Cloudflare</b>{tt(", then refresh.", "، ثم حدّث الصفحة.")}
          </div>
        )}

        {!loading && !noToken && (
          <>
            <div className="mt-5 rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <Text size="small" weight="plus">{tt("Country", "الدولة")}</Text>
                  <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ ...selStyle, minWidth: 250 }}>
                    {options.map((o) => <option key={o.code} value={o.code}>{o.flag} {o.name} ({o.code})</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <Text size="small" weight="plus">{tt("Action", "الإجراء")}</Text>
                  <select value={mode} onChange={(e) => setMode(e.target.value)} style={selStyle}>
                    <option value="block">{tt("Block (403)", "حظر كامل (403)")}</option>
                    <option value="managed_challenge">{tt("Challenge (CAPTCHA)", "تحدّي (كابتشا)")}</option>
                  </select>
                </div>
                <Button variant="primary" onClick={add} isLoading={busy} disabled={blockedSet.has(country)}>
                  {tt("Add rule", "إضافة قاعدة")}
                </Button>
              </div>
              {country === yourCountry && yourCountry && (
                <Text size="xsmall" className="text-ui-fg-error mt-2">⚠️ {tt("This looks like YOUR current country.", "يبدو أن هذه دولتك الحالية.")}</Text>
              )}
            </div>

            <div className="mt-5">
              <Text size="small" weight="plus" className="mb-2">{tt("Currently blocked", "المحظورة حالياً")} · {blocked.length}</Text>
              {blocked.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ui-border-base p-8 text-center text-ui-fg-muted text-sm">
                  {tt("No countries blocked yet.", "لا توجد دول محظورة بعد.")}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {blocked.map((r) => (
                    <div key={r.id} className="rounded-xl border border-ui-border-base bg-ui-bg-base p-3 flex items-center gap-3">
                      <span className="text-xl">{flagOf(r.country)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ui-fg-base">{nameOf(r.country)} <span className="text-ui-fg-muted">({r.country})</span></div>
                        {r.notes ? <div className="text-xs text-ui-fg-subtle truncate">{r.notes}</div> : null}
                      </div>
                      <Badge size="2xsmall" color={r.mode === "block" ? "red" : "orange"}>
                        {r.mode === "block" ? tt("Blocked", "محظورة") : tt("Challenge", "تحدّي")}
                      </Badge>
                      <Button variant="secondary" size="small" onClick={() => remove(r.id)} disabled={busy}>{tt("Remove", "حذف")}</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-xl bg-ui-bg-subtle border border-ui-border-base p-4 text-xs text-ui-fg-subtle leading-relaxed">
              ℹ️ {tt(
                "“Block” returns 403 Forbidden to every visitor from that country. “Challenge” shows a CAPTCHA — real people can pass, most bots can’t. Rules live in Cloudflare and apply site-wide within seconds; removing a rule restores access. Tip: don’t block your own country with “Block”, or you may lock yourself out.",
                "«حظر كامل» يرجّع 403 لكل زائر من تلك الدولة. «تحدّي» يعرض كابتشا — الأشخاص الحقيقيون يعبرون والبوتات غالباً لا. القواعد تُحفظ في Cloudflare وتُطبّق على كامل الموقع خلال ثوانٍ، وحذف القاعدة يعيد الوصول. نصيحة: لا تحظر دولتك بـ«حظر كامل» حتى لا تُغلق على نفسك."
              )}
            </div>
          </>
        )}
      </Container>
    </SingleColumnPage>
  )
}
