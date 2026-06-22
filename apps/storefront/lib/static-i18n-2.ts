// Localized content for the /help and /blog index (chrome) pages.
// FAQ answers, hero copy, CTAs and labels are translated for all 7 locales.
// Blog POST titles/bodies come from lib/blog-posts.ts and are NOT translated here —
// only the page chrome (hero, breadcrumbs, section labels, links, FAQ, CTA).
// seoFor() handles canonical/hreflang/og:locale internally.
import { type Locale, DEFAULT_LOCALE } from "./locales"

export type HelpFaq = { q: string; a: string }
export type HelpFaqGroup = { section: string; items: HelpFaq[] }

export type HelpContent = {
  metaTitle: string
  metaDesc: string
  bcHome: string
  bcHelp: string
  h1: string
  heroSub: string
  searchPlaceholder: string
  noMatchPre: string // before the <strong>{query}</strong>
  noMatchPost: string // after it, before the contact link
  contactLink: string
  stillTitle: string
  stillSub: string
  whatsapp: string
  call: string
  email: string
  groups: HelpFaqGroup[]
}

export type BlogContent = {
  metaTitle: string
  metaDesc: string
  bcHome: string
  bcBlog: string
  h1: string
  heroSub: string
  featuredLabel: string
  minRead: string // "min read"
  promoLabel: string
  promoTitle: string
  promoSub: string
  promoteCta: string
  linksHeading: string
  linksPara: string
  browseAll: string
  monthlyDeals: string
  verifiedCompanies: string
  popularBrands: string
  faqHeading: string
  faqPricesQ: string
  faqPricesA: string
  faqBookQ: string
  faqBookA: string
  faqCompaniesQ: string
  faqCompaniesAPre: string // text before the inline "List Your Car" link
  listYourCar: string
  faqCompaniesAPost: string // text after the link (may be empty)
  ctaTitle: string
  ctaSub: string
  ctaBtn: string
}

const HELP: Record<Locale, HelpContent> = {
  en: {
    metaTitle: "Help Center — Auto to Rental",
    metaDesc: "Answers for renters and rental companies: fees, verification, Free International Call, payments, subscriptions, safety and trust.",
    bcHome: "Home", bcHelp: "Help",
    h1: "How can we help?",
    heroSub: "Search our help center or contact us directly.",
    searchPlaceholder: "Search… (e.g. cancel, payment, verify)",
    noMatchPre: "No FAQ matches ", noMatchPost: ". ",
    contactLink: "Contact us directly",
    stillTitle: "Still need help?",
    stillSub: "Get in touch — we usually reply within a few hours.",
    whatsapp: "WhatsApp", call: "Call", email: "Email",
    groups: [
      {
        section: "For Customers",
        items: [
          { q: "Do I pay any fee or commission to Auto to Rental?", a: "No. You pay only the rental company directly. We charge zero commission and zero booking fees." },
          { q: "How do I rent a car?", a: "Browse listings, find a car you like, then click WhatsApp, Phone, or Free International Call to contact the rental company directly. Agree the terms with them, pick up the car." },
          { q: "Are the rental companies verified?", a: "Yes. Every rental company is verified — trade license, identity, and operational checks — before they can list cars. You will see a blue ✓ Verified badge on legitimate companies." },
          { q: "Can I rent from outside the UAE / Syria?", a: "Yes. Use the Free International Call button on any listing — it is a free WebRTC call to the rental company, no international charges. Then arrange delivery or pickup." },
          { q: "What is the “Free International Call” feature?", a: "It is a browser-based video call (WebRTC). The rental company receives a live call directly in their browser. You do not pay international phone charges." },
          { q: "Can I cancel?", a: "Cancellation policies are set by each rental company. Always confirm cancellation terms with them before paying." },
          { q: "Are reviews real?", a: "Reviews are pulled from each rental company’s Google Business Profile and from customers who rented through Auto to Rental." },
        ],
      },
      {
        section: "For Rental Companies",
        items: [
          { q: "How much does it cost to list my cars?", a: "Free for the first 30 days. After that: AED 99/month (Basic), AED 249/month (Pro), or AED 999/year (Annual — save 17%)." },
          { q: "Do you take commission on bookings?", a: "Never. Customers contact you directly. You set the price. You keep 100%." },
          { q: "How do I sign up?", a: "Go to List Your Car or click “List your car”. We verify your trade license within 24 hours, then you can publish listings immediately." },
          { q: "How do customers reach me?", a: "Through your phone number, WhatsApp, or our Free International Call feature. All contacts go directly to you." },
          { q: "Can I edit listings?", a: "Yes. Log in at partner.autotorental.com/rental and use the vendor dashboard to add, edit, pause, or remove vehicles." },
          { q: "Will I get notified of new enquiries?", a: "Yes — WhatsApp messages, phone calls, and Free Call requests reach you directly. You also see analytics of all interactions in your dashboard." },
        ],
      },
      {
        section: "Payments & Subscriptions",
        items: [
          { q: "What payment methods do you accept (for rental company subscriptions)?", a: "Credit card via Stripe (Visa, Mastercard, Amex). For Syria operations, we also support bank transfer." },
          { q: "Can I cancel my subscription anytime?", a: "Yes. Cancel from your vendor dashboard. Your listings stay live until the end of your current paid period." },
          { q: "Do you offer refunds?", a: "Mid-period subscription refunds are reviewed case-by-case. Contact us for help." },
        ],
      },
      {
        section: "Safety & Trust",
        items: [
          { q: "I had a bad experience with a rental company. What do I do?", a: "Report the listing using the flag icon on the vehicle page. Or contact us at hello@autotorental.com — we take complaints seriously and remove bad actors." },
          { q: "How do you verify rental companies?", a: "We check trade license, owner identity, business location, and existing online reviews before approving any listing." },
          { q: "Is my data safe?", a: "Yes. We do not sell your data. See our privacy policy for the details." },
        ],
      },
    ],
  },
  ar: {
    metaTitle: "مركز المساعدة — Auto to Rental",
    metaDesc: "إجابات للمستأجرين وشركات التأجير: الرسوم، التحقق، المكالمة الدولية المجانية، المدفوعات، الاشتراكات، الأمان والثقة.",
    bcHome: "الرئيسية", bcHelp: "المساعدة",
    h1: "كيف يمكننا مساعدتك؟",
    heroSub: "ابحث في مركز المساعدة أو تواصل معنا مباشرة.",
    searchPlaceholder: "ابحث… (مثل: إلغاء، دفع، تحقق)",
    noMatchPre: "لا توجد أسئلة شائعة تطابق ", noMatchPost: ". ",
    contactLink: "تواصل معنا مباشرة",
    stillTitle: "ما زلت بحاجة إلى مساعدة؟",
    stillSub: "تواصل معنا — عادةً نرد خلال بضع ساعات.",
    whatsapp: "واتساب", call: "اتصال", email: "بريد إلكتروني",
    groups: [
      {
        section: "للعملاء",
        items: [
          { q: "هل أدفع أي رسوم أو عمولة لـ Auto to Rental؟", a: "لا. تدفع فقط لشركة التأجير مباشرة. نحن لا نفرض أي عمولة ولا رسوم حجز." },
          { q: "كيف أستأجر سيارة؟", a: "تصفح الإعلانات، اعثر على سيارة تعجبك، ثم اضغط واتساب أو هاتف أو مكالمة دولية مجانية للتواصل مع شركة التأجير مباشرة. اتفق على الشروط معها واستلم السيارة." },
          { q: "هل شركات التأجير موثوقة؟", a: "نعم. تتم مراجعة كل شركة تأجير — الرخصة التجارية والهوية والفحوصات التشغيلية — قبل أن تتمكن من إدراج السيارات. سترى شارة ✓ موثوق زرقاء على الشركات الموثوقة." },
          { q: "هل يمكنني الاستئجار من خارج الإمارات / سوريا؟", a: "نعم. استخدم زر المكالمة الدولية المجانية في أي إعلان — إنها مكالمة WebRTC مجانية مع شركة التأجير دون رسوم دولية. ثم رتّب التوصيل أو الاستلام." },
          { q: "ما هي ميزة «المكالمة الدولية المجانية»؟", a: "إنها مكالمة فيديو عبر المتصفح (WebRTC). تتلقى شركة التأجير مكالمة مباشرة داخل متصفحها. لا تدفع رسوم هاتف دولية." },
          { q: "هل يمكنني الإلغاء؟", a: "تُحدد سياسات الإلغاء من قبل كل شركة تأجير. تأكد دائماً من شروط الإلغاء معها قبل الدفع." },
          { q: "هل التقييمات حقيقية؟", a: "تُجمع التقييمات من ملف Google Business لكل شركة تأجير ومن العملاء الذين استأجروا عبر Auto to Rental." },
        ],
      },
      {
        section: "لشركات التأجير",
        items: [
          { q: "كم تكلفة إدراج سياراتي؟", a: "مجاني لأول 30 يوماً. بعد ذلك: 99 درهماً/شهر (أساسي)، 249 درهماً/شهر (احترافي)، أو 999 درهماً/سنة (سنوي — وفّر 17%)." },
          { q: "هل تأخذون عمولة على الحجوزات؟", a: "أبداً. يتواصل العملاء معك مباشرة. أنت تحدد السعر. وتحتفظ بنسبة 100%." },
          { q: "كيف أشترك؟", a: "اذهب إلى أدرج سيارتك أو اضغط «أدرج سيارتك». نتحقق من رخصتك التجارية خلال 24 ساعة، ثم يمكنك نشر الإعلانات فوراً." },
          { q: "كيف يصل إليّ العملاء؟", a: "عبر رقم هاتفك أو واتساب أو ميزة المكالمة الدولية المجانية. تصل كل وسائل التواصل إليك مباشرة." },
          { q: "هل يمكنني تعديل الإعلانات؟", a: "نعم. سجّل الدخول على partner.autotorental.com/rental واستخدم لوحة التحكم لإضافة المركبات أو تعديلها أو إيقافها أو إزالتها." },
          { q: "هل سيتم إشعاري بالاستفسارات الجديدة؟", a: "نعم — تصلك رسائل واتساب والمكالمات الهاتفية وطلبات المكالمة المجانية مباشرة. كما ترى تحليلات لكل التفاعلات في لوحة التحكم." },
        ],
      },
      {
        section: "المدفوعات والاشتراكات",
        items: [
          { q: "ما طرق الدفع التي تقبلونها (لاشتراكات شركات التأجير)؟", a: "بطاقة ائتمان عبر Stripe (Visa، Mastercard، Amex). لعمليات سوريا، ندعم أيضاً التحويل المصرفي." },
          { q: "هل يمكنني إلغاء اشتراكي في أي وقت؟", a: "نعم. ألغِ من لوحة التحكم. تبقى إعلاناتك نشطة حتى نهاية فترة الدفع الحالية." },
          { q: "هل تقدمون استرداداً؟", a: "تُراجع طلبات استرداد الاشتراك خلال الفترة حالة بحالة. تواصل معنا للمساعدة." },
        ],
      },
      {
        section: "الأمان والثقة",
        items: [
          { q: "واجهت تجربة سيئة مع شركة تأجير. ماذا أفعل؟", a: "أبلغ عن الإعلان باستخدام أيقونة العلم في صفحة المركبة. أو تواصل معنا على hello@autotorental.com — نحن نأخذ الشكاوى على محمل الجد ونزيل المسيئين." },
          { q: "كيف تتحققون من شركات التأجير؟", a: "نتحقق من الرخصة التجارية وهوية المالك وموقع العمل والتقييمات الموجودة عبر الإنترنت قبل الموافقة على أي إعلان." },
          { q: "هل بياناتي آمنة؟", a: "نعم. نحن لا نبيع بياناتك. راجع سياسة الخصوصية للتفاصيل." },
        ],
      },
    ],
  },
  es: {
    metaTitle: "Centro de ayuda — Auto to Rental",
    metaDesc: "Respuestas para clientes y empresas de alquiler: tarifas, verificación, Llamada Internacional Gratis, pagos, suscripciones, seguridad y confianza.",
    bcHome: "Inicio", bcHelp: "Ayuda",
    h1: "¿Cómo podemos ayudarte?",
    heroSub: "Busca en nuestro centro de ayuda o contáctanos directamente.",
    searchPlaceholder: "Buscar… (p. ej. cancelar, pago, verificar)",
    noMatchPre: "Ninguna pregunta frecuente coincide con ", noMatchPost: ". ",
    contactLink: "Contáctanos directamente",
    stillTitle: "¿Aún necesitas ayuda?",
    stillSub: "Ponte en contacto — solemos responder en unas horas.",
    whatsapp: "WhatsApp", call: "Llamar", email: "Correo",
    groups: [
      {
        section: "Para clientes",
        items: [
          { q: "¿Pago alguna tarifa o comisión a Auto to Rental?", a: "No. Solo pagas directamente a la empresa de alquiler. No cobramos comisión ni tarifas de reserva." },
          { q: "¿Cómo alquilo un auto?", a: "Explora los anuncios, encuentra un auto que te guste y luego haz clic en WhatsApp, Teléfono o Llamada Internacional Gratis para contactar directamente con la empresa. Acuerda los términos con ellos y recoge el auto." },
          { q: "¿Las empresas de alquiler están verificadas?", a: "Sí. Cada empresa se verifica — licencia comercial, identidad y controles operativos — antes de poder publicar autos. Verás una insignia azul ✓ Verificado en las empresas legítimas." },
          { q: "¿Puedo alquilar desde fuera de EAU / Siria?", a: "Sí. Usa el botón de Llamada Internacional Gratis en cualquier anuncio — es una llamada WebRTC gratuita a la empresa, sin cargos internacionales. Luego organiza la entrega o recogida." },
          { q: "¿Qué es la función «Llamada Internacional Gratis»?", a: "Es una videollamada en el navegador (WebRTC). La empresa recibe una llamada en vivo directamente en su navegador. No pagas cargos telefónicos internacionales." },
          { q: "¿Puedo cancelar?", a: "Las políticas de cancelación las fija cada empresa de alquiler. Confirma siempre los términos de cancelación con ellos antes de pagar." },
          { q: "¿Las reseñas son reales?", a: "Las reseñas provienen del perfil de Google Business de cada empresa y de clientes que alquilaron a través de Auto to Rental." },
        ],
      },
      {
        section: "Para empresas de alquiler",
        items: [
          { q: "¿Cuánto cuesta publicar mis autos?", a: "Gratis los primeros 30 días. Después: AED 99/mes (Básico), AED 249/mes (Pro) o AED 999/año (Anual — ahorra 17%)." },
          { q: "¿Cobran comisión por las reservas?", a: "Nunca. Los clientes te contactan directamente. Tú pones el precio. Te quedas con el 100%." },
          { q: "¿Cómo me registro?", a: "Ve a Publica tu auto o haz clic en «Publica tu auto». Verificamos tu licencia comercial en 24 horas y luego puedes publicar anuncios de inmediato." },
          { q: "¿Cómo me contactan los clientes?", a: "A través de tu número de teléfono, WhatsApp o nuestra función de Llamada Internacional Gratis. Todos los contactos llegan directamente a ti." },
          { q: "¿Puedo editar los anuncios?", a: "Sí. Inicia sesión en partner.autotorental.com/rental y usa el panel para añadir, editar, pausar o quitar vehículos." },
          { q: "¿Me notificarán las nuevas consultas?", a: "Sí — los mensajes de WhatsApp, las llamadas y las solicitudes de Llamada Gratis llegan directamente a ti. También ves análisis de todas las interacciones en tu panel." },
        ],
      },
      {
        section: "Pagos y suscripciones",
        items: [
          { q: "¿Qué métodos de pago aceptan (para suscripciones de empresas)?", a: "Tarjeta de crédito vía Stripe (Visa, Mastercard, Amex). Para operaciones en Siria, también admitimos transferencia bancaria." },
          { q: "¿Puedo cancelar mi suscripción en cualquier momento?", a: "Sí. Cancela desde tu panel. Tus anuncios siguen activos hasta el final del periodo pagado actual." },
          { q: "¿Ofrecen reembolsos?", a: "Los reembolsos de suscripción a mitad de periodo se revisan caso por caso. Contáctanos para ayuda." },
        ],
      },
      {
        section: "Seguridad y confianza",
        items: [
          { q: "Tuve una mala experiencia con una empresa de alquiler. ¿Qué hago?", a: "Reporta el anuncio con el icono de bandera en la página del vehículo. O escríbenos a hello@autotorental.com — tomamos las quejas en serio y eliminamos a los infractores." },
          { q: "¿Cómo verifican a las empresas de alquiler?", a: "Comprobamos la licencia comercial, la identidad del propietario, la ubicación del negocio y las reseñas en línea existentes antes de aprobar cualquier anuncio." },
          { q: "¿Están seguros mis datos?", a: "Sí. No vendemos tus datos. Consulta nuestra política de privacidad para más detalles." },
        ],
      },
    ],
  },
  zh: {
    metaTitle: "帮助中心 — Auto to Rental",
    metaDesc: "为租客和租车公司提供解答：费用、认证、免费国际通话、付款、订阅、安全与信任。",
    bcHome: "首页", bcHelp: "帮助",
    h1: "我们能帮您什么？",
    heroSub: "搜索我们的帮助中心或直接联系我们。",
    searchPlaceholder: "搜索…（例如 取消、付款、认证）",
    noMatchPre: "没有匹配的常见问题：", noMatchPost: "。",
    contactLink: "直接联系我们",
    stillTitle: "仍需帮助？",
    stillSub: "与我们联系 — 我们通常在几小时内回复。",
    whatsapp: "WhatsApp", call: "致电", email: "电子邮件",
    groups: [
      {
        section: "面向客户",
        items: [
          { q: "我需要向 Auto to Rental 支付任何费用或佣金吗？", a: "不需要。您只需直接向租车公司付款。我们收取零佣金、零预订费。" },
          { q: "我该如何租车？", a: "浏览房源，找到喜欢的车，然后点击 WhatsApp、电话或免费国际通话直接联系租车公司。与他们商定条款后取车即可。" },
          { q: "租车公司经过认证吗？", a: "是的。每家租车公司在发布车辆前都会经过认证 — 营业执照、身份和运营审核。您会在正规公司上看到蓝色的 ✓ 认证徽章。" },
          { q: "我能在阿联酋 / 叙利亚境外租车吗？", a: "可以。在任何房源上使用免费国际通话按钮 — 这是与租车公司之间的免费 WebRTC 通话，无国际费用。然后安排送车或取车。" },
          { q: "什么是「免费国际通话」功能？", a: "这是一种基于浏览器的视频通话（WebRTC）。租车公司会直接在其浏览器中接到实时通话。您无需支付国际电话费。" },
          { q: "我可以取消吗？", a: "取消政策由各租车公司制定。付款前请务必与他们确认取消条款。" },
          { q: "评价是真实的吗？", a: "评价来自每家租车公司的 Google 商家资料，以及通过 Auto to Rental 租车的客户。" },
        ],
      },
      {
        section: "面向租车公司",
        items: [
          { q: "发布我的车辆需要多少费用？", a: "前 30 天免费。之后：每月 99 迪拉姆（基础版）、每月 249 迪拉姆（专业版）或每年 999 迪拉姆（年付 — 省 17%）。" },
          { q: "你们对预订收取佣金吗？", a: "从不。客户直接联系您。价格由您定。您保留 100%。" },
          { q: "我该如何注册？", a: "前往「发布您的车辆」或点击「发布您的车辆」。我们会在 24 小时内核实您的营业执照，之后您即可立即发布房源。" },
          { q: "客户如何联系我？", a: "通过您的电话号码、WhatsApp 或我们的免费国际通话功能。所有联系都直接到达您本人。" },
          { q: "我可以编辑房源吗？", a: "可以。在 partner.autotorental.com/rental 登录，使用商家后台添加、编辑、暂停或删除车辆。" },
          { q: "我会收到新咨询的通知吗？", a: "会 — WhatsApp 消息、电话和免费通话请求都会直接到达您。您还能在后台查看所有互动的分析。" },
        ],
      },
      {
        section: "付款与订阅",
        items: [
          { q: "你们接受哪些付款方式（用于租车公司订阅）？", a: "通过 Stripe 的信用卡（Visa、Mastercard、Amex）。对于叙利亚业务，我们也支持银行转账。" },
          { q: "我可以随时取消订阅吗？", a: "可以。在商家后台取消。您的房源将持续显示至当前付费周期结束。" },
          { q: "你们提供退款吗？", a: "周期中途的订阅退款将逐案审核。如需帮助请联系我们。" },
        ],
      },
      {
        section: "安全与信任",
        items: [
          { q: "我与某家租车公司的体验很糟糕。我该怎么办？", a: "在车辆页面使用旗帜图标举报该房源。或发送邮件至 hello@autotorental.com — 我们认真对待投诉并清除不良商家。" },
          { q: "你们如何认证租车公司？", a: "在批准任何房源前，我们会核查营业执照、车主身份、营业地点和现有的在线评价。" },
          { q: "我的数据安全吗？", a: "安全。我们不出售您的数据。详情请参阅我们的隐私政策。" },
        ],
      },
    ],
  },
  th: {
    metaTitle: "ศูนย์ช่วยเหลือ — Auto to Rental",
    metaDesc: "คำตอบสำหรับผู้เช่าและบริษัทเช่ารถ: ค่าธรรมเนียม การยืนยัน โทรระหว่างประเทศฟรี การชำระเงิน การสมัครสมาชิก ความปลอดภัยและความน่าเชื่อถือ",
    bcHome: "หน้าแรก", bcHelp: "ช่วยเหลือ",
    h1: "เราช่วยอะไรคุณได้บ้าง?",
    heroSub: "ค้นหาในศูนย์ช่วยเหลือหรือติดต่อเราโดยตรง",
    searchPlaceholder: "ค้นหา… (เช่น ยกเลิก ชำระเงิน ยืนยัน)",
    noMatchPre: "ไม่พบคำถามที่ตรงกับ ", noMatchPost: ". ",
    contactLink: "ติดต่อเราโดยตรง",
    stillTitle: "ยังต้องการความช่วยเหลือ?",
    stillSub: "ติดต่อเรา — โดยปกติเราตอบกลับภายในไม่กี่ชั่วโมง",
    whatsapp: "WhatsApp", call: "โทร", email: "อีเมล",
    groups: [
      {
        section: "สำหรับลูกค้า",
        items: [
          { q: "ฉันต้องจ่ายค่าธรรมเนียมหรือค่าคอมมิชชันให้ Auto to Rental ไหม?", a: "ไม่ คุณจ่ายให้บริษัทเช่ารถโดยตรงเท่านั้น เราไม่คิดค่าคอมมิชชันและไม่มีค่าธรรมเนียมการจอง" },
          { q: "ฉันเช่ารถได้อย่างไร?", a: "เลือกชมประกาศ หารถที่คุณชอบ จากนั้นคลิก WhatsApp โทรศัพท์ หรือโทรระหว่างประเทศฟรี เพื่อติดต่อบริษัทเช่ารถโดยตรง ตกลงเงื่อนไขกับบริษัทแล้วรับรถ" },
          { q: "บริษัทเช่ารถได้รับการยืนยันไหม?", a: "ใช่ ทุกบริษัทได้รับการยืนยัน — ใบอนุญาตการค้า ตัวตน และการตรวจสอบการดำเนินงาน — ก่อนจึงจะลงประกาศรถได้ คุณจะเห็นป้าย ✓ ยืนยันแล้วสีน้ำเงินบนบริษัทที่ถูกต้อง" },
          { q: "ฉันเช่าจากนอก UAE / ซีเรียได้ไหม?", a: "ได้ ใช้ปุ่มโทรระหว่างประเทศฟรีบนประกาศใดก็ได้ — เป็นการโทร WebRTC ฟรีถึงบริษัทเช่ารถ ไม่มีค่าโทรระหว่างประเทศ จากนั้นนัดส่งหรือรับรถ" },
          { q: "ฟีเจอร์ «โทรระหว่างประเทศฟรี» คืออะไร?", a: "เป็นการวิดีโอคอลผ่านเบราว์เซอร์ (WebRTC) บริษัทเช่ารถจะรับสายสดในเบราว์เซอร์ของตนโดยตรง คุณไม่ต้องจ่ายค่าโทรศัพท์ระหว่างประเทศ" },
          { q: "ฉันยกเลิกได้ไหม?", a: "นโยบายการยกเลิกกำหนดโดยแต่ละบริษัทเช่ารถ ควรยืนยันเงื่อนไขการยกเลิกกับบริษัทก่อนชำระเงินเสมอ" },
          { q: "รีวิวเป็นของจริงไหม?", a: "รีวิวดึงมาจากโปรไฟล์ Google Business ของแต่ละบริษัทและจากลูกค้าที่เช่าผ่าน Auto to Rental" },
        ],
      },
      {
        section: "สำหรับบริษัทเช่ารถ",
        items: [
          { q: "การลงประกาศรถของฉันมีค่าใช้จ่ายเท่าไร?", a: "ฟรี 30 วันแรก หลังจากนั้น: 99 AED/เดือน (พื้นฐาน), 249 AED/เดือน (โปร) หรือ 999 AED/ปี (รายปี — ประหยัด 17%)" },
          { q: "คุณเก็บค่าคอมมิชชันจากการจองไหม?", a: "ไม่เลย ลูกค้าติดต่อคุณโดยตรง คุณตั้งราคาเอง คุณได้รับ 100%" },
          { q: "ฉันสมัครได้อย่างไร?", a: "ไปที่ ลงประกาศรถของคุณ หรือคลิก «ลงประกาศรถของคุณ» เราจะยืนยันใบอนุญาตการค้าของคุณภายใน 24 ชั่วโมง จากนั้นคุณเผยแพร่ประกาศได้ทันที" },
          { q: "ลูกค้าติดต่อฉันได้อย่างไร?", a: "ผ่านหมายเลขโทรศัพท์ WhatsApp หรือฟีเจอร์โทรระหว่างประเทศฟรีของเรา การติดต่อทั้งหมดมาถึงคุณโดยตรง" },
          { q: "ฉันแก้ไขประกาศได้ไหม?", a: "ได้ เข้าสู่ระบบที่ partner.autotorental.com/rental และใช้แดชบอร์ดผู้ขายเพื่อเพิ่ม แก้ไข พัก หรือลบรถ" },
          { q: "ฉันจะได้รับการแจ้งเตือนคำถามใหม่ไหม?", a: "ได้ — ข้อความ WhatsApp การโทร และคำขอโทรฟรีจะมาถึงคุณโดยตรง คุณยังเห็นการวิเคราะห์การโต้ตอบทั้งหมดในแดชบอร์ดด้วย" },
        ],
      },
      {
        section: "การชำระเงินและการสมัครสมาชิก",
        items: [
          { q: "คุณรับวิธีชำระเงินแบบใด (สำหรับการสมัครสมาชิกของบริษัทเช่ารถ)?", a: "บัตรเครดิตผ่าน Stripe (Visa, Mastercard, Amex) สำหรับการดำเนินงานในซีเรีย เรารองรับการโอนเงินผ่านธนาคารด้วย" },
          { q: "ฉันยกเลิกการสมัครสมาชิกได้ทุกเมื่อไหม?", a: "ได้ ยกเลิกจากแดชบอร์ดผู้ขายของคุณ ประกาศของคุณจะยังแสดงจนสิ้นสุดรอบที่ชำระเงินปัจจุบัน" },
          { q: "คุณมีการคืนเงินไหม?", a: "การคืนเงินการสมัครสมาชิกระหว่างรอบจะพิจารณาเป็นรายกรณี ติดต่อเราเพื่อขอความช่วยเหลือ" },
        ],
      },
      {
        section: "ความปลอดภัยและความน่าเชื่อถือ",
        items: [
          { q: "ฉันมีประสบการณ์ไม่ดีกับบริษัทเช่ารถ ควรทำอย่างไร?", a: "รายงานประกาศโดยใช้ไอคอนธงบนหน้ารถ หรือติดต่อเราที่ hello@autotorental.com — เราให้ความสำคัญกับข้อร้องเรียนและกำจัดผู้กระทำผิด" },
          { q: "คุณยืนยันบริษัทเช่ารถอย่างไร?", a: "เราตรวจสอบใบอนุญาตการค้า ตัวตนของเจ้าของ ที่ตั้งธุรกิจ และรีวิวออนไลน์ที่มีอยู่ก่อนอนุมัติประกาศใด ๆ" },
          { q: "ข้อมูลของฉันปลอดภัยไหม?", a: "ปลอดภัย เราไม่ขายข้อมูลของคุณ ดูรายละเอียดในนโยบายความเป็นส่วนตัวของเรา" },
        ],
      },
    ],
  },
  ru: {
    metaTitle: "Центр помощи — Auto to Rental",
    metaDesc: "Ответы для арендаторов и компаний по аренде: сборы, проверка, бесплатный международный звонок, платежи, подписки, безопасность и доверие.",
    bcHome: "Главная", bcHelp: "Помощь",
    h1: "Чем мы можем помочь?",
    heroSub: "Найдите ответ в центре помощи или свяжитесь с нами напрямую.",
    searchPlaceholder: "Поиск… (напр. отмена, оплата, проверка)",
    noMatchPre: "Нет вопросов, соответствующих ", noMatchPost: ". ",
    contactLink: "Связаться с нами напрямую",
    stillTitle: "Всё ещё нужна помощь?",
    stillSub: "Свяжитесь с нами — обычно мы отвечаем в течение нескольких часов.",
    whatsapp: "WhatsApp", call: "Позвонить", email: "Эл. почта",
    groups: [
      {
        section: "Для клиентов",
        items: [
          { q: "Плачу ли я сбор или комиссию Auto to Rental?", a: "Нет. Вы платите только напрямую компании по аренде. Мы берём нулевую комиссию и нулевые сборы за бронирование." },
          { q: "Как арендовать авто?", a: "Просмотрите объявления, найдите понравившееся авто, затем нажмите WhatsApp, Телефон или Бесплатный международный звонок, чтобы связаться с компанией напрямую. Согласуйте условия и заберите авто." },
          { q: "Проверены ли компании по аренде?", a: "Да. Каждая компания проходит проверку — торговая лицензия, личность и операционные проверки — прежде чем размещать авто. У надёжных компаний вы увидите синий значок ✓ Проверено." },
          { q: "Могу ли я арендовать из-за пределов ОАЭ / Сирии?", a: "Да. Используйте кнопку Бесплатный международный звонок в любом объявлении — это бесплатный WebRTC-звонок компании без международных сборов. Затем договоритесь о доставке или получении." },
          { q: "Что такое функция «Бесплатный международный звонок»?", a: "Это видеозвонок в браузере (WebRTC). Компания получает живой звонок прямо в своём браузере. Вы не платите за международную телефонную связь." },
          { q: "Могу ли я отменить?", a: "Политику отмены устанавливает каждая компания по аренде. Всегда уточняйте условия отмены до оплаты." },
          { q: "Отзывы настоящие?", a: "Отзывы берутся из профиля Google Business каждой компании и от клиентов, арендовавших через Auto to Rental." },
        ],
      },
      {
        section: "Для компаний по аренде",
        items: [
          { q: "Сколько стоит разместить мои авто?", a: "Бесплатно первые 30 дней. Далее: 99 AED/мес (Базовый), 249 AED/мес (Pro) или 999 AED/год (Годовой — экономия 17%)." },
          { q: "Берёте ли вы комиссию с бронирований?", a: "Никогда. Клиенты связываются с вами напрямую. Вы устанавливаете цену. Вы оставляете 100%." },
          { q: "Как зарегистрироваться?", a: "Перейдите в Разместить авто или нажмите «Разместить авто». Мы проверяем вашу торговую лицензию в течение 24 часов, после чего вы можете сразу публиковать объявления." },
          { q: "Как клиенты со мной связываются?", a: "Через ваш номер телефона, WhatsApp или нашу функцию Бесплатного международного звонка. Все контакты поступают напрямую вам." },
          { q: "Могу ли я редактировать объявления?", a: "Да. Войдите на partner.autotorental.com/rental и используйте панель продавца, чтобы добавлять, редактировать, приостанавливать или удалять авто." },
          { q: "Буду ли я получать уведомления о новых запросах?", a: "Да — сообщения WhatsApp, звонки и запросы Бесплатного звонка поступают вам напрямую. Также вы видите аналитику всех взаимодействий в панели." },
        ],
      },
      {
        section: "Платежи и подписки",
        items: [
          { q: "Какие способы оплаты вы принимаете (для подписок компаний)?", a: "Кредитная карта через Stripe (Visa, Mastercard, Amex). Для операций в Сирии мы также поддерживаем банковский перевод." },
          { q: "Можно ли отменить подписку в любое время?", a: "Да. Отмените её в панели продавца. Ваши объявления остаются активными до конца текущего оплаченного периода." },
          { q: "Предлагаете ли вы возврат средств?", a: "Возврат за подписку в середине периода рассматривается индивидуально. Свяжитесь с нами за помощью." },
        ],
      },
      {
        section: "Безопасность и доверие",
        items: [
          { q: "У меня был плохой опыт с компанией по аренде. Что делать?", a: "Пожалуйтесь на объявление с помощью значка флага на странице авто. Или напишите нам на hello@autotorental.com — мы серьёзно относимся к жалобам и удаляем недобросовестных." },
          { q: "Как вы проверяете компании по аренде?", a: "Мы проверяем торговую лицензию, личность владельца, местоположение бизнеса и существующие онлайн-отзывы перед одобрением любого объявления." },
          { q: "В безопасности ли мои данные?", a: "Да. Мы не продаём ваши данные. Подробности см. в нашей политике конфиденциальности." },
        ],
      },
    ],
  },
  ur: {
    metaTitle: "مدد مرکز — Auto to Rental",
    metaDesc: "کرایہ داروں اور کرایہ کمپنیوں کے لیے جوابات: فیس، تصدیق، مفت بین الاقوامی کال، ادائیگیاں، سبسکرپشن، تحفظ اور اعتماد۔",
    bcHome: "ہوم", bcHelp: "مدد",
    h1: "ہم آپ کی کیا مدد کر سکتے ہیں؟",
    heroSub: "ہمارے مدد مرکز میں تلاش کریں یا براہ راست ہم سے رابطہ کریں۔",
    searchPlaceholder: "تلاش کریں… (مثلاً منسوخ، ادائیگی، تصدیق)",
    noMatchPre: "کوئی سوال مماثل نہیں: ", noMatchPost: "۔ ",
    contactLink: "براہ راست ہم سے رابطہ کریں",
    stillTitle: "ابھی بھی مدد درکار ہے؟",
    stillSub: "رابطہ کریں — ہم عام طور پر چند گھنٹوں میں جواب دیتے ہیں۔",
    whatsapp: "واٹس ایپ", call: "کال", email: "ای میل",
    groups: [
      {
        section: "صارفین کے لیے",
        items: [
          { q: "کیا میں Auto to Rental کو کوئی فیس یا کمیشن ادا کرتا ہوں؟", a: "نہیں۔ آپ صرف کرایہ کمپنی کو براہ راست ادائیگی کرتے ہیں۔ ہم صفر کمیشن اور صفر بکنگ فیس لیتے ہیں۔" },
          { q: "میں گاڑی کیسے کرائے پر لوں؟", a: "اشتہار دیکھیں، پسندیدہ گاڑی تلاش کریں، پھر کرایہ کمپنی سے براہ راست رابطے کے لیے واٹس ایپ، فون یا مفت بین الاقوامی کال پر کلک کریں۔ ان کے ساتھ شرائط طے کریں اور گاڑی لے لیں۔" },
          { q: "کیا کرایہ کمپنیاں تصدیق شدہ ہیں؟", a: "جی ہاں۔ ہر کرایہ کمپنی کی تصدیق ہوتی ہے — تجارتی لائسنس، شناخت اور آپریشنل جانچ — اس سے پہلے کہ وہ گاڑیاں درج کر سکیں۔ آپ کو قابل اعتماد کمپنیوں پر نیلا ✓ تصدیق شدہ بیج نظر آئے گا۔" },
          { q: "کیا میں UAE / شام سے باہر سے کرائے پر لے سکتا ہوں؟", a: "جی ہاں۔ کسی بھی اشتہار پر مفت بین الاقوامی کال بٹن استعمال کریں — یہ کرایہ کمپنی کو ایک مفت WebRTC کال ہے، کوئی بین الاقوامی چارجز نہیں۔ پھر ڈیلیوری یا پک اپ طے کریں۔" },
          { q: "«مفت بین الاقوامی کال» فیچر کیا ہے؟", a: "یہ براؤزر پر مبنی ویڈیو کال (WebRTC) ہے۔ کرایہ کمپنی کو براہ راست اپنے براؤزر میں لائیو کال موصول ہوتی ہے۔ آپ بین الاقوامی فون چارجز ادا نہیں کرتے۔" },
          { q: "کیا میں منسوخ کر سکتا ہوں؟", a: "منسوخی کی پالیسیاں ہر کرایہ کمپنی طے کرتی ہے۔ ادائیگی سے پہلے ہمیشہ ان سے منسوخی کی شرائط کی تصدیق کریں۔" },
          { q: "کیا جائزے حقیقی ہیں؟", a: "جائزے ہر کرایہ کمپنی کے Google Business پروفائل اور Auto to Rental کے ذریعے کرائے پر لینے والے صارفین سے لیے جاتے ہیں۔" },
        ],
      },
      {
        section: "کرایہ کمپنیوں کے لیے",
        items: [
          { q: "میری گاڑیاں درج کرنے کی لاگت کتنی ہے؟", a: "پہلے 30 دن مفت۔ اس کے بعد: 99 AED/ماہ (بنیادی)، 249 AED/ماہ (پرو)، یا 999 AED/سال (سالانہ — 17% بچت)۔" },
          { q: "کیا آپ بکنگ پر کمیشن لیتے ہیں؟", a: "کبھی نہیں۔ صارفین آپ سے براہ راست رابطہ کرتے ہیں۔ قیمت آپ طے کرتے ہیں۔ آپ 100% رکھتے ہیں۔" },
          { q: "میں سائن اپ کیسے کروں؟", a: "اپنی گاڑی درج کریں پر جائیں یا «اپنی گاڑی درج کریں» پر کلک کریں۔ ہم 24 گھنٹوں میں آپ کے تجارتی لائسنس کی تصدیق کرتے ہیں، پھر آپ فوراً اشتہار شائع کر سکتے ہیں۔" },
          { q: "صارفین مجھ تک کیسے پہنچتے ہیں؟", a: "آپ کے فون نمبر، واٹس ایپ یا ہمارے مفت بین الاقوامی کال فیچر کے ذریعے۔ تمام رابطے براہ راست آپ تک پہنچتے ہیں۔" },
          { q: "کیا میں اشتہار میں ترمیم کر سکتا ہوں؟", a: "جی ہاں۔ partner.autotorental.com/rental پر لاگ ان کریں اور گاڑیاں شامل کرنے، ترمیم، روکنے یا ہٹانے کے لیے وینڈر ڈیش بورڈ استعمال کریں۔" },
          { q: "کیا مجھے نئی پوچھ گچھ کی اطلاع ملے گی؟", a: "جی ہاں — واٹس ایپ پیغامات، فون کالز اور مفت کال درخواستیں براہ راست آپ تک پہنچتی ہیں۔ آپ ڈیش بورڈ میں تمام تعاملات کا تجزیہ بھی دیکھتے ہیں۔" },
        ],
      },
      {
        section: "ادائیگیاں اور سبسکرپشن",
        items: [
          { q: "آپ کون سے ادائیگی کے طریقے قبول کرتے ہیں (کرایہ کمپنی سبسکرپشن کے لیے)؟", a: "Stripe کے ذریعے کریڈٹ کارڈ (Visa، Mastercard، Amex)۔ شام کی کارروائیوں کے لیے، ہم بینک ٹرانسفر کی بھی سہولت دیتے ہیں۔" },
          { q: "کیا میں کسی بھی وقت سبسکرپشن منسوخ کر سکتا ہوں؟", a: "جی ہاں۔ اپنے وینڈر ڈیش بورڈ سے منسوخ کریں۔ آپ کے اشتہار موجودہ ادا شدہ مدت کے اختتام تک فعال رہتے ہیں۔" },
          { q: "کیا آپ رقم واپسی کی پیشکش کرتے ہیں؟", a: "مدت کے دوران سبسکرپشن کی رقم واپسی کا جائزہ ہر کیس کے حساب سے لیا جاتا ہے۔ مدد کے لیے ہم سے رابطہ کریں۔" },
        ],
      },
      {
        section: "تحفظ اور اعتماد",
        items: [
          { q: "مجھے کرایہ کمپنی کے ساتھ برا تجربہ ہوا۔ میں کیا کروں؟", a: "گاڑی کے صفحے پر جھنڈے کے آئیکن سے اشتہار کی اطلاع دیں۔ یا hello@autotorental.com پر ہم سے رابطہ کریں — ہم شکایات کو سنجیدگی سے لیتے ہیں اور برے عناصر کو ہٹا دیتے ہیں۔" },
          { q: "آپ کرایہ کمپنیوں کی تصدیق کیسے کرتے ہیں؟", a: "کسی بھی اشتہار کی منظوری سے پہلے ہم تجارتی لائسنس، مالک کی شناخت، کاروباری مقام اور موجودہ آن لائن جائزوں کی جانچ کرتے ہیں۔" },
          { q: "کیا میرا ڈیٹا محفوظ ہے؟", a: "جی ہاں۔ ہم آپ کا ڈیٹا فروخت نہیں کرتے۔ تفصیلات کے لیے ہماری رازداری کی پالیسی دیکھیں۔" },
        ],
      },
    ],
  },
}

const BLOG: Record<Locale, BlogContent> = {
  en: {
    metaTitle: "Car Rental Blog — Tips, Guides, Reviews",
    metaDesc: "Expert guides on car rental in Dubai and UAE. Cheapest car rental tips, luxury car reviews, tourist guides, and money-saving strategies.",
    bcHome: "Home", bcBlog: "Blog",
    h1: "Car Rental Blog",
    heroSub: "Honest tips, real prices, and practical guides for renting cars in Dubai and the UAE.",
    featuredLabel: "Featured", minRead: "min read",
    promoLabel: "Promotional Slot",
    promoTitle: "Advertise your rental offer in editorial sections",
    promoSub: "Place contextual offers beside high-traffic guides about car rental, pricing, and travel planning.",
    promoteCta: "Promote your fleet",
    linksHeading: "Useful rental links for readers",
    linksPara: "Turn blog reading into action with direct links to live car inventory, verified rental companies, and keyword-focused category pages.",
    browseAll: "Browse all rental cars", monthlyDeals: "Monthly rental deals",
    verifiedCompanies: "Verified companies", popularBrands: "Popular brands",
    faqHeading: "FAQ",
    faqPricesQ: "Do blog prices reflect market reality?",
    faqPricesA: "Guides are updated based on market data and current listings.",
    faqBookQ: "Can I book from the blog?",
    faqBookA: "Each guide links to live inventory and company pages where you can contact providers directly.",
    faqCompaniesQ: "How can companies appear in guides?",
    faqCompaniesAPre: "Businesses can join and request promotional placements via ",
    listYourCar: "List Your Car",
    faqCompaniesAPost: ".",
    ctaTitle: "Ready to rent your car?",
    ctaSub: "Browse 1,200+ cars from verified rental companies across UAE & Syria.",
    ctaBtn: "Browse cars →",
  },
  ar: {
    metaTitle: "مدونة تأجير السيارات — نصائح وأدلة ومراجعات",
    metaDesc: "أدلة الخبراء حول تأجير السيارات في دبي والإمارات. نصائح أرخص تأجير، مراجعات سيارات فاخرة، أدلة سياحية، واستراتيجيات توفير المال.",
    bcHome: "الرئيسية", bcBlog: "المدونة",
    h1: "مدونة تأجير السيارات",
    heroSub: "نصائح صادقة وأسعار حقيقية وأدلة عملية لتأجير السيارات في دبي والإمارات.",
    featuredLabel: "مميز", minRead: "دقيقة قراءة",
    promoLabel: "مساحة ترويجية",
    promoTitle: "أعلن عن عرض التأجير الخاص بك في الأقسام التحريرية",
    promoSub: "ضع عروضاً سياقية بجوار الأدلة عالية الزيارات حول تأجير السيارات والأسعار وتخطيط السفر.",
    promoteCta: "روّج لأسطولك",
    linksHeading: "روابط تأجير مفيدة للقراء",
    linksPara: "حوّل قراءة المدونة إلى فعل عبر روابط مباشرة لمخزون السيارات الحي والشركات الموثوقة وصفحات الفئات المركزة على الكلمات المفتاحية.",
    browseAll: "تصفح كل سيارات الإيجار", monthlyDeals: "عروض الإيجار الشهرية",
    verifiedCompanies: "شركات موثوقة", popularBrands: "ماركات شائعة",
    faqHeading: "الأسئلة الشائعة",
    faqPricesQ: "هل تعكس أسعار المدونة واقع السوق؟",
    faqPricesA: "تُحدَّث الأدلة بناءً على بيانات السوق والإعلانات الحالية.",
    faqBookQ: "هل يمكنني الحجز من المدونة؟",
    faqBookA: "يرتبط كل دليل بالمخزون الحي وصفحات الشركات حيث يمكنك التواصل مع مزودي الخدمة مباشرة.",
    faqCompaniesQ: "كيف يمكن للشركات أن تظهر في الأدلة؟",
    faqCompaniesAPre: "يمكن للشركات الانضمام وطلب مواضع ترويجية عبر ",
    listYourCar: "أدرج سيارتك",
    faqCompaniesAPost: ".",
    ctaTitle: "هل أنت مستعد لاستئجار سيارتك؟",
    ctaSub: "تصفح أكثر من 1,200 سيارة من شركات تأجير موثوقة في الإمارات وسوريا.",
    ctaBtn: "تصفح السيارات ←",
  },
  es: {
    metaTitle: "Blog de alquiler de autos — Consejos, guías, reseñas",
    metaDesc: "Guías expertas sobre alquiler de autos en Dubái y EAU. Consejos del alquiler más barato, reseñas de autos de lujo, guías turísticas y estrategias de ahorro.",
    bcHome: "Inicio", bcBlog: "Blog",
    h1: "Blog de alquiler de autos",
    heroSub: "Consejos honestos, precios reales y guías prácticas para alquilar autos en Dubái y EAU.",
    featuredLabel: "Destacado", minRead: "min de lectura",
    promoLabel: "Espacio promocional",
    promoTitle: "Anuncia tu oferta de alquiler en las secciones editoriales",
    promoSub: "Coloca ofertas contextuales junto a guías de alto tráfico sobre alquiler de autos, precios y planificación de viajes.",
    promoteCta: "Promociona tu flota",
    linksHeading: "Enlaces de alquiler útiles para lectores",
    linksPara: "Convierte la lectura del blog en acción con enlaces directos al inventario en vivo, empresas verificadas y páginas de categoría enfocadas en palabras clave.",
    browseAll: "Ver todos los autos en alquiler", monthlyDeals: "Ofertas de alquiler mensual",
    verifiedCompanies: "Empresas verificadas", popularBrands: "Marcas populares",
    faqHeading: "Preguntas frecuentes",
    faqPricesQ: "¿Los precios del blog reflejan la realidad del mercado?",
    faqPricesA: "Las guías se actualizan según datos del mercado y los anuncios actuales.",
    faqBookQ: "¿Puedo reservar desde el blog?",
    faqBookA: "Cada guía enlaza con inventario en vivo y páginas de empresas donde puedes contactar a los proveedores directamente.",
    faqCompaniesQ: "¿Cómo pueden las empresas aparecer en las guías?",
    faqCompaniesAPre: "Las empresas pueden unirse y solicitar ubicaciones promocionales mediante ",
    listYourCar: "Publica tu auto",
    faqCompaniesAPost: ".",
    ctaTitle: "¿Listo para alquilar tu auto?",
    ctaSub: "Explora más de 1,200 autos de empresas verificadas en EAU y Siria.",
    ctaBtn: "Ver autos →",
  },
  zh: {
    metaTitle: "租车博客 — 技巧、指南、评测",
    metaDesc: "迪拜和阿联酋租车的专家指南。最便宜租车技巧、豪华车评测、游客指南和省钱策略。",
    bcHome: "首页", bcBlog: "博客",
    h1: "租车博客",
    heroSub: "在迪拜和阿联酋租车的真实技巧、实价和实用指南。",
    featuredLabel: "精选", minRead: "分钟阅读",
    promoLabel: "推广位",
    promoTitle: "在编辑栏目中宣传您的租车优惠",
    promoSub: "将相关优惠放在关于租车、定价和旅行规划的高流量指南旁边。",
    promoteCta: "推广您的车队",
    linksHeading: "面向读者的实用租车链接",
    linksPara: "通过直达实时车辆库存、认证租车公司和关键词聚焦分类页面的链接，把阅读化为行动。",
    browseAll: "浏览所有出租车辆", monthlyDeals: "月租优惠",
    verifiedCompanies: "认证公司", popularBrands: "热门品牌",
    faqHeading: "常见问题",
    faqPricesQ: "博客价格反映市场实际情况吗？",
    faqPricesA: "指南根据市场数据和当前房源进行更新。",
    faqBookQ: "我能从博客预订吗？",
    faqBookA: "每篇指南都链接到实时库存和公司页面，您可在那里直接联系供应商。",
    faqCompaniesQ: "公司如何出现在指南中？",
    faqCompaniesAPre: "企业可以加入并通过 ",
    listYourCar: "发布您的车辆",
    faqCompaniesAPost: " 申请推广位。",
    ctaTitle: "准备好租车了吗？",
    ctaSub: "浏览来自阿联酋和叙利亚认证租车公司的 1,200+ 辆车。",
    ctaBtn: "浏览车辆 →",
  },
  th: {
    metaTitle: "บล็อกเช่ารถ — เคล็ดลับ คู่มือ รีวิว",
    metaDesc: "คู่มือจากผู้เชี่ยวชาญเรื่องการเช่ารถในดูไบและ UAE เคล็ดลับเช่ารถถูกที่สุด รีวิวรถหรู คู่มือนักท่องเที่ยว และกลยุทธ์ประหยัดเงิน",
    bcHome: "หน้าแรก", bcBlog: "บล็อก",
    h1: "บล็อกเช่ารถ",
    heroSub: "เคล็ดลับจริงใจ ราคาจริง และคู่มือใช้งานได้จริงสำหรับการเช่ารถในดูไบและ UAE",
    featuredLabel: "แนะนำ", minRead: "นาทีในการอ่าน",
    promoLabel: "พื้นที่โปรโมชัน",
    promoTitle: "โฆษณาข้อเสนอเช่ารถของคุณในส่วนบทความ",
    promoSub: "วางข้อเสนอที่เกี่ยวข้องข้างคู่มือที่มีผู้เข้าชมสูงเกี่ยวกับการเช่ารถ ราคา และการวางแผนเดินทาง",
    promoteCta: "โปรโมตฟลีตของคุณ",
    linksHeading: "ลิงก์เช่ารถที่มีประโยชน์สำหรับผู้อ่าน",
    linksPara: "เปลี่ยนการอ่านบล็อกเป็นการลงมือทำด้วยลิงก์ตรงไปยังสต็อกรถสด บริษัทเช่ารถที่ได้รับการยืนยัน และหน้าหมวดหมู่ที่เน้นคีย์เวิร์ด",
    browseAll: "ดูรถให้เช่าทั้งหมด", monthlyDeals: "ดีลเช่ารายเดือน",
    verifiedCompanies: "บริษัทที่ได้รับการยืนยัน", popularBrands: "แบรนด์ยอดนิยม",
    faqHeading: "คำถามที่พบบ่อย",
    faqPricesQ: "ราคาในบล็อกสะท้อนความเป็นจริงของตลาดไหม?",
    faqPricesA: "คู่มือได้รับการอัปเดตตามข้อมูลตลาดและประกาศปัจจุบัน",
    faqBookQ: "ฉันจองจากบล็อกได้ไหม?",
    faqBookA: "คู่มือแต่ละชิ้นเชื่อมโยงกับสต็อกสดและหน้าบริษัทที่คุณติดต่อผู้ให้บริการได้โดยตรง",
    faqCompaniesQ: "บริษัทจะปรากฏในคู่มือได้อย่างไร?",
    faqCompaniesAPre: "ธุรกิจสามารถเข้าร่วมและขอตำแหน่งโปรโมชันได้ผ่าน ",
    listYourCar: "ลงประกาศรถของคุณ",
    faqCompaniesAPost: "",
    ctaTitle: "พร้อมเช่ารถแล้วหรือยัง?",
    ctaSub: "เลือกชมรถกว่า 1,200 คันจากบริษัทเช่ารถที่ได้รับการยืนยันทั่ว UAE และซีเรีย",
    ctaBtn: "ดูรถ →",
  },
  ru: {
    metaTitle: "Блог об аренде авто — советы, гиды, обзоры",
    metaDesc: "Экспертные руководства по аренде авто в Дубае и ОАЭ. Советы по самой дешёвой аренде, обзоры люкс-авто, гиды для туристов и стратегии экономии.",
    bcHome: "Главная", bcBlog: "Блог",
    h1: "Блог об аренде авто",
    heroSub: "Честные советы, реальные цены и практичные руководства по аренде авто в Дубае и ОАЭ.",
    featuredLabel: "Избранное", minRead: "мин чтения",
    promoLabel: "Рекламное место",
    promoTitle: "Рекламируйте своё предложение аренды в редакционных разделах",
    promoSub: "Размещайте контекстные предложения рядом с популярными руководствами об аренде авто, ценах и планировании поездок.",
    promoteCta: "Продвигайте свой автопарк",
    linksHeading: "Полезные ссылки об аренде для читателей",
    linksPara: "Превратите чтение блога в действие: прямые ссылки на актуальный каталог авто, проверенные компании и тематические страницы категорий.",
    browseAll: "Смотреть все авто в аренду", monthlyDeals: "Месячные предложения аренды",
    verifiedCompanies: "Проверенные компании", popularBrands: "Популярные марки",
    faqHeading: "Вопросы и ответы",
    faqPricesQ: "Отражают ли цены в блоге реальность рынка?",
    faqPricesA: "Руководства обновляются на основе рыночных данных и текущих объявлений.",
    faqBookQ: "Могу ли я забронировать прямо из блога?",
    faqBookA: "Каждое руководство ссылается на актуальный каталог и страницы компаний, где можно связаться с поставщиками напрямую.",
    faqCompaniesQ: "Как компании могут попасть в руководства?",
    faqCompaniesAPre: "Компании могут присоединиться и запросить рекламные размещения через ",
    listYourCar: "Разместить авто",
    faqCompaniesAPost: ".",
    ctaTitle: "Готовы арендовать авто?",
    ctaSub: "Просмотрите более 1 200 авто от проверенных компаний по аренде в ОАЭ и Сирии.",
    ctaBtn: "Смотреть авто →",
  },
  ur: {
    metaTitle: "کار کرایہ بلاگ — تجاویز، گائیڈز، جائزے",
    metaDesc: "دبئی اور UAE میں کار کرائے پر ماہرانہ گائیڈز۔ سستے ترین کرائے کی تجاویز، لگژری کار جائزے، سیاحتی گائیڈز اور پیسے بچانے کی حکمت عملیاں۔",
    bcHome: "ہوم", bcBlog: "بلاگ",
    h1: "کار کرایہ بلاگ",
    heroSub: "دبئی اور UAE میں گاڑیاں کرائے پر لینے کے لیے سچی تجاویز، حقیقی قیمتیں اور عملی گائیڈز۔",
    featuredLabel: "نمایاں", minRead: "منٹ پڑھنے کا وقت",
    promoLabel: "پروموشنل سلاٹ",
    promoTitle: "ادارتی حصوں میں اپنی کرایہ پیشکش کی تشہیر کریں",
    promoSub: "کار کرائے، قیمتوں اور سفر کی منصوبہ بندی سے متعلق زیادہ ٹریفک والے گائیڈز کے ساتھ متعلقہ پیشکشیں رکھیں۔",
    promoteCta: "اپنے فلیٹ کو فروغ دیں",
    linksHeading: "قارئین کے لیے مفید کرایہ لنکس",
    linksPara: "لائیو کار انوینٹری، تصدیق شدہ کرایہ کمپنیوں اور کلیدی الفاظ پر مرکوز زمرہ صفحات کے براہ راست لنکس کے ساتھ بلاگ پڑھنے کو عمل میں بدلیں۔",
    browseAll: "کرائے کی تمام گاڑیاں دیکھیں", monthlyDeals: "ماہانہ کرایہ ڈیلز",
    verifiedCompanies: "تصدیق شدہ کمپنیاں", popularBrands: "مقبول برانڈز",
    faqHeading: "عمومی سوالات",
    faqPricesQ: "کیا بلاگ کی قیمتیں مارکیٹ کی حقیقت کی عکاسی کرتی ہیں؟",
    faqPricesA: "گائیڈز مارکیٹ ڈیٹا اور موجودہ اشتہار کی بنیاد پر اپ ڈیٹ ہوتے ہیں۔",
    faqBookQ: "کیا میں بلاگ سے بکنگ کر سکتا ہوں؟",
    faqBookA: "ہر گائیڈ لائیو انوینٹری اور کمپنی صفحات سے منسلک ہے جہاں آپ فراہم کنندگان سے براہ راست رابطہ کر سکتے ہیں۔",
    faqCompaniesQ: "کمپنیاں گائیڈز میں کیسے ظاہر ہو سکتی ہیں؟",
    faqCompaniesAPre: "کاروبار شامل ہو سکتے ہیں اور پروموشنل جگہوں کی درخواست کر سکتے ہیں ",
    listYourCar: "اپنی گاڑی درج کریں",
    faqCompaniesAPost: " کے ذریعے۔",
    ctaTitle: "اپنی گاڑی کرائے پر لینے کے لیے تیار ہیں؟",
    ctaSub: "UAE اور شام میں تصدیق شدہ کرایہ کمپنیوں سے 1,200+ گاڑیاں دیکھیں۔",
    ctaBtn: "گاڑیاں دیکھیں ←",
  },
}

export function helpContent(locale: Locale): HelpContent {
  return HELP[locale] || HELP[DEFAULT_LOCALE]
}

export function blogContent(locale: Locale): BlogContent {
  return BLOG[locale] || BLOG[DEFAULT_LOCALE]
}
