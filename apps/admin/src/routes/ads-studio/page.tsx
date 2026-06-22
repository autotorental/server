import { useEffect, useState } from "react"
import { tt } from "../../lib/lang"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text, Button, Input, Label, Badge, toast } from "@medusajs/ui"
import { Bolt } from "@medusajs/icons"
import { API } from "../../lib/api"

export const config: RouteConfig = { label: tt("AI Ads Studio", "استوديو الإعلانات"), icon: Bolt, rank: 34 }

const Seg = ({ value, set, options }: any) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o: any) => (
      <button key={o.id} type="button" onClick={() => set(o.id)}
        className={"rounded-lg border px-3 py-2 text-sm transition " + (value === o.id ? "border-ui-fg-interactive bg-ui-bg-base shadow-sm font-medium" : "border-ui-border-base text-ui-fg-subtle hover:border-ui-border-strong")}>{o.label}</button>
    ))}
  </div>
)
const Card = ({ title, children, right }: any) => (
  <div className="rounded-xl border border-ui-border-base bg-ui-bg-base">
    <div className="px-4 py-3 border-b border-ui-border-base flex items-center justify-between gap-2"><Text weight="plus">{title}</Text>{right}</div>
    <div className="p-4">{children}</div>
  </div>
)
const matchColor = (m: string) => (m === "exact" ? "green" : m === "phrase" ? "blue" : "grey")

const Page = () => {
  const [opt, setOpt] = useState<any>({ companies: [], categories: [], countries: [], goals: [] })
  const [goal, setGoal] = useState("whatsapp")
  const [platform, setPlatform] = useState("all")
  const [tone, setTone] = useState("premium")
  const [countries, setCountries] = useState<string[]>(["United Arab Emirates"])
  const [category, setCategory] = useState("")
  const [model, setModel] = useState("")
  const [company, setCompany] = useState("")
  const [offer, setOffer] = useState("")
  const [budget, setBudget] = useState("50")
  const [days, setDays] = useState("7")
  const [variations, setVariations] = useState(3)
  const [lang, setLang] = useState<"ar" | "en">("ar")
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<any>(null)
  const [err, setErr] = useState("")

  useEffect(() => { fetch(`${API}/admin/ads/options`, { credentials: "include" }).then((r) => r.json()).then(setOpt).catch(() => {}) }, [])
  const toggleCountry = (c: string) => setCountries((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
  const copy = (t: string) => { try { navigator.clipboard.writeText(t); toast.success(tt("Copied ✓", "تم النسخ ✓")) } catch { /* */ } }

  const generate = async () => {
    setBusy(true); setErr(""); setOut(null)
    try {
      const companyName = (opt.companies || []).find((c: any) => c.id === company)?.name || ""
      const r = await fetch(`${API}/admin/ads/generate`, {
        method: "POST", credentials: "include", headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal, platform, tone, countries, category, model, company, company_name: companyName, offer, budget: Number(budget), days: Number(days), variations, language: lang }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(d.message || "failed"); return }
      setOut(d)
    } catch (e: any) { setErr(e?.message || "error") } finally { setBusy(false) }
  }

  const copyAll = () => {
    if (!out) return
    const L: string[] = []
    L.push(`# ${out.campaign_name}`)
    if (out.objective) L.push(out.objective)
    if (out.strategy) L.push(`\nSTRATEGY: ${out.strategy}`)
    if (out.target_summary) L.push(`TARGET: ${out.target_summary}`)
    L.push(`\nLANDING URL:\n${out.landing_url}`)
    const a = out.audience
    if (a) L.push(`\nAUDIENCE: ${a.age} · ${a.gender}\nInterests: ${(a.interests || []).join(", ")}\nBehaviors: ${(a.behaviors || []).join(", ")}\nExclude: ${(a.exclusions || []).join(", ")}\nLookalike: ${a.lookalike || ""}`)
    L.push(`\n— AD VARIATIONS —`)
    ;(out.ad_variations || []).forEach((v: any, i: number) => L.push(`\n[${i + 1}] ${v.headline}\n${v.primary_text}\n${v.description}\nCTA: ${v.cta}`))
    if (out.google) L.push(`\n— GOOGLE SEARCH —\nHeadlines:\n${(out.google.headlines || []).map((h: string) => "• " + h).join("\n")}\nDescriptions:\n${(out.google.descriptions || []).map((h: string) => "• " + h).join("\n")}\nKeywords:\n${(out.google.keywords || []).map((k: any) => `• ${k.kw} [${k.match}]`).join("\n")}\nNegatives: ${(out.google.negative_keywords || []).join(", ")}`)
    if (out.social) L.push(`\n— SOCIAL —\nHashtags: ${(out.social.hashtags || []).join(" ")}\nHooks:\n${(out.social.hooks || []).map((h: string) => "• " + h).join("\n")}`)
    const bp = out.budget_plan
    if (bp) L.push(`\n— BUDGET —\n${bp.summary}\nSplit: ${bp.daily_split}\nBid: ${bp.bid_strategy}\nCPC: ${bp.est_cpc} · Leads/day: ${bp.est_leads_per_day} · Reach: ${bp.est_reach}`)
    if (out.schedule) L.push(`\nSCHEDULE: ${(out.schedule.best_days || []).join(", ")} · ${out.schedule.best_hours}`)
    if (out.ab_test) L.push(`\nA/B TEST: ${out.ab_test}`)
    if (out.tips) L.push(`\n— TIPS —\n${(out.tips || []).map((t: string) => "• " + t).join("\n")}`)
    copy(L.join("\n"))
  }

  const selCls = "w-full rounded-lg border border-ui-border-base bg-ui-bg-field px-3 py-2 text-sm"
  const g = out?.google
  const a = out?.audience
  const bp = out?.budget_plan

  return (
    <SingleColumnPage>
      <Container className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl text-white shrink-0" style={{ backgroundImage: "linear-gradient(135deg,#1753b0,#0ea5e9)" }}><Bolt /></div>
          <div>
            <Heading level="h1">{tt("AI Ads Studio", "استوديو الإعلانات الذكي")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">{tt("Pick goal, platforms, tone & budget — Claude builds a full launch-ready campaign: copy, Google RSA, keywords, audience, budget split & schedule.", "اختر الهدف والمنصّات والأسلوب والميزانية — Claude يبني حملة كاملة جاهزة للإطلاق: نصوص، إعلانات Google، كلمات مفتاحية، استهداف، توزيع ميزانية وجدول.")}</Text>
          </div>
        </div>

        {/* BUILDER */}
        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4 flex flex-col gap-4">
          <div><Label size="small" weight="plus" className="mb-1.5 block">🎯 {tt("Goal", "الهدف")}</Label>
            <Seg value={goal} set={setGoal} options={[
              { id: "whatsapp", label: "💬 " + tt("WhatsApp leads", "رسائل واتساب") },
              { id: "call", label: "📞 " + tt("Phone calls", "مكالمات") },
              { id: "view", label: "🚗 " + tt("Car page views", "مشاهدة سيارة") },
              { id: "traffic", label: "🌐 " + tt("Website visits", "زيارات الموقع") },
              { id: "subscription", label: "⭐ " + tt("Vendor signups", "اشتراك الشركات") },
            ]} /></div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            <div><Label size="small" weight="plus" className="mb-1.5 block">📣 {tt("Platforms", "المنصّات")}</Label>
              <Seg value={platform} set={setPlatform} options={[
                { id: "all", label: "✨ " + tt("All", "الكل") }, { id: "meta", label: "Meta" }, { id: "google", label: "Google" }, { id: "tiktok", label: "TikTok" }, { id: "snapchat", label: "Snapchat" },
              ]} /></div>
            <div><Label size="small" weight="plus" className="mb-1.5 block">🎨 {tt("Tone", "الأسلوب")}</Label>
              <Seg value={tone} set={setTone} options={[
                { id: "premium", label: tt("Premium", "فخم") }, { id: "luxury", label: tt("Luxury", "فاخر جداً") }, { id: "urgent", label: tt("Urgent", "إلحاح") }, { id: "friendly", label: tt("Friendly", "ودّي") }, { id: "professional", label: tt("Professional", "احترافي") }, { id: "playful", label: tt("Bold", "جريء") },
              ]} /></div>
          </div>

          <div><Label size="small" weight="plus" className="mb-1.5 block">🌍 {tt("Target countries", "الدول المستهدفة")}</Label>
            <div className="flex flex-wrap gap-2">
              {(opt.countries || []).map((c: string) => (
                <button key={c} type="button" onClick={() => toggleCountry(c)}
                  className={"rounded-full border px-3 py-1 text-xs transition " + (countries.includes(c) ? "border-ui-fg-interactive bg-ui-bg-base font-medium" : "border-ui-border-base text-ui-fg-subtle")}>{c}</button>
              ))}
            </div></div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
            <div><Label size="small" weight="plus" className="mb-1.5 block">🚙 {tt("Car category", "فئة السيارة")}</Label>
              <select className={selCls} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">{tt("Any category", "كل الفئات")}</option>
                {(opt.categories || []).map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div><Label size="small" weight="plus" className="mb-1.5 block">🏎️ {tt("Specific model (optional)", "موديل محدّد (اختياري)")}</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={tt("e.g. Lamborghini Urus", "مثال: لامبورغيني أوروس")} /></div>
            <div><Label size="small" weight="plus" className="mb-1.5 block">🏢 {tt("Rental company", "شركة التأجير")}</Label>
              <select className={selCls} value={company} onChange={(e) => setCompany(e.target.value)}>
                <option value="">{tt("All companies", "كل الشركات")}</option>
                {(opt.companies || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><Label size="small" weight="plus" className="mb-1.5 block">🏷️ {tt("Offer / promo (optional)", "عرض / خصم (اختياري)")}</Label>
              <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder={tt("e.g. 20% off weekends", "مثال: خصم 20% بنهاية الأسبوع")} /></div>
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))" }}>
            <div><Label size="small" weight="plus" className="mb-1.5 block">💰 {tt("Daily budget (AED)", "ميزانية يومية (درهم)")}</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
            <div><Label size="small" weight="plus" className="mb-1.5 block">📅 {tt("Days", "الأيام")}</Label>
              <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} /></div>
            <div><Label size="small" weight="plus" className="mb-1.5 block">🔢 {tt("Variations", "عدد النسخ")}</Label>
              <Seg value={variations} set={setVariations} options={[{ id: 3, label: "3" }, { id: 4, label: "4" }, { id: 5, label: "5" }]} /></div>
            <div><Label size="small" weight="plus" className="mb-1.5 block">🗣️ {tt("Language", "اللغة")}</Label>
              <Seg value={lang} set={setLang as any} options={[{ id: "ar", label: "عربي" }, { id: "en", label: "English" }]} /></div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="primary" onClick={generate} isLoading={busy} disabled={!countries.length}>⚡ {tt("Build campaign with Claude", "ابنِ الحملة بـ Claude")}</Button>
            {busy && <Text size="small" className="text-ui-fg-muted">{tt("Claude is crafting your campaign… (~20s)", "Claude يجهّز حملتك… (~20 ثانية)")}</Text>}
            {err && <Text size="small" className="text-ui-fg-error">{err}</Text>}
          </div>
        </div>

        {/* OUTPUT */}
        {out && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Heading level="h2">{out.campaign_name}</Heading>
              <Badge color="purple">⚡ Claude</Badge>
              <Badge color="green">{out.conversion_event}</Badge>
              {(out.platforms || []).map((p: string, i: number) => <Badge key={i} size="2xsmall" color="grey">{p}</Badge>)}
              <div className="ml-auto"><Button size="small" variant="secondary" onClick={copyAll}>📋 {tt("Copy whole campaign", "نسخ الحملة كاملة")}</Button></div>
            </div>
            {out.target_summary && <Text size="small" className="text-ui-fg-subtle -mt-2">{out.objective} · {out.target_summary}</Text>}

            {out.strategy && (
              <div className="rounded-xl border border-ui-border-base p-4" style={{ background: "linear-gradient(135deg, rgba(23,83,176,0.06), rgba(14,165,233,0.06))" }}>
                <Text size="small" weight="plus" className="mb-1">🧠 {tt("Strategy", "الاستراتيجية")}</Text>
                <Text size="small" className="text-ui-fg-subtle">{out.strategy}</Text>
              </div>
            )}

            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))" }}>
              {a && (
                <Card title={"👥 " + tt("Audience targeting", "الاستهداف")}>
                  <div className="text-sm flex flex-col gap-2">
                    <div><b>{tt("Age", "العمر")}:</b> {a.age} · <b>{tt("Gender", "الجنس")}:</b> {a.gender}</div>
                    <div><b>{tt("Interests", "الاهتمامات")}:</b><div className="flex flex-wrap gap-1.5 mt-1">{(a.interests || []).map((i: string, k: number) => <Badge key={k} size="2xsmall" color="blue">{i}</Badge>)}</div></div>
                    {(a.behaviors || []).length > 0 && <div><b>{tt("Behaviors", "السلوكيات")}:</b><div className="flex flex-wrap gap-1.5 mt-1">{(a.behaviors || []).map((i: string, k: number) => <Badge key={k} size="2xsmall" color="grey">{i}</Badge>)}</div></div>}
                    {(a.exclusions || []).length > 0 && <div><b>{tt("Exclude", "استبعاد")}:</b><div className="flex flex-wrap gap-1.5 mt-1">{(a.exclusions || []).map((i: string, k: number) => <Badge key={k} size="2xsmall" color="red">{i}</Badge>)}</div></div>}
                    {a.lookalike && <div className="text-xs text-ui-fg-subtle">🎯 {tt("Lookalike", "جمهور مشابه")}: {a.lookalike}</div>}
                    {(a.placements || []).length > 0 && <div className="text-xs text-ui-fg-muted">{tt("Placements", "أماكن الظهور")}: {(a.placements || []).join(" · ")}</div>}
                  </div>
                </Card>
              )}
              <Card title={"🔗 " + tt("Tracked landing URL", "رابط الهبوط المتتبَّع")} right={<Button size="small" variant="secondary" onClick={() => copy(out.landing_url)}>{tt("Copy", "نسخ")}</Button>}>
                <div className="text-xs font-mono break-all text-ui-fg-interactive">{out.landing_url}</div>
                <Text size="xsmall" className="text-ui-fg-muted mt-2">{out.tracking_note}</Text>
              </Card>
            </div>

            <Card title={"✍️ " + tt("Ad creatives", "نصوص الإعلان") + " (" + (out.ad_variations || []).length + ")"}>
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
                {(out.ad_variations || []).map((v: any, k: number) => (
                  <div key={k} className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-1"><div className="flex items-center gap-1 flex-wrap"><Badge size="2xsmall" color="blue">#{k + 1}</Badge>{v.hook && <Badge size="2xsmall" color="purple">{v.hook}</Badge>}</div>
                      <Button size="small" variant="transparent" onClick={() => copy(`${v.headline}\n\n${v.primary_text}\n\n${v.description}`)}>{tt("Copy", "نسخ")}</Button></div>
                    <div className="text-sm font-semibold">{v.headline}</div>
                    <div className="text-sm text-ui-fg-subtle">{v.primary_text}</div>
                    <div className="text-xs text-ui-fg-muted">{v.description}</div>
                    {v.cta && <div><Badge size="2xsmall" color="green">▶ {v.cta}</Badge></div>}
                  </div>
                ))}
              </div>
            </Card>

            {g && (
              <Card title={"🔍 " + tt("Google Search ad (RSA)", "إعلان بحث Google")} right={<Button size="small" variant="secondary" onClick={() => copy([...(g.headlines || []), "", ...(g.descriptions || [])].join("\n"))}>{tt("Copy all", "نسخ الكل")}</Button>}>
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
                  <div>
                    <Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-1.5">{tt("Headlines", "العناوين")} (≤30) · {(g.headlines || []).length}</Text>
                    <div className="flex flex-col gap-1">{(g.headlines || []).map((h: string, i: number) => <div key={i} className="text-sm flex items-center justify-between gap-2"><span>{h}</span><span className="text-ui-fg-muted text-xs">{h.length}</span></div>)}</div>
                  </div>
                  <div>
                    <Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-1.5">{tt("Descriptions", "الأوصاف")} (≤90) · {(g.descriptions || []).length}</Text>
                    <div className="flex flex-col gap-1.5">{(g.descriptions || []).map((h: string, i: number) => <div key={i} className="text-sm">{h}</div>)}</div>
                  </div>
                </div>
                {(g.keywords || []).length > 0 && (
                  <div className="mt-4"><Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-1.5">{tt("Keywords", "الكلمات المفتاحية")}</Text>
                    <div className="flex flex-wrap gap-1.5">{(g.keywords || []).map((k: any, i: number) => <Badge key={i} size="2xsmall" color={matchColor(k.match)}>{k.kw} · {k.match}</Badge>)}</div></div>
                )}
                {(g.negative_keywords || []).length > 0 && (
                  <div className="mt-3"><Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-1.5">{tt("Negative keywords", "كلمات سلبية")}</Text>
                    <div className="flex flex-wrap gap-1.5">{(g.negative_keywords || []).map((k: string, i: number) => <Badge key={i} size="2xsmall" color="red">−{k}</Badge>)}</div></div>
                )}
                <div className="grid gap-4 mt-3" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
                  {(g.sitelinks || []).length > 0 && (
                    <div><Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-1.5">{tt("Sitelinks", "روابط إضافية")}</Text>
                      <div className="flex flex-col gap-1">{(g.sitelinks || []).map((s: any, i: number) => <div key={i} className="text-sm"><span className="text-ui-fg-interactive font-medium">{s.text}</span> <span className="text-ui-fg-muted text-xs">{s.desc}</span></div>)}</div></div>
                  )}
                  {(g.callouts || []).length > 0 && (
                    <div><Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-1.5">{tt("Callouts", "تنويهات")}</Text>
                      <div className="flex flex-wrap gap-1.5">{(g.callouts || []).map((c: string, i: number) => <Badge key={i} size="2xsmall" color="grey">{c}</Badge>)}</div></div>
                  )}
                </div>
              </Card>
            )}

            {out.social && ((out.social.hashtags || []).length > 0 || (out.social.hooks || []).length > 0) && (
              <Card title={"📱 " + tt("Social / Reels & TikTok", "سوشال / ريلز وتيك توك")}>
                {(out.social.hooks || []).length > 0 && <div className="mb-3"><Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-1.5">{tt("Scroll-stopping hooks", "جُمل افتتاحية تجذب")}</Text>
                  <ul className="text-sm text-ui-fg-subtle list-disc pl-5 flex flex-col gap-1">{(out.social.hooks || []).map((h: string, i: number) => <li key={i}>{h}</li>)}</ul></div>}
                {(out.social.hashtags || []).length > 0 && <div className="flex flex-wrap gap-1.5">{(out.social.hashtags || []).map((h: string, i: number) => <Badge key={i} size="2xsmall" color="blue">{h.startsWith("#") ? h : "#" + h}</Badge>)}</div>}
              </Card>
            )}

            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
              {bp && (
                <Card title={"📊 " + tt("Budget & forecast", "الميزانية والتوقّع")}>
                  <div className="text-sm flex flex-col gap-1.5 text-ui-fg-subtle">
                    {bp.summary && <div>{bp.summary}</div>}
                    {bp.daily_split && <div><b>{tt("Split", "التوزيع")}:</b> {bp.daily_split}</div>}
                    {bp.bid_strategy && <div><b>{tt("Bidding", "المزايدة")}:</b> {bp.bid_strategy}</div>}
                    <div className="flex flex-wrap gap-2 mt-1">
                      {bp.est_cpc && <Badge size="2xsmall" color="grey">CPC {bp.est_cpc}</Badge>}
                      {bp.est_leads_per_day && <Badge size="2xsmall" color="green">{bp.est_leads_per_day} {tt("leads/day", "عميل/يوم")}</Badge>}
                      {bp.est_reach && <Badge size="2xsmall" color="blue">{tt("Reach", "وصول")} {bp.est_reach}</Badge>}
                    </div>
                  </div>
                </Card>
              )}
              <div className="flex flex-col gap-4">
                {out.schedule && (
                  <Card title={"⏰ " + tt("Best schedule", "أفضل توقيت")}>
                    <div className="text-sm text-ui-fg-subtle"><b>{tt("Days", "الأيام")}:</b> {(out.schedule.best_days || []).join(" · ")}<br /><b>{tt("Hours", "الساعات")}:</b> {out.schedule.best_hours}</div>
                  </Card>
                )}
                {out.ab_test && (
                  <Card title={"🧪 " + tt("Test this first", "اختبر هذا أولاً")}>
                    <Text size="small" className="text-ui-fg-subtle">{out.ab_test}</Text>
                  </Card>
                )}
              </div>
            </div>

            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
              {(out.creative_brief || (out.creative_ideas || []).length > 0) && (
                <Card title={"🎨 " + tt("Creative direction", "توجيه التصميم")}>
                  {out.creative_brief && <Text size="small" className="text-ui-fg-subtle">{out.creative_brief}</Text>}
                  {(out.creative_ideas || []).length > 0 && <ul className="text-sm text-ui-fg-subtle list-disc pl-5 flex flex-col gap-1 mt-2">{(out.creative_ideas || []).map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>}
                </Card>
              )}
              {Array.isArray(out.tips) && out.tips.length > 0 && (
                <Card title={"💡 " + tt("Optimization tips", "نصائح التحسين")}>
                  <ul className="text-sm text-ui-fg-subtle list-disc pl-5 flex flex-col gap-1">{out.tips.map((t: string, i: number) => <li key={i}>{t}</li>)}</ul>
                </Card>
              )}
            </div>
          </div>
        )}
      </Container>
    </SingleColumnPage>
  )
}
export default Page
