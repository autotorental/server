// Localized content for the /brands and /companies index (directory) pages.
// Brand/company proper names stay as-is; all chrome, headings, CTAs and FAQs are
// translated for all 7 locales. seoFor() handles canonical/hreflang/og:locale.
import { type Locale, DEFAULT_LOCALE } from "./locales"

export type IdxFaq = { q: string; a: string }

export type BrandsContent = {
  metaTitle: string
  metaDesc: string
  bcHome: string
  bcBrands: string
  h1: string // {n} placeholder
  heroSub: string
  carsWord: (n: number) => string // "3 cars" / "1 car"
  comingSoon: string
  moveHeading: string
  movePara: string
  allCars: string
  monthlyDeals: string
  verifiedCompanies: string
  faqHeading: string
  faqs: IdxFaq[]
}

export type CompaniesContent = {
  metaTitle: string
  metaDesc: string
  bcHome: string
  bcCompanies: string
  h1: string
  heroSub: string // {n} placeholder
  noneTitle: string
  beFirst: string
  carsListed: (n: number) => string // "3 cars listed"
  promoLabel: string
  promoTitle: string
  promoSub: string
  becomeFeatured: string
  findHeading: string
  findPara: string
  allCars: string
  carBrands: string
  rentalGuides: string
  faqHeading: string
  faqs: IdxFaq[]
}

const BRANDS: Record<Locale, BrandsContent> = {
  en: {
    metaTitle: "Car Brands for Rent in UAE & Syria | Auto to Rental",
    metaDesc: "Browse rental cars by brand across UAE and Syria. Compare verified inventory and open high-intent brand pages with direct contact options.",
    bcHome: "Home", bcBrands: "Brands",
    h1: "Browse {n} Car Brands", heroSub: "From Toyota to Lamborghini — find your favourite carmaker.",
    carsWord: (n) => `${n} car${n === 1 ? "" : "s"}`, comingSoon: "Coming soon",
    moveHeading: "Move from brand discovery to booking",
    movePara: "Brand pages connect directly to city inventory, verified companies, and monthly rental opportunities.",
    allCars: "All cars", monthlyDeals: "Monthly deals", verifiedCompanies: "Verified companies",
    faqHeading: "FAQ",
    faqs: [
      { q: "Can I rent the same brand in different cities?", a: "Yes. Open the brand page to view active listings across supported cities in UAE and Syria." },
      { q: "Do brand pages include monthly options?", a: "Yes. After opening a brand page, use filters to find daily, weekly, or monthly deals." },
      { q: "Are these brands linked to verified companies?", a: "Yes. Listings are sourced from verified rental companies with active fleet inventory." },
    ],
  },
  ar: {
    metaTitle: "ماركات سيارات للإيجار في الإمارات وسوريا | Auto to Rental",
    metaDesc: "تصفح سيارات الإيجار حسب الماركة في الإمارات وسوريا. قارن المخزون الموثوق وافتح صفحات الماركات عالية النية مع خيارات تواصل مباشرة.",
    bcHome: "الرئيسية", bcBrands: "الماركات",
    h1: "تصفح {n} ماركة سيارات", heroSub: "من تويوتا إلى لامبورغيني — اعثر على صانع سيارتك المفضل.",
    carsWord: (n) => `${n} سيارة`, comingSoon: "قريباً",
    moveHeading: "انتقل من اكتشاف الماركة إلى الحجز",
    movePara: "ترتبط صفحات الماركات مباشرة بمخزون المدن والشركات الموثوقة وفرص التأجير الشهري.",
    allCars: "كل السيارات", monthlyDeals: "عروض شهرية", verifiedCompanies: "شركات موثوقة",
    faqHeading: "الأسئلة الشائعة",
    faqs: [
      { q: "هل يمكنني استئجار نفس الماركة في مدن مختلفة؟", a: "نعم. افتح صفحة الماركة لعرض الإعلانات النشطة عبر المدن المدعومة في الإمارات وسوريا." },
      { q: "هل تتضمن صفحات الماركات خيارات شهرية؟", a: "نعم. بعد فتح صفحة الماركة، استخدم الفلاتر للعثور على عروض يومية أو أسبوعية أو شهرية." },
      { q: "هل هذه الماركات مرتبطة بشركات موثوقة؟", a: "نعم. الإعلانات مصدرها شركات تأجير موثوقة لديها مخزون أسطول نشط." },
    ],
  },
  es: {
    metaTitle: "Marcas de autos en alquiler en EAU y Siria | Auto to Rental",
    metaDesc: "Explora autos de alquiler por marca en EAU y Siria. Compara inventario verificado y abre páginas de marca de alta intención con contacto directo.",
    bcHome: "Inicio", bcBrands: "Marcas",
    h1: "Explora {n} marcas de autos", heroSub: "De Toyota a Lamborghini — encuentra tu fabricante favorito.",
    carsWord: (n) => `${n} auto${n === 1 ? "" : "s"}`, comingSoon: "Próximamente",
    moveHeading: "Pasa del descubrimiento de marca a la reserva",
    movePara: "Las páginas de marca conectan directamente con el inventario por ciudad, empresas verificadas y opciones de alquiler mensual.",
    allCars: "Todos los autos", monthlyDeals: "Ofertas mensuales", verifiedCompanies: "Empresas verificadas",
    faqHeading: "Preguntas frecuentes",
    faqs: [
      { q: "¿Puedo alquilar la misma marca en distintas ciudades?", a: "Sí. Abre la página de la marca para ver anuncios activos en las ciudades disponibles de EAU y Siria." },
      { q: "¿Las páginas de marca incluyen opciones mensuales?", a: "Sí. Al abrir una página de marca, usa los filtros para encontrar ofertas diarias, semanales o mensuales." },
      { q: "¿Estas marcas están vinculadas a empresas verificadas?", a: "Sí. Los anuncios provienen de empresas verificadas con inventario de flota activo." },
    ],
  },
  zh: {
    metaTitle: "阿联酋和叙利亚租车品牌 | Auto to Rental",
    metaDesc: "按品牌浏览阿联酋和叙利亚的租车。比较认证库存，打开高意向品牌页面并直接联系。",
    bcHome: "首页", bcBrands: "品牌",
    h1: "浏览{n}个汽车品牌", heroSub: "从丰田到兰博基尼 — 找到您喜爱的汽车制造商。",
    carsWord: (n) => `${n}辆车`, comingSoon: "即将推出",
    moveHeading: "从品牌发现到预订",
    movePara: "品牌页面直接连接城市库存、认证公司和月租机会。",
    allCars: "所有车辆", monthlyDeals: "月租优惠", verifiedCompanies: "认证公司",
    faqHeading: "常见问题",
    faqs: [
      { q: "我能在不同城市租同一品牌吗？", a: "可以。打开品牌页面查看阿联酋和叙利亚支持城市的有效房源。" },
      { q: "品牌页面包含月租选项吗？", a: "包含。打开品牌页面后，使用筛选器查找日租、周租或月租优惠。" },
      { q: "这些品牌与认证公司关联吗？", a: "是的。房源来自拥有活跃车队库存的认证租车公司。" },
    ],
  },
  th: {
    metaTitle: "แบรนด์รถเช่าใน UAE และซีเรีย | Auto to Rental",
    metaDesc: "เลือกชมรถเช่าตามแบรนด์ทั่ว UAE และซีเรีย เปรียบเทียบสต็อกที่ได้รับการยืนยันและเปิดหน้าแบรนด์ที่มีความต้องการสูงพร้อมติดต่อโดยตรง",
    bcHome: "หน้าแรก", bcBrands: "แบรนด์",
    h1: "เลือกชม {n} แบรนด์รถยนต์", heroSub: "ตั้งแต่ Toyota ถึง Lamborghini — ค้นหาผู้ผลิตรถที่คุณชื่นชอบ",
    carsWord: (n) => `${n} คัน`, comingSoon: "เร็วๆ นี้",
    moveHeading: "จากการค้นพบแบรนด์สู่การจอง",
    movePara: "หน้าแบรนด์เชื่อมต่อโดยตรงกับสต็อกตามเมือง บริษัทที่ได้รับการยืนยัน และโอกาสเช่ารายเดือน",
    allCars: "รถทั้งหมด", monthlyDeals: "ดีลรายเดือน", verifiedCompanies: "บริษัทที่ได้รับการยืนยัน",
    faqHeading: "คำถามที่พบบ่อย",
    faqs: [
      { q: "เช่าแบรนด์เดียวกันในเมืองต่างกันได้ไหม?", a: "ได้ เปิดหน้าแบรนด์เพื่อดูประกาศที่ใช้งานอยู่ในเมืองที่รองรับใน UAE และซีเรีย" },
      { q: "หน้าแบรนด์มีตัวเลือกรายเดือนไหม?", a: "มี หลังเปิดหน้าแบรนด์ ใช้ตัวกรองเพื่อหาดีลรายวัน รายสัปดาห์ หรือรายเดือน" },
      { q: "แบรนด์เหล่านี้เชื่อมโยงกับบริษัทที่ได้รับการยืนยันไหม?", a: "ใช่ ประกาศมาจากบริษัทเช่ารถที่ได้รับการยืนยันซึ่งมีสต็อกรถใช้งานอยู่" },
    ],
  },
  ru: {
    metaTitle: "Марки авто в аренду в ОАЭ и Сирии | Auto to Rental",
    metaDesc: "Просматривайте авто в аренду по марке в ОАЭ и Сирии. Сравните проверенный каталог и откройте страницы марок с прямым контактом.",
    bcHome: "Главная", bcBrands: "Марки",
    h1: "Просмотрите {n} марок авто", heroSub: "От Toyota до Lamborghini — найдите любимого автопроизводителя.",
    carsWord: (n) => `${n} авто`, comingSoon: "Скоро",
    moveHeading: "От выбора марки к бронированию",
    movePara: "Страницы марок напрямую связаны с каталогом по городам, проверенными компаниями и возможностями месячной аренды.",
    allCars: "Все авто", monthlyDeals: "Месячные предложения", verifiedCompanies: "Проверенные компании",
    faqHeading: "Вопросы и ответы",
    faqs: [
      { q: "Можно ли арендовать одну марку в разных городах?", a: "Да. Откройте страницу марки, чтобы увидеть активные объявления в поддерживаемых городах ОАЭ и Сирии." },
      { q: "Включают ли страницы марок месячные варианты?", a: "Да. Открыв страницу марки, используйте фильтры для поиска суточных, недельных или месячных предложений." },
      { q: "Связаны ли эти марки с проверенными компаниями?", a: "Да. Объявления поступают от проверенных компаний с активным автопарком." },
    ],
  },
  ur: {
    metaTitle: "UAE اور شام میں کرائے کی کار برانڈز | Auto to Rental",
    metaDesc: "UAE اور شام میں برانڈ کے لحاظ سے کرائے کی گاڑیاں دیکھیں۔ تصدیق شدہ انوینٹری کا موازنہ کریں اور براہ راست رابطے کے ساتھ برانڈ صفحات کھولیں۔",
    bcHome: "ہوم", bcBrands: "برانڈز",
    h1: "{n} کار برانڈز دیکھیں", heroSub: "ٹویوٹا سے لیمبورگینی تک — اپنا پسندیدہ کار ساز تلاش کریں۔",
    carsWord: (n) => `${n} گاڑیاں`, comingSoon: "جلد آ رہا ہے",
    moveHeading: "برانڈ دریافت سے بکنگ تک",
    movePara: "برانڈ صفحات براہ راست شہر کی انوینٹری، تصدیق شدہ کمپنیوں اور ماہانہ کرائے کے مواقع سے جڑتے ہیں۔",
    allCars: "تمام گاڑیاں", monthlyDeals: "ماہانہ ڈیلز", verifiedCompanies: "تصدیق شدہ کمپنیاں",
    faqHeading: "عمومی سوالات",
    faqs: [
      { q: "کیا میں مختلف شہروں میں ایک ہی برانڈ کرائے پر لے سکتا ہوں؟", a: "جی ہاں۔ UAE اور شام کے معاون شہروں میں فعال اشتہار دیکھنے کے لیے برانڈ صفحہ کھولیں۔" },
      { q: "کیا برانڈ صفحات میں ماہانہ اختیارات شامل ہیں؟", a: "جی ہاں۔ برانڈ صفحہ کھولنے کے بعد، روزانہ، ہفتہ وار یا ماہانہ ڈیلز تلاش کرنے کے لیے فلٹر استعمال کریں۔" },
      { q: "کیا یہ برانڈز تصدیق شدہ کمپنیوں سے منسلک ہیں؟", a: "جی ہاں۔ اشتہار فعال فلیٹ انوینٹری والی تصدیق شدہ کرایہ کمپنیوں سے آتے ہیں۔" },
    ],
  },
}

const COMPANIES: Record<Locale, CompaniesContent> = {
  en: {
    metaTitle: "Verified Car Rental Companies — UAE & Syria",
    metaDesc: "Explore verified rental companies with direct contact details, active car inventory, and trusted profiles across UAE and Syria.",
    bcHome: "Home", bcCompanies: "Rental Companies",
    h1: "Verified Rental Companies", heroSub: "{n} trusted rental companies across UAE & Syria. Contact them directly — no middleman.",
    noneTitle: "No companies yet", beFirst: "Be the first to join",
    carsListed: (n) => `${n} car${n === 1 ? "" : "s"} listed`,
    promoLabel: "Promotional Slot", promoTitle: "Featured company highlight area",
    promoSub: "Promote trusted rental companies with premium visibility on this directory page.", becomeFeatured: "Become featured",
    findHeading: "Find the right rental partner faster",
    findPara: "Browse company profiles, compare active vehicle inventory, and jump directly into high-intent pages for better conversion and stronger internal SEO flow.",
    allCars: "All cars for rent", carBrands: "Car brands", rentalGuides: "Rental guides",
    faqHeading: "FAQ",
    faqs: [
      { q: "Are all companies verified?", a: "Profiles listed here are reviewed and verified before publishing." },
      { q: "Can I contact companies directly?", a: "Yes, each company profile links to direct WhatsApp and phone details." },
      { q: "Can companies boost exposure?", a: "Yes, featured and promotional placements are available for eligible partners." },
    ],
  },
  ar: {
    metaTitle: "شركات تأجير سيارات موثوقة — الإمارات وسوريا",
    metaDesc: "استكشف شركات تأجير موثوقة مع تفاصيل تواصل مباشرة ومخزون سيارات نشط وملفات موثوقة في الإمارات وسوريا.",
    bcHome: "الرئيسية", bcCompanies: "شركات التأجير",
    h1: "شركات تأجير موثوقة", heroSub: "{n} شركة تأجير موثوقة في الإمارات وسوريا. تواصل معها مباشرة — بدون وسيط.",
    noneTitle: "لا توجد شركات بعد", beFirst: "كن أول من ينضم",
    carsListed: (n) => `${n} سيارة مدرجة`,
    promoLabel: "مساحة ترويجية", promoTitle: "منطقة إبراز الشركات المميزة",
    promoSub: "روّج لشركات التأجير الموثوقة بظهور مميز على صفحة الدليل هذه.", becomeFeatured: "كن مميزاً",
    findHeading: "اعثر على شريك التأجير المناسب أسرع",
    findPara: "تصفح ملفات الشركات، قارن مخزون المركبات النشط، وانتقل مباشرة إلى الصفحات عالية النية لتحويل أفضل وتدفق SEO داخلي أقوى.",
    allCars: "كل السيارات للإيجار", carBrands: "ماركات السيارات", rentalGuides: "أدلة التأجير",
    faqHeading: "الأسئلة الشائعة",
    faqs: [
      { q: "هل جميع الشركات موثوقة؟", a: "تتم مراجعة الملفات المدرجة هنا والتحقق منها قبل النشر." },
      { q: "هل يمكنني التواصل مع الشركات مباشرة؟", a: "نعم، يرتبط كل ملف شركة بتفاصيل واتساب والهاتف المباشرة." },
      { q: "هل يمكن للشركات زيادة ظهورها؟", a: "نعم، تتوفر مواضع مميزة وترويجية للشركاء المؤهلين." },
    ],
  },
  es: {
    metaTitle: "Empresas de alquiler de autos verificadas — EAU y Siria",
    metaDesc: "Explora empresas de alquiler verificadas con contacto directo, inventario activo y perfiles de confianza en EAU y Siria.",
    bcHome: "Inicio", bcCompanies: "Empresas de alquiler",
    h1: "Empresas de alquiler verificadas", heroSub: "{n} empresas de alquiler de confianza en EAU y Siria. Contáctalas directamente — sin intermediarios.",
    noneTitle: "Aún no hay empresas", beFirst: "Sé el primero en unirte",
    carsListed: (n) => `${n} auto${n === 1 ? "" : "s"} publicado${n === 1 ? "" : "s"}`,
    promoLabel: "Espacio promocional", promoTitle: "Área destacada de empresas",
    promoSub: "Promociona empresas de alquiler de confianza con visibilidad premium en esta página de directorio.", becomeFeatured: "Hazte destacado",
    findHeading: "Encuentra al socio de alquiler adecuado más rápido",
    findPara: "Explora perfiles de empresas, compara inventario activo y salta directamente a páginas de alta intención para mejor conversión y un flujo SEO interno más fuerte.",
    allCars: "Todos los autos en alquiler", carBrands: "Marcas de autos", rentalGuides: "Guías de alquiler",
    faqHeading: "Preguntas frecuentes",
    faqs: [
      { q: "¿Todas las empresas están verificadas?", a: "Los perfiles listados aquí se revisan y verifican antes de publicarse." },
      { q: "¿Puedo contactar a las empresas directamente?", a: "Sí, cada perfil de empresa enlaza con datos directos de WhatsApp y teléfono." },
      { q: "¿Pueden las empresas aumentar su exposición?", a: "Sí, hay ubicaciones destacadas y promocionales disponibles para socios elegibles." },
    ],
  },
  zh: {
    metaTitle: "认证租车公司 — 阿联酋和叙利亚",
    metaDesc: "探索认证租车公司，提供直接联系方式、活跃车辆库存和阿联酋及叙利亚的可信资料。",
    bcHome: "首页", bcCompanies: "租车公司",
    h1: "认证租车公司", heroSub: "阿联酋和叙利亚{n}家可信租车公司。直接联系 — 无中间商。",
    noneTitle: "暂无公司", beFirst: "成为首位加入者",
    carsListed: (n) => `已列出${n}辆车`,
    promoLabel: "推广位", promoTitle: "精选公司展示区",
    promoSub: "在此目录页以优质曝光推广可信租车公司。", becomeFeatured: "成为精选",
    findHeading: "更快找到合适的租车伙伴",
    findPara: "浏览公司资料，比较活跃车辆库存，直接跳转到高意向页面，提升转化率并加强内部SEO流。",
    allCars: "所有出租车辆", carBrands: "汽车品牌", rentalGuides: "租车指南",
    faqHeading: "常见问题",
    faqs: [
      { q: "所有公司都经过认证吗？", a: "此处列出的资料在发布前都经过审核和认证。" },
      { q: "我能直接联系公司吗？", a: "可以，每个公司资料都链接到直接的WhatsApp和电话信息。" },
      { q: "公司能提升曝光吗？", a: "可以，符合条件的合作伙伴可获得精选和推广位。" },
    ],
  },
  th: {
    metaTitle: "บริษัทเช่ารถที่ได้รับการยืนยัน — UAE และซีเรีย",
    metaDesc: "สำรวจบริษัทเช่ารถที่ได้รับการยืนยัน พร้อมข้อมูลติดต่อโดยตรง สต็อกรถที่ใช้งานอยู่ และโปรไฟล์ที่เชื่อถือได้ทั่ว UAE และซีเรีย",
    bcHome: "หน้าแรก", bcCompanies: "บริษัทเช่ารถ",
    h1: "บริษัทเช่ารถที่ได้รับการยืนยัน", heroSub: "บริษัทเช่ารถที่เชื่อถือได้ {n} แห่งทั่ว UAE และซีเรีย ติดต่อโดยตรง — ไม่มีคนกลาง",
    noneTitle: "ยังไม่มีบริษัท", beFirst: "เป็นรายแรกที่เข้าร่วม",
    carsListed: (n) => `ลงประกาศ ${n} คัน`,
    promoLabel: "พื้นที่โปรโมชัน", promoTitle: "พื้นที่ไฮไลต์บริษัทแนะนำ",
    promoSub: "โปรโมตบริษัทเช่ารถที่เชื่อถือได้ด้วยการมองเห็นระดับพรีเมียมบนหน้าไดเรกทอรีนี้", becomeFeatured: "เป็นบริษัทแนะนำ",
    findHeading: "ค้นหาพาร์ทเนอร์เช่ารถที่เหมาะสมได้เร็วขึ้น",
    findPara: "เลือกชมโปรไฟล์บริษัท เปรียบเทียบสต็อกรถที่ใช้งานอยู่ และข้ามไปยังหน้าที่มีความต้องการสูงโดยตรงเพื่อการแปลงที่ดีขึ้นและ SEO ภายในที่แข็งแกร่งขึ้น",
    allCars: "รถให้เช่าทั้งหมด", carBrands: "แบรนด์รถยนต์", rentalGuides: "คู่มือการเช่า",
    faqHeading: "คำถามที่พบบ่อย",
    faqs: [
      { q: "ทุกบริษัทได้รับการยืนยันไหม?", a: "โปรไฟล์ที่แสดงที่นี่ได้รับการตรวจสอบและยืนยันก่อนเผยแพร่" },
      { q: "ติดต่อบริษัทโดยตรงได้ไหม?", a: "ได้ โปรไฟล์แต่ละบริษัทเชื่อมโยงกับข้อมูล WhatsApp และโทรศัพท์โดยตรง" },
      { q: "บริษัทเพิ่มการมองเห็นได้ไหม?", a: "ได้ ตำแหน่งแนะนำและโปรโมชันมีให้สำหรับพาร์ทเนอร์ที่มีสิทธิ์" },
    ],
  },
  ru: {
    metaTitle: "Проверенные компании по аренде авто — ОАЭ и Сирия",
    metaDesc: "Изучите проверенные компании по аренде с прямыми контактами, активным автопарком и надёжными профилями в ОАЭ и Сирии.",
    bcHome: "Главная", bcCompanies: "Компании по аренде",
    h1: "Проверенные компании по аренде", heroSub: "{n} надёжных компаний по аренде в ОАЭ и Сирии. Связывайтесь напрямую — без посредников.",
    noneTitle: "Пока нет компаний", beFirst: "Станьте первым",
    carsListed: (n) => `${n} авто в каталоге`,
    promoLabel: "Рекламное место", promoTitle: "Зона выделенных компаний",
    promoSub: "Продвигайте надёжные компании по аренде с премиум-видимостью на этой странице каталога.", becomeFeatured: "Стать избранным",
    findHeading: "Быстрее найдите подходящего партнёра по аренде",
    findPara: "Просматривайте профили компаний, сравнивайте активный автопарк и переходите напрямую на страницы с высоким намерением для лучшей конверсии и более сильного внутреннего SEO.",
    allCars: "Все авто в аренду", carBrands: "Марки авто", rentalGuides: "Руководства по аренде",
    faqHeading: "Вопросы и ответы",
    faqs: [
      { q: "Все ли компании проверены?", a: "Профили, представленные здесь, проверяются и верифицируются перед публикацией." },
      { q: "Могу ли я связаться с компаниями напрямую?", a: "Да, каждый профиль компании содержит прямые контакты WhatsApp и телефон." },
      { q: "Могут ли компании повысить видимость?", a: "Да, для подходящих партнёров доступны выделенные и рекламные размещения." },
    ],
  },
  ur: {
    metaTitle: "تصدیق شدہ کار کرایہ کمپنیاں — UAE اور شام",
    metaDesc: "براہ راست رابطہ تفصیلات، فعال کار انوینٹری اور UAE و شام میں قابل اعتماد پروفائلز کے ساتھ تصدیق شدہ کرایہ کمپنیاں دریافت کریں۔",
    bcHome: "ہوم", bcCompanies: "کرایہ کمپنیاں",
    h1: "تصدیق شدہ کرایہ کمپنیاں", heroSub: "UAE اور شام میں {n} قابل اعتماد کرایہ کمپنیاں۔ براہ راست رابطہ کریں — کوئی بیچوان نہیں۔",
    noneTitle: "ابھی کوئی کمپنی نہیں", beFirst: "شامل ہونے والے پہلے بنیں",
    carsListed: (n) => `${n} گاڑیاں درج`,
    promoLabel: "پروموشنل سلاٹ", promoTitle: "نمایاں کمپنی ہائی لائٹ ایریا",
    promoSub: "اس ڈائریکٹری صفحے پر پریمیم نمائش کے ساتھ قابل اعتماد کرایہ کمپنیوں کو فروغ دیں۔", becomeFeatured: "نمایاں بنیں",
    findHeading: "صحیح کرایہ پارٹنر تیزی سے تلاش کریں",
    findPara: "کمپنی پروفائلز دیکھیں، فعال گاڑیوں کی انوینٹری کا موازنہ کریں، اور بہتر تبدیلی اور مضبوط اندرونی SEO کے لیے براہ راست اعلیٰ ضرورت والے صفحات پر جائیں۔",
    allCars: "کرائے کی تمام گاڑیاں", carBrands: "کار برانڈز", rentalGuides: "کرایہ گائیڈز",
    faqHeading: "عمومی سوالات",
    faqs: [
      { q: "کیا تمام کمپنیاں تصدیق شدہ ہیں؟", a: "یہاں درج پروفائلز شائع ہونے سے پہلے جائزہ اور تصدیق کیے جاتے ہیں۔" },
      { q: "کیا میں کمپنیوں سے براہ راست رابطہ کر سکتا ہوں؟", a: "جی ہاں، ہر کمپنی پروفائل براہ راست واٹس ایپ اور فون تفصیلات سے منسلک ہے۔" },
      { q: "کیا کمپنیاں نمائش بڑھا سکتی ہیں؟", a: "جی ہاں، اہل شراکت داروں کے لیے نمایاں اور پروموشنل جگہیں دستیاب ہیں۔" },
    ],
  },
}

export function brandsContent(locale: Locale): BrandsContent {
  return BRANDS[locale] || BRANDS[DEFAULT_LOCALE]
}

export function companiesContent(locale: Locale): CompaniesContent {
  return COMPANIES[locale] || COMPANIES[DEFAULT_LOCALE]
}
