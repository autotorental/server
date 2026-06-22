import { useEffect, useState } from "react"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Badge,
  Textarea,
  Select,
  Switch,
  toast,
} from "@medusajs/ui"
import { Bolt } from "@medusajs/icons"
import { tt } from "../../lib/lang"
import { API } from "../../lib/api"

export const config: RouteConfig = {
  label: tt("Social Posting", "النشر على السوشيال"),
  icon: Bolt,
  rank: 40,
}

type Account = {
  id: string
  platform: string
  name: string
  external_id: string | null
  enabled: boolean
}
type PlatformInfo = {
  platform: string
  label: string
  connect: "oauth" | "webhook" | "manual"
  needs?: string[]
}
type Rule = {
  id: string
  name: string
  enabled: boolean
  event: string
  account_ids: string[]
  template: string
  delay_minutes: number
}
type Post = {
  id: string
  platform: string
  status: string
  content: string
  error: string | null
  external_post_id: string | null
  created_at: string
}

const api = (path: string, init?: RequestInit) =>
  fetch(`${API}/admin/social${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  }).then(async (r) => {
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.message || `Request failed (${r.status})`)
    return j
  })

const PLATFORM_EMOJI: Record<string, string> = {
  facebook: "📘",
  instagram: "📸",
  twitter: "𝕏",
  linkedin: "💼",
  pinterest: "📌",
  tiktok: "🎵",
  tumblr: "📑",
  discord: "💬",
  google_business: "🏢",
}

export default function SocialPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([])
  const [rules, setRules] = useState<Rule[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  // manual-connect form
  const [mp, setMp] = useState("discord")
  const [mName, setMName] = useState("")
  const [mToken, setMToken] = useState("")
  const [mExtId, setMExtId] = useState("")
  const [mMeta, setMMeta] = useState("")

  // rule form
  const [rName, setRName] = useState(tt("Auto-post new cars", "نشر السيارات الجديدة"))
  const [rTemplate, setRTemplate] = useState("{title}\n{description}\n{url}")
  const [rAccounts, setRAccounts] = useState<string[]>([])
  const [rDelay, setRDelay] = useState(0)

  async function loadAll() {
    setLoading(true)
    try {
      const [a, p, r, ps] = await Promise.all([
        api("/accounts"),
        api("/platforms"),
        api("/rules"),
        api("/posts?limit=30"),
      ])
      setAccounts(a.accounts || [])
      setPlatforms(p.platforms || [])
      setRules(r.rules || [])
      setPosts(ps.posts || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    loadAll()
  }, [])

  async function connectFacebook() {
    try {
      const { url } = await api("/oauth/facebook/start", { method: "POST", body: "{}" })
      window.location.href = url
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function manualConnect() {
    try {
      let metadata: any = null
      if (mMeta.trim()) {
        try {
          metadata = JSON.parse(mMeta)
        } catch {
          toast.error(tt("Metadata must be valid JSON", "البيانات الإضافية لازم JSON صحيح"))
          return
        }
      }
      await api("/accounts/manual", {
        method: "POST",
        body: JSON.stringify({
          platform: mp,
          name: mName || mp,
          access_token: mToken,
          external_id: mExtId || null,
          metadata,
        }),
      })
      toast.success(tt("Account connected", "تم ربط الحساب"))
      setMName("")
      setMToken("")
      setMExtId("")
      setMMeta("")
      loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function toggleAccount(acc: Account) {
    await api(`/accounts/${acc.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !acc.enabled }),
    }).catch((e) => toast.error(e.message))
    loadAll()
  }
  async function deleteAccount(acc: Account) {
    if (!confirm(tt(`Disconnect ${acc.name}?`, `فصل ${acc.name}؟`))) return
    await api(`/accounts/${acc.id}`, { method: "DELETE" }).catch((e) => toast.error(e.message))
    loadAll()
  }

  async function createRule() {
    if (!rAccounts.length) {
      toast.error(tt("Pick at least one account", "اختر حساب واحد على الأقل"))
      return
    }
    try {
      await api("/rules", {
        method: "POST",
        body: JSON.stringify({
          name: rName,
          event: "product_created",
          account_ids: rAccounts,
          template: rTemplate,
          delay_minutes: Number(rDelay) || 0,
        }),
      })
      toast.success(tt("Rule created", "تم إنشاء القاعدة"))
      setRAccounts([])
      loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }
  async function toggleRule(rule: Rule) {
    await api(`/rules/${rule.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !rule.enabled }),
    }).catch((e) => toast.error(e.message))
    loadAll()
  }
  async function deleteRule(rule: Rule) {
    if (!confirm(tt("Delete this rule?", "حذف القاعدة؟"))) return
    await api(`/rules/${rule.id}`, { method: "DELETE" }).catch((e) => toast.error(e.message))
    loadAll()
  }

  const selectedPlatformInfo = platforms.find((p) => p.platform === mp)
  const statusColor = (s: string) =>
    s === "published" ? "green" : s === "failed" ? "red" : "orange"

  return (
    <SingleColumnPage>
      <Container className="p-6">
        <Heading level="h1">{tt("Social Posting", "النشر على السوشيال")}</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          {tt(
            "Connect your social accounts and auto-post every new car.",
            "اربط حساباتك على السوشيال وانشر كل عربية جديدة أوتوماتيك."
          )}
        </Text>
      </Container>

      {/* Connected accounts */}
      <Container className="p-6 mt-4">
        <Heading level="h2">{tt("Connected accounts", "الحسابات المربوطة")}</Heading>
        <div className="mt-3 flex flex-col gap-2">
          {accounts.length === 0 && (
            <Text className="text-ui-fg-subtle">
              {loading ? tt("Loading…", "جاري التحميل…") : tt("No accounts yet.", "لا توجد حسابات بعد.")}
            </Text>
          )}
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between border rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 18 }}>{PLATFORM_EMOJI[acc.platform] || "🔗"}</span>
                <div>
                  <Text weight="plus">{acc.name}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {acc.platform}
                    {acc.external_id ? ` · ${acc.external_id}` : ""}
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={acc.enabled ? "green" : "grey"}>
                  {acc.enabled ? tt("On", "مفعّل") : tt("Off", "موقوف")}
                </Badge>
                <Switch checked={acc.enabled} onCheckedChange={() => toggleAccount(acc)} />
                <Button variant="danger" size="small" onClick={() => deleteAccount(acc)}>
                  {tt("Remove", "حذف")}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Connect new */}
        <div className="mt-6 border-t pt-4">
          <Heading level="h3">{tt("Connect a new account", "ربط حساب جديد")}</Heading>

          <div className="mt-3">
            <Button variant="secondary" onClick={connectFacebook}>
              📘 {tt("Sign in with Facebook / Instagram", "تسجيل الدخول بفيسبوك / إنستغرام")}
            </Button>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              {tt(
                "Requires FACEBOOK_APP_ID / SECRET in the server env.",
                "يتطلب FACEBOOK_APP_ID / SECRET في إعدادات السيرفر."
              )}
            </Text>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>{tt("Platform", "المنصة")}</Label>
              <Select value={mp} onValueChange={setMp}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {platforms
                    .filter((p) => p.connect !== "oauth")
                    .map((p) => (
                      <Select.Item key={p.platform} value={p.platform}>
                        {PLATFORM_EMOJI[p.platform]} {p.label}
                      </Select.Item>
                    ))}
                </Select.Content>
              </Select>
            </div>
            <div>
              <Label>{tt("Display name", "اسم الحساب")}</Label>
              <Input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="My Page" />
            </div>
            <div className="md:col-span-2">
              <Label>
                {mp === "discord"
                  ? tt("Webhook URL", "رابط الـ Webhook")
                  : tt("Access token", "التوكن")}
              </Label>
              <Textarea
                value={mToken}
                onChange={(e) => setMToken(e.target.value)}
                placeholder={mp === "discord" ? "https://discord.com/api/webhooks/…" : "token…"}
              />
            </div>
            {selectedPlatformInfo?.needs?.includes("external_id") && (
              <div>
                <Label>{tt("External ID (page/blog/urn/location)", "المعرّف الخارجي")}</Label>
                <Input value={mExtId} onChange={(e) => setMExtId(e.target.value)} />
              </div>
            )}
            {selectedPlatformInfo?.needs?.some((n) => n.startsWith("metadata.")) && (
              <div>
                <Label>{tt("Extra (JSON, e.g. board_id)", "إضافي (JSON مثل board_id)")}</Label>
                <Input
                  value={mMeta}
                  onChange={(e) => setMMeta(e.target.value)}
                  placeholder='{"board_id":"123"}'
                />
              </div>
            )}
          </div>
          <Button className="mt-3" onClick={manualConnect} disabled={!mToken}>
            {tt("Connect", "ربط")}
          </Button>
        </div>
      </Container>

      {/* Auto-post rules */}
      <Container className="p-6 mt-4">
        <Heading level="h2">{tt("Auto-post rules", "قواعد النشر التلقائي")}</Heading>
        <Text className="text-ui-fg-subtle mt-1">
          {tt(
            "Every new car that matches a rule is posted automatically.",
            "كل عربية جديدة تطابق القاعدة تتنشر تلقائيًا."
          )}
        </Text>

        <div className="mt-3 flex flex-col gap-2">
          {rules.map((rule) => (
            <div key={rule.id} className="border rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <Text weight="plus">{rule.name}</Text>
                <div className="flex items-center gap-3">
                  <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule)} />
                  <Button variant="danger" size="small" onClick={() => deleteRule(rule)}>
                    {tt("Delete", "حذف")}
                  </Button>
                </div>
              </div>
              <Text size="small" className="text-ui-fg-subtle mt-1">
                {rule.account_ids.length} {tt("account(s)", "حساب")} ·{" "}
                {rule.delay_minutes > 0
                  ? tt(`delay ${rule.delay_minutes}m`, `تأخير ${rule.delay_minutes}د`)
                  : tt("immediate", "فوري")}
              </Text>
            </div>
          ))}
        </div>

        {/* New rule */}
        <div className="mt-6 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{tt("Rule name", "اسم القاعدة")}</Label>
            <Input value={rName} onChange={(e) => setRName(e.target.value)} />
          </div>
          <div>
            <Label>{tt("Delay (minutes)", "تأخير (دقائق)")}</Label>
            <Input
              type="number"
              value={rDelay}
              onChange={(e) => setRDelay(Number(e.target.value))}
            />
          </div>
          <div className="md:col-span-2">
            <Label>{tt("Caption template", "قالب المنشور")}</Label>
            <Textarea value={rTemplate} onChange={(e) => setRTemplate(e.target.value)} />
            <Text size="small" className="text-ui-fg-subtle mt-1">
              {tt("Tokens:", "الرموز:")} {"{title} {description} {price} {url} {image} {handle}"}
            </Text>
          </div>
          <div className="md:col-span-2">
            <Label>{tt("Post to accounts", "انشر على الحسابات")}</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {accounts.map((acc) => {
                const on = rAccounts.includes(acc.id)
                return (
                  <Button
                    key={acc.id}
                    size="small"
                    variant={on ? "primary" : "secondary"}
                    onClick={() =>
                      setRAccounts((prev) =>
                        on ? prev.filter((x) => x !== acc.id) : [...prev, acc.id]
                      )
                    }
                  >
                    {PLATFORM_EMOJI[acc.platform]} {acc.name}
                  </Button>
                )
              })}
              {accounts.length === 0 && (
                <Text size="small" className="text-ui-fg-subtle">
                  {tt("Connect an account first.", "اربط حساب الأول.")}
                </Text>
              )}
            </div>
          </div>
        </div>
        <Button className="mt-3" onClick={createRule} disabled={!accounts.length}>
          {tt("Create rule", "إنشاء قاعدة")}
        </Button>
      </Container>

      {/* History */}
      <Container className="p-6 mt-4">
        <Heading level="h2">{tt("Recent posts", "آخر المنشورات")}</Heading>
        <div className="mt-3 flex flex-col gap-2">
          {posts.length === 0 && (
            <Text className="text-ui-fg-subtle">{tt("Nothing posted yet.", "لا يوجد منشورات بعد.")}</Text>
          )}
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span>{PLATFORM_EMOJI[p.platform] || "🔗"}</span>
                <Text size="small" className="truncate" style={{ maxWidth: 360 }}>
                  {p.content?.slice(0, 80)}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                {p.error && (
                  <Text size="small" className="text-ui-fg-error truncate" style={{ maxWidth: 200 }}>
                    {p.error}
                  </Text>
                )}
                <Badge color={statusColor(p.status)}>{p.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}
