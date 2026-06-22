// Localized SEO copy for the dynamically-generated brand and city landing pages.
// These two page types generate the bulk of our long-tail SEO surface (one page per
// brand and per city), so translating their templates here gives full multilingual
// coverage for every brand/city in all 7 locales. Brand/city proper names are kept
// as-is; UAE/Syria + all chrome/FAQ copy are localized. seoFor() handles the
// canonical/hreflang/og:locale; this module supplies the localized title/description
// and the visible body + FAQ content.
import { type Locale, DEFAULT_LOCALE } from "./locales"
import { t } from "./i18n"

type TopModel = { name: string; count: number }

export type BrandCtx = {
  name: string
  count: number
  priceLow?: number
  priceHigh?: number
  topModels: TopModel[]
  cityNames: string[]
  country: "ae" | "sy"
}

export type CityCtx = {
  name: string
  count: number
  priceLow?: number
  priceHigh?: number
  brandNames: string[]
  bodyTypes: string[]
  country: "ae" | "sy"
}

export type BrandSeo = {
  title: string
  description: string
  intro: string
  focusKeyword: string
  heroSub: string
  fromPerDay?: string
  popularModels: string
  availableCars: string
  noneListed: string
  browseAll: string
  routesHeading: string
  routesSub: string
  faqHeading: string
  faqs: { q: string; a: string }[]
  bcHome: string
  bcBrands: string
}

export type CitySeo = {
  title: string
  description: string
  intro: string
  focusKeyword: string
  heroSub: string
  fromPerDay?: string
  topBrands: string
  carsFor: string
  noneListed: string
  routesHeading: string
  routesSub: string
  faqHeading: string
  faqs: { q: string; a: string }[]
  bcHome: string
  bcCars: string
}

// Localized "from AED {n}/day" fragment (kept AED — recognised currency code on site).
function perDay(locale: Locale, n: number): string {
  switch (locale) {
    case "ar": return `من ${n} درهم/يوم`
    case "es": return `desde AED ${n}/día`
    case "zh": return `每天 AED ${n} 起`
    case "th": return `เริ่มต้น AED ${n}/วัน`
    case "ru": return `от AED ${n}/день`
    case "ur": return `AED ${n}/دن سے`
    default: return `from AED ${n}/day`
  }
}

const cn = (locale: Locale, country: "ae" | "sy") =>
  t(locale, country === "sy" ? "country_sy" : "country_ae")

// ───────────────────────── BRAND ─────────────────────────
const BRAND: Record<Locale, (c: BrandCtx) => BrandSeo> = {
  en: (c) => {
    const models3 = c.topModels.slice(0, 3).map(m => m.name).join(", ")
    const cities4 = c.cityNames.slice(0, 4).join(", ") || "UAE"
    const range = c.priceLow && c.priceHigh ? (c.priceLow === c.priceHigh ? `${c.priceLow}` : `${c.priceLow}–${c.priceHigh}`) : ""
    return {
      title: c.count > 0 ? `Rent ${c.name} in UAE — ${c.count} cars from AED ${c.priceLow}/day`.slice(0, 60) : `${c.name} car rental UAE & Syria | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} ${c.name} rental cars in ${cities4}${models3 ? ` — popular: ${models3}` : ""}. Daily, weekly, monthly rates ${range ? `from AED ${c.priceLow}/day` : ""}. Direct contact with verified rental companies. No commission.`.slice(0, 160)
        : `Browse ${c.name} rental cars across the UAE and Syria. Verified rental companies. Direct contact via WhatsApp, phone, or free international call. No commission.`.slice(0, 160),
      intro: c.count > 0
        ? `${c.name} is one of the most popular car brands available for rent in the UAE${c.cityNames.length ? ` — especially in ${cities4}` : ""}. We currently list <strong>${c.count} ${c.name} ${c.count === 1 ? "vehicle" : "vehicles"}</strong> from verified rental companies${range ? `, with daily rates ranging from <strong>AED ${c.priceLow}</strong> to <strong>AED ${c.priceHigh}</strong>` : ""}.${c.topModels.length ? ` The most-listed models include ${c.topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? ` (${m.count})` : ""}`).join(", ")}.` : ""}`
        : `${c.name} rental cars will be available soon on Auto to Rental. In the meantime, browse our full catalog or contact us if you have a specific request.`,
      focusKeyword: `${c.name.toLowerCase()} rental UAE`,
      heroSub: `${c.count} ${c.count === 1 ? "car" : "cars"} from verified rental companies`,
      popularModels: `Popular ${c.name} models`,
      availableCars: `Available ${c.name} cars`,
      noneListed: `No ${c.name} cars listed yet.`,
      browseAll: `Browse all cars →`,
      routesHeading: `High-intent routes for ${c.name}`,
      routesSub: `Explore city and intent combinations that match how renters search before contacting suppliers.`,
      faqHeading: `Frequently asked questions about renting a ${c.name}`,
      bcHome: "Home", bcBrands: "Brands",
      faqs: [
        { q: `How much does it cost to rent a ${c.name} in UAE?`, a: c.priceLow ? `Renting a ${c.name} starts from around AED ${c.priceLow} per day on Auto to Rental. The exact price depends on the model, year, rental duration and the rental company. Monthly rentals offer the lowest daily rate. Compare ${c.count} ${c.name} cars from verified companies.` : `${c.name} rental prices depend on the model, year, rental duration and the rental company. Monthly rentals offer the lowest daily rate. Compare ${c.name} cars from verified companies directly — no commission, no booking fees.` },
        { q: `Can I rent a ${c.name} monthly?`, a: `Yes. Most companies listing ${c.name} cars offer daily, weekly and monthly rates. A monthly ${c.name} rental usually gives the best daily price and often includes insurance, registration and routine maintenance.` },
        { q: `Which ${c.name} models are available to rent?`, a: c.topModels.length ? `Popular ${c.name} models currently available include ${c.topModels.slice(0, 5).map(m => m.name).join(", ")}, and more. Browse the full list to compare specs and prices.` : `A range of ${c.name} models is available from verified rental companies. Browse the listings to compare specs, years and prices.` },
        { q: `Does Auto to Rental charge fees on ${c.name} rentals?`, a: `No. Auto to Rental is a marketplace — you contact the rental company directly by phone, WhatsApp or call. We charge zero commission and zero booking fees on ${c.name} or any other car.` },
      ],
    }
  },
  ar: (c) => {
    const models3 = c.topModels.slice(0, 3).map(m => m.name).join("، ")
    const cities4 = c.cityNames.slice(0, 4).join("، ") || "الإمارات"
    return {
      title: c.count > 0 ? `تأجير ${c.name} في الإمارات — ${c.count} سيارة من ${c.priceLow} درهم/يوم`.slice(0, 60) : `تأجير سيارات ${c.name} في الإمارات وسوريا | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} سيارة ${c.name} للإيجار في ${cities4}${models3 ? ` — الأشهر: ${models3}` : ""}. أسعار يومية وأسبوعية وشهرية ${c.priceLow ? `من ${c.priceLow} درهم/يوم` : ""}. تواصل مباشر مع شركات تأجير موثوقة. بدون عمولة.`.slice(0, 160)
        : `تصفّح سيارات ${c.name} للإيجار في الإمارات وسوريا. شركات تأجير موثوقة وتواصل مباشر عبر واتساب أو الهاتف أو مكالمة دولية مجانية. بدون عمولة.`.slice(0, 160),
      intro: c.count > 0
        ? `تُعد ${c.name} من أكثر ماركات السيارات طلباً للإيجار في الإمارات${c.cityNames.length ? ` — خاصة في ${cities4}` : ""}. نعرض حالياً <strong>${c.count} سيارة ${c.name}</strong> من شركات تأجير موثوقة${c.priceLow && c.priceHigh ? `، بأسعار يومية تتراوح بين <strong>${c.priceLow} درهم</strong> و<strong>${c.priceHigh} درهم</strong>` : ""}.${c.topModels.length ? ` ومن أكثر الموديلات توفراً ${c.topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? ` (${m.count})` : ""}`).join("، ")}.` : ""}`
        : `ستتوفر سيارات ${c.name} للإيجار قريباً على Auto to Rental. في غضون ذلك تصفّح كامل الكتالوج أو تواصل معنا لأي طلب خاص.`,
      focusKeyword: `تأجير ${c.name} الإمارات`,
      heroSub: `${c.count} سيارة من شركات تأجير موثوقة`,
      popularModels: `أشهر موديلات ${c.name}`,
      availableCars: `سيارات ${c.name} المتوفرة`,
      noneListed: `لا توجد سيارات ${c.name} مدرجة بعد.`,
      browseAll: `تصفّح كل السيارات ←`,
      routesHeading: `وجهات البحث الأكثر طلباً لـ ${c.name}`,
      routesSub: `استكشف تركيبات المدينة ونوع الإيجار التي تطابق طريقة بحث المستأجرين قبل التواصل مع المورّدين.`,
      faqHeading: `أسئلة شائعة حول استئجار ${c.name}`,
      bcHome: "الرئيسية", bcBrands: "الماركات",
      faqs: [
        { q: `كم تكلفة استئجار ${c.name} في الإمارات؟`, a: c.priceLow ? `يبدأ استئجار ${c.name} من حوالي ${c.priceLow} درهم في اليوم على Auto to Rental. يعتمد السعر الدقيق على الموديل وسنة الصنع ومدة الإيجار وشركة التأجير. يوفّر الإيجار الشهري أقل سعر يومي. قارن بين ${c.count} سيارة ${c.name} من شركات موثوقة.` : `تعتمد أسعار تأجير ${c.name} على الموديل وسنة الصنع ومدة الإيجار وشركة التأجير. يوفّر الإيجار الشهري أقل سعر يومي. قارن سيارات ${c.name} من شركات موثوقة مباشرة — بدون عمولة وبدون رسوم حجز.` },
        { q: `هل يمكنني استئجار ${c.name} شهرياً؟`, a: `نعم. تقدّم معظم الشركات التي تعرض سيارات ${c.name} أسعاراً يومية وأسبوعية وشهرية. عادةً ما يمنحك الإيجار الشهري لـ ${c.name} أفضل سعر يومي وغالباً ما يشمل التأمين والتسجيل والصيانة الدورية.` },
        { q: `ما موديلات ${c.name} المتاحة للإيجار؟`, a: c.topModels.length ? `تشمل أشهر موديلات ${c.name} المتوفرة حالياً ${c.topModels.slice(0, 5).map(m => m.name).join("، ")} وغيرها. تصفّح القائمة الكاملة لمقارنة المواصفات والأسعار.` : `تتوفر مجموعة من موديلات ${c.name} من شركات تأجير موثوقة. تصفّح القوائم لمقارنة المواصفات وسنوات الصنع والأسعار.` },
        { q: `هل تتقاضى Auto to Rental رسوماً على تأجير ${c.name}؟`, a: `لا. Auto to Rental هي منصة وساطة — تتواصل مع شركة التأجير مباشرة عبر الهاتف أو واتساب أو المكالمة. لا نتقاضى أي عمولة ولا أي رسوم حجز على ${c.name} أو أي سيارة أخرى.` },
      ],
    }
  },
  es: (c) => {
    const models3 = c.topModels.slice(0, 3).map(m => m.name).join(", ")
    const cities4 = c.cityNames.slice(0, 4).join(", ") || "EAU"
    return {
      title: c.count > 0 ? `Alquilar ${c.name} en EAU — ${c.count} autos desde AED ${c.priceLow}/día`.slice(0, 60) : `Alquiler de autos ${c.name} en EAU y Siria | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} autos ${c.name} de alquiler en ${cities4}${models3 ? ` — populares: ${models3}` : ""}. Tarifas diarias, semanales y mensuales ${c.priceLow ? `desde AED ${c.priceLow}/día` : ""}. Contacto directo con empresas verificadas. Sin comisión.`.slice(0, 160)
        : `Explora autos ${c.name} de alquiler en EAU y Siria. Empresas de alquiler verificadas. Contacto directo por WhatsApp, teléfono o llamada internacional gratuita. Sin comisión.`.slice(0, 160),
      intro: c.count > 0
        ? `${c.name} es una de las marcas de autos más populares para alquilar en los EAU${c.cityNames.length ? ` — especialmente en ${cities4}` : ""}. Actualmente ofrecemos <strong>${c.count} ${c.count === 1 ? "vehículo" : "vehículos"} ${c.name}</strong> de empresas verificadas${c.priceLow && c.priceHigh ? `, con tarifas diarias desde <strong>AED ${c.priceLow}</strong> hasta <strong>AED ${c.priceHigh}</strong>` : ""}.${c.topModels.length ? ` Los modelos más listados incluyen ${c.topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? ` (${m.count})` : ""}`).join(", ")}.` : ""}`
        : `Los autos ${c.name} de alquiler estarán disponibles pronto en Auto to Rental. Mientras tanto, explora nuestro catálogo completo o contáctanos si tienes una solicitud específica.`,
      focusKeyword: `alquiler ${c.name.toLowerCase()} EAU`,
      heroSub: `${c.count} ${c.count === 1 ? "auto" : "autos"} de empresas verificadas`,
      popularModels: `Modelos ${c.name} populares`,
      availableCars: `Autos ${c.name} disponibles`,
      noneListed: `Aún no hay autos ${c.name} listados.`,
      browseAll: `Ver todos los autos →`,
      routesHeading: `Rutas de alta intención para ${c.name}`,
      routesSub: `Explora combinaciones de ciudad e intención que coinciden con cómo buscan los clientes antes de contactar a los proveedores.`,
      faqHeading: `Preguntas frecuentes sobre alquilar un ${c.name}`,
      bcHome: "Inicio", bcBrands: "Marcas",
      faqs: [
        { q: `¿Cuánto cuesta alquilar un ${c.name} en EAU?`, a: c.priceLow ? `Alquilar un ${c.name} cuesta desde unos AED ${c.priceLow} por día en Auto to Rental. El precio exacto depende del modelo, el año, la duración del alquiler y la empresa. El alquiler mensual ofrece la tarifa diaria más baja. Compara ${c.count} autos ${c.name} de empresas verificadas.` : `Los precios de alquiler de ${c.name} dependen del modelo, el año, la duración y la empresa. El alquiler mensual ofrece la tarifa diaria más baja. Compara autos ${c.name} de empresas verificadas directamente, sin comisión ni cargos de reserva.` },
        { q: `¿Puedo alquilar un ${c.name} mensualmente?`, a: `Sí. La mayoría de las empresas que listan autos ${c.name} ofrecen tarifas diarias, semanales y mensuales. Un alquiler mensual de ${c.name} suele dar el mejor precio diario y a menudo incluye seguro, registro y mantenimiento.` },
        { q: `¿Qué modelos ${c.name} están disponibles para alquilar?`, a: c.topModels.length ? `Los modelos ${c.name} populares disponibles ahora incluyen ${c.topModels.slice(0, 5).map(m => m.name).join(", ")} y más. Explora la lista completa para comparar especificaciones y precios.` : `Hay una variedad de modelos ${c.name} de empresas verificadas. Explora los listados para comparar especificaciones, años y precios.` },
        { q: `¿Auto to Rental cobra comisión por los alquileres de ${c.name}?`, a: `No. Auto to Rental es un marketplace: contactas a la empresa directamente por teléfono, WhatsApp o llamada. No cobramos comisión ni cargos de reserva por ${c.name} ni ningún otro auto.` },
      ],
    }
  },
  zh: (c) => {
    const models3 = c.topModels.slice(0, 3).map(m => m.name).join("、")
    const cities4 = c.cityNames.slice(0, 4).join("、") || "阿联酋"
    return {
      title: c.count > 0 ? `阿联酋租${c.name} — ${c.count}辆，每天AED ${c.priceLow}起`.slice(0, 60) : `${c.name}租车 阿联酋和叙利亚 | Auto to Rental`,
      description: c.count > 0
        ? `${cities4}有${c.count}辆${c.name}租车${models3 ? `——热门：${models3}` : ""}。日租、周租、月租${c.priceLow ? `，每天AED ${c.priceLow}起` : ""}。直接联系认证租车公司，无佣金。`.slice(0, 160)
        : `浏览阿联酋和叙利亚的${c.name}租车。认证租车公司，通过WhatsApp、电话或免费国际通话直接联系。无佣金。`.slice(0, 160),
      intro: c.count > 0
        ? `${c.name}是阿联酋最受欢迎的租车品牌之一${c.cityNames.length ? `——尤其在${cities4}` : ""}。我们目前提供来自认证租车公司的<strong>${c.count}辆${c.name}车辆</strong>${c.priceLow && c.priceHigh ? `，日租价格从<strong>AED ${c.priceLow}</strong>到<strong>AED ${c.priceHigh}</strong>` : ""}。${c.topModels.length ? ` 上架最多的车型包括${c.topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? `（${m.count}）` : ""}`).join("、")}。` : ""}`
        : `${c.name}租车即将在Auto to Rental上线。在此期间，请浏览我们的完整目录，或如有特定需求请联系我们。`,
      focusKeyword: `${c.name} 租车 阿联酋`,
      heroSub: `${c.count}辆来自认证租车公司`,
      popularModels: `热门${c.name}车型`,
      availableCars: `可租${c.name}车辆`,
      noneListed: `暂无${c.name}车辆上架。`,
      browseAll: `浏览所有车辆 →`,
      routesHeading: `${c.name}的高意向搜索路线`,
      routesSub: `探索符合租车者在联系供应商前搜索方式的城市与意向组合。`,
      faqHeading: `关于租${c.name}的常见问题`,
      bcHome: "首页", bcBrands: "品牌",
      faqs: [
        { q: `在阿联酋租一辆${c.name}多少钱？`, a: c.priceLow ? `在Auto to Rental上租${c.name}每天约AED ${c.priceLow}起。具体价格取决于车型、年份、租期和租车公司。月租的日均价格最低。比较${c.count}辆来自认证公司的${c.name}。` : `${c.name}的租车价格取决于车型、年份、租期和租车公司。月租的日均价格最低。直接比较认证公司的${c.name}——无佣金、无预订费。` },
        { q: `我可以按月租${c.name}吗？`, a: `可以。大多数提供${c.name}的公司都有日租、周租和月租。${c.name}月租通常日均价格最优，并常包含保险、注册和日常保养。` },
        { q: `有哪些${c.name}车型可租？`, a: c.topModels.length ? `目前热门的${c.name}车型包括${c.topModels.slice(0, 5).map(m => m.name).join("、")}等。浏览完整列表以比较配置和价格。` : `认证租车公司提供多种${c.name}车型。浏览列表以比较配置、年份和价格。` },
        { q: `Auto to Rental对${c.name}租车收费吗？`, a: `不收。Auto to Rental是一个平台——您通过电话、WhatsApp或通话直接联系租车公司。对${c.name}或任何车辆，我们不收任何佣金和预订费。` },
      ],
    }
  },
  th: (c) => {
    const models3 = c.topModels.slice(0, 3).map(m => m.name).join(", ")
    const cities4 = c.cityNames.slice(0, 4).join(", ") || "UAE"
    return {
      title: c.count > 0 ? `เช่า ${c.name} ใน UAE — ${c.count} คัน จาก AED ${c.priceLow}/วัน`.slice(0, 60) : `เช่ารถ ${c.name} ใน UAE และซีเรีย | Auto to Rental`,
      description: c.count > 0
        ? `รถเช่า ${c.name} ${c.count} คันใน ${cities4}${models3 ? ` — ยอดนิยม: ${models3}` : ""} อัตรารายวัน รายสัปดาห์ รายเดือน ${c.priceLow ? `เริ่ม AED ${c.priceLow}/วัน` : ""} ติดต่อบริษัทเช่ารถที่ผ่านการตรวจสอบโดยตรง ไม่มีค่าคอมมิชชั่น`.slice(0, 160)
        : `เลือกดูรถเช่า ${c.name} ทั่ว UAE และซีเรีย บริษัทเช่ารถที่ผ่านการตรวจสอบ ติดต่อโดยตรงผ่าน WhatsApp โทรศัพท์ หรือโทรต่างประเทศฟรี ไม่มีค่าคอมมิชชั่น`.slice(0, 160),
      intro: c.count > 0
        ? `${c.name} เป็นหนึ่งในแบรนด์รถยอดนิยมสำหรับเช่าใน UAE${c.cityNames.length ? ` — โดยเฉพาะใน ${cities4}` : ""} ขณะนี้เรามี <strong>${c.name} ${c.count} คัน</strong> จากบริษัทเช่ารถที่ผ่านการตรวจสอบ${c.priceLow && c.priceHigh ? ` ราคารายวันตั้งแต่ <strong>AED ${c.priceLow}</strong> ถึง <strong>AED ${c.priceHigh}</strong>` : ""}${c.topModels.length ? ` รุ่นที่ลงประกาศมากที่สุดได้แก่ ${c.topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? ` (${m.count})` : ""}`).join(", ")}` : ""}`
        : `รถเช่า ${c.name} จะเปิดให้บริการเร็ว ๆ นี้บน Auto to Rental ระหว่างนี้เลือกดูแคตตาล็อกทั้งหมดหรือติดต่อเราหากมีคำขอเฉพาะ`,
      focusKeyword: `เช่ารถ ${c.name} UAE`,
      heroSub: `${c.count} คัน จากบริษัทเช่ารถที่ผ่านการตรวจสอบ`,
      popularModels: `รุ่น ${c.name} ยอดนิยม`,
      availableCars: `รถ ${c.name} ที่มีให้เช่า`,
      noneListed: `ยังไม่มีรถ ${c.name} ลงประกาศ`,
      browseAll: `ดูรถทั้งหมด →`,
      routesHeading: `เส้นทางค้นหายอดนิยมสำหรับ ${c.name}`,
      routesSub: `สำรวจการผสมเมืองและจุดประสงค์ที่ตรงกับวิธีที่ผู้เช่าค้นหาก่อนติดต่อผู้ให้บริการ`,
      faqHeading: `คำถามที่พบบ่อยเกี่ยวกับการเช่า ${c.name}`,
      bcHome: "หน้าแรก", bcBrands: "แบรนด์",
      faqs: [
        { q: `เช่า ${c.name} ใน UAE ราคาเท่าไหร่?`, a: c.priceLow ? `การเช่า ${c.name} เริ่มต้นประมาณ AED ${c.priceLow} ต่อวันบน Auto to Rental ราคาขึ้นอยู่กับรุ่น ปี ระยะเวลาเช่า และบริษัท การเช่ารายเดือนให้ราคาต่อวันต่ำสุด เปรียบเทียบ ${c.name} ${c.count} คันจากบริษัทที่ผ่านการตรวจสอบ` : `ราคาเช่า ${c.name} ขึ้นอยู่กับรุ่น ปี ระยะเวลาเช่า และบริษัท การเช่ารายเดือนให้ราคาต่อวันต่ำสุด เปรียบเทียบ ${c.name} จากบริษัทที่ผ่านการตรวจสอบโดยตรง ไม่มีค่าคอมมิชชั่นและค่าจอง` },
        { q: `เช่า ${c.name} รายเดือนได้ไหม?`, a: `ได้ บริษัทส่วนใหญ่ที่ลงประกาศ ${c.name} มีอัตรารายวัน รายสัปดาห์ และรายเดือน การเช่า ${c.name} รายเดือนมักให้ราคาต่อวันดีที่สุด และมักรวมประกัน การจดทะเบียน และการบำรุงรักษา` },
        { q: `มีรุ่น ${c.name} อะไรให้เช่าบ้าง?`, a: c.topModels.length ? `รุ่น ${c.name} ยอดนิยมที่มีตอนนี้ได้แก่ ${c.topModels.slice(0, 5).map(m => m.name).join(", ")} และอื่น ๆ ดูรายการทั้งหมดเพื่อเปรียบเทียบสเปคและราคา` : `มีรุ่น ${c.name} หลากหลายจากบริษัทที่ผ่านการตรวจสอบ ดูรายการเพื่อเปรียบเทียบสเปค ปี และราคา` },
        { q: `Auto to Rental คิดค่าธรรมเนียมการเช่า ${c.name} ไหม?`, a: `ไม่ Auto to Rental เป็นแพลตฟอร์ม — คุณติดต่อบริษัทเช่ารถโดยตรงทางโทรศัพท์ WhatsApp หรือโทร เราไม่คิดค่าคอมมิชชั่นและค่าจองสำหรับ ${c.name} หรือรถคันใด ๆ` },
      ],
    }
  },
  ru: (c) => {
    const models3 = c.topModels.slice(0, 3).map(m => m.name).join(", ")
    const cities4 = c.cityNames.slice(0, 4).join(", ") || "ОАЭ"
    return {
      title: c.count > 0 ? `Аренда ${c.name} в ОАЭ — ${c.count} авто от AED ${c.priceLow}/день`.slice(0, 60) : `Аренда ${c.name} в ОАЭ и Сирии | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} авто ${c.name} в аренду в ${cities4}${models3 ? ` — популярные: ${models3}` : ""}. Посуточно, понедельно, помесячно ${c.priceLow ? `от AED ${c.priceLow}/день` : ""}. Прямой контакт с проверенными компаниями. Без комиссии.`.slice(0, 160)
        : `Авто ${c.name} в аренду по всем ОАЭ и Сирии. Проверенные компании, прямой контакт через WhatsApp, телефон или бесплатный международный звонок. Без комиссии.`.slice(0, 160),
      intro: c.count > 0
        ? `${c.name} — одна из самых популярных марок для аренды в ОАЭ${c.cityNames.length ? ` — особенно в ${cities4}` : ""}. Сейчас доступно <strong>${c.count} авто ${c.name}</strong> от проверенных компаний${c.priceLow && c.priceHigh ? `, со стоимостью в сутки от <strong>AED ${c.priceLow}</strong> до <strong>AED ${c.priceHigh}</strong>` : ""}.${c.topModels.length ? ` Чаще всего размещают модели ${c.topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? ` (${m.count})` : ""}`).join(", ")}.` : ""}`
        : `Авто ${c.name} в аренду скоро появятся на Auto to Rental. А пока просмотрите весь каталог или свяжитесь с нами по особому запросу.`,
      focusKeyword: `аренда ${c.name.toLowerCase()} ОАЭ`,
      heroSub: `${c.count} авто от проверенных компаний`,
      popularModels: `Популярные модели ${c.name}`,
      availableCars: `Доступные авто ${c.name}`,
      noneListed: `Авто ${c.name} пока не размещены.`,
      browseAll: `Смотреть все авто →`,
      routesHeading: `Популярные запросы по ${c.name}`,
      routesSub: `Изучите сочетания города и цели, отражающие то, как арендаторы ищут перед обращением к поставщикам.`,
      faqHeading: `Частые вопросы об аренде ${c.name}`,
      bcHome: "Главная", bcBrands: "Марки",
      faqs: [
        { q: `Сколько стоит аренда ${c.name} в ОАЭ?`, a: c.priceLow ? `Аренда ${c.name} начинается примерно от AED ${c.priceLow} в сутки на Auto to Rental. Точная цена зависит от модели, года, срока аренды и компании. Помесячная аренда даёт самую низкую суточную цену. Сравните ${c.count} авто ${c.name} от проверенных компаний.` : `Цены на аренду ${c.name} зависят от модели, года, срока аренды и компании. Помесячная аренда даёт самую низкую суточную цену. Сравнивайте авто ${c.name} от проверенных компаний напрямую — без комиссии и сборов за бронирование.` },
        { q: `Можно ли арендовать ${c.name} помесячно?`, a: `Да. Большинство компаний с авто ${c.name} предлагают посуточные, понедельные и помесячные тарифы. Помесячная аренда ${c.name} обычно даёт лучшую суточную цену и часто включает страховку, регистрацию и обслуживание.` },
        { q: `Какие модели ${c.name} доступны в аренду?`, a: c.topModels.length ? `Сейчас популярны модели ${c.name}: ${c.topModels.slice(0, 5).map(m => m.name).join(", ")} и другие. Смотрите полный список для сравнения характеристик и цен.` : `Доступен ряд моделей ${c.name} от проверенных компаний. Смотрите объявления для сравнения характеристик, годов и цен.` },
        { q: `Берёт ли Auto to Rental комиссию за аренду ${c.name}?`, a: `Нет. Auto to Rental — это площадка: вы связываетесь с компанией напрямую по телефону, WhatsApp или звонку. Мы не берём ни комиссии, ни сборов за бронирование ${c.name} или любого другого авто.` },
      ],
    }
  },
  ur: (c) => {
    const models3 = c.topModels.slice(0, 3).map(m => m.name).join("، ")
    const cities4 = c.cityNames.slice(0, 4).join("، ") || "متحدہ عرب امارات"
    return {
      title: c.count > 0 ? `${c.name} کرائے پر — UAE میں ${c.count} گاڑیاں، AED ${c.priceLow}/دن سے`.slice(0, 60) : `${c.name} کار کرایہ UAE اور شام | Auto to Rental`,
      description: c.count > 0
        ? `${cities4} میں ${c.count} ${c.name} کرائے کی گاڑیاں${models3 ? ` — مقبول: ${models3}` : ""}۔ روزانہ، ہفتہ وار، ماہانہ ریٹ ${c.priceLow ? `AED ${c.priceLow}/دن سے` : ""}۔ تصدیق شدہ کمپنیوں سے براہ راست رابطہ۔ کوئی کمیشن نہیں۔`.slice(0, 160)
        : `UAE اور شام میں ${c.name} کرائے کی گاڑیاں دیکھیں۔ تصدیق شدہ کمپنیاں، WhatsApp، فون یا مفت بین الاقوامی کال کے ذریعے براہ راست رابطہ۔ کوئی کمیشن نہیں۔`.slice(0, 160),
      intro: c.count > 0
        ? `${c.name} UAE میں کرائے کے لیے سب سے مقبول کار برانڈز میں سے ایک ہے${c.cityNames.length ? ` — خاص طور پر ${cities4} میں` : ""}۔ ہم اس وقت تصدیق شدہ کمپنیوں کی <strong>${c.count} ${c.name} گاڑیاں</strong> پیش کر رہے ہیں${c.priceLow && c.priceHigh ? `، روزانہ ریٹ <strong>AED ${c.priceLow}</strong> سے <strong>AED ${c.priceHigh}</strong> تک` : ""}۔${c.topModels.length ? ` سب سے زیادہ درج ماڈلز میں ${c.topModels.map(m => `<strong>${m.name}</strong>${m.count > 1 ? ` (${m.count})` : ""}`).join("، ")} شامل ہیں۔` : ""}`
        : `${c.name} کرائے کی گاڑیاں جلد ہی Auto to Rental پر دستیاب ہوں گی۔ اس دوران ہمارا مکمل کیٹلاگ دیکھیں یا کسی خاص درخواست کے لیے ہم سے رابطہ کریں۔`,
      focusKeyword: `${c.name} کرایہ UAE`,
      heroSub: `تصدیق شدہ کمپنیوں کی ${c.count} گاڑیاں`,
      popularModels: `مقبول ${c.name} ماڈلز`,
      availableCars: `دستیاب ${c.name} گاڑیاں`,
      noneListed: `ابھی تک کوئی ${c.name} گاڑی درج نہیں۔`,
      browseAll: `تمام گاڑیاں دیکھیں ←`,
      routesHeading: `${c.name} کے لیے مقبول تلاش راستے`,
      routesSub: `شہر اور مقصد کے وہ امتزاج دیکھیں جو فراہم کنندگان سے رابطے سے پہلے کرایہ داروں کی تلاش سے مطابقت رکھتے ہیں۔`,
      faqHeading: `${c.name} کرائے پر لینے کے بارے میں عمومی سوالات`,
      bcHome: "ہوم", bcBrands: "برانڈز",
      faqs: [
        { q: `UAE میں ${c.name} کرائے پر لینے کی قیمت کتنی ہے؟`, a: c.priceLow ? `Auto to Rental پر ${c.name} کرائے پر تقریباً AED ${c.priceLow} فی دن سے شروع ہوتا ہے۔ اصل قیمت ماڈل، سال، کرائے کی مدت اور کمپنی پر منحصر ہے۔ ماہانہ کرایہ سب سے کم روزانہ ریٹ دیتا ہے۔ تصدیق شدہ کمپنیوں کی ${c.count} ${c.name} گاڑیوں کا موازنہ کریں۔` : `${c.name} کرائے کی قیمتیں ماڈل، سال، مدت اور کمپنی پر منحصر ہیں۔ ماہانہ کرایہ سب سے کم روزانہ ریٹ دیتا ہے۔ تصدیق شدہ کمپنیوں کی ${c.name} گاڑیوں کا براہ راست موازنہ کریں — کوئی کمیشن یا بکنگ فیس نہیں۔` },
        { q: `کیا میں ${c.name} ماہانہ کرائے پر لے سکتا ہوں؟`, a: `جی ہاں۔ ${c.name} گاڑیاں درج کرنے والی زیادہ تر کمپنیاں روزانہ، ہفتہ وار اور ماہانہ ریٹ پیش کرتی ہیں۔ ${c.name} کا ماہانہ کرایہ عموماً بہترین روزانہ قیمت دیتا ہے اور اکثر بیمہ، رجسٹریشن اور معمول کی دیکھ بھال شامل ہوتی ہے۔` },
        { q: `کرائے کے لیے کون سے ${c.name} ماڈلز دستیاب ہیں؟`, a: c.topModels.length ? `اس وقت دستیاب مقبول ${c.name} ماڈلز میں ${c.topModels.slice(0, 5).map(m => m.name).join("، ")} اور مزید شامل ہیں۔ خصوصیات اور قیمتوں کا موازنہ کرنے کے لیے مکمل فہرست دیکھیں۔` : `تصدیق شدہ کمپنیوں سے ${c.name} ماڈلز کی ایک رینج دستیاب ہے۔ خصوصیات، سال اور قیمتوں کا موازنہ کرنے کے لیے فہرستیں دیکھیں۔` },
        { q: `کیا Auto to Rental ${c.name} کرائے پر فیس لیتا ہے؟`, a: `نہیں۔ Auto to Rental ایک مارکیٹ پلیس ہے — آپ کمپنی سے فون، WhatsApp یا کال کے ذریعے براہ راست رابطہ کرتے ہیں۔ ہم ${c.name} یا کسی اور گاڑی پر کوئی کمیشن اور بکنگ فیس نہیں لیتے۔` },
      ],
    }
  },
}

// ───────────────────────── CITY ─────────────────────────
const CITY: Record<Locale, (c: CityCtx) => CitySeo> = {
  en: (c) => {
    const country = c.country === "sy" ? "Syria" : "UAE"
    const brands3 = c.brandNames.slice(0, 3).join(", ")
    const bodies3 = c.bodyTypes.slice(0, 3).map(b => b.toLowerCase()).join(", ")
    return {
      title: c.count > 0 ? `Car Rental ${c.name} — ${c.count} Cars from AED ${c.priceLow}/day`.slice(0, 60) : `Car Rental in ${c.name}, ${country} | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} cars for rent in ${c.name}${brands3 ? ` — ${brands3}` : ""}${bodies3 ? ` and other ${bodies3}` : ""}. Daily, weekly, monthly. From AED ${c.priceLow}/day. Direct contact with verified rental companies. No commission.`.slice(0, 160)
        : `Rent a car in ${c.name}, ${country}. Verified rental companies, direct contact via WhatsApp, phone, or free international call. No commission, no booking fees.`.slice(0, 160),
      intro: c.count > 0
        ? `Looking to rent a car in <strong>${c.name}</strong>? Auto to Rental lists <strong>${c.count} ${c.count === 1 ? "vehicle" : "vehicles"}</strong> from verified rental companies operating in the city, with daily prices starting at <strong>AED ${c.priceLow}</strong>${c.brandNames.length ? `. Popular brands available include ${c.brandNames.slice(0, 4).map(b => `<strong>${b}</strong>`).join(", ")}` : ""}${c.bodyTypes.length ? `. Body types range from ${c.bodyTypes.slice(0, 3).map(b => b.toLowerCase()).join(", ")}` : ""}.`
        : `Car rentals in <strong>${c.name}</strong> are coming soon to Auto to Rental. Check back shortly or contact us with your specific request.`,
      focusKeyword: `car rental ${c.name.toLowerCase()}`,
      heroSub: `${c.count} ${c.count === 1 ? "car" : "cars"} available`,
      topBrands: `Top brands available in ${c.name}`,
      carsFor: `Cars for rent in ${c.name}`,
      noneListed: `No cars listed in ${c.name} yet.`,
      routesHeading: `High-intent routes in ${c.name}`,
      routesSub: `Jump directly to city + brand + intent pages for faster comparison and booking decisions.`,
      faqHeading: `Frequently asked questions about car rental in ${c.name}`,
      bcHome: "Home", bcCars: "Cars",
      faqs: cityFaqsEn(c),
    }
  },
  ar: (c) => {
    const country = c.country === "sy" ? "سوريا" : "الإمارات"
    const brands3 = c.brandNames.slice(0, 3).join("، ")
    const bodies3 = c.bodyTypes.slice(0, 3).join("، ")
    return {
      title: c.count > 0 ? `تأجير سيارات ${c.name} — ${c.count} سيارة من ${c.priceLow} درهم/يوم`.slice(0, 60) : `تأجير سيارات في ${c.name}، ${country} | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} سيارة للإيجار في ${c.name}${brands3 ? ` — ${brands3}` : ""}${bodies3 ? ` وأنواع أخرى مثل ${bodies3}` : ""}. يومي وأسبوعي وشهري. من ${c.priceLow} درهم/يوم. تواصل مباشر مع شركات موثوقة. بدون عمولة.`.slice(0, 160)
        : `استأجر سيارة في ${c.name}، ${country}. شركات تأجير موثوقة وتواصل مباشر عبر واتساب أو الهاتف أو مكالمة دولية مجانية. بدون عمولة ولا رسوم حجز.`.slice(0, 160),
      intro: c.count > 0
        ? `تبحث عن استئجار سيارة في <strong>${c.name}</strong>؟ يعرض Auto to Rental <strong>${c.count} سيارة</strong> من شركات تأجير موثوقة تعمل في المدينة، بأسعار يومية تبدأ من <strong>${c.priceLow} درهم</strong>${c.brandNames.length ? `. ومن أشهر الماركات المتوفرة ${c.brandNames.slice(0, 4).map(b => `<strong>${b}</strong>`).join("، ")}` : ""}${c.bodyTypes.length ? `. وتتنوع الفئات بين ${c.bodyTypes.slice(0, 3).join("، ")}` : ""}.`
        : `سيتوفر تأجير السيارات في <strong>${c.name}</strong> قريباً على Auto to Rental. عُد لاحقاً أو تواصل معنا بطلبك الخاص.`,
      focusKeyword: `تأجير سيارات ${c.name}`,
      heroSub: `${c.count} سيارة متاحة`,
      topBrands: `أبرز الماركات المتوفرة في ${c.name}`,
      carsFor: `سيارات للإيجار في ${c.name}`,
      noneListed: `لا توجد سيارات مدرجة في ${c.name} بعد.`,
      routesHeading: `وجهات البحث الأكثر طلباً في ${c.name}`,
      routesSub: `انتقل مباشرة إلى صفحات المدينة + الماركة + نوع الإيجار لمقارنة أسرع وقرارات حجز أفضل.`,
      faqHeading: `أسئلة شائعة حول تأجير السيارات في ${c.name}`,
      bcHome: "الرئيسية", bcCars: "السيارات",
      faqs: cityFaqsAr(c),
    }
  },
  es: (c) => {
    const country = c.country === "sy" ? "Siria" : "EAU"
    const brands3 = c.brandNames.slice(0, 3).join(", ")
    const bodies3 = c.bodyTypes.slice(0, 3).map(b => b.toLowerCase()).join(", ")
    return {
      title: c.count > 0 ? `Alquiler de autos ${c.name} — ${c.count} desde AED ${c.priceLow}/día`.slice(0, 60) : `Alquiler de autos en ${c.name}, ${country} | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} autos de alquiler en ${c.name}${brands3 ? ` — ${brands3}` : ""}${bodies3 ? ` y otros ${bodies3}` : ""}. Diario, semanal, mensual. Desde AED ${c.priceLow}/día. Contacto directo con empresas verificadas. Sin comisión.`.slice(0, 160)
        : `Alquila un auto en ${c.name}, ${country}. Empresas verificadas, contacto directo por WhatsApp, teléfono o llamada internacional gratuita. Sin comisión ni cargos de reserva.`.slice(0, 160),
      intro: c.count > 0
        ? `¿Buscas alquilar un auto en <strong>${c.name}</strong>? Auto to Rental ofrece <strong>${c.count} ${c.count === 1 ? "vehículo" : "vehículos"}</strong> de empresas verificadas que operan en la ciudad, con precios diarios desde <strong>AED ${c.priceLow}</strong>${c.brandNames.length ? `. Las marcas populares disponibles incluyen ${c.brandNames.slice(0, 4).map(b => `<strong>${b}</strong>`).join(", ")}` : ""}${c.bodyTypes.length ? `. Los tipos de carrocería van desde ${c.bodyTypes.slice(0, 3).map(b => b.toLowerCase()).join(", ")}` : ""}.`
        : `El alquiler de autos en <strong>${c.name}</strong> llegará pronto a Auto to Rental. Vuelve pronto o contáctanos con tu solicitud específica.`,
      focusKeyword: `alquiler de autos ${c.name.toLowerCase()}`,
      heroSub: `${c.count} ${c.count === 1 ? "auto disponible" : "autos disponibles"}`,
      topBrands: `Mejores marcas disponibles en ${c.name}`,
      carsFor: `Autos de alquiler en ${c.name}`,
      noneListed: `Aún no hay autos listados en ${c.name}.`,
      routesHeading: `Rutas de alta intención en ${c.name}`,
      routesSub: `Ve directamente a las páginas de ciudad + marca + intención para comparar y decidir más rápido.`,
      faqHeading: `Preguntas frecuentes sobre alquiler de autos en ${c.name}`,
      bcHome: "Inicio", bcCars: "Autos",
      faqs: cityFaqsEs(c),
    }
  },
  zh: (c) => {
    const country = c.country === "sy" ? "叙利亚" : "阿联酋"
    const brands3 = c.brandNames.slice(0, 3).join("、")
    const bodies3 = c.bodyTypes.slice(0, 3).join("、")
    return {
      title: c.count > 0 ? `${c.name}租车 — ${c.count}辆，每天AED ${c.priceLow}起`.slice(0, 60) : `${c.name}租车 ${country} | Auto to Rental`,
      description: c.count > 0
        ? `${c.name}有${c.count}辆租车${brands3 ? ` — ${brands3}` : ""}${bodies3 ? `及其他${bodies3}` : ""}。日租、周租、月租。每天AED ${c.priceLow}起。直接联系认证租车公司。无佣金。`.slice(0, 160)
        : `在${country}${c.name}租车。认证租车公司，通过WhatsApp、电话或免费国际通话直接联系。无佣金，无预订费。`.slice(0, 160),
      intro: c.count > 0
        ? `想在<strong>${c.name}</strong>租车？Auto to Rental提供该市认证租车公司的<strong>${c.count}辆车</strong>，日租价格从<strong>AED ${c.priceLow}</strong>起${c.brandNames.length ? `。可选的热门品牌包括${c.brandNames.slice(0, 4).map(b => `<strong>${b}</strong>`).join("、")}` : ""}${c.bodyTypes.length ? `。车型涵盖${c.bodyTypes.slice(0, 3).join("、")}` : ""}。`
        : `<strong>${c.name}</strong>的租车服务即将在Auto to Rental上线。请稍后再来，或联系我们提出具体需求。`,
      focusKeyword: `${c.name} 租车`,
      heroSub: `${c.count}辆可租`,
      topBrands: `${c.name}热门可租品牌`,
      carsFor: `${c.name}租车`,
      noneListed: `${c.name}暂无车辆上架。`,
      routesHeading: `${c.name}的高意向搜索路线`,
      routesSub: `直接跳转到城市+品牌+意向页面，更快比较和决策。`,
      faqHeading: `关于${c.name}租车的常见问题`,
      bcHome: "首页", bcCars: "租车",
      faqs: cityFaqsZh(c),
    }
  },
  th: (c) => {
    const country = c.country === "sy" ? "ซีเรีย" : "UAE"
    const brands3 = c.brandNames.slice(0, 3).join(", ")
    const bodies3 = c.bodyTypes.slice(0, 3).join(", ")
    return {
      title: c.count > 0 ? `รถเช่า ${c.name} — ${c.count} คัน จาก AED ${c.priceLow}/วัน`.slice(0, 60) : `รถเช่าใน ${c.name}, ${country} | Auto to Rental`,
      description: c.count > 0
        ? `รถเช่า ${c.count} คันใน ${c.name}${brands3 ? ` — ${brands3}` : ""}${bodies3 ? ` และอื่น ๆ ${bodies3}` : ""} รายวัน รายสัปดาห์ รายเดือน เริ่ม AED ${c.priceLow}/วัน ติดต่อบริษัทที่ผ่านการตรวจสอบโดยตรง ไม่มีค่าคอมมิชชั่น`.slice(0, 160)
        : `เช่ารถใน ${c.name}, ${country} บริษัทที่ผ่านการตรวจสอบ ติดต่อโดยตรงผ่าน WhatsApp โทรศัพท์ หรือโทรต่างประเทศฟรี ไม่มีค่าคอมมิชชั่นและค่าจอง`.slice(0, 160),
      intro: c.count > 0
        ? `กำลังมองหารถเช่าใน <strong>${c.name}</strong>? Auto to Rental มี <strong>${c.count} คัน</strong> จากบริษัทเช่ารถที่ผ่านการตรวจสอบในเมืองนี้ ราคารายวันเริ่มต้นที่ <strong>AED ${c.priceLow}</strong>${c.brandNames.length ? ` แบรนด์ยอดนิยมที่มี ได้แก่ ${c.brandNames.slice(0, 4).map(b => `<strong>${b}</strong>`).join(", ")}` : ""}${c.bodyTypes.length ? ` ประเภทรถมีตั้งแต่ ${c.bodyTypes.slice(0, 3).join(", ")}` : ""}`
        : `บริการรถเช่าใน <strong>${c.name}</strong> กำลังจะเปิดบน Auto to Rental เร็ว ๆ นี้ กลับมาใหม่หรือติดต่อเราพร้อมคำขอเฉพาะ`,
      focusKeyword: `รถเช่า ${c.name}`,
      heroSub: `มี ${c.count} คัน`,
      topBrands: `แบรนด์ยอดนิยมที่มีใน ${c.name}`,
      carsFor: `รถเช่าใน ${c.name}`,
      noneListed: `ยังไม่มีรถลงประกาศใน ${c.name}`,
      routesHeading: `เส้นทางค้นหายอดนิยมใน ${c.name}`,
      routesSub: `ไปที่หน้าเมือง + แบรนด์ + จุดประสงค์โดยตรง เพื่อเปรียบเทียบและตัดสินใจได้เร็วขึ้น`,
      faqHeading: `คำถามที่พบบ่อยเกี่ยวกับรถเช่าใน ${c.name}`,
      bcHome: "หน้าแรก", bcCars: "รถเช่า",
      faqs: cityFaqsTh(c),
    }
  },
  ru: (c) => {
    const country = c.country === "sy" ? "Сирия" : "ОАЭ"
    const brands3 = c.brandNames.slice(0, 3).join(", ")
    const bodies3 = c.bodyTypes.slice(0, 3).map(b => b.toLowerCase()).join(", ")
    return {
      title: c.count > 0 ? `Аренда авто ${c.name} — ${c.count} от AED ${c.priceLow}/день`.slice(0, 60) : `Аренда авто в ${c.name}, ${country} | Auto to Rental`,
      description: c.count > 0
        ? `${c.count} авто в аренду в ${c.name}${brands3 ? ` — ${brands3}` : ""}${bodies3 ? ` и другие ${bodies3}` : ""}. Посуточно, понедельно, помесячно. От AED ${c.priceLow}/день. Прямой контакт с проверенными компаниями. Без комиссии.`.slice(0, 160)
        : `Аренда авто в ${c.name}, ${country}. Проверенные компании, прямой контакт через WhatsApp, телефон или бесплатный международный звонок. Без комиссии и сборов.`.slice(0, 160),
      intro: c.count > 0
        ? `Ищете авто в аренду в <strong>${c.name}</strong>? На Auto to Rental доступно <strong>${c.count} авто</strong> от проверенных компаний города, с ценой в сутки от <strong>AED ${c.priceLow}</strong>${c.brandNames.length ? `. Популярные доступные марки: ${c.brandNames.slice(0, 4).map(b => `<strong>${b}</strong>`).join(", ")}` : ""}${c.bodyTypes.length ? `. Типы кузова: ${c.bodyTypes.slice(0, 3).map(b => b.toLowerCase()).join(", ")}` : ""}.`
        : `Аренда авто в <strong>${c.name}</strong> скоро появится на Auto to Rental. Загляните позже или свяжитесь с нами по особому запросу.`,
      focusKeyword: `аренда авто ${c.name.toLowerCase()}`,
      heroSub: `${c.count} авто доступно`,
      topBrands: `Популярные марки в ${c.name}`,
      carsFor: `Авто в аренду в ${c.name}`,
      noneListed: `Авто в ${c.name} пока не размещены.`,
      routesHeading: `Популярные запросы в ${c.name}`,
      routesSub: `Переходите сразу к страницам город + марка + цель для быстрого сравнения и решения о бронировании.`,
      faqHeading: `Частые вопросы об аренде авто в ${c.name}`,
      bcHome: "Главная", bcCars: "Авто",
      faqs: cityFaqsRu(c),
    }
  },
  ur: (c) => {
    const country = c.country === "sy" ? "شام" : "متحدہ عرب امارات"
    const brands3 = c.brandNames.slice(0, 3).join("، ")
    const bodies3 = c.bodyTypes.slice(0, 3).join("، ")
    return {
      title: c.count > 0 ? `${c.name} کار کرایہ — ${c.count} گاڑیاں، AED ${c.priceLow}/دن سے`.slice(0, 60) : `${c.name}، ${country} میں کار کرایہ | Auto to Rental`,
      description: c.count > 0
        ? `${c.name} میں ${c.count} کرائے کی گاڑیاں${brands3 ? ` — ${brands3}` : ""}${bodies3 ? ` اور دیگر ${bodies3}` : ""}۔ روزانہ، ہفتہ وار، ماہانہ۔ AED ${c.priceLow}/دن سے۔ تصدیق شدہ کمپنیوں سے براہ راست رابطہ۔ کوئی کمیشن نہیں۔`.slice(0, 160)
        : `${c.name}، ${country} میں کار کرائے پر لیں۔ تصدیق شدہ کمپنیاں، WhatsApp، فون یا مفت بین الاقوامی کال کے ذریعے براہ راست رابطہ۔ کوئی کمیشن یا بکنگ فیس نہیں۔`.slice(0, 160),
      intro: c.count > 0
        ? `<strong>${c.name}</strong> میں کار کرائے پر لینا چاہتے ہیں؟ Auto to Rental شہر میں کام کرنے والی تصدیق شدہ کمپنیوں کی <strong>${c.count} گاڑیاں</strong> پیش کرتا ہے، روزانہ قیمت <strong>AED ${c.priceLow}</strong> سے شروع${c.brandNames.length ? `۔ دستیاب مقبول برانڈز میں ${c.brandNames.slice(0, 4).map(b => `<strong>${b}</strong>`).join("، ")} شامل ہیں` : ""}${c.bodyTypes.length ? `۔ باڈی اقسام ${c.bodyTypes.slice(0, 3).join("، ")} تک` : ""}۔`
        : `<strong>${c.name}</strong> میں کار کرایہ جلد ہی Auto to Rental پر آ رہا ہے۔ کچھ دیر بعد دیکھیں یا اپنی خاص درخواست کے ساتھ ہم سے رابطہ کریں۔`,
      focusKeyword: `کار کرایہ ${c.name}`,
      heroSub: `${c.count} گاڑیاں دستیاب`,
      topBrands: `${c.name} میں دستیاب بہترین برانڈز`,
      carsFor: `${c.name} میں کرائے کی گاڑیاں`,
      noneListed: `ابھی تک ${c.name} میں کوئی گاڑی درج نہیں۔`,
      routesHeading: `${c.name} میں مقبول تلاش راستے`,
      routesSub: `تیز موازنہ اور بکنگ فیصلوں کے لیے براہ راست شہر + برانڈ + مقصد صفحات پر جائیں۔`,
      faqHeading: `${c.name} میں کار کرائے کے بارے میں عمومی سوالات`,
      bcHome: "ہوم", bcCars: "گاڑیاں",
      faqs: cityFaqsUr(c),
    }
  },
}

// City FAQ builders (5 each) — split out to keep the locale objects readable.
function cityFaqsEn(c: CityCtx) {
  const sy = c.country === "sy"
  return [
    { q: `How much does it cost to rent a car in ${c.name}?`, a: c.priceLow ? `Car rental in ${c.name} starts from around AED ${c.priceLow} per day. Prices vary by car model, rental duration, and the rental company. Monthly rentals are usually much cheaper per day. Browse ${c.count} available cars to compare live prices.` : `Car rental prices in ${c.name} depend on the car model, rental duration, and the rental company. Monthly rentals are usually much cheaper per day. Browse available cars to compare live prices directly with verified companies.` },
    { q: `What documents do I need to rent a car in ${c.name}?`, a: sy ? `You typically need a valid driving licence, a passport or national ID, and to be at least 21 years old. Requirements can vary by company — contact the rental company directly to confirm.` : `In the UAE you usually need a valid UAE driving licence or an International Driving Permit (for tourists), your passport or Emirates ID, and to be at least 21–25 years old depending on the car. Contact the rental company to confirm exact requirements.` },
    { q: `Can I rent a car monthly in ${c.name}?`, a: `Yes. Most rental companies in ${c.name} offer daily, weekly and monthly rates. Monthly car rental usually gives the lowest daily price and often includes registration, insurance and routine maintenance. Use the price filters to find monthly deals.` },
    { q: `Does Auto to Rental charge commission or booking fees?`, a: `No. Auto to Rental is a marketplace — you contact verified rental companies in ${c.name} directly by phone, WhatsApp or call. We charge zero commission and zero booking fees.` },
    { q: `Is car delivery available in ${c.name}?`, a: `Many rental companies in ${c.name} offer car delivery to your hotel, home, or the airport. Delivery availability and fees are shown on each car's page — check the listing or contact the company directly.` },
  ]
}
function cityFaqsAr(c: CityCtx) {
  const sy = c.country === "sy"
  return [
    { q: `كم تكلفة استئجار سيارة في ${c.name}؟`, a: c.priceLow ? `يبدأ تأجير السيارات في ${c.name} من حوالي ${c.priceLow} درهم في اليوم. تختلف الأسعار حسب موديل السيارة ومدة الإيجار وشركة التأجير. عادةً ما يكون الإيجار الشهري أرخص بكثير في اليوم. تصفّح ${c.count} سيارة متاحة لمقارنة الأسعار الحية.` : `تعتمد أسعار تأجير السيارات في ${c.name} على موديل السيارة ومدة الإيجار وشركة التأجير. عادةً ما يكون الإيجار الشهري أرخص بكثير في اليوم. تصفّح السيارات المتاحة لمقارنة الأسعار مباشرة مع شركات موثوقة.` },
    { q: `ما المستندات التي أحتاجها لاستئجار سيارة في ${c.name}؟`, a: sy ? `تحتاج عادةً إلى رخصة قيادة سارية وجواز سفر أو هوية وطنية وأن يكون عمرك 21 عاماً على الأقل. قد تختلف المتطلبات حسب الشركة — تواصل مع شركة التأجير مباشرة للتأكيد.` : `في الإمارات تحتاج عادةً إلى رخصة قيادة إماراتية سارية أو رخصة قيادة دولية (للسياح)، وجواز سفرك أو الهوية الإماراتية، وأن يكون عمرك بين 21 و25 عاماً حسب السيارة. تواصل مع شركة التأجير لتأكيد المتطلبات الدقيقة.` },
    { q: `هل يمكنني استئجار سيارة شهرياً في ${c.name}؟`, a: `نعم. تقدّم معظم شركات التأجير في ${c.name} أسعاراً يومية وأسبوعية وشهرية. عادةً ما يمنحك الإيجار الشهري أقل سعر يومي وغالباً يشمل التسجيل والتأمين والصيانة الدورية. استخدم فلاتر السعر للعثور على عروض شهرية.` },
    { q: `هل تتقاضى Auto to Rental عمولة أو رسوم حجز؟`, a: `لا. Auto to Rental منصة وساطة — تتواصل مع شركات التأجير الموثوقة في ${c.name} مباشرة عبر الهاتف أو واتساب أو المكالمة. لا نتقاضى أي عمولة ولا أي رسوم حجز.` },
    { q: `هل يتوفر توصيل السيارة في ${c.name}؟`, a: `تقدّم كثير من شركات التأجير في ${c.name} توصيل السيارة إلى فندقك أو منزلك أو المطار. يظهر توفر التوصيل ورسومه في صفحة كل سيارة — راجع الإعلان أو تواصل مع الشركة مباشرة.` },
  ]
}
function cityFaqsEs(c: CityCtx) {
  const sy = c.country === "sy"
  return [
    { q: `¿Cuánto cuesta alquilar un auto en ${c.name}?`, a: c.priceLow ? `El alquiler de autos en ${c.name} cuesta desde unos AED ${c.priceLow} por día. Los precios varían según el modelo, la duración y la empresa. El alquiler mensual suele ser mucho más barato por día. Explora ${c.count} autos disponibles para comparar precios en vivo.` : `Los precios de alquiler en ${c.name} dependen del modelo, la duración y la empresa. El alquiler mensual suele ser mucho más barato por día. Explora los autos disponibles para comparar precios directamente con empresas verificadas.` },
    { q: `¿Qué documentos necesito para alquilar un auto en ${c.name}?`, a: sy ? `Normalmente necesitas una licencia de conducir válida, pasaporte o documento nacional, y tener al menos 21 años. Los requisitos varían según la empresa — contáctala directamente para confirmar.` : `En los EAU normalmente necesitas una licencia de conducir de los EAU válida o un Permiso Internacional (para turistas), tu pasaporte o Emirates ID, y tener entre 21 y 25 años según el auto. Contacta a la empresa para confirmar los requisitos exactos.` },
    { q: `¿Puedo alquilar un auto mensualmente en ${c.name}?`, a: `Sí. La mayoría de las empresas en ${c.name} ofrecen tarifas diarias, semanales y mensuales. El alquiler mensual suele dar el precio diario más bajo y a menudo incluye registro, seguro y mantenimiento. Usa los filtros de precio para encontrar ofertas mensuales.` },
    { q: `¿Auto to Rental cobra comisión o cargos de reserva?`, a: `No. Auto to Rental es un marketplace: contactas a las empresas verificadas en ${c.name} directamente por teléfono, WhatsApp o llamada. No cobramos comisión ni cargos de reserva.` },
    { q: `¿Hay entrega de auto en ${c.name}?`, a: `Muchas empresas en ${c.name} ofrecen entrega del auto a tu hotel, casa o el aeropuerto. La disponibilidad y las tarifas de entrega se muestran en la página de cada auto — revisa el anuncio o contacta a la empresa directamente.` },
  ]
}
function cityFaqsZh(c: CityCtx) {
  const sy = c.country === "sy"
  return [
    { q: `在${c.name}租车多少钱？`, a: c.priceLow ? `在${c.name}租车每天约AED ${c.priceLow}起。价格因车型、租期和租车公司而异。月租通常每天便宜得多。浏览${c.count}辆可租车辆以比较实时价格。` : `${c.name}的租车价格取决于车型、租期和租车公司。月租通常每天便宜得多。浏览可租车辆，直接与认证公司比较实时价格。` },
    { q: `在${c.name}租车需要哪些证件？`, a: sy ? `通常需要有效驾照、护照或身份证，并且年满21岁。要求因公司而异——请直接联系租车公司确认。` : `在阿联酋通常需要有效的阿联酋驾照或国际驾照（游客），护照或Emirates ID，并根据车型年满21–25岁。请联系租车公司确认确切要求。` },
    { q: `我可以在${c.name}按月租车吗？`, a: `可以。${c.name}的大多数租车公司提供日租、周租和月租。月租通常每天价格最低，并常包含注册、保险和日常保养。使用价格筛选查找月租优惠。` },
    { q: `Auto to Rental收取佣金或预订费吗？`, a: `不收。Auto to Rental是一个平台——您通过电话、WhatsApp或通话直接联系${c.name}的认证租车公司。我们不收任何佣金和预订费。` },
    { q: `${c.name}提供送车服务吗？`, a: `${c.name}的许多租车公司提供送车到酒店、住所或机场。送车的可用性和费用显示在每辆车的页面上——请查看车辆信息或直接联系公司。` },
  ]
}
function cityFaqsTh(c: CityCtx) {
  const sy = c.country === "sy"
  return [
    { q: `เช่ารถใน ${c.name} ราคาเท่าไหร่?`, a: c.priceLow ? `รถเช่าใน ${c.name} เริ่มต้นประมาณ AED ${c.priceLow} ต่อวัน ราคาแตกต่างตามรุ่น ระยะเวลาเช่า และบริษัท การเช่ารายเดือนมักถูกกว่ามากต่อวัน ดูรถ ${c.count} คันที่มีเพื่อเปรียบเทียบราคาแบบเรียลไทม์` : `ราคาเช่ารถใน ${c.name} ขึ้นอยู่กับรุ่น ระยะเวลาเช่า และบริษัท การเช่ารายเดือนมักถูกกว่ามากต่อวัน ดูรถที่มีเพื่อเปรียบเทียบราคากับบริษัทที่ผ่านการตรวจสอบโดยตรง` },
    { q: `ต้องใช้เอกสารอะไรในการเช่ารถใน ${c.name}?`, a: sy ? `โดยทั่วไปต้องมีใบขับขี่ที่ใช้ได้ พาสปอร์ตหรือบัตรประชาชน และอายุอย่างน้อย 21 ปี ข้อกำหนดอาจต่างกันตามบริษัท — ติดต่อบริษัทโดยตรงเพื่อยืนยัน` : `ใน UAE โดยทั่วไปต้องมีใบขับขี่ UAE ที่ใช้ได้ หรือใบขับขี่สากล (สำหรับนักท่องเที่ยว) พาสปอร์ตหรือ Emirates ID และอายุ 21–25 ปีขึ้นไปตามประเภทรถ ติดต่อบริษัทเพื่อยืนยันข้อกำหนดที่แน่นอน` },
    { q: `เช่ารถรายเดือนใน ${c.name} ได้ไหม?`, a: `ได้ บริษัทส่วนใหญ่ใน ${c.name} มีอัตรารายวัน รายสัปดาห์ และรายเดือน การเช่ารายเดือนมักให้ราคาต่อวันต่ำสุด และมักรวมการจดทะเบียน ประกัน และการบำรุงรักษา ใช้ตัวกรองราคาเพื่อหาดีลรายเดือน` },
    { q: `Auto to Rental คิดค่าคอมมิชชั่นหรือค่าจองไหม?`, a: `ไม่ Auto to Rental เป็นแพลตฟอร์ม — คุณติดต่อบริษัทเช่ารถที่ผ่านการตรวจสอบใน ${c.name} โดยตรงทางโทรศัพท์ WhatsApp หรือโทร เราไม่คิดค่าคอมมิชชั่นและค่าจอง` },
    { q: `มีบริการส่งรถใน ${c.name} ไหม?`, a: `บริษัทเช่ารถหลายแห่งใน ${c.name} มีบริการส่งรถถึงโรงแรม บ้าน หรือสนามบิน ความพร้อมและค่าบริการส่งแสดงอยู่ในหน้าของรถแต่ละคัน — ดูประกาศหรือติดต่อบริษัทโดยตรง` },
  ]
}
function cityFaqsRu(c: CityCtx) {
  const sy = c.country === "sy"
  return [
    { q: `Сколько стоит аренда авто в ${c.name}?`, a: c.priceLow ? `Аренда авто в ${c.name} начинается примерно от AED ${c.priceLow} в сутки. Цены зависят от модели, срока аренды и компании. Помесячная аренда обычно намного дешевле в сутки. Просмотрите ${c.count} доступных авто для сравнения актуальных цен.` : `Цены на аренду в ${c.name} зависят от модели, срока аренды и компании. Помесячная аренда обычно намного дешевле в сутки. Просмотрите доступные авто для сравнения актуальных цен напрямую с проверенными компаниями.` },
    { q: `Какие документы нужны для аренды авто в ${c.name}?`, a: sy ? `Обычно нужны действующие водительские права, паспорт или удостоверение личности, и возраст не менее 21 года. Требования зависят от компании — уточняйте напрямую.` : `В ОАЭ обычно нужны действующие права ОАЭ или международные права (для туристов), паспорт или Emirates ID, и возраст от 21 до 25 лет в зависимости от авто. Свяжитесь с компанией для уточнения требований.` },
    { q: `Можно ли арендовать авто помесячно в ${c.name}?`, a: `Да. Большинство компаний в ${c.name} предлагают посуточные, понедельные и помесячные тарифы. Помесячная аренда обычно даёт самую низкую суточную цену и часто включает регистрацию, страховку и обслуживание. Используйте фильтры цены для поиска помесячных предложений.` },
    { q: `Берёт ли Auto to Rental комиссию или сборы за бронирование?`, a: `Нет. Auto to Rental — это площадка: вы связываетесь с проверенными компаниями в ${c.name} напрямую по телефону, WhatsApp или звонку. Мы не берём ни комиссии, ни сборов за бронирование.` },
    { q: `Доступна ли доставка авто в ${c.name}?`, a: `Многие компании в ${c.name} предлагают доставку авто в отель, домой или в аэропорт. Доступность и стоимость доставки указаны на странице каждого авто — смотрите объявление или свяжитесь с компанией напрямую.` },
  ]
}
function cityFaqsUr(c: CityCtx) {
  const sy = c.country === "sy"
  return [
    { q: `${c.name} میں کار کرائے پر لینے کی قیمت کتنی ہے؟`, a: c.priceLow ? `${c.name} میں کار کرایہ تقریباً AED ${c.priceLow} فی دن سے شروع ہوتا ہے۔ قیمتیں ماڈل، مدت اور کمپنی کے مطابق مختلف ہوتی ہیں۔ ماہانہ کرایہ عموماً فی دن بہت سستا ہوتا ہے۔ لائیو قیمتوں کا موازنہ کرنے کے لیے ${c.count} دستیاب گاڑیاں دیکھیں۔` : `${c.name} میں کرائے کی قیمتیں ماڈل، مدت اور کمپنی پر منحصر ہیں۔ ماہانہ کرایہ عموماً فی دن بہت سستا ہوتا ہے۔ تصدیق شدہ کمپنیوں سے براہ راست قیمتوں کا موازنہ کرنے کے لیے دستیاب گاڑیاں دیکھیں۔` },
    { q: `${c.name} میں کار کرائے پر لینے کے لیے کن دستاویزات کی ضرورت ہے؟`, a: sy ? `عموماً آپ کو ایک درست ڈرائیونگ لائسنس، پاسپورٹ یا قومی شناختی کارڈ، اور کم از کم 21 سال کی عمر درکار ہوتی ہے۔ تقاضے کمپنی کے مطابق مختلف ہو سکتے ہیں — تصدیق کے لیے کمپنی سے براہ راست رابطہ کریں۔` : `UAE میں عموماً آپ کو درست UAE ڈرائیونگ لائسنس یا بین الاقوامی ڈرائیونگ پرمٹ (سیاحوں کے لیے)، پاسپورٹ یا Emirates ID، اور گاڑی کے مطابق 21–25 سال کی عمر درکار ہوتی ہے۔ درست تقاضوں کی تصدیق کے لیے کمپنی سے رابطہ کریں۔` },
    { q: `کیا میں ${c.name} میں ماہانہ کار کرائے پر لے سکتا ہوں؟`, a: `جی ہاں۔ ${c.name} میں زیادہ تر کمپنیاں روزانہ، ہفتہ وار اور ماہانہ ریٹ پیش کرتی ہیں۔ ماہانہ کرایہ عموماً سب سے کم روزانہ قیمت دیتا ہے اور اکثر رجسٹریشن، بیمہ اور دیکھ بھال شامل ہوتی ہے۔ ماہانہ ڈیلز تلاش کرنے کے لیے قیمت فلٹرز استعمال کریں۔` },
    { q: `کیا Auto to Rental کمیشن یا بکنگ فیس لیتا ہے؟`, a: `نہیں۔ Auto to Rental ایک مارکیٹ پلیس ہے — آپ ${c.name} میں تصدیق شدہ کمپنیوں سے فون، WhatsApp یا کال کے ذریعے براہ راست رابطہ کرتے ہیں۔ ہم کوئی کمیشن اور بکنگ فیس نہیں لیتے۔` },
    { q: `کیا ${c.name} میں گاڑی کی ڈیلیوری دستیاب ہے؟`, a: `${c.name} میں بہت سی کمپنیاں آپ کے ہوٹل، گھر یا ایئرپورٹ پر گاڑی کی ڈیلیوری پیش کرتی ہیں۔ ڈیلیوری کی دستیابی اور فیس ہر گاڑی کے صفحے پر دکھائی جاتی ہے — لسٹنگ دیکھیں یا کمپنی سے براہ راست رابطہ کریں۔` },
  ]
}

export function brandSeo(ctx: BrandCtx, locale: Locale): BrandSeo {
  const out = (BRAND[locale] || BRAND[DEFAULT_LOCALE])(ctx)
  out.fromPerDay = ctx.priceLow ? perDay(locale, ctx.priceLow) : ""
  return out
}

export function citySeo(ctx: CityCtx, locale: Locale): CitySeo {
  const out = (CITY[locale] || CITY[DEFAULT_LOCALE])(ctx)
  out.fromPerDay = ctx.priceLow ? perDay(locale, ctx.priceLow) : ""
  return out
}

// Localized phrase for the intent-route chips: "{brand} {intent} in {city}".
const INTENT_WORD: Record<Locale, Record<"daily" | "monthly" | "luxury", string>> = {
  en: { daily: "daily", monthly: "monthly", luxury: "luxury" },
  ar: { daily: "يومي", monthly: "شهري", luxury: "فاخر" },
  es: { daily: "diario", monthly: "mensual", luxury: "de lujo" },
  zh: { daily: "日租", monthly: "月租", luxury: "豪华" },
  th: { daily: "รายวัน", monthly: "รายเดือน", luxury: "หรู" },
  ru: { daily: "посуточно", monthly: "помесячно", luxury: "люкс" },
  ur: { daily: "روزانہ", monthly: "ماہانہ", luxury: "لگژری" },
}

export function intentRoutePhrase(locale: Locale, brand: string, intent: "daily" | "monthly" | "luxury", city: string): string {
  const w = (INTENT_WORD[locale] || INTENT_WORD.en)[intent]
  switch (locale) {
    case "ar": return `${brand} ${w} في ${city}`
    case "es": return `${brand} ${w} en ${city}`
    case "zh": return `${city}${brand}${w}`
    case "th": return `${brand} ${w} ใน ${city}`
    case "ru": return `${brand} ${w} в ${city}`
    case "ur": return `${city} میں ${brand} ${w}`
    default: return `${brand} ${w} in ${city}`
  }
}
