// Localized content for the legal pages: /terms, /privacy, /cookies.
// Each record carries the page chrome (breadcrumb, headings, quick links) and the
// full fallback body (used when no admin-managed HTML is present). seoFor() handles
// canonical/hreflang/og:locale; do NOT pass a locale key to it.
import { type Locale, DEFAULT_LOCALE } from "./locales"

export type LegalSection = { h: string; body: string[] }

// Shared quick-link labels reused across the three pages.
export type LegalChrome = {
  bcHome: string
  quickLinksTitle: string
  linkPrivacy: string
  linkTerms: string
  linkCookies: string
  linkContact: string
  lastUpdated: string // label, e.g. "Last updated:"
}

export type TermsContent = LegalChrome & {
  metaTitle: string
  metaDesc: string
  bcLabel: string
  h1: string
  updatedValue: string // fallback date string (e.g. "January 2026")
  sections: LegalSection[]
}

export type PrivacyContent = LegalChrome & {
  metaTitle: string
  metaDesc: string
  bcLabel: string
  h1: string
  updatedValue: string
  sections: LegalSection[]
}

export type CookieRow = { name: string; purpose: string }

export type CookiesContent = LegalChrome & {
  metaTitle: string
  metaDesc: string
  bcLabel: string
  h1: string
  updatedValue: string
  // Cookies page mixes prose sections with structured cookie tables, so it has a
  // bespoke shape rather than a generic sections array.
  whatTitle: string
  whatBody: string
  essentialTitle: string
  essentialRows: CookieRow[]
  adTitle: string
  adIntro: string
  adRows: CookieRow[]
  changeTitle: string
  changeBody: string[] // paragraphs; <code>cookie_consent</code> rendered around literal
  moreTitle: string
  moreBody: string // contains {link} placeholder for Privacy Policy
  moreLinkLabel: string
}

const TERMS: Record<Locale, TermsContent> = {
  en: {
    metaTitle: "Terms of Service — Auto to Rental",
    metaDesc: "The terms governing your use of the Auto to Rental car rental marketplace across the UAE and Syria.",
    bcHome: "Home", bcLabel: "Terms",
    quickLinksTitle: "Legal quick links",
    linkPrivacy: "Privacy", linkTerms: "Terms", linkCookies: "Cookies", linkContact: "Contact",
    lastUpdated: "Last updated:",
    h1: "Terms of Service",
    updatedValue: "January 2026",
    sections: [
      { h: "1. What Auto to Rental is", body: ["Auto to Rental is a marketplace. We list cars on behalf of independent rental companies. We are not a rental company. We do not own any vehicle. We do not charge you any rental fee, commission, or booking fee."] },
      { h: "2. The rental agreement is between you and the rental company", body: ["When you contact a rental company through our site, the rental terms (price, deposit, insurance, mileage, fuel, cancellation) are agreed directly between you and them. Auto to Rental is not a party to that agreement."] },
      { h: "3. Acceptable use", body: ["Do not scrape the site or attempt to reverse-engineer it.", "Do not impersonate a rental company.", "Do not post false reviews or fake reports.", "Do not use the contact features for spam or harassment."] },
      { h: "4. Vendor (rental company) terms", body: ["You may list vehicles you own or are authorised to rent out.", "Pricing must be accurate and reflect what customers actually pay.", "30-day free trial. After that a monthly subscription is required to keep listings active.", "We reserve the right to suspend listings that violate these terms or local law."] },
      { h: "5. Disclaimer", body: ["We provide the marketplace as is. We do not guarantee the accuracy of listings, the condition of vehicles, or the conduct of rental companies. Always verify before paying."] },
      { h: "6. Limitation of liability", body: ["To the maximum extent permitted by UAE and Syrian law, Auto to Rental is not liable for any loss arising from your interactions with rental companies, including accidents, damage, theft, or disputes."] },
      { h: "7. Governing law", body: ["These terms are governed by the laws of the United Arab Emirates. Disputes are resolved in the courts of Dubai."] },
      { h: "8. Contact", body: ["legal@autotorental.com"] },
    ],
  },
  ar: {
    metaTitle: "شروط الخدمة — Auto to Rental",
    metaDesc: "الشروط التي تحكم استخدامك لسوق تأجير السيارات Auto to Rental في الإمارات وسوريا.",
    bcHome: "الرئيسية", bcLabel: "الشروط",
    quickLinksTitle: "روابط قانونية سريعة",
    linkPrivacy: "الخصوصية", linkTerms: "الشروط", linkCookies: "ملفات الارتباط", linkContact: "اتصل بنا",
    lastUpdated: "آخر تحديث:",
    h1: "شروط الخدمة",
    updatedValue: "يناير 2026",
    sections: [
      { h: "1. ما هي Auto to Rental", body: ["Auto to Rental هي سوق إلكتروني. نعرض السيارات نيابةً عن شركات تأجير مستقلة. نحن لسنا شركة تأجير. لا نملك أي مركبة. لا نفرض عليك أي رسوم تأجير أو عمولة أو رسوم حجز."] },
      { h: "2. اتفاقية التأجير بينك وبين شركة التأجير", body: ["عند التواصل مع شركة تأجير عبر موقعنا، يتم الاتفاق على شروط التأجير (السعر، التأمين، الوديعة، المسافة، الوقود، الإلغاء) مباشرةً بينك وبينها. Auto to Rental ليست طرفاً في تلك الاتفاقية."] },
      { h: "3. الاستخدام المقبول", body: ["لا تقم باستخراج بيانات الموقع أو محاولة هندسته العكسية.", "لا تنتحل صفة شركة تأجير.", "لا تنشر تقييمات كاذبة أو بلاغات مزيفة.", "لا تستخدم ميزات التواصل للرسائل المزعجة أو المضايقة."] },
      { h: "4. شروط البائع (شركة التأجير)", body: ["يمكنك إدراج المركبات التي تملكها أو المخوّل بتأجيرها.", "يجب أن تكون الأسعار دقيقة وتعكس ما يدفعه العملاء فعلياً.", "تجربة مجانية لمدة 30 يوماً. بعد ذلك يلزم اشتراك شهري لإبقاء الإعلانات نشطة.", "نحتفظ بحق تعليق الإعلانات التي تنتهك هذه الشروط أو القانون المحلي."] },
      { h: "5. إخلاء المسؤولية", body: ["نقدّم السوق «كما هو». لا نضمن دقة الإعلانات أو حالة المركبات أو سلوك شركات التأجير. تحقّق دائماً قبل الدفع."] },
      { h: "6. حدود المسؤولية", body: ["إلى أقصى حد يسمح به قانون الإمارات وسوريا، لا تتحمل Auto to Rental أي مسؤولية عن أي خسارة ناتجة عن تعاملاتك مع شركات التأجير، بما في ذلك الحوادث أو الأضرار أو السرقة أو النزاعات."] },
      { h: "7. القانون الحاكم", body: ["تخضع هذه الشروط لقوانين دولة الإمارات العربية المتحدة. تُحل النزاعات في محاكم دبي."] },
      { h: "8. التواصل", body: ["legal@autotorental.com"] },
    ],
  },
  es: {
    metaTitle: "Términos del servicio — Auto to Rental",
    metaDesc: "Los términos que rigen tu uso del mercado de alquiler de autos Auto to Rental en EAU y Siria.",
    bcHome: "Inicio", bcLabel: "Términos",
    quickLinksTitle: "Enlaces legales rápidos",
    linkPrivacy: "Privacidad", linkTerms: "Términos", linkCookies: "Cookies", linkContact: "Contacto",
    lastUpdated: "Última actualización:",
    h1: "Términos del servicio",
    updatedValue: "Enero de 2026",
    sections: [
      { h: "1. Qué es Auto to Rental", body: ["Auto to Rental es un mercado. Publicamos autos en nombre de empresas de alquiler independientes. No somos una empresa de alquiler. No poseemos ningún vehículo. No te cobramos ninguna tarifa de alquiler, comisión ni cargo por reserva."] },
      { h: "2. El contrato de alquiler es entre tú y la empresa de alquiler", body: ["Cuando contactas a una empresa de alquiler a través de nuestro sitio, los términos del alquiler (precio, depósito, seguro, kilometraje, combustible, cancelación) se acuerdan directamente entre tú y ella. Auto to Rental no es parte de ese contrato."] },
      { h: "3. Uso aceptable", body: ["No extraigas datos del sitio ni intentes aplicarle ingeniería inversa.", "No te hagas pasar por una empresa de alquiler.", "No publiques reseñas falsas ni reportes falsos.", "No uses las funciones de contacto para spam o acoso."] },
      { h: "4. Términos para proveedores (empresas de alquiler)", body: ["Puedes publicar vehículos que poseas o que estés autorizado a alquilar.", "Los precios deben ser exactos y reflejar lo que los clientes pagan realmente.", "Prueba gratuita de 30 días. Después se requiere una suscripción mensual para mantener los anuncios activos.", "Nos reservamos el derecho de suspender anuncios que infrinjan estos términos o la ley local."] },
      { h: "5. Descargo de responsabilidad", body: ["Ofrecemos el mercado «tal cual». No garantizamos la exactitud de los anuncios, el estado de los vehículos ni la conducta de las empresas de alquiler. Verifica siempre antes de pagar."] },
      { h: "6. Limitación de responsabilidad", body: ["En la máxima medida permitida por la ley de EAU y Siria, Auto to Rental no se hace responsable de ninguna pérdida derivada de tus interacciones con empresas de alquiler, incluidos accidentes, daños, robos o disputas."] },
      { h: "7. Ley aplicable", body: ["Estos términos se rigen por las leyes de los Emiratos Árabes Unidos. Las disputas se resuelven en los tribunales de Dubái."] },
      { h: "8. Contacto", body: ["legal@autotorental.com"] },
    ],
  },
  zh: {
    metaTitle: "服务条款 — Auto to Rental",
    metaDesc: "管辖您在阿联酋和叙利亚使用 Auto to Rental 租车平台的条款。",
    bcHome: "首页", bcLabel: "条款",
    quickLinksTitle: "法律快速链接",
    linkPrivacy: "隐私", linkTerms: "条款", linkCookies: "Cookie", linkContact: "联系",
    lastUpdated: "最后更新：",
    h1: "服务条款",
    updatedValue: "2026年1月",
    sections: [
      { h: "1. Auto to Rental 是什么", body: ["Auto to Rental 是一个平台。我们代表独立租车公司发布车辆。我们不是租车公司。我们不拥有任何车辆。我们不向您收取任何租金、佣金或预订费。"] },
      { h: "2. 租赁协议在您与租车公司之间", body: ["当您通过本站联系租车公司时，租赁条款（价格、押金、保险、里程、燃油、取消）由您与对方直接商定。Auto to Rental 不是该协议的当事方。"] },
      { h: "3. 可接受的使用", body: ["请勿抓取本站或试图对其进行逆向工程。", "请勿冒充租车公司。", "请勿发布虚假评论或虚假举报。", "请勿利用联系功能进行垃圾信息或骚扰。"] },
      { h: "4. 供应商（租车公司）条款", body: ["您可以发布您拥有或获授权出租的车辆。", "定价必须准确，并反映客户实际支付的金额。", "30天免费试用。之后需要按月订阅以保持房源有效。", "对于违反本条款或当地法律的房源，我们保留暂停的权利。"] },
      { h: "5. 免责声明", body: ["我们按「现状」提供本平台。我们不保证房源的准确性、车辆的状况或租车公司的行为。付款前请务必核实。"] },
      { h: "6. 责任限制", body: ["在阿联酋和叙利亚法律允许的最大范围内，Auto to Rental 不对因您与租车公司互动而产生的任何损失负责，包括事故、损坏、盗窃或纠纷。"] },
      { h: "7. 适用法律", body: ["本条款受阿联酋联邦法律管辖。争议由迪拜法院解决。"] },
      { h: "8. 联系", body: ["legal@autotorental.com"] },
    ],
  },
  th: {
    metaTitle: "ข้อกำหนดในการให้บริการ — Auto to Rental",
    metaDesc: "ข้อกำหนดที่ควบคุมการใช้งานตลาดเช่ารถ Auto to Rental ของคุณใน UAE และซีเรีย",
    bcHome: "หน้าแรก", bcLabel: "ข้อกำหนด",
    quickLinksTitle: "ลิงก์ทางกฎหมายด่วน",
    linkPrivacy: "ความเป็นส่วนตัว", linkTerms: "ข้อกำหนด", linkCookies: "คุกกี้", linkContact: "ติดต่อ",
    lastUpdated: "อัปเดตล่าสุด:",
    h1: "ข้อกำหนดในการให้บริการ",
    updatedValue: "มกราคม 2026",
    sections: [
      { h: "1. Auto to Rental คืออะไร", body: ["Auto to Rental เป็นตลาดกลาง เราลงประกาศรถในนามของบริษัทเช่ารถอิสระ เราไม่ใช่บริษัทเช่ารถ เราไม่ได้เป็นเจ้าของรถคันใด เราไม่เรียกเก็บค่าเช่า ค่าคอมมิชชัน หรือค่าจองจากคุณ"] },
      { h: "2. สัญญาเช่าเป็นข้อตกลงระหว่างคุณกับบริษัทเช่ารถ", body: ["เมื่อคุณติดต่อบริษัทเช่ารถผ่านเว็บไซต์ของเรา เงื่อนไขการเช่า (ราคา เงินมัดจำ ประกัน ระยะทาง น้ำมัน การยกเลิก) จะตกลงกันโดยตรงระหว่างคุณกับบริษัท Auto to Rental ไม่ได้เป็นคู่สัญญาในข้อตกลงนั้น"] },
      { h: "3. การใช้งานที่ยอมรับได้", body: ["ห้ามดึงข้อมูลจากเว็บไซต์หรือพยายามทำวิศวกรรมย้อนกลับ", "ห้ามแอบอ้างเป็นบริษัทเช่ารถ", "ห้ามโพสต์รีวิวปลอมหรือรายงานปลอม", "ห้ามใช้ฟีเจอร์ติดต่อเพื่อสแปมหรือคุกคาม"] },
      { h: "4. ข้อกำหนดสำหรับผู้ขาย (บริษัทเช่ารถ)", body: ["คุณสามารถลงประกาศรถที่คุณเป็นเจ้าของหรือได้รับอนุญาตให้ปล่อยเช่า", "ราคาต้องถูกต้องและสะท้อนยอดที่ลูกค้าจ่ายจริง", "ทดลองใช้ฟรี 30 วัน หลังจากนั้นต้องสมัครสมาชิกรายเดือนเพื่อให้ประกาศยังคงใช้งานอยู่", "เราขอสงวนสิทธิ์ในการระงับประกาศที่ละเมิดข้อกำหนดนี้หรือกฎหมายท้องถิ่น"] },
      { h: "5. ข้อปฏิเสธความรับผิด", body: ["เราให้บริการตลาดกลางตาม «สภาพที่เป็นอยู่» เราไม่รับประกันความถูกต้องของประกาศ สภาพของรถ หรือพฤติกรรมของบริษัทเช่ารถ โปรดตรวจสอบก่อนชำระเงินทุกครั้ง"] },
      { h: "6. ข้อจำกัดความรับผิด", body: ["เท่าที่กฎหมาย UAE และซีเรียอนุญาตสูงสุด Auto to Rental ไม่รับผิดต่อความสูญเสียใดที่เกิดจากการติดต่อของคุณกับบริษัทเช่ารถ รวมถึงอุบัติเหตุ ความเสียหาย การโจรกรรม หรือข้อพิพาท"] },
      { h: "7. กฎหมายที่ใช้บังคับ", body: ["ข้อกำหนดเหล่านี้อยู่ภายใต้กฎหมายของสหรัฐอาหรับเอมิเรตส์ ข้อพิพาทจะระงับในศาลของดูไบ"] },
      { h: "8. ติดต่อ", body: ["legal@autotorental.com"] },
    ],
  },
  ru: {
    metaTitle: "Условия использования — Auto to Rental",
    metaDesc: "Условия, регулирующие использование вами маркетплейса аренды авто Auto to Rental в ОАЭ и Сирии.",
    bcHome: "Главная", bcLabel: "Условия",
    quickLinksTitle: "Быстрые правовые ссылки",
    linkPrivacy: "Конфиденциальность", linkTerms: "Условия", linkCookies: "Файлы cookie", linkContact: "Контакты",
    lastUpdated: "Последнее обновление:",
    h1: "Условия использования",
    updatedValue: "Январь 2026",
    sections: [
      { h: "1. Что такое Auto to Rental", body: ["Auto to Rental — это маркетплейс. Мы размещаем автомобили от имени независимых компаний по аренде. Мы не являемся компанией по аренде. Мы не владеем ни одним автомобилем. Мы не взимаем с вас плату за аренду, комиссию или сбор за бронирование."] },
      { h: "2. Договор аренды заключается между вами и компанией по аренде", body: ["Когда вы связываетесь с компанией по аренде через наш сайт, условия аренды (цена, залог, страховка, пробег, топливо, отмена) согласовываются напрямую между вами и ею. Auto to Rental не является стороной этого договора."] },
      { h: "3. Допустимое использование", body: ["Не парсите сайт и не пытайтесь провести обратную разработку.", "Не выдавайте себя за компанию по аренде.", "Не публикуйте ложные отзывы или поддельные жалобы.", "Не используйте функции связи для спама или преследования."] },
      { h: "4. Условия для продавцов (компаний по аренде)", body: ["Вы можете размещать автомобили, которыми владеете или которые уполномочены сдавать в аренду.", "Цены должны быть точными и отражать то, что клиенты фактически платят.", "Бесплатный пробный период 30 дней. После этого для сохранения активных объявлений требуется месячная подписка.", "Мы оставляем за собой право приостанавливать объявления, нарушающие эти условия или местное законодательство."] },
      { h: "5. Отказ от ответственности", body: ["Мы предоставляем маркетплейс «как есть». Мы не гарантируем точность объявлений, состояние автомобилей или поведение компаний по аренде. Всегда проверяйте перед оплатой."] },
      { h: "6. Ограничение ответственности", body: ["В максимальной степени, разрешённой законодательством ОАЭ и Сирии, Auto to Rental не несёт ответственности за любые убытки, возникшие в результате вашего взаимодействия с компаниями по аренде, включая аварии, повреждения, кражу или споры."] },
      { h: "7. Применимое право", body: ["Эти условия регулируются законодательством Объединённых Арабских Эмиратов. Споры разрешаются в судах Дубая."] },
      { h: "8. Контакты", body: ["legal@autotorental.com"] },
    ],
  },
  ur: {
    metaTitle: "سروس کی شرائط — Auto to Rental",
    metaDesc: "UAE اور شام میں Auto to Rental کار کرایہ مارکیٹ پلیس کے آپ کے استعمال پر حاکم شرائط۔",
    bcHome: "ہوم", bcLabel: "شرائط",
    quickLinksTitle: "قانونی فوری روابط",
    linkPrivacy: "رازداری", linkTerms: "شرائط", linkCookies: "کوکیز", linkContact: "رابطہ",
    lastUpdated: "آخری تازہ کاری:",
    h1: "سروس کی شرائط",
    updatedValue: "جنوری 2026",
    sections: [
      { h: "1. Auto to Rental کیا ہے", body: ["Auto to Rental ایک مارکیٹ پلیس ہے۔ ہم آزاد کرایہ کمپنیوں کی جانب سے گاڑیاں درج کرتے ہیں۔ ہم کرایہ کمپنی نہیں ہیں۔ ہم کسی گاڑی کے مالک نہیں۔ ہم آپ سے کوئی کرایہ، کمیشن یا بکنگ فیس نہیں لیتے۔"] },
      { h: "2. کرایہ معاہدہ آپ اور کرایہ کمپنی کے درمیان ہے", body: ["جب آپ ہماری سائٹ کے ذریعے کسی کرایہ کمپنی سے رابطہ کرتے ہیں تو کرایہ کی شرائط (قیمت، ڈپازٹ، انشورنس، مسافت، ایندھن، منسوخی) آپ اور ان کے درمیان براہ راست طے ہوتی ہیں۔ Auto to Rental اس معاہدے کا فریق نہیں ہے۔"] },
      { h: "3. قابل قبول استعمال", body: ["سائٹ کو اسکریپ نہ کریں اور نہ ہی اس کی ریورس انجینئرنگ کی کوشش کریں۔", "کسی کرایہ کمپنی کا روپ نہ دھاریں۔", "جھوٹے جائزے یا جعلی رپورٹس پوسٹ نہ کریں۔", "رابطہ خصوصیات کو اسپام یا ہراسانی کے لیے استعمال نہ کریں۔"] },
      { h: "4. وینڈر (کرایہ کمپنی) کی شرائط", body: ["آپ وہ گاڑیاں درج کر سکتے ہیں جن کے آپ مالک ہیں یا جنہیں کرائے پر دینے کے مجاز ہیں۔", "قیمتیں درست ہونی چاہئیں اور وہی ظاہر کریں جو گاہک حقیقتاً ادا کرتے ہیں۔", "30 دن کی مفت آزمائش۔ اس کے بعد اشتہار فعال رکھنے کے لیے ماہانہ سبسکرپشن لازمی ہے۔", "ہم ان شرائط یا مقامی قانون کی خلاف ورزی کرنے والے اشتہار معطل کرنے کا حق محفوظ رکھتے ہیں۔"] },
      { h: "5. دستبرداری", body: ["ہم مارکیٹ پلیس «جیسا ہے» فراہم کرتے ہیں۔ ہم اشتہار کی درستگی، گاڑیوں کی حالت یا کرایہ کمپنیوں کے طرز عمل کی ضمانت نہیں دیتے۔ ادائیگی سے پہلے ہمیشہ تصدیق کریں۔"] },
      { h: "6. ذمہ داری کی حد", body: ["UAE اور شام کے قانون کے تحت زیادہ سے زیادہ حد تک، Auto to Rental کرایہ کمپنیوں کے ساتھ آپ کے تعاملات سے پیدا ہونے والے کسی نقصان کی ذمہ دار نہیں، بشمول حادثات، نقصان، چوری یا تنازعات۔"] },
      { h: "7. حاکم قانون", body: ["یہ شرائط متحدہ عرب امارات کے قوانین کے تابع ہیں۔ تنازعات دبئی کی عدالتوں میں حل کیے جاتے ہیں۔"] },
      { h: "8. رابطہ", body: ["legal@autotorental.com"] },
    ],
  },
}

const PRIVACY: Record<Locale, PrivacyContent> = {
  en: {
    metaTitle: "Privacy Policy — Auto to Rental",
    metaDesc: "How Auto to Rental collects, uses, and protects your personal data across the UAE and Syria.",
    bcHome: "Home", bcLabel: "Privacy",
    quickLinksTitle: "Legal quick links",
    linkPrivacy: "Privacy", linkTerms: "Terms", linkCookies: "Cookies", linkContact: "Contact",
    lastUpdated: "Last updated:",
    h1: "Privacy Policy",
    updatedValue: "January 2026",
    sections: [
      { h: "1. Who we are", body: ["Auto to Rental (we, us) is a car rental marketplace operating in the United Arab Emirates and Syria. We connect customers with verified rental companies. We are the data controller for the personal data described in this policy."] },
      { h: "2. What we collect", body: ["Browsing data: pages viewed, device, language, country (via cookies and analytics).", "Contact actions: when you click WhatsApp, Call, Free International Call, or Follow — we log the event for the rental company.", "Communications: name, email, phone if you submit a contact form or report a listing.", "Account data (vendors only): name, email, phone, trade license, payment method (handled by Stripe)."] },
      { h: "3. How we use your data", body: ["Operate and improve the marketplace.", "Show rental companies how many contacts their listings receive (anonymous counts).", "Send transactional emails (account, password reset, subscription receipts).", "With your consent: analytics and advertising cookies (Google, Meta, TikTok) for ad measurement and retargeting."] },
      { h: "4. Who we share with", body: ["We never sell your data. We share with:", "Rental companies (only when you initiate contact — they see your phone/email if you choose to send it).", "Service providers: Stripe (payments), Resend (email), Cloudflare (CDN), Hostinger (hosting), Meilisearch (search).", "Authorities when legally required."] },
      { h: "5. Cookies", body: ["See our Cookie Policy for details. You can change consent any time in the banner."] },
      { h: "6. Your rights", body: ["You can request access, correction, or deletion of your data at any time. Email privacy@autotorental.com."] },
      { h: "7. Retention", body: ["We keep analytics events for 12 months. Vendor account data is kept while your subscription is active and for 12 months after."] },
      { h: "8. Contact", body: ["For privacy questions: privacy@autotorental.com"] },
    ],
  },
  ar: {
    metaTitle: "سياسة الخصوصية — Auto to Rental",
    metaDesc: "كيف تجمع Auto to Rental بياناتك الشخصية وتستخدمها وتحميها في الإمارات وسوريا.",
    bcHome: "الرئيسية", bcLabel: "الخصوصية",
    quickLinksTitle: "روابط قانونية سريعة",
    linkPrivacy: "الخصوصية", linkTerms: "الشروط", linkCookies: "ملفات الارتباط", linkContact: "اتصل بنا",
    lastUpdated: "آخر تحديث:",
    h1: "سياسة الخصوصية",
    updatedValue: "يناير 2026",
    sections: [
      { h: "1. من نحن", body: ["Auto to Rental (نحن) سوق لتأجير السيارات يعمل في دولة الإمارات العربية المتحدة وسوريا. نربط العملاء بشركات تأجير موثوقة. نحن المتحكم في البيانات الشخصية الموصوفة في هذه السياسة."] },
      { h: "2. ما الذي نجمعه", body: ["بيانات التصفح: الصفحات المعروضة، الجهاز، اللغة، الدولة (عبر ملفات الارتباط والتحليلات).", "إجراءات التواصل: عند نقرك على واتساب أو اتصال أو مكالمة دولية مجانية أو متابعة — نسجّل الحدث لصالح شركة التأجير.", "المراسلات: الاسم والبريد الإلكتروني والهاتف إذا أرسلت نموذج تواصل أو أبلغت عن إعلان.", "بيانات الحساب (للبائعين فقط): الاسم والبريد والهاتف والرخصة التجارية وطريقة الدفع (تتولاها Stripe)."] },
      { h: "3. كيف نستخدم بياناتك", body: ["تشغيل السوق وتحسينه.", "إظهار عدد جهات الاتصال التي تتلقاها إعلانات شركات التأجير (أعداد مجهولة الهوية).", "إرسال رسائل المعاملات (الحساب، إعادة تعيين كلمة المرور، إيصالات الاشتراك).", "بموافقتك: ملفات ارتباط التحليلات والإعلانات (Google وMeta وTikTok) لقياس الإعلانات وإعادة الاستهداف."] },
      { h: "4. مع من نشارك", body: ["لا نبيع بياناتك أبداً. نشاركها مع:", "شركات التأجير (فقط عند بدئك التواصل — ترى هاتفك/بريدك إذا اخترت إرساله).", "مزوّدو الخدمات: Stripe (المدفوعات)، Resend (البريد)، Cloudflare (شبكة التوصيل)، Hostinger (الاستضافة)، Meilisearch (البحث).", "الجهات الرسمية عند الاقتضاء القانوني."] },
      { h: "5. ملفات الارتباط", body: ["راجع سياسة ملفات الارتباط لمزيد من التفاصيل. يمكنك تغيير الموافقة في أي وقت من الشريط."] },
      { h: "6. حقوقك", body: ["يمكنك طلب الوصول إلى بياناتك أو تصحيحها أو حذفها في أي وقت. راسل privacy@autotorental.com."] },
      { h: "7. الاحتفاظ", body: ["نحتفظ بأحداث التحليلات لمدة 12 شهراً. تُحفظ بيانات حساب البائع أثناء فعالية اشتراكك ولمدة 12 شهراً بعده."] },
      { h: "8. التواصل", body: ["لأسئلة الخصوصية: privacy@autotorental.com"] },
    ],
  },
  es: {
    metaTitle: "Política de privacidad — Auto to Rental",
    metaDesc: "Cómo Auto to Rental recopila, usa y protege tus datos personales en EAU y Siria.",
    bcHome: "Inicio", bcLabel: "Privacidad",
    quickLinksTitle: "Enlaces legales rápidos",
    linkPrivacy: "Privacidad", linkTerms: "Términos", linkCookies: "Cookies", linkContact: "Contacto",
    lastUpdated: "Última actualización:",
    h1: "Política de privacidad",
    updatedValue: "Enero de 2026",
    sections: [
      { h: "1. Quiénes somos", body: ["Auto to Rental (nosotros) es un mercado de alquiler de autos que opera en los Emiratos Árabes Unidos y Siria. Conectamos clientes con empresas de alquiler verificadas. Somos el responsable del tratamiento de los datos personales descritos en esta política."] },
      { h: "2. Qué recopilamos", body: ["Datos de navegación: páginas vistas, dispositivo, idioma, país (mediante cookies y analítica).", "Acciones de contacto: cuando haces clic en WhatsApp, Llamar, Llamada internacional gratuita o Seguir, registramos el evento para la empresa de alquiler.", "Comunicaciones: nombre, correo, teléfono si envías un formulario de contacto o reportas un anuncio.", "Datos de cuenta (solo proveedores): nombre, correo, teléfono, licencia comercial, método de pago (gestionado por Stripe)."] },
      { h: "3. Cómo usamos tus datos", body: ["Operar y mejorar el mercado.", "Mostrar a las empresas de alquiler cuántos contactos reciben sus anuncios (conteos anónimos).", "Enviar correos transaccionales (cuenta, restablecimiento de contraseña, recibos de suscripción).", "Con tu consentimiento: cookies de analítica y publicidad (Google, Meta, TikTok) para medición de anuncios y retargeting."] },
      { h: "4. Con quién compartimos", body: ["Nunca vendemos tus datos. Compartimos con:", "Empresas de alquiler (solo cuando inicias el contacto: ven tu teléfono/correo si decides enviarlo).", "Proveedores de servicios: Stripe (pagos), Resend (correo), Cloudflare (CDN), Hostinger (alojamiento), Meilisearch (búsqueda).", "Autoridades cuando la ley lo exige."] },
      { h: "5. Cookies", body: ["Consulta nuestra Política de cookies para más detalles. Puedes cambiar el consentimiento en cualquier momento en el banner."] },
      { h: "6. Tus derechos", body: ["Puedes solicitar el acceso, la corrección o la eliminación de tus datos en cualquier momento. Escribe a privacy@autotorental.com."] },
      { h: "7. Conservación", body: ["Conservamos los eventos de analítica durante 12 meses. Los datos de cuenta del proveedor se conservan mientras tu suscripción esté activa y durante 12 meses después."] },
      { h: "8. Contacto", body: ["Para preguntas de privacidad: privacy@autotorental.com"] },
    ],
  },
  zh: {
    metaTitle: "隐私政策 — Auto to Rental",
    metaDesc: "Auto to Rental 如何在阿联酋和叙利亚收集、使用和保护您的个人数据。",
    bcHome: "首页", bcLabel: "隐私",
    quickLinksTitle: "法律快速链接",
    linkPrivacy: "隐私", linkTerms: "条款", linkCookies: "Cookie", linkContact: "联系",
    lastUpdated: "最后更新：",
    h1: "隐私政策",
    updatedValue: "2026年1月",
    sections: [
      { h: "1. 我们是谁", body: ["Auto to Rental（我们）是一个在阿联酋和叙利亚运营的租车平台。我们将客户与经认证的租车公司连接起来。对于本政策中描述的个人数据，我们是数据控制者。"] },
      { h: "2. 我们收集什么", body: ["浏览数据：浏览的页面、设备、语言、国家（通过 Cookie 和分析）。", "联系操作：当您点击 WhatsApp、致电、免费国际通话或关注时，我们会为租车公司记录该事件。", "通信信息：如果您提交联系表单或举报房源，则包括姓名、电子邮件、电话。", "账户数据（仅供应商）：姓名、电子邮件、电话、营业执照、支付方式（由 Stripe 处理）。"] },
      { h: "3. 我们如何使用您的数据", body: ["运营和改进平台。", "向租车公司显示其房源收到多少联系（匿名计数）。", "发送交易类邮件（账户、密码重置、订阅收据）。", "经您同意：分析和广告 Cookie（Google、Meta、TikTok）用于广告衡量和再营销。"] },
      { h: "4. 我们与谁共享", body: ["我们绝不出售您的数据。我们会与以下各方共享：", "租车公司（仅当您主动联系时——若您选择发送，他们会看到您的电话/邮箱）。", "服务提供商：Stripe（支付）、Resend（邮件）、Cloudflare（CDN）、Hostinger（托管）、Meilisearch（搜索）。", "法律要求时的相关机构。"] },
      { h: "5. Cookie", body: ["详情请参阅我们的 Cookie 政策。您可以随时在横幅中更改同意设置。"] },
      { h: "6. 您的权利", body: ["您可以随时请求访问、更正或删除您的数据。请发送邮件至 privacy@autotorental.com。"] },
      { h: "7. 保留期", body: ["我们保留分析事件 12 个月。供应商账户数据在您订阅有效期间及之后 12 个月内保留。"] },
      { h: "8. 联系", body: ["隐私问题请联系：privacy@autotorental.com"] },
    ],
  },
  th: {
    metaTitle: "นโยบายความเป็นส่วนตัว — Auto to Rental",
    metaDesc: "วิธีที่ Auto to Rental เก็บ ใช้ และปกป้องข้อมูลส่วนบุคคลของคุณใน UAE และซีเรีย",
    bcHome: "หน้าแรก", bcLabel: "ความเป็นส่วนตัว",
    quickLinksTitle: "ลิงก์ทางกฎหมายด่วน",
    linkPrivacy: "ความเป็นส่วนตัว", linkTerms: "ข้อกำหนด", linkCookies: "คุกกี้", linkContact: "ติดต่อ",
    lastUpdated: "อัปเดตล่าสุด:",
    h1: "นโยบายความเป็นส่วนตัว",
    updatedValue: "มกราคม 2026",
    sections: [
      { h: "1. เราคือใคร", body: ["Auto to Rental (เรา) เป็นตลาดเช่ารถที่ให้บริการในสหรัฐอาหรับเอมิเรตส์และซีเรีย เราเชื่อมต่อลูกค้ากับบริษัทเช่ารถที่ได้รับการยืนยัน เราเป็นผู้ควบคุมข้อมูลสำหรับข้อมูลส่วนบุคคลที่อธิบายไว้ในนโยบายนี้"] },
      { h: "2. เราเก็บอะไรบ้าง", body: ["ข้อมูลการเรียกดู: หน้าที่ดู อุปกรณ์ ภาษา ประเทศ (ผ่านคุกกี้และการวิเคราะห์)", "การติดต่อ: เมื่อคุณคลิก WhatsApp โทร โทรระหว่างประเทศฟรี หรือติดตาม เราจะบันทึกเหตุการณ์ให้บริษัทเช่ารถ", "การสื่อสาร: ชื่อ อีเมล โทรศัพท์ หากคุณส่งแบบฟอร์มติดต่อหรือรายงานประกาศ", "ข้อมูลบัญชี (เฉพาะผู้ขาย): ชื่อ อีเมล โทรศัพท์ ใบอนุญาตการค้า วิธีชำระเงิน (จัดการโดย Stripe)"] },
      { h: "3. เราใช้ข้อมูลของคุณอย่างไร", body: ["ดำเนินการและปรับปรุงตลาดกลาง", "แสดงให้บริษัทเช่ารถเห็นว่าประกาศได้รับการติดต่อกี่ครั้ง (จำนวนแบบไม่ระบุตัวตน)", "ส่งอีเมลธุรกรรม (บัญชี รีเซ็ตรหัสผ่าน ใบเสร็จการสมัครสมาชิก)", "เมื่อคุณยินยอม: คุกกี้วิเคราะห์และโฆษณา (Google, Meta, TikTok) เพื่อวัดผลโฆษณาและรีทาร์เก็ต"] },
      { h: "4. เราแบ่งปันกับใคร", body: ["เราไม่ขายข้อมูลของคุณเด็ดขาด เราแบ่งปันกับ:", "บริษัทเช่ารถ (เฉพาะเมื่อคุณเริ่มติดต่อ — พวกเขาเห็นโทรศัพท์/อีเมลของคุณหากคุณเลือกส่ง)", "ผู้ให้บริการ: Stripe (ชำระเงิน), Resend (อีเมล), Cloudflare (CDN), Hostinger (โฮสติ้ง), Meilisearch (ค้นหา)", "หน่วยงานราชการเมื่อกฎหมายกำหนด"] },
      { h: "5. คุกกี้", body: ["ดูรายละเอียดในนโยบายคุกกี้ของเรา คุณสามารถเปลี่ยนการยินยอมได้ทุกเมื่อในแบนเนอร์"] },
      { h: "6. สิทธิ์ของคุณ", body: ["คุณสามารถขอเข้าถึง แก้ไข หรือลบข้อมูลของคุณได้ทุกเมื่อ ส่งอีเมลถึง privacy@autotorental.com"] },
      { h: "7. การเก็บรักษา", body: ["เราเก็บเหตุการณ์การวิเคราะห์ไว้ 12 เดือน ข้อมูลบัญชีผู้ขายจะถูกเก็บไว้ระหว่างที่การสมัครสมาชิกของคุณยังใช้งานอยู่และอีก 12 เดือนหลังจากนั้น"] },
      { h: "8. ติดต่อ", body: ["สำหรับคำถามด้านความเป็นส่วนตัว: privacy@autotorental.com"] },
    ],
  },
  ru: {
    metaTitle: "Политика конфиденциальности — Auto to Rental",
    metaDesc: "Как Auto to Rental собирает, использует и защищает ваши персональные данные в ОАЭ и Сирии.",
    bcHome: "Главная", bcLabel: "Конфиденциальность",
    quickLinksTitle: "Быстрые правовые ссылки",
    linkPrivacy: "Конфиденциальность", linkTerms: "Условия", linkCookies: "Файлы cookie", linkContact: "Контакты",
    lastUpdated: "Последнее обновление:",
    h1: "Политика конфиденциальности",
    updatedValue: "Январь 2026",
    sections: [
      { h: "1. Кто мы", body: ["Auto to Rental (мы) — маркетплейс аренды автомобилей, работающий в Объединённых Арабских Эмиратах и Сирии. Мы связываем клиентов с проверенными компаниями по аренде. Мы являемся оператором персональных данных, описанных в этой политике."] },
      { h: "2. Что мы собираем", body: ["Данные о просмотре: просмотренные страницы, устройство, язык, страна (через файлы cookie и аналитику).", "Действия связи: когда вы нажимаете WhatsApp, Позвонить, Бесплатный международный звонок или Подписаться — мы регистрируем событие для компании по аренде.", "Сообщения: имя, email, телефон, если вы отправляете форму связи или жалобу на объявление.", "Данные аккаунта (только для продавцов): имя, email, телефон, торговая лицензия, способ оплаты (обрабатывается Stripe)."] },
      { h: "3. Как мы используем ваши данные", body: ["Управление маркетплейсом и его улучшение.", "Показ компаниям по аренде, сколько обращений получают их объявления (анонимные счётчики).", "Отправка транзакционных писем (аккаунт, сброс пароля, чеки подписки).", "С вашего согласия: аналитические и рекламные файлы cookie (Google, Meta, TikTok) для измерения рекламы и ретаргетинга."] },
      { h: "4. С кем мы делимся", body: ["Мы никогда не продаём ваши данные. Мы делимся с:", "Компаниями по аренде (только когда вы инициируете контакт — они видят ваш телефон/email, если вы решите его отправить).", "Поставщиками услуг: Stripe (платежи), Resend (email), Cloudflare (CDN), Hostinger (хостинг), Meilisearch (поиск).", "Органами власти, когда это требуется по закону."] },
      { h: "5. Файлы cookie", body: ["Подробности см. в нашей Политике использования файлов cookie. Вы можете изменить согласие в любое время в баннере."] },
      { h: "6. Ваши права", body: ["Вы можете запросить доступ, исправление или удаление ваших данных в любое время. Пишите на privacy@autotorental.com."] },
      { h: "7. Хранение", body: ["Мы храним аналитические события 12 месяцев. Данные аккаунта продавца хранятся, пока активна ваша подписка, и в течение 12 месяцев после."] },
      { h: "8. Контакты", body: ["По вопросам конфиденциальности: privacy@autotorental.com"] },
    ],
  },
  ur: {
    metaTitle: "رازداری کی پالیسی — Auto to Rental",
    metaDesc: "Auto to Rental کس طرح UAE اور شام میں آپ کا ذاتی ڈیٹا جمع، استعمال اور محفوظ کرتا ہے۔",
    bcHome: "ہوم", bcLabel: "رازداری",
    quickLinksTitle: "قانونی فوری روابط",
    linkPrivacy: "رازداری", linkTerms: "شرائط", linkCookies: "کوکیز", linkContact: "رابطہ",
    lastUpdated: "آخری تازہ کاری:",
    h1: "رازداری کی پالیسی",
    updatedValue: "جنوری 2026",
    sections: [
      { h: "1. ہم کون ہیں", body: ["Auto to Rental (ہم) متحدہ عرب امارات اور شام میں کام کرنے والا کار کرایہ مارکیٹ پلیس ہے۔ ہم گاہکوں کو تصدیق شدہ کرایہ کمپنیوں سے جوڑتے ہیں۔ اس پالیسی میں بیان کردہ ذاتی ڈیٹا کے لیے ہم ڈیٹا کنٹرولر ہیں۔"] },
      { h: "2. ہم کیا جمع کرتے ہیں", body: ["براؤزنگ ڈیٹا: دیکھے گئے صفحات، ڈیوائس، زبان، ملک (کوکیز اور تجزیات کے ذریعے)۔", "رابطہ اقدامات: جب آپ واٹس ایپ، کال، مفت بین الاقوامی کال یا فالو پر کلک کرتے ہیں — ہم کرایہ کمپنی کے لیے واقعہ ریکارڈ کرتے ہیں۔", "مواصلات: نام، ای میل، فون اگر آپ رابطہ فارم جمع کرائیں یا کسی اشتہار کی رپورٹ کریں۔", "اکاؤنٹ ڈیٹا (صرف وینڈرز): نام، ای میل، فون، تجارتی لائسنس، ادائیگی کا طریقہ (Stripe سنبھالتا ہے)۔"] },
      { h: "3. ہم آپ کا ڈیٹا کیسے استعمال کرتے ہیں", body: ["مارکیٹ پلیس چلانا اور بہتر بنانا۔", "کرایہ کمپنیوں کو دکھانا کہ ان کے اشتہار کو کتنے رابطے ملے (گمنام تعداد)۔", "لین دین کی ای میلز بھیجنا (اکاؤنٹ، پاس ورڈ ری سیٹ، سبسکرپشن رسیدیں)۔", "آپ کی رضامندی سے: اشتہار کی پیمائش اور ری ٹارگیٹنگ کے لیے تجزیات اور اشتہاری کوکیز (Google، Meta، TikTok)۔"] },
      { h: "4. ہم کس کے ساتھ شیئر کرتے ہیں", body: ["ہم آپ کا ڈیٹا کبھی نہیں بیچتے۔ ہم ان کے ساتھ شیئر کرتے ہیں:", "کرایہ کمپنیاں (صرف جب آپ رابطہ شروع کریں — اگر آپ بھیجنے کا انتخاب کریں تو وہ آپ کا فون/ای میل دیکھتی ہیں)۔", "سروس فراہم کنندگان: Stripe (ادائیگیاں)، Resend (ای میل)، Cloudflare (CDN)، Hostinger (ہوسٹنگ)، Meilisearch (تلاش)۔", "قانونی طور پر مطلوب ہونے پر حکام۔"] },
      { h: "5. کوکیز", body: ["تفصیلات کے لیے ہماری کوکی پالیسی دیکھیں۔ آپ بینر میں کسی بھی وقت رضامندی تبدیل کر سکتے ہیں۔"] },
      { h: "6. آپ کے حقوق", body: ["آپ کسی بھی وقت اپنے ڈیٹا تک رسائی، تصحیح یا حذف کی درخواست کر سکتے ہیں۔ ای میل privacy@autotorental.com۔"] },
      { h: "7. برقراری", body: ["ہم تجزیاتی واقعات 12 ماہ تک رکھتے ہیں۔ وینڈر اکاؤنٹ ڈیٹا آپ کی سبسکرپشن فعال رہنے تک اور اس کے بعد 12 ماہ تک رکھا جاتا ہے۔"] },
      { h: "8. رابطہ", body: ["رازداری کے سوالات کے لیے: privacy@autotorental.com"] },
    ],
  },
}

const COOKIES: Record<Locale, CookiesContent> = {
  en: {
    metaTitle: "Cookie Policy — Auto to Rental",
    metaDesc: "How Auto to Rental uses cookies and how you can manage your consent.",
    bcHome: "Home", bcLabel: "Cookies",
    quickLinksTitle: "Legal quick links",
    linkPrivacy: "Privacy", linkTerms: "Terms", linkCookies: "Cookies", linkContact: "Contact",
    lastUpdated: "Last updated:",
    h1: "Cookie Policy",
    updatedValue: "January 2026",
    whatTitle: "What are cookies?",
    whatBody: "Small text files that websites store on your device to remember things about you (like which country you chose, your preferred currency, or whether you are logged in).",
    essentialTitle: "Essential cookies (always on)",
    essentialRows: [
      { name: "country", purpose: "Remembers which country you selected (UAE / Syria)" },
      { name: "lang", purpose: "Remembers your language (English / Arabic)" },
      { name: "ccy", purpose: "Remembers your currency (AED / SYP / USD / EUR / GBP)" },
      { name: "device_id", purpose: "Anonymous ID so the follow button and favorites work without an account" },
      { name: "cookie_consent", purpose: "Remembers your consent choice" },
    ],
    adTitle: "Analytics & advertising cookies (only with consent)",
    adIntro: "Loaded only after you click Accept all in the cookie banner.",
    adRows: [
      { name: "Google Analytics 4 (_ga, _ga_*)", purpose: "Anonymous page views and visit duration" },
      { name: "Google Ads", purpose: "Measures ad conversions and builds remarketing audiences" },
      { name: "Meta Pixel (_fbp)", purpose: "Facebook + Instagram ad measurement and retargeting" },
      { name: "TikTok Pixel", purpose: "TikTok ad measurement and retargeting" },
    ],
    changeTitle: "How to change your consent",
    changeBody: ["Open the cookie banner footer link or clear the ", " cookie in your browser to be asked again. You can also block all cookies in your browser settings — the site will still work."],
    moreTitle: "More info",
    moreBody: "See our {link} for the full picture.",
    moreLinkLabel: "Privacy Policy",
  },
  ar: {
    metaTitle: "سياسة ملفات الارتباط — Auto to Rental",
    metaDesc: "كيف تستخدم Auto to Rental ملفات الارتباط وكيف يمكنك إدارة موافقتك.",
    bcHome: "الرئيسية", bcLabel: "ملفات الارتباط",
    quickLinksTitle: "روابط قانونية سريعة",
    linkPrivacy: "الخصوصية", linkTerms: "الشروط", linkCookies: "ملفات الارتباط", linkContact: "اتصل بنا",
    lastUpdated: "آخر تحديث:",
    h1: "سياسة ملفات الارتباط",
    updatedValue: "يناير 2026",
    whatTitle: "ما هي ملفات الارتباط؟",
    whatBody: "ملفات نصية صغيرة تخزّنها المواقع على جهازك لتتذكر أشياء عنك (مثل الدولة التي اخترتها أو عملتك المفضلة أو ما إذا كنت مسجّل الدخول).",
    essentialTitle: "ملفات الارتباط الأساسية (مفعّلة دائماً)",
    essentialRows: [
      { name: "country", purpose: "تتذكر الدولة التي اخترتها (الإمارات / سوريا)" },
      { name: "lang", purpose: "تتذكر لغتك (الإنجليزية / العربية)" },
      { name: "ccy", purpose: "تتذكر عملتك (درهم / ليرة سورية / دولار / يورو / جنيه)" },
      { name: "device_id", purpose: "معرّف مجهول لتعمل أزرار المتابعة والمفضلة دون حساب" },
      { name: "cookie_consent", purpose: "تتذكر اختيارك للموافقة" },
    ],
    adTitle: "ملفات ارتباط التحليلات والإعلانات (بالموافقة فقط)",
    adIntro: "تُحمَّل فقط بعد نقرك «قبول الكل» في شريط ملفات الارتباط.",
    adRows: [
      { name: "Google Analytics 4 (_ga, _ga_*)", purpose: "مشاهدات صفحات مجهولة ومدة الزيارة" },
      { name: "Google Ads", purpose: "تقيس تحويلات الإعلانات وتبني جماهير إعادة التسويق" },
      { name: "Meta Pixel (_fbp)", purpose: "قياس وإعادة استهداف إعلانات فيسبوك وإنستغرام" },
      { name: "TikTok Pixel", purpose: "قياس وإعادة استهداف إعلانات تيك توك" },
    ],
    changeTitle: "كيفية تغيير موافقتك",
    changeBody: ["افتح رابط شريط ملفات الارتباط في التذييل أو امسح ملف ", " في متصفحك لتُسأل من جديد. يمكنك أيضاً حظر كل ملفات الارتباط من إعدادات المتصفح — وسيظل الموقع يعمل."],
    moreTitle: "مزيد من المعلومات",
    moreBody: "راجع {link} للصورة الكاملة.",
    moreLinkLabel: "سياسة الخصوصية",
  },
  es: {
    metaTitle: "Política de cookies — Auto to Rental",
    metaDesc: "Cómo Auto to Rental usa las cookies y cómo puedes gestionar tu consentimiento.",
    bcHome: "Inicio", bcLabel: "Cookies",
    quickLinksTitle: "Enlaces legales rápidos",
    linkPrivacy: "Privacidad", linkTerms: "Términos", linkCookies: "Cookies", linkContact: "Contacto",
    lastUpdated: "Última actualización:",
    h1: "Política de cookies",
    updatedValue: "Enero de 2026",
    whatTitle: "¿Qué son las cookies?",
    whatBody: "Pequeños archivos de texto que los sitios web guardan en tu dispositivo para recordar cosas sobre ti (como qué país elegiste, tu moneda preferida o si has iniciado sesión).",
    essentialTitle: "Cookies esenciales (siempre activas)",
    essentialRows: [
      { name: "country", purpose: "Recuerda qué país seleccionaste (EAU / Siria)" },
      { name: "lang", purpose: "Recuerda tu idioma (inglés / árabe)" },
      { name: "ccy", purpose: "Recuerda tu moneda (AED / SYP / USD / EUR / GBP)" },
      { name: "device_id", purpose: "ID anónimo para que el botón seguir y los favoritos funcionen sin cuenta" },
      { name: "cookie_consent", purpose: "Recuerda tu elección de consentimiento" },
    ],
    adTitle: "Cookies de analítica y publicidad (solo con consentimiento)",
    adIntro: "Se cargan solo después de que hagas clic en Aceptar todo en el banner de cookies.",
    adRows: [
      { name: "Google Analytics 4 (_ga, _ga_*)", purpose: "Vistas de página anónimas y duración de la visita" },
      { name: "Google Ads", purpose: "Mide conversiones de anuncios y crea audiencias de remarketing" },
      { name: "Meta Pixel (_fbp)", purpose: "Medición y retargeting de anuncios de Facebook e Instagram" },
      { name: "TikTok Pixel", purpose: "Medición y retargeting de anuncios de TikTok" },
    ],
    changeTitle: "Cómo cambiar tu consentimiento",
    changeBody: ["Abre el enlace del banner de cookies en el pie de página o borra la cookie ", " en tu navegador para que se te pregunte de nuevo. También puedes bloquear todas las cookies en la configuración de tu navegador — el sitio seguirá funcionando."],
    moreTitle: "Más información",
    moreBody: "Consulta nuestra {link} para tener el panorama completo.",
    moreLinkLabel: "Política de privacidad",
  },
  zh: {
    metaTitle: "Cookie 政策 — Auto to Rental",
    metaDesc: "Auto to Rental 如何使用 Cookie 以及您如何管理同意设置。",
    bcHome: "首页", bcLabel: "Cookie",
    quickLinksTitle: "法律快速链接",
    linkPrivacy: "隐私", linkTerms: "条款", linkCookies: "Cookie", linkContact: "联系",
    lastUpdated: "最后更新：",
    h1: "Cookie 政策",
    updatedValue: "2026年1月",
    whatTitle: "什么是 Cookie？",
    whatBody: "网站存储在您设备上的小型文本文件，用于记住有关您的信息（如您选择的国家、首选货币或是否已登录）。",
    essentialTitle: "必要 Cookie（始终启用）",
    essentialRows: [
      { name: "country", purpose: "记住您选择的国家（阿联酋 / 叙利亚）" },
      { name: "lang", purpose: "记住您的语言（英语 / 阿拉伯语）" },
      { name: "ccy", purpose: "记住您的货币（AED / SYP / USD / EUR / GBP）" },
      { name: "device_id", purpose: "匿名 ID，使关注按钮和收藏在无账户时也能工作" },
      { name: "cookie_consent", purpose: "记住您的同意选择" },
    ],
    adTitle: "分析与广告 Cookie（仅在同意后）",
    adIntro: "仅在您点击 Cookie 横幅中的「全部接受」后加载。",
    adRows: [
      { name: "Google Analytics 4 (_ga, _ga_*)", purpose: "匿名页面浏览量和访问时长" },
      { name: "Google Ads", purpose: "衡量广告转化并构建再营销受众" },
      { name: "Meta Pixel (_fbp)", purpose: "Facebook + Instagram 广告衡量和再定向" },
      { name: "TikTok Pixel", purpose: "TikTok 广告衡量和再定向" },
    ],
    changeTitle: "如何更改您的同意设置",
    changeBody: ["打开页脚中的 Cookie 横幅链接，或在浏览器中清除 ", " Cookie 以便再次询问。您也可以在浏览器设置中阻止所有 Cookie — 网站仍可正常运行。"],
    moreTitle: "更多信息",
    moreBody: "请参阅我们的{link}以了解完整情况。",
    moreLinkLabel: "隐私政策",
  },
  th: {
    metaTitle: "นโยบายคุกกี้ — Auto to Rental",
    metaDesc: "วิธีที่ Auto to Rental ใช้คุกกี้และวิธีจัดการการยินยอมของคุณ",
    bcHome: "หน้าแรก", bcLabel: "คุกกี้",
    quickLinksTitle: "ลิงก์ทางกฎหมายด่วน",
    linkPrivacy: "ความเป็นส่วนตัว", linkTerms: "ข้อกำหนด", linkCookies: "คุกกี้", linkContact: "ติดต่อ",
    lastUpdated: "อัปเดตล่าสุด:",
    h1: "นโยบายคุกกี้",
    updatedValue: "มกราคม 2026",
    whatTitle: "คุกกี้คืออะไร?",
    whatBody: "ไฟล์ข้อความขนาดเล็กที่เว็บไซต์จัดเก็บไว้ในอุปกรณ์ของคุณเพื่อจดจำสิ่งต่างๆ เกี่ยวกับคุณ (เช่น ประเทศที่คุณเลือก สกุลเงินที่คุณต้องการ หรือคุณเข้าสู่ระบบหรือไม่)",
    essentialTitle: "คุกกี้ที่จำเป็น (เปิดตลอดเวลา)",
    essentialRows: [
      { name: "country", purpose: "จดจำประเทศที่คุณเลือก (UAE / ซีเรีย)" },
      { name: "lang", purpose: "จดจำภาษาของคุณ (อังกฤษ / อาหรับ)" },
      { name: "ccy", purpose: "จดจำสกุลเงินของคุณ (AED / SYP / USD / EUR / GBP)" },
      { name: "device_id", purpose: "ID แบบไม่ระบุตัวตนเพื่อให้ปุ่มติดตามและรายการโปรดทำงานได้โดยไม่ต้องมีบัญชี" },
      { name: "cookie_consent", purpose: "จดจำการเลือกยินยอมของคุณ" },
    ],
    adTitle: "คุกกี้วิเคราะห์และโฆษณา (เมื่อยินยอมเท่านั้น)",
    adIntro: "โหลดเฉพาะหลังจากที่คุณคลิก «ยอมรับทั้งหมด» ในแบนเนอร์คุกกี้",
    adRows: [
      { name: "Google Analytics 4 (_ga, _ga_*)", purpose: "การดูหน้าแบบไม่ระบุตัวตนและระยะเวลาการเยี่ยมชม" },
      { name: "Google Ads", purpose: "วัดการแปลงโฆษณาและสร้างกลุ่มเป้าหมายรีมาร์เก็ตติ้ง" },
      { name: "Meta Pixel (_fbp)", purpose: "การวัดและรีทาร์เก็ตโฆษณา Facebook + Instagram" },
      { name: "TikTok Pixel", purpose: "การวัดและรีทาร์เก็ตโฆษณา TikTok" },
    ],
    changeTitle: "วิธีเปลี่ยนการยินยอมของคุณ",
    changeBody: ["เปิดลิงก์แบนเนอร์คุกกี้ในส่วนท้าย หรือล้างคุกกี้ ", " ในเบราว์เซอร์ของคุณเพื่อให้ถูกถามอีกครั้ง คุณยังสามารถบล็อกคุกกี้ทั้งหมดในการตั้งค่าเบราว์เซอร์ — เว็บไซต์จะยังทำงานได้"],
    moreTitle: "ข้อมูลเพิ่มเติม",
    moreBody: "ดู {link} ของเราเพื่อภาพรวมทั้งหมด",
    moreLinkLabel: "นโยบายความเป็นส่วนตัว",
  },
  ru: {
    metaTitle: "Политика использования файлов cookie — Auto to Rental",
    metaDesc: "Как Auto to Rental использует файлы cookie и как вы можете управлять своим согласием.",
    bcHome: "Главная", bcLabel: "Файлы cookie",
    quickLinksTitle: "Быстрые правовые ссылки",
    linkPrivacy: "Конфиденциальность", linkTerms: "Условия", linkCookies: "Файлы cookie", linkContact: "Контакты",
    lastUpdated: "Последнее обновление:",
    h1: "Политика использования файлов cookie",
    updatedValue: "Январь 2026",
    whatTitle: "Что такое файлы cookie?",
    whatBody: "Небольшие текстовые файлы, которые сайты сохраняют на вашем устройстве, чтобы запоминать сведения о вас (например, выбранную страну, предпочитаемую валюту или то, вошли ли вы в систему).",
    essentialTitle: "Необходимые файлы cookie (всегда включены)",
    essentialRows: [
      { name: "country", purpose: "Запоминает выбранную вами страну (ОАЭ / Сирия)" },
      { name: "lang", purpose: "Запоминает ваш язык (английский / арабский)" },
      { name: "ccy", purpose: "Запоминает вашу валюту (AED / SYP / USD / EUR / GBP)" },
      { name: "device_id", purpose: "Анонимный ID, чтобы кнопка подписки и избранное работали без аккаунта" },
      { name: "cookie_consent", purpose: "Запоминает ваш выбор согласия" },
    ],
    adTitle: "Аналитические и рекламные файлы cookie (только с согласия)",
    adIntro: "Загружаются только после нажатия «Принять все» в баннере файлов cookie.",
    adRows: [
      { name: "Google Analytics 4 (_ga, _ga_*)", purpose: "Анонимные просмотры страниц и длительность визита" },
      { name: "Google Ads", purpose: "Измеряет конверсии рекламы и формирует аудитории ремаркетинга" },
      { name: "Meta Pixel (_fbp)", purpose: "Измерение и ретаргетинг рекламы Facebook и Instagram" },
      { name: "TikTok Pixel", purpose: "Измерение и ретаргетинг рекламы TikTok" },
    ],
    changeTitle: "Как изменить ваше согласие",
    changeBody: ["Откройте ссылку на баннер файлов cookie в нижнем колонтитуле или очистите файл cookie ", " в браузере, чтобы вас спросили снова. Вы также можете заблокировать все файлы cookie в настройках браузера — сайт продолжит работать."],
    moreTitle: "Больше информации",
    moreBody: "Полную картину см. в нашей {link}.",
    moreLinkLabel: "Политике конфиденциальности",
  },
  ur: {
    metaTitle: "کوکی پالیسی — Auto to Rental",
    metaDesc: "Auto to Rental کوکیز کا استعمال کیسے کرتا ہے اور آپ اپنی رضامندی کیسے منظم کر سکتے ہیں۔",
    bcHome: "ہوم", bcLabel: "کوکیز",
    quickLinksTitle: "قانونی فوری روابط",
    linkPrivacy: "رازداری", linkTerms: "شرائط", linkCookies: "کوکیز", linkContact: "رابطہ",
    lastUpdated: "آخری تازہ کاری:",
    h1: "کوکی پالیسی",
    updatedValue: "جنوری 2026",
    whatTitle: "کوکیز کیا ہیں؟",
    whatBody: "چھوٹی ٹیکسٹ فائلیں جو ویب سائٹس آپ کے ڈیوائس پر محفوظ کرتی ہیں تاکہ آپ کے بارے میں چیزیں یاد رکھیں (جیسے آپ نے کون سا ملک منتخب کیا، آپ کی پسندیدہ کرنسی، یا آیا آپ لاگ ان ہیں)۔",
    essentialTitle: "ضروری کوکیز (ہمیشہ فعال)",
    essentialRows: [
      { name: "country", purpose: "یاد رکھتی ہے کہ آپ نے کون سا ملک منتخب کیا (UAE / شام)" },
      { name: "lang", purpose: "آپ کی زبان یاد رکھتی ہے (انگریزی / عربی)" },
      { name: "ccy", purpose: "آپ کی کرنسی یاد رکھتی ہے (AED / SYP / USD / EUR / GBP)" },
      { name: "device_id", purpose: "گمنام ID تاکہ فالو بٹن اور پسندیدہ اکاؤنٹ کے بغیر کام کریں" },
      { name: "cookie_consent", purpose: "آپ کی رضامندی کا انتخاب یاد رکھتی ہے" },
    ],
    adTitle: "تجزیات اور اشتہاری کوکیز (صرف رضامندی کے ساتھ)",
    adIntro: "صرف اس وقت لوڈ ہوتی ہیں جب آپ کوکی بینر میں «سب قبول کریں» پر کلک کریں۔",
    adRows: [
      { name: "Google Analytics 4 (_ga, _ga_*)", purpose: "گمنام صفحہ مشاہدات اور دورے کا دورانیہ" },
      { name: "Google Ads", purpose: "اشتہاری تبدیلیوں کی پیمائش اور ری مارکیٹنگ سامعین بناتی ہے" },
      { name: "Meta Pixel (_fbp)", purpose: "فیس بک + انسٹاگرام اشتہار کی پیمائش اور ری ٹارگیٹنگ" },
      { name: "TikTok Pixel", purpose: "ٹک ٹاک اشتہار کی پیمائش اور ری ٹارگیٹنگ" },
    ],
    changeTitle: "اپنی رضامندی کیسے تبدیل کریں",
    changeBody: ["فوٹر میں کوکی بینر لنک کھولیں یا اپنے براؤزر میں ", " کوکی صاف کریں تاکہ آپ سے دوبارہ پوچھا جائے۔ آپ اپنے براؤزر کی ترتیبات میں تمام کوکیز کو بلاک بھی کر سکتے ہیں — سائٹ پھر بھی کام کرے گی۔"],
    moreTitle: "مزید معلومات",
    moreBody: "مکمل تصویر کے لیے ہماری {link} دیکھیں۔",
    moreLinkLabel: "رازداری کی پالیسی",
  },
}

export function termsContent(locale: Locale): TermsContent {
  return TERMS[locale] || TERMS[DEFAULT_LOCALE]
}

export function privacyContent(locale: Locale): PrivacyContent {
  return PRIVACY[locale] || PRIVACY[DEFAULT_LOCALE]
}

export function cookiesContent(locale: Locale): CookiesContent {
  return COOKIES[locale] || COOKIES[DEFAULT_LOCALE]
}
