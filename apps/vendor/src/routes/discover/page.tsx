import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { SingleColumnPage } from "@mercurjs/dashboard-shared"
import { Container, Heading, Text } from "@medusajs/ui"
import { Sparkles } from "@medusajs/icons"

// Bilingual EN/AR using the same lightweight pattern as the other vendor routes.
// NOTE: only real characters are used (no \u escapes) — escapes silently break
// the route config loader on this dashboard.
const isAr = typeof document !== "undefined" && (document.documentElement.lang || "").startsWith("ar")
const L = (en: string, ar: string) => (isAr ? ar : en)

export const config: RouteConfig = {
  label: isAr ? "اكتشف أدواتك" : "Discover Tools",
  icon: Sparkles,
  rank: 0,
}

type Tool = { icon: string; title: string; desc: string; href: string; tag?: string }
type Group = { emoji: string; heading: string; sub: string; tools: Tool[] }

const GROUPS: Group[] = [
  {
    emoji: "🚀",
    heading: L("Grow & promote", "نمِّ وروّج"),
    sub: L("Reach more customers and fill your calendar.", "اصل لعملاء أكثر واملأ تقويمك."),
    tools: [
      { icon: "📣", title: L("Paid Ads", "إعلانات مدفوعة"), tag: L("Popular", "شائع"), href: "/rental/ads", desc: L("Promote your cars on Instagram, Facebook, TikTok, Snapchat & Google from one prepaid AED wallet.", "روّج سياراتك على إنستغرام وفيسبوك وتيك توك وسناب شات وجوجل من محفظة واحدة مدفوعة مسبقًا بالدرهم.") },
      { icon: "🎁", title: L("Promotions", "العروض"), href: "/rental/promotions", desc: L("Run discounts and featured placement to stand out in search results.", "أطلق خصومات وإبرازًا مميزًا لتتصدّر نتائج البحث.") },
      { icon: "🌐", title: L("Custom Domain", "نطاق مخصّص"), href: "/rental/custom-domain", desc: L("Run your storefront on your own domain — yourcompany.com — with automatic SSL.", "شغّل متجرك على نطاقك الخاص — yourcompany.com — مع شهادة SSL تلقائية.") },
      { icon: "⬇️", title: L("Import Vehicles", "استيراد المركبات"), href: "/rental/import-vehicles", desc: L("Already have a website? Import your entire fleet automatically — no re-typing.", "لديك موقع؟ استورد أسطولك كاملًا تلقائيًا — بلا إعادة إدخال.") },
      { icon: "🔍", title: L("Site Audit", "فحص الموقع"), href: "/rental/site-audit", desc: L("Check your store's SEO and performance health, and fix issues.", "افحص صحة متجرك في السيو والأداء، وأصلح المشاكل.") },
    ],
  },
  {
    emoji: "📊",
    heading: L("Understand your performance", "افهم أداءك"),
    sub: L("Know exactly what's working — and what to improve.", "اعرف بالضبط ما ينجح وما يحتاج تحسينًا."),
    tools: [
      { icon: "🌍", title: L("Live Traffic", "الزيارات المباشرة"), href: "/rental/traffic", desc: L("See visitors on your store right now, live on a world map.", "شاهد زوّار متجرك الآن مباشرةً على خريطة العالم.") },
      { icon: "📈", title: L("Detailed Analytics", "تحليلات مفصّلة"), href: "/rental/analytics", desc: L("Calls, WhatsApp, free calls and views — with charts, sources and top cars.", "مكالمات وواتساب ومكالمات مجانية ومشاهدات — مع رسوم بيانية ومصادر وأفضل السيارات.") },
      { icon: "🤖", title: L("AI Assistant", "المساعد الذكي"), tag: L("New", "جديد"), href: "/rental/ai-assistant", desc: L("Ask AI about your business in plain language — reports, insights and PDF catalogs.", "اسأل الذكاء الاصطناعي عن عملك بلغة طبيعية — تقارير ورؤى وكتالوجات PDF.") },
    ],
  },
  {
    emoji: "💬",
    heading: L("Engage your customers", "تفاعل مع عملائك"),
    sub: L("Build a following and reply fast — bookings follow.", "ابنِ جمهورًا وردّ بسرعة — الحجوزات تتبع."),
    tools: [
      { icon: "👥", title: L("Followers", "المتابعون"), href: "/rental/followers", desc: L("See the customers who follow your company.", "شاهد العملاء الذين يتابعون شركتك.") },
      { icon: "🔔", title: L("Notify Followers", "إشعار المتابعين"), href: "/rental/notify", desc: L("Send a push notification to all your followers about a new car or a deal.", "أرسل إشعارًا فوريًا لكل متابعيك عن سيارة جديدة أو عرض.") },
      { icon: "✉️", title: L("Messages", "الرسائل"), href: "/rental/messages", desc: L("Chat directly with customers from one inbox.", "دردش مع العملاء مباشرةً من صندوق وارد واحد.") },
      { icon: "📞", title: L("Call Log", "سجل المكالمات"), href: "/rental/calls", desc: L("Track free in-app voice and video calls from customers.", "تابع المكالمات الصوتية والمرئية المجانية داخل التطبيق من العملاء.") },
      { icon: "⭐", title: L("Reviews", "التقييمات"), href: "/rental/reviews", desc: L("Read and manage what customers say about you.", "اقرأ وأدِر ما يقوله العملاء عنك.") },
    ],
  },
  {
    emoji: "🏢",
    heading: L("Manage your business", "أدر عملك"),
    sub: L("Everything to keep your fleet and profile sharp.", "كل ما يبقي أسطولك وملفك في أفضل حال."),
    tools: [
      { icon: "🚗", title: L("Vehicles", "المركبات"), href: "/rental/vehicles", desc: L("Add and manage cars with VIN auto-decode and daily / weekly / monthly pricing.", "أضف وأدِر السيارات مع فك VIN تلقائي وتسعير يومي / أسبوعي / شهري.") },
      { icon: "🧾", title: L("Orders", "الطلبات"), href: "/rental/orders", desc: L("View bookings and customer orders.", "اعرض الحجوزات وطلبات العملاء.") },
      { icon: "🏬", title: L("Store Profile", "ملف المتجر"), href: "/rental/settings/store", desc: L("Banner, logo, description and contact details customers see.", "الغلاف والشعار والوصف وبيانات التواصل التي يراها العملاء.") },
      { icon: "🚚", title: L("Locations & Delivery", "المواقع والتوصيل"), href: "/rental/settings/delivery", desc: L("Set your branches and delivery zones.", "حدّد فروعك ومناطق التوصيل.") },
      { icon: "📱", title: L("Contact & Social", "التواصل والسوشيال"), href: "/rental/settings/contact-social", desc: L("Your phone, WhatsApp and social media links.", "هاتفك وواتساب وروابط مواقع التواصل الاجتماعي.") },
      { icon: "📜", title: L("Trade License", "الرخصة التجارية"), href: "/rental/settings/trade-license", desc: L("Upload your license to earn the verified badge.", "ارفع رخصتك لتحصل على شارة التوثيق.") },
      { icon: "💳", title: L("Subscription", "الاشتراك"), href: "/rental/subscription", desc: L("Manage your plan and billing.", "أدِر خطتك وفواتيرك.") },
    ],
  },
]

const Page = () => {
  return (
    <SingleColumnPage>
      {/* Hero */}
      <Container className="p-6">
        <div className="rounded-2xl bg-gradient-to-br from-ui-tag-blue-bg via-ui-bg-base to-ui-bg-base p-6 border border-ui-border-base">
          <Heading level="h1" className="flex items-center gap-2 text-2xl">
            <span>✨</span> {L("Discover everything you can do", "اكتشف كل ما يمكنك فعله")}
          </Heading>
          <Text className="text-ui-fg-subtle mt-2 max-w-2xl leading-relaxed">
            {L(
              "Auto to Rental gives you a full professional toolkit to run, promote and grow your rental business. Here is everything available to you — tap any tool to open it.",
              "تمنحك Auto to Rental مجموعة أدوات احترافية كاملة لإدارة وترويج وتنمية عملك في التأجير. إليك كل ما هو متاح لك — اضغط أي أداة لفتحها.",
            )}
          </Text>
        </div>
      </Container>

      {GROUPS.map((g, gi) => (
        <Container key={gi} className="p-6 pt-0">
          <Heading level="h3" className="flex items-center gap-2">
            <span>{g.emoji}</span> {g.heading}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle mb-4">{g.sub}</Text>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {g.tools.map((a, i) => (
              <a
                key={i}
                href={a.href}
                className="group bg-ui-bg-base border border-ui-border-base hover:border-ui-fg-muted hover:shadow-md rounded-xl p-4 flex items-start gap-3 transition"
              >
                <div className="text-2xl">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ui-fg-base group-hover:text-ui-fg-interactive flex items-center gap-2 flex-wrap">
                    {a.title}
                    {a.tag && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-ui-tag-blue-bg text-ui-tag-blue-text">
                        {a.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ui-fg-subtle mt-0.5 leading-relaxed">{a.desc}</div>
                </div>
                <span className="text-ui-fg-muted">→</span>
              </a>
            ))}
          </div>
        </Container>
      ))}
    </SingleColumnPage>
  )
}

export default Page
