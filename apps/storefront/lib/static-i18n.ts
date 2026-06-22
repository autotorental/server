// Localized content for the static /about and /contact pages.
// All visible chrome — hero, breadcrumbs, headings, paragraphs, stats, value
// cards, form labels/placeholders, CTAs and FAQ — is translated for all 7 locales.
// Proper nouns (Auto to Rental, WhatsApp, brand names) stay as-is.
// seoFor() handles canonical/hreflang/og:locale; meta keywords kept in English.
import { type Locale, DEFAULT_LOCALE } from "./locales"

export type AboutValue = { t: string; s: string }
export type AboutStat = { v: string; l: string }

export type AboutContent = {
  metaTitle: string
  metaDesc: string
  bcHome: string
  bcAbout: string
  heroTitlePre: string
  heroTitleHighlight: string
  heroTitlePost: string
  heroSub: string
  storyEyebrow: string
  storyHeading: string
  storyP1: string
  storyP2Pre: string
  storyP2Strong: string
  storyP2Post: string
  storyP3: string
  stats: AboutStat[]
  valuesEyebrow: string
  valuesHeading: string
  values: AboutValue[]
  ctaHeading: string
  ctaSub: string
  ctaBrowse: string
  ctaList: string
}

export type ContactSubject = string

export type ContactContent = {
  metaTitle: string
  metaDesc: string
  bcHome: string
  bcContact: string
  heroTitle: string
  heroSub: string
  whatsapp: string
  whatsappNote: string
  phone: string
  phoneNote: string
  email: string
  emailNote: string
  hqTitle: string
  hqLine1: string
  hqLine2: string
  formHeading: string
  labelName: string
  labelEmail: string
  labelPhone: string
  labelSubject: string
  labelMessage: string
  selectPlaceholder: string
  subjects: ContactSubject[]
  sendBtn: string
  sendingBtn: string
  requiredError: string
  sendError: string
  sentTitle: string
  sentBodyPre: string
  sentBodyPost: string
  sendAnother: string
  privacyPre: string
  privacyLink: string
  privacyPost: string
}

const ABOUT: Record<Locale, AboutContent> = {
  en: {
    metaTitle: "About Us — Auto to Rental",
    metaDesc: "Auto to Rental is the leading car rental marketplace in the UAE and Syria. Browse 1000+ verified vehicles and contact rental companies directly.",
    bcHome: "Home", bcAbout: "About",
    heroTitlePre: "The world’s smartest ", heroTitleHighlight: "car rental marketplace", heroTitlePost: ".",
    heroSub: "Auto to Rental is a global marketplace — connecting renters with verified rental companies in any country. AI-powered listings, zero commission, and direct contact with every company on the platform.",
    storyEyebrow: "Our Story", storyHeading: "International. AI-powered. Zero commission.",
    storyP1: "We built Auto to Rental because car rental deserved a smarter marketplace — one that works for renters everywhere, not just in one city or country. Whether you’re in Dubai, London, or Berlin, you can find and book directly from verified rental companies worldwide.",
    storyP2Pre: "What sets us apart is our built-in ",
    storyP2Strong: "AI engine",
    storyP2Post: " — it automatically generates professional titles, SEO-optimised descriptions, and intelligent feature suggestions for every vehicle. Rental companies look world-class from day one. And we never take a commission. Just a flat monthly subscription — that’s our entire business model.",
    storyP3: "The result: renters get the best prices with no hidden fees, rental companies keep 100% of every booking, and our AI makes every listing the best it can be.",
    stats: [
      { v: "50+", l: "Vehicles listed" },
      { v: "2+", l: "Verified partners" },
      { v: "🌍 Global", l: "Available worldwide" },
      { v: "0%", l: "Commission, ever" },
    ],
    valuesEyebrow: "What we stand for", valuesHeading: "Our principles",
    values: [
      { t: "AI-powered, always", s: "Our AI writes professional titles, SEO descriptions, and feature lists for every vehicle automatically — the smartest listings on any rental marketplace." },
      { t: "Zero commission", s: "We charge rental companies a flat monthly fee — never a percentage of what you pay them. Every dirham goes to the rental company." },
      { t: "Truly international", s: "List and rent from any country. Our platform supports every currency, language, and region worldwide." },
      { t: "Direct contact", s: "You speak to the rental company directly via WhatsApp, phone, or our free AI-powered international video call system." },
      { t: "Verified companies", s: "Every rental company is vetted with trade license and identity checks before going live. Renters can trust every listing." },
      { t: "No surprises", s: "What you see is what you pay. No hidden fees, no booking surcharges, no commission added at checkout." },
    ],
    ctaHeading: "Ready to explore the world?", ctaSub: "Browse cars from verified rental companies worldwide. No account needed.",
    ctaBrowse: "Browse Cars", ctaList: "List your car",
  },
  ar: {
    metaTitle: "من نحن — Auto to Rental",
    metaDesc: "Auto to Rental هي السوق الرائدة لتأجير السيارات في الإمارات وسوريا. تصفح أكثر من 1000 مركبة موثوقة وتواصل مع شركات التأجير مباشرة.",
    bcHome: "الرئيسية", bcAbout: "من نحن",
    heroTitlePre: "السوق التي ", heroTitleHighlight: "تُلغي الوسيط", heroTitlePost: ".",
    heroSub: "تربطك Auto to Rental مباشرة بشركات تأجير موثوقة في جميع أنحاء الإمارات وسوريا. بلا عمولة. بلا رسوم حجز. بلا أي عائق بينك وبين المفاتيح.",
    storyEyebrow: "قصتنا", storyHeading: "صُنعت بأيدي أناس يستأجرون السيارات.",
    storyP1: "أطلقنا Auto to Rental لأن أسواق تأجير السيارات القائمة في المنطقة لم تكن تخدم أحداً حقاً. كان العملاء يدفعون رسوماً خفية، وتخسر شركات التأجير هامش ربحها بسبب العمولة، والجميع محبط.",
    storyP2Pre: "لذلك بنينا شيئاً مختلفاً — سوق تُدرج فيه شركات التأجير سياراتها مجاناً، ويتواصل معها العملاء مباشرة، ونحن نأخذ ",
    storyP2Strong: "عمولة صفرية",
    storyP2Post: " على أي عملية تأجير. نحقق دخلنا بطريقة واحدة صادقة: تدفع شركات التأجير اشتراكاً شهرياً ثابتاً لإبقاء إعلاناتها نشطة. هذا كل شيء.",
    storyP3: "النتيجة: أسعار أكثر عدلاً للعملاء، وإيرادات أكبر لشركات التأجير، وسوق يثق به الناس فعلاً.",
    stats: [
      { v: "1,200+", l: "مركبة مدرجة" },
      { v: "500+", l: "شركة تأجير موثوقة" },
      { v: "16", l: "مدينة مغطاة" },
      { v: "0%", l: "عمولة على الإطلاق" },
    ],
    valuesEyebrow: "ما نؤمن به", valuesHeading: "مبادئنا",
    values: [
      { t: "موثوقة دائماً", s: "تخضع كل شركة تأجير للتدقيق قبل أن تتمكن من الإدراج. رخصة تجارية وهوية وفحوصات تشغيلية." },
      { t: "عمولة صفرية", s: "نتقاضى من شركات التأجير رسماً شهرياً ثابتاً — وليس نسبة مما تدفعه لها أبداً." },
      { t: "تواصل مباشر", s: "تتحدث مع شركة التأجير مباشرة عبر واتساب أو الهاتف أو مكالمة فيديو دولية مجانية." },
      { t: "محلي أولاً", s: "مصمم للإمارات وسوريا — العربية والإنجليزية، الدرهم والليرة السورية والدولار، وطرق دفع محلية." },
      { t: "بلا مفاجآت", s: "ما تراه في الإعلان هو ما تدفعه. لا رسوم خفية ولا عمولة تُضاف عند الدفع." },
      { t: "مجتمع", s: "التقييمات والمتابعات وتحقق Google تعني أن الثقة تُكتسب ولا تُشترى." },
    ],
    ctaHeading: "هل أنت مستعد للعثور على سيارتك؟", ctaSub: "تصفح أكثر من 1,200 مركبة في 16 مدينة. بلا حاجة لحساب.",
    ctaBrowse: "تصفح السيارات", ctaList: "أدرج سيارتك",
  },
  es: {
    metaTitle: "Quiénes somos — Auto to Rental",
    metaDesc: "Auto to Rental es el principal mercado de alquiler de autos en EAU y Siria. Explora más de 1000 vehículos verificados y contacta directamente con las empresas de alquiler.",
    bcHome: "Inicio", bcAbout: "Quiénes somos",
    heroTitlePre: "El mercado que ", heroTitleHighlight: "elimina al intermediario", heroTitlePost: ".",
    heroSub: "Auto to Rental te conecta directamente con empresas de alquiler verificadas en EAU y Siria. Sin comisiones. Sin cargos por reserva. Sin fricciones entre tú y las llaves.",
    storyEyebrow: "Nuestra historia", storyHeading: "Creado por personas que alquilan autos.",
    storyP1: "Creamos Auto to Rental porque los mercados de alquiler de autos existentes en la región no ayudaban de verdad a nadie. Los clientes pagaban tarifas ocultas. Las empresas perdían margen por las comisiones. Todos estaban frustrados.",
    storyP2Pre: "Así que construimos algo diferente: un mercado donde las empresas publican gratis, los clientes las contactan directamente y nosotros cobramos ",
    storyP2Strong: "cero comisión",
    storyP2Post: " en cualquier alquiler. Ganamos dinero de una sola forma honesta: las empresas pagan una suscripción mensual fija para mantener sus anuncios activos. Eso es todo.",
    storyP3: "El resultado: precios más justos para los clientes, más ingresos para las empresas de alquiler y un mercado en el que la gente realmente confía.",
    stats: [
      { v: "1,200+", l: "Vehículos publicados" },
      { v: "500+", l: "Empresas verificadas" },
      { v: "16", l: "Ciudades cubiertas" },
      { v: "0%", l: "Comisión, siempre" },
    ],
    valuesEyebrow: "Lo que defendemos", valuesHeading: "Nuestros principios",
    values: [
      { t: "Verificadas, siempre", s: "Cada empresa de alquiler es evaluada antes de poder publicar. Licencia comercial, identidad y controles operativos." },
      { t: "Cero comisión", s: "Cobramos a las empresas una tarifa mensual fija, nunca un porcentaje de lo que les pagas." },
      { t: "Contacto directo", s: "Hablas con la empresa de alquiler directamente por WhatsApp, teléfono o videollamada internacional gratuita." },
      { t: "Local primero", s: "Creado para EAU y Siria: árabe e inglés, AED + SYP + USD y métodos de pago locales." },
      { t: "Sin sorpresas", s: "Lo que ves en un anuncio es lo que pagas. Sin tarifas ocultas ni comisiones añadidas al pagar." },
      { t: "Comunidad", s: "Reseñas, seguidores y verificación de Google: la confianza se gana, no se compra." },
    ],
    ctaHeading: "¿Listo para encontrar tu auto?", ctaSub: "Explora más de 1,200 vehículos en 16 ciudades. Sin necesidad de cuenta.",
    ctaBrowse: "Explorar autos", ctaList: "Publica tu auto",
  },
  zh: {
    metaTitle: "关于我们 — Auto to Rental",
    metaDesc: "Auto to Rental 是阿联酋和叙利亚领先的租车平台。浏览 1000 多辆认证车辆，直接联系租车公司。",
    bcHome: "首页", bcAbout: "关于我们",
    heroTitlePre: "这个平台", heroTitleHighlight: "去除了中间商", heroTitlePost: "。",
    heroSub: "Auto to Rental 让您直接联系阿联酋和叙利亚的认证租车公司。无佣金，无预订费，您与车钥匙之间没有任何阻碍。",
    storyEyebrow: "我们的故事", storyHeading: "由租车的人打造。",
    storyP1: "我们创立 Auto to Rental，是因为本地区现有的租车平台并未真正帮助任何人。客户支付隐藏费用，租车公司因佣金损失利润，每个人都很沮丧。",
    storyP2Pre: "于是我们打造了不一样的产品 — 一个租车公司免费刊登、客户直接联系、而我们对任何租赁",
    storyP2Strong: "收取零佣金",
    storyP2Post: "的平台。我们以一种诚实的方式盈利：租车公司支付固定的月度订阅费来保持其房源有效。仅此而已。",
    storyP3: "结果是：客户获得更公平的价格，租车公司获得更多收入，平台真正赢得人们的信任。",
    stats: [
      { v: "1,200+", l: "已刊登车辆" },
      { v: "500+", l: "认证租车公司" },
      { v: "16", l: "覆盖城市" },
      { v: "0%", l: "始终零佣金" },
    ],
    valuesEyebrow: "我们的坚持", valuesHeading: "我们的原则",
    values: [
      { t: "始终认证", s: "每家租车公司在刊登前都经过审核 —— 营业执照、身份与运营核查。" },
      { t: "零佣金", s: "我们向租车公司收取固定的月费 —— 绝不抽取您支付金额的任何百分比。" },
      { t: "直接联系", s: "您可通过 WhatsApp、电话或免费国际视频通话直接与租车公司沟通。" },
      { t: "本地优先", s: "为阿联酋和叙利亚打造 —— 阿拉伯语与英语、迪拉姆 + 叙利亚镑 + 美元、本地支付方式。" },
      { t: "没有意外", s: "房源上显示的就是您支付的。没有隐藏费用，结账时不加收佣金。" },
      { t: "社区", s: "评价、关注与 Google 验证意味着信任是赢得的，而非买来的。" },
    ],
    ctaHeading: "准备好找到您的车了吗？", ctaSub: "浏览 16 座城市的 1,200 多辆车。无需注册账户。",
    ctaBrowse: "浏览车辆", ctaList: "刊登您的车",
  },
  th: {
    metaTitle: "เกี่ยวกับเรา — Auto to Rental",
    metaDesc: "Auto to Rental คือมาร์เก็ตเพลสเช่ารถชั้นนำใน UAE และซีเรีย เลือกชมรถที่ได้รับการยืนยันกว่า 1000 คันและติดต่อบริษัทเช่ารถได้โดยตรง",
    bcHome: "หน้าแรก", bcAbout: "เกี่ยวกับเรา",
    heroTitlePre: "มาร์เก็ตเพลสที่ ", heroTitleHighlight: "ตัดคนกลางออกไป", heroTitlePost: "",
    heroSub: "Auto to Rental เชื่อมคุณกับบริษัทเช่ารถที่ได้รับการยืนยันทั่ว UAE และซีเรียโดยตรง ไม่มีค่าคอมมิชชัน ไม่มีค่าจอง ไม่มีอุปสรรคระหว่างคุณกับกุญแจรถ",
    storyEyebrow: "เรื่องราวของเรา", storyHeading: "สร้างโดยคนที่เช่ารถ",
    storyP1: "เราเริ่ม Auto to Rental เพราะมาร์เก็ตเพลสเช่ารถที่มีอยู่ในภูมิภาคนี้ไม่ได้ช่วยใครอย่างแท้จริง ลูกค้าจ่ายค่าธรรมเนียมแอบแฝง บริษัทเช่ารถเสียกำไรให้ค่าคอมมิชชัน ทุกคนหงุดหงิด",
    storyP2Pre: "เราจึงสร้างสิ่งที่แตกต่าง — มาร์เก็ตเพลสที่บริษัทเช่ารถลงประกาศฟรี ลูกค้าติดต่อโดยตรง และเราเก็บ ",
    storyP2Strong: "ค่าคอมมิชชันศูนย์บาท",
    storyP2Post: " จากการเช่าทุกครั้ง เราหารายได้ด้วยวิธีเดียวที่ตรงไปตรงมา คือบริษัทเช่ารถจ่ายค่าสมาชิกรายเดือนแบบคงที่เพื่อให้ประกาศของตนใช้งานได้ เท่านั้นเอง",
    storyP3: "ผลลัพธ์คือ ราคาที่เป็นธรรมกว่าสำหรับลูกค้า รายได้ที่มากขึ้นสำหรับบริษัทเช่ารถ และมาร์เก็ตเพลสที่ผู้คนไว้วางใจจริง ๆ",
    stats: [
      { v: "1,200+", l: "รถที่ลงประกาศ" },
      { v: "500+", l: "บริษัทเช่ารถที่ยืนยันแล้ว" },
      { v: "16", l: "เมืองที่ครอบคลุม" },
      { v: "0%", l: "ค่าคอมมิชชันตลอดไป" },
    ],
    valuesEyebrow: "สิ่งที่เรายึดถือ", valuesHeading: "หลักการของเรา",
    values: [
      { t: "ยืนยันเสมอ", s: "ทุกบริษัทเช่ารถต้องผ่านการตรวจสอบก่อนจึงจะลงประกาศได้ ทั้งใบอนุญาตการค้า ตัวตน และการตรวจสอบการดำเนินงาน" },
      { t: "ค่าคอมมิชชันศูนย์", s: "เราเก็บค่าธรรมเนียมรายเดือนแบบคงที่จากบริษัทเช่ารถ — ไม่เคยเก็บเปอร์เซ็นต์จากเงินที่คุณจ่ายให้พวกเขา" },
      { t: "ติดต่อโดยตรง", s: "คุณคุยกับบริษัทเช่ารถได้โดยตรงผ่าน WhatsApp โทรศัพท์ หรือวิดีโอคอลระหว่างประเทศฟรี" },
      { t: "ท้องถิ่นมาก่อน", s: "สร้างมาเพื่อ UAE และซีเรีย — อาหรับและอังกฤษ, AED + SYP + USD และวิธีชำระเงินท้องถิ่น" },
      { t: "ไม่มีเซอร์ไพรส์", s: "สิ่งที่คุณเห็นในประกาศคือสิ่งที่คุณจ่าย ไม่มีค่าธรรมเนียมแอบแฝง ไม่มีค่าคอมมิชชันเพิ่มตอนชำระเงิน" },
      { t: "ชุมชน", s: "รีวิว การติดตาม และการยืนยันจาก Google หมายความว่าความไว้วางใจต้องได้มา ไม่ใช่ซื้อมา" },
    ],
    ctaHeading: "พร้อมหารถของคุณแล้วหรือยัง?", ctaSub: "เลือกชมรถกว่า 1,200 คันใน 16 เมือง ไม่ต้องมีบัญชี",
    ctaBrowse: "เลือกชมรถ", ctaList: "ลงประกาศรถของคุณ",
  },
  ru: {
    metaTitle: "О нас — Auto to Rental",
    metaDesc: "Auto to Rental — ведущий маркетплейс аренды авто в ОАЭ и Сирии. Просматривайте более 1000 проверенных автомобилей и связывайтесь с компаниями напрямую.",
    bcHome: "Главная", bcAbout: "О нас",
    heroTitlePre: "Маркетплейс, который ", heroTitleHighlight: "убирает посредника", heroTitlePost: ".",
    heroSub: "Auto to Rental напрямую связывает вас с проверенными компаниями по аренде в ОАЭ и Сирии. Без комиссии. Без сборов за бронирование. Без преград между вами и ключами.",
    storyEyebrow: "Наша история", storyHeading: "Создано теми, кто арендует авто.",
    storyP1: "Мы запустили Auto to Rental, потому что существующие маркетплейсы аренды авто в регионе никому по-настоящему не помогали. Клиенты платили скрытые сборы. Компании теряли маржу на комиссиях. Все были разочарованы.",
    storyP2Pre: "Поэтому мы создали нечто иное — маркетплейс, где компании размещают объявления бесплатно, клиенты связываются с ними напрямую, а мы берём ",
    storyP2Strong: "нулевую комиссию",
    storyP2Post: " с любой аренды. Мы зарабатываем одним честным способом: компании платят фиксированную ежемесячную подписку, чтобы их объявления оставались активными. Вот и всё.",
    storyP3: "Результат: более честные цены для клиентов, больше дохода для компаний и маркетплейс, которому люди действительно доверяют.",
    stats: [
      { v: "1,200+", l: "Автомобилей размещено" },
      { v: "500+", l: "Проверенных компаний" },
      { v: "16", l: "Городов охвачено" },
      { v: "0%", l: "Комиссия, всегда" },
    ],
    valuesEyebrow: "За что мы выступаем", valuesHeading: "Наши принципы",
    values: [
      { t: "Всегда проверено", s: "Каждая компания проходит проверку, прежде чем разместить объявление. Лицензия, личность и операционные проверки." },
      { t: "Нулевая комиссия", s: "Мы берём с компаний фиксированную ежемесячную плату — никогда процент от того, что вы им платите." },
      { t: "Прямой контакт", s: "Вы общаетесь с компанией напрямую через WhatsApp, по телефону или в бесплатном международном видеозвонке." },
      { t: "Местное в приоритете", s: "Создано для ОАЭ и Сирии — арабский и английский, AED + SYP + USD, местные способы оплаты." },
      { t: "Без сюрпризов", s: "Что вы видите в объявлении, то и платите. Без скрытых сборов и комиссий при оформлении." },
      { t: "Сообщество", s: "Отзывы, подписки и верификация Google означают, что доверие зарабатывают, а не покупают." },
    ],
    ctaHeading: "Готовы найти своё авто?", ctaSub: "Просмотрите более 1,200 автомобилей в 16 городах. Аккаунт не нужен.",
    ctaBrowse: "Смотреть авто", ctaList: "Разместить своё авто",
  },
  ur: {
    metaTitle: "ہمارے بارے میں — Auto to Rental",
    metaDesc: "Auto to Rental متحدہ عرب امارات اور شام میں کار کرائے کی سب سے بڑی مارکیٹ پلیس ہے۔ 1000 سے زائد تصدیق شدہ گاڑیاں دیکھیں اور کرایہ کمپنیوں سے براہ راست رابطہ کریں۔",
    bcHome: "ہوم", bcAbout: "ہمارے بارے میں",
    heroTitlePre: "وہ مارکیٹ پلیس جو ", heroTitleHighlight: "بیچوان کو ختم کرتی ہے", heroTitlePost: "۔",
    heroSub: "Auto to Rental آپ کو متحدہ عرب امارات اور شام میں تصدیق شدہ کرایہ کمپنیوں سے براہ راست جوڑتی ہے۔ کوئی کمیشن نہیں۔ کوئی بکنگ فیس نہیں۔ آپ اور چابیوں کے درمیان کوئی رکاوٹ نہیں۔",
    storyEyebrow: "ہماری کہانی", storyHeading: "گاڑیاں کرائے پر لینے والوں کے ہاتھوں بنایا گیا۔",
    storyP1: "ہم نے Auto to Rental اس لیے شروع کیا کیونکہ خطے میں موجودہ کار کرایہ مارکیٹ پلیسز واقعی کسی کی مدد نہیں کر رہی تھیں۔ صارفین پوشیدہ فیس ادا کرتے تھے۔ کرایہ کمپنیاں کمیشن میں اپنا منافع کھو دیتی تھیں۔ ہر کوئی پریشان تھا۔",
    storyP2Pre: "تو ہم نے کچھ مختلف بنایا — ایک ایسی مارکیٹ پلیس جہاں کرایہ کمپنیاں مفت میں اشتہار دیتی ہیں، صارفین براہ راست رابطہ کرتے ہیں، اور ہم کسی بھی کرائے پر ",
    storyP2Strong: "صفر کمیشن",
    storyP2Post: " لیتے ہیں۔ ہم ایک ایماندار طریقے سے کماتے ہیں: کرایہ کمپنیاں اپنے اشتہار فعال رکھنے کے لیے ایک مقررہ ماہانہ سبسکرپشن ادا کرتی ہیں۔ بس یہی ہے۔",
    storyP3: "نتیجہ: صارفین کے لیے زیادہ منصفانہ قیمتیں، کرایہ کمپنیوں کے لیے زیادہ آمدنی، اور ایک ایسی مارکیٹ پلیس جس پر لوگ واقعی بھروسہ کرتے ہیں۔",
    stats: [
      { v: "1,200+", l: "درج گاڑیاں" },
      { v: "500+", l: "تصدیق شدہ کرایہ کمپنیاں" },
      { v: "16", l: "احاطہ شدہ شہر" },
      { v: "0%", l: "کمیشن، کبھی نہیں" },
    ],
    valuesEyebrow: "ہم کس چیز پر یقین رکھتے ہیں", valuesHeading: "ہمارے اصول",
    values: [
      { t: "ہمیشہ تصدیق شدہ", s: "ہر کرایہ کمپنی اشتہار دینے سے پہلے جانچی جاتی ہے۔ تجارتی لائسنس، شناخت اور آپریشنل جانچ۔" },
      { t: "صفر کمیشن", s: "ہم کرایہ کمپنیوں سے ایک مقررہ ماہانہ فیس لیتے ہیں — کبھی بھی آپ کی ادائیگی کا کوئی فیصد نہیں۔" },
      { t: "براہ راست رابطہ", s: "آپ کرایہ کمپنی سے براہ راست WhatsApp، فون یا مفت بین الاقوامی ویڈیو کال کے ذریعے بات کرتے ہیں۔" },
      { t: "مقامی پہلے", s: "متحدہ عرب امارات اور شام کے لیے بنایا گیا — عربی اور انگریزی، AED + SYP + USD، مقامی ادائیگی کے طریقے۔" },
      { t: "کوئی حیرانی نہیں", s: "اشتہار پر جو آپ دیکھتے ہیں وہی ادا کرتے ہیں۔ کوئی پوشیدہ فیس نہیں، چیک آؤٹ پر کوئی کمیشن شامل نہیں۔" },
      { t: "کمیونٹی", s: "ریویوز، فالوز اور Google کی تصدیق کا مطلب ہے کہ بھروسہ کمایا جاتا ہے، خریدا نہیں جاتا۔" },
    ],
    ctaHeading: "اپنی گاڑی تلاش کرنے کے لیے تیار ہیں؟", ctaSub: "16 شہروں میں 1,200 سے زائد گاڑیاں دیکھیں۔ اکاؤنٹ کی ضرورت نہیں۔",
    ctaBrowse: "گاڑیاں دیکھیں", ctaList: "اپنی گاڑی درج کریں",
  },
}

const CONTACT: Record<Locale, ContactContent> = {
  en: {
    metaTitle: "Contact Us — Auto to Rental",
    metaDesc: "Get in touch with Auto to Rental. Reach us by WhatsApp, phone or email — we usually reply within a few hours across the UAE and Syria.",
    bcHome: "Home", bcContact: "Contact",
    heroTitle: "Get in touch", heroSub: "We’re here to help — usually reply within a few hours.",
    whatsapp: "WhatsApp", whatsappNote: "Fastest response",
    phone: "Phone", phoneNote: "9 AM – 9 PM Dubai time",
    email: "Email", emailNote: "Reply within 24h",
    hqTitle: "Headquarters", hqLine1: "Dubai, United Arab Emirates", hqLine2: "Serving UAE & Syria",
    formHeading: "Send us a message",
    labelName: "Name *", labelEmail: "Email *", labelPhone: "Phone", labelSubject: "Subject", labelMessage: "Message *",
    selectPlaceholder: "Select…",
    subjects: ["General enquiry", "Help renting a car", "I want to list my cars", "Report a listing", "Partnership", "Press"],
    sendBtn: "Send message", sendingBtn: "Sending…",
    requiredError: "Name, email and message are required",
    sendError: "Could not send. Please email us directly.",
    sentTitle: "Message sent",
    sentBodyPre: "We’ve received your message and will reply to ", sentBodyPost: " within 24 hours.",
    sendAnother: "Send another",
    privacyPre: "By submitting you agree to our ", privacyLink: "privacy policy", privacyPost: ".",
  },
  ar: {
    metaTitle: "تواصل معنا — Auto to Rental",
    metaDesc: "تواصل مع Auto to Rental عبر واتساب أو الهاتف أو البريد الإلكتروني — نرد عادةً خلال ساعات قليلة في الإمارات وسوريا.",
    bcHome: "الرئيسية", bcContact: "تواصل معنا",
    heroTitle: "تواصل معنا", heroSub: "نحن هنا لمساعدتك — نرد عادةً خلال ساعات قليلة.",
    whatsapp: "واتساب", whatsappNote: "الأسرع في الرد",
    phone: "الهاتف", phoneNote: "9 صباحاً – 9 مساءً بتوقيت دبي",
    email: "البريد الإلكتروني", emailNote: "الرد خلال 24 ساعة",
    hqTitle: "المقر الرئيسي", hqLine1: "دبي، الإمارات العربية المتحدة", hqLine2: "نخدم الإمارات وسوريا",
    formHeading: "أرسل لنا رسالة",
    labelName: "الاسم *", labelEmail: "البريد الإلكتروني *", labelPhone: "الهاتف", labelSubject: "الموضوع", labelMessage: "الرسالة *",
    selectPlaceholder: "اختر…",
    subjects: ["استفسار عام", "مساعدة في استئجار سيارة", "أريد إدراج سياراتي", "الإبلاغ عن إعلان", "شراكة", "إعلام"],
    sendBtn: "إرسال الرسالة", sendingBtn: "جارٍ الإرسال…",
    requiredError: "الاسم والبريد الإلكتروني والرسالة مطلوبة",
    sendError: "تعذّر الإرسال. يرجى مراسلتنا مباشرة عبر البريد.",
    sentTitle: "تم إرسال الرسالة",
    sentBodyPre: "لقد استلمنا رسالتك وسنرد على ", sentBodyPost: " خلال 24 ساعة.",
    sendAnother: "إرسال رسالة أخرى",
    privacyPre: "بإرسالك توافق على ", privacyLink: "سياسة الخصوصية", privacyPost: " الخاصة بنا.",
  },
  es: {
    metaTitle: "Contáctanos — Auto to Rental",
    metaDesc: "Ponte en contacto con Auto to Rental por WhatsApp, teléfono o correo — solemos responder en pocas horas en EAU y Siria.",
    bcHome: "Inicio", bcContact: "Contacto",
    heroTitle: "Ponte en contacto", heroSub: "Estamos aquí para ayudar — solemos responder en pocas horas.",
    whatsapp: "WhatsApp", whatsappNote: "Respuesta más rápida",
    phone: "Teléfono", phoneNote: "9 AM – 9 PM hora de Dubái",
    email: "Correo", emailNote: "Respuesta en 24 h",
    hqTitle: "Sede central", hqLine1: "Dubái, Emiratos Árabes Unidos", hqLine2: "Atendemos EAU y Siria",
    formHeading: "Envíanos un mensaje",
    labelName: "Nombre *", labelEmail: "Correo *", labelPhone: "Teléfono", labelSubject: "Asunto", labelMessage: "Mensaje *",
    selectPlaceholder: "Selecciona…",
    subjects: ["Consulta general", "Ayuda para alquilar un auto", "Quiero publicar mis autos", "Reportar un anuncio", "Alianzas", "Prensa"],
    sendBtn: "Enviar mensaje", sendingBtn: "Enviando…",
    requiredError: "El nombre, el correo y el mensaje son obligatorios",
    sendError: "No se pudo enviar. Escríbenos directamente por correo.",
    sentTitle: "Mensaje enviado",
    sentBodyPre: "Hemos recibido tu mensaje y responderemos a ", sentBodyPost: " en 24 horas.",
    sendAnother: "Enviar otro",
    privacyPre: "Al enviar aceptas nuestra ", privacyLink: "política de privacidad", privacyPost: ".",
  },
  zh: {
    metaTitle: "联系我们 — Auto to Rental",
    metaDesc: "通过 WhatsApp、电话或电子邮件联系 Auto to Rental — 在阿联酋和叙利亚我们通常会在几小时内回复。",
    bcHome: "首页", bcContact: "联系我们",
    heroTitle: "联系我们", heroSub: "我们随时为您提供帮助 —— 通常会在几小时内回复。",
    whatsapp: "WhatsApp", whatsappNote: "回复最快",
    phone: "电话", phoneNote: "迪拜时间上午 9 点 – 晚上 9 点",
    email: "电子邮件", emailNote: "24 小时内回复",
    hqTitle: "总部", hqLine1: "阿联酋迪拜", hqLine2: "服务阿联酋和叙利亚",
    formHeading: "给我们留言",
    labelName: "姓名 *", labelEmail: "电子邮件 *", labelPhone: "电话", labelSubject: "主题", labelMessage: "留言 *",
    selectPlaceholder: "请选择…",
    subjects: ["一般咨询", "租车帮助", "我想刊登我的车辆", "举报房源", "合作", "媒体"],
    sendBtn: "发送留言", sendingBtn: "发送中…",
    requiredError: "姓名、电子邮件和留言为必填项",
    sendError: "发送失败。请直接给我们发电子邮件。",
    sentTitle: "留言已发送",
    sentBodyPre: "我们已收到您的留言，将在 24 小时内回复至 ", sentBodyPost: "。",
    sendAnother: "再发一条",
    privacyPre: "提交即表示您同意我们的", privacyLink: "隐私政策", privacyPost: "。",
  },
  th: {
    metaTitle: "ติดต่อเรา — Auto to Rental",
    metaDesc: "ติดต่อ Auto to Rental ทาง WhatsApp โทรศัพท์ หรืออีเมล — เรามักตอบกลับภายในไม่กี่ชั่วโมงทั่ว UAE และซีเรีย",
    bcHome: "หน้าแรก", bcContact: "ติดต่อ",
    heroTitle: "ติดต่อเรา", heroSub: "เราพร้อมช่วยเหลือ — มักตอบกลับภายในไม่กี่ชั่วโมง",
    whatsapp: "WhatsApp", whatsappNote: "ตอบเร็วที่สุด",
    phone: "โทรศัพท์", phoneNote: "9.00 – 21.00 น. เวลาดูไบ",
    email: "อีเมล", emailNote: "ตอบกลับภายใน 24 ชม.",
    hqTitle: "สำนักงานใหญ่", hqLine1: "ดูไบ สหรัฐอาหรับเอมิเรตส์", hqLine2: "ให้บริการ UAE และซีเรีย",
    formHeading: "ส่งข้อความถึงเรา",
    labelName: "ชื่อ *", labelEmail: "อีเมล *", labelPhone: "โทรศัพท์", labelSubject: "หัวข้อ", labelMessage: "ข้อความ *",
    selectPlaceholder: "เลือก…",
    subjects: ["สอบถามทั่วไป", "ขอความช่วยเหลือเรื่องการเช่ารถ", "ฉันต้องการลงประกาศรถของฉัน", "รายงานประกาศ", "ความร่วมมือ", "สื่อมวลชน"],
    sendBtn: "ส่งข้อความ", sendingBtn: "กำลังส่ง…",
    requiredError: "จำเป็นต้องกรอกชื่อ อีเมล และข้อความ",
    sendError: "ส่งไม่สำเร็จ กรุณาส่งอีเมลถึงเราโดยตรง",
    sentTitle: "ส่งข้อความแล้ว",
    sentBodyPre: "เราได้รับข้อความของคุณแล้ว และจะตอบกลับไปที่ ", sentBodyPost: " ภายใน 24 ชั่วโมง",
    sendAnother: "ส่งอีกข้อความ",
    privacyPre: "การส่งถือว่าคุณยอมรับ", privacyLink: "นโยบายความเป็นส่วนตัว", privacyPost: "ของเรา",
  },
  ru: {
    metaTitle: "Связаться с нами — Auto to Rental",
    metaDesc: "Свяжитесь с Auto to Rental через WhatsApp, по телефону или по электронной почте — обычно отвечаем в течение нескольких часов в ОАЭ и Сирии.",
    bcHome: "Главная", bcContact: "Контакты",
    heroTitle: "Свяжитесь с нами", heroSub: "Мы готовы помочь — обычно отвечаем в течение нескольких часов.",
    whatsapp: "WhatsApp", whatsappNote: "Самый быстрый ответ",
    phone: "Телефон", phoneNote: "9:00 – 21:00 по времени Дубая",
    email: "Эл. почта", emailNote: "Ответ в течение 24 ч",
    hqTitle: "Головной офис", hqLine1: "Дубай, Объединённые Арабские Эмираты", hqLine2: "Обслуживаем ОАЭ и Сирию",
    formHeading: "Напишите нам",
    labelName: "Имя *", labelEmail: "Эл. почта *", labelPhone: "Телефон", labelSubject: "Тема", labelMessage: "Сообщение *",
    selectPlaceholder: "Выберите…",
    subjects: ["Общий вопрос", "Помощь с арендой авто", "Хочу разместить свои авто", "Пожаловаться на объявление", "Партнёрство", "Пресса"],
    sendBtn: "Отправить сообщение", sendingBtn: "Отправка…",
    requiredError: "Имя, эл. почта и сообщение обязательны",
    sendError: "Не удалось отправить. Напишите нам напрямую на эл. почту.",
    sentTitle: "Сообщение отправлено",
    sentBodyPre: "Мы получили ваше сообщение и ответим на ", sentBodyPost: " в течение 24 часов.",
    sendAnother: "Отправить ещё",
    privacyPre: "Отправляя, вы соглашаетесь с нашей ", privacyLink: "политикой конфиденциальности", privacyPost: ".",
  },
  ur: {
    metaTitle: "ہم سے رابطہ کریں — Auto to Rental",
    metaDesc: "Auto to Rental سے WhatsApp، فون یا ای میل کے ذریعے رابطہ کریں — ہم عام طور پر متحدہ عرب امارات اور شام میں چند گھنٹوں میں جواب دیتے ہیں۔",
    bcHome: "ہوم", bcContact: "رابطہ",
    heroTitle: "ہم سے رابطہ کریں", heroSub: "ہم مدد کے لیے حاضر ہیں — عام طور پر چند گھنٹوں میں جواب دیتے ہیں۔",
    whatsapp: "WhatsApp", whatsappNote: "تیز ترین جواب",
    phone: "فون", phoneNote: "صبح 9 بجے – رات 9 بجے دبئی وقت",
    email: "ای میل", emailNote: "24 گھنٹوں میں جواب",
    hqTitle: "ہیڈکوارٹر", hqLine1: "دبئی، متحدہ عرب امارات", hqLine2: "متحدہ عرب امارات اور شام کے لیے خدمات",
    formHeading: "ہمیں پیغام بھیجیں",
    labelName: "نام *", labelEmail: "ای میل *", labelPhone: "فون", labelSubject: "موضوع", labelMessage: "پیغام *",
    selectPlaceholder: "منتخب کریں…",
    subjects: ["عمومی استفسار", "گاڑی کرائے پر لینے میں مدد", "میں اپنی گاڑیاں درج کرنا چاہتا ہوں", "اشتہار کی شکایت", "شراکت داری", "پریس"],
    sendBtn: "پیغام بھیجیں", sendingBtn: "بھیجا جا رہا ہے…",
    requiredError: "نام، ای میل اور پیغام لازمی ہیں",
    sendError: "بھیجا نہیں جا سکا۔ براہ کرم ہمیں براہ راست ای میل کریں۔",
    sentTitle: "پیغام بھیج دیا گیا",
    sentBodyPre: "ہمیں آپ کا پیغام موصول ہو گیا ہے اور ہم 24 گھنٹوں میں ", sentBodyPost: " پر جواب دیں گے۔",
    sendAnother: "ایک اور بھیجیں",
    privacyPre: "بھیجنے سے آپ ہماری ", privacyLink: "پرائیویسی پالیسی", privacyPost: " سے اتفاق کرتے ہیں۔",
  },
}

export function aboutContent(locale: Locale): AboutContent {
  return ABOUT[locale] || ABOUT[DEFAULT_LOCALE]
}

export function contactContent(locale: Locale): ContactContent {
  return CONTACT[locale] || CONTACT[DEFAULT_LOCALE]
}
