// Localized content for the vehicle detail page (/cars/[id]).
// Car titles, brand/city proper names and prices stay as-is. All UI chrome,
// labels, CTAs and FAQs are professionally translated for all 7 locales.
import { type Locale, DEFAULT_LOCALE } from "./locales"

export type VehicleContent = {
  // breadcrumb
  bcHome: string
  bcCars: string
  // badges / hero
  featured: string
  vehicleVideo: string
  listedBy: string
  availableNow: string
  perDay: string
  save: (n: number) => string
  daily: string
  weekly: string
  monthly: string
  bestDeal: string
  securityDeposit: string
  noDeposit: string
  contactDirectly: string
  whatsapp: string
  callNow: string
  freeIntlCall: string
  noFees1: string
  noFees2: string
  // specs
  quickSpecs: string
  specYear: string
  specBody: string
  specTransmission: string
  specFuel: string
  specSeats: string
  specDoors: string
  specColor: string
  specMileage: string
  // sections
  featuresTitle: string
  aboutTitle: string
  deliveryTitle: string
  deliverySub: string
  freeDelivery: string
  // trust
  trustVerified: string
  trustNoFees: string
  trustDirect: string
  trustTopRated: string
  // promo
  promoLabel: string
  promoTitle: string
  promoSub: string
  allCars: string
  brandCars: (brand: string) => string
  // faq
  faqTitle: string
  faqReserveQ: string
  faqReserveA: string
  faqCompareQ: string
  faqCompareA1: string // "Check more "
  faqCompareLink1: string // "cars in this category"
  faqCompareA2: string // " or browse cars in "
  faqVerifiedQ: string
  faqVerifiedA: string
  // company profile
  listedByLabel: string
  viewProfile: string
  moreFrom: (name: string) => string
  carsCount: (n: number) => string
  // reviews
  reviewsTitle: string
  viaGoogle: string
  reviewsWord: string
  reviewsNoteTitle: string
  reviewsNote: string
  // meta builders
  metaTitle: (title: string, ccy: string, price: number) => string
  metaDesc: (title: string, ccy: string, price: number, specs: string, company?: string) => string
  // whatsapp prefilled message
  waMessage: (p: { title: string; place: string; price: string; url: string }) => string
}

const EN: VehicleContent = {
  securityDeposit: "Security Deposit", noDeposit: "No Security Deposit",
  bcHome: "Home", bcCars: "Cars",
  featured: "★ Featured", vehicleVideo: "Vehicle video", listedBy: "Listed by", availableNow: "Available Now",
  perDay: "/ day", save: (n) => `Save ${n}%`, daily: "Daily", weekly: "Weekly", monthly: "Monthly", bestDeal: "BEST DEAL",
  contactDirectly: "Contact directly", whatsapp: "WhatsApp", callNow: "Call Now", freeIntlCall: "Free International Call",
  noFees1: "✓ No commission · ✓ No booking fee", noFees2: "You contact the rental company directly",
  quickSpecs: "Quick specs", specYear: "Year", specBody: "Body", specTransmission: "Transmission", specFuel: "Fuel",
  specSeats: "Seats", specDoors: "Doors", specColor: "Color", specMileage: "Mileage",
  featuresTitle: "Features & Equipment", aboutTitle: "About this car",
  deliveryTitle: "Delivery", deliverySub: "Where this car can be delivered", freeDelivery: "Free delivery",
  trustVerified: "Verified Company", trustNoFees: "No Hidden Fees", trustDirect: "Direct Contact", trustTopRated: "Top Rated",
  promoLabel: "Promotional Slot", promoTitle: "Need more options like this car?",
  promoSub: "Explore similar verified listings by brand, city, and body type to compare pricing faster.",
  allCars: "All cars", brandCars: (b) => `${b} cars`,
  faqTitle: "Rental FAQ for this listing",
  faqReserveQ: "How do I reserve this car?", faqReserveA: "Use the WhatsApp or Call button above to confirm availability and rental terms directly with the company.",
  faqCompareQ: "Can I compare similar vehicles?", faqCompareA1: "Check more ", faqCompareLink1: "cars in this category", faqCompareA2: " or browse cars in ",
  faqVerifiedQ: "Is this company verified?", faqVerifiedA: "Yes, listings on Auto to Rental come from verified rental providers with public profile pages.",
  listedByLabel: "Listed by", viewProfile: "View Profile →", moreFrom: (n) => `More from ${n}`, carsCount: (n) => `${n} cars`,
  reviewsTitle: "Reviews", viaGoogle: "via Google", reviewsWord: "reviews",
  reviewsNoteTitle: "📍 Reviews from Google Maps",
  reviewsNote: "Real customer reviews are pulled from the rental company's Google Business Profile. The admin will link the Google Place ID for each company to display verified reviews here.",
  metaTitle: (t, ccy, price) => `${t} — from ${ccy} ${price}/day`,
  metaDesc: (t, ccy, price, specs, company) => `${t}${company ? ` · ${company}` : ""}. ${specs}Book directly with the rental company — from ${ccy} ${price}/day. No booking commission.`,
  waMessage: (p) => `Hello! 👋\n\nI saw this car on Auto to Rental and I'd like to rent it:\n\n🚗 ${p.title}\n📍 ${p.place}\n💰 ${p.price}\n\n🔗 ${p.url}\n\nCould you please share:\n• Availability and pickup options\n• Security deposit\n• Insurance and mileage limits\n\nThank you!`,
}

const AR: VehicleContent = {
  securityDeposit: "مبلغ التأمين", noDeposit: "بدون تأمين",
  bcHome: "الرئيسية", bcCars: "السيارات",
  featured: "★ مميزة", vehicleVideo: "فيديو السيارة", listedBy: "مدرجة بواسطة", availableNow: "متاحة الآن",
  perDay: "/ يوم", save: (n) => `وفّر ${n}%`, daily: "يومي", weekly: "أسبوعي", monthly: "شهري", bestDeal: "أفضل عرض",
  contactDirectly: "تواصل مباشرة", whatsapp: "واتساب", callNow: "اتصل الآن", freeIntlCall: "اتصال دولي مجاني",
  noFees1: "✓ بدون عمولة · ✓ بدون رسوم حجز", noFees2: "تتواصل مع شركة التأجير مباشرة",
  quickSpecs: "المواصفات السريعة", specYear: "السنة", specBody: "الهيكل", specTransmission: "ناقل الحركة", specFuel: "الوقود",
  specSeats: "المقاعد", specDoors: "الأبواب", specColor: "اللون", specMileage: "المسافة المقطوعة",
  featuresTitle: "المميزات والتجهيزات", aboutTitle: "عن هذه السيارة",
  deliveryTitle: "التوصيل", deliverySub: "أماكن توصيل هذه السيارة", freeDelivery: "توصيل مجاني",
  trustVerified: "شركة موثوقة", trustNoFees: "بدون رسوم خفية", trustDirect: "تواصل مباشر", trustTopRated: "الأعلى تقييماً",
  promoLabel: "مساحة ترويجية", promoTitle: "تبحث عن خيارات أخرى مثل هذه السيارة؟",
  promoSub: "استكشف عروضاً موثوقة مشابهة حسب الماركة والمدينة ونوع الهيكل لمقارنة الأسعار بشكل أسرع.",
  allCars: "كل السيارات", brandCars: (b) => `سيارات ${b}`,
  faqTitle: "أسئلة شائعة حول هذا التأجير",
  faqReserveQ: "كيف أحجز هذه السيارة؟", faqReserveA: "استخدم زر واتساب أو الاتصال أعلاه لتأكيد التوفر وشروط التأجير مباشرة مع الشركة.",
  faqCompareQ: "هل يمكنني مقارنة سيارات مشابهة؟", faqCompareA1: "تصفح المزيد من ", faqCompareLink1: "السيارات في هذه الفئة", faqCompareA2: " أو تصفح السيارات في ",
  faqVerifiedQ: "هل هذه الشركة موثوقة؟", faqVerifiedA: "نعم، العروض على Auto to Rental تأتي من شركات تأجير موثوقة لديها صفحات تعريف عامة.",
  listedByLabel: "مدرجة بواسطة", viewProfile: "عرض الملف ←", moreFrom: (n) => `المزيد من ${n}`, carsCount: (n) => `${n} سيارة`,
  reviewsTitle: "التقييمات", viaGoogle: "عبر جوجل", reviewsWord: "تقييم",
  reviewsNoteTitle: "📍 تقييمات من خرائط جوجل",
  reviewsNote: "تقييمات العملاء الحقيقية يتم جلبها من ملف شركة التأجير على Google Business. سيقوم المسؤول بربط معرّف Google Place لكل شركة لعرض التقييمات الموثوقة هنا.",
  metaTitle: (t, ccy, price) => `${t} — من ${ccy} ${price}/يوم`,
  metaDesc: (t, ccy, price, specs, company) => `${t}${company ? ` · ${company}` : ""}. ${specs}احجز مباشرة مع شركة التأجير — من ${ccy} ${price}/يوم. بدون عمولة حجز.`,
  waMessage: (p) => `مرحباً! 👋\n\nرأيت هذه السيارة على Auto to Rental وأرغب في استئجارها:\n\n🚗 ${p.title}\n📍 ${p.place}\n💰 ${p.price}\n\n🔗 ${p.url}\n\nهل يمكنكم تزويدي بـ:\n• التوفر وخيارات الاستلام\n• مبلغ التأمين\n• التأمين وحدود المسافة\n\nشكراً لكم!`,
}

const ES: VehicleContent = {
  securityDeposit: "Depósito de seguridad", noDeposit: "Sin depósito",
  bcHome: "Inicio", bcCars: "Coches",
  featured: "★ Destacado", vehicleVideo: "Vídeo del vehículo", listedBy: "Publicado por", availableNow: "Disponible ahora",
  perDay: "/ día", save: (n) => `Ahorra ${n}%`, daily: "Diario", weekly: "Semanal", monthly: "Mensual", bestDeal: "MEJOR OFERTA",
  contactDirectly: "Contacto directo", whatsapp: "WhatsApp", callNow: "Llamar ahora", freeIntlCall: "Llamada internacional gratis",
  noFees1: "✓ Sin comisión · ✓ Sin tarifa de reserva", noFees2: "Contactas directamente con la empresa de alquiler",
  quickSpecs: "Especificaciones rápidas", specYear: "Año", specBody: "Carrocería", specTransmission: "Transmisión", specFuel: "Combustible",
  specSeats: "Asientos", specDoors: "Puertas", specColor: "Color", specMileage: "Kilometraje",
  featuresTitle: "Características y equipamiento", aboutTitle: "Sobre este coche",
  deliveryTitle: "Entrega", deliverySub: "Dónde se puede entregar este coche", freeDelivery: "Entrega gratis",
  trustVerified: "Empresa verificada", trustNoFees: "Sin cargos ocultos", trustDirect: "Contacto directo", trustTopRated: "Mejor valorado",
  promoLabel: "Espacio promocional", promoTitle: "¿Necesitas más opciones como este coche?",
  promoSub: "Explora anuncios verificados similares por marca, ciudad y carrocería para comparar precios más rápido.",
  allCars: "Todos los coches", brandCars: (b) => `Coches ${b}`,
  faqTitle: "Preguntas frecuentes sobre este alquiler",
  faqReserveQ: "¿Cómo reservo este coche?", faqReserveA: "Usa el botón de WhatsApp o Llamar de arriba para confirmar disponibilidad y condiciones directamente con la empresa.",
  faqCompareQ: "¿Puedo comparar vehículos similares?", faqCompareA1: "Mira más ", faqCompareLink1: "coches de esta categoría", faqCompareA2: " o explora coches en ",
  faqVerifiedQ: "¿Está verificada esta empresa?", faqVerifiedA: "Sí, los anuncios en Auto to Rental provienen de empresas de alquiler verificadas con páginas de perfil públicas.",
  listedByLabel: "Publicado por", viewProfile: "Ver perfil →", moreFrom: (n) => `Más de ${n}`, carsCount: (n) => `${n} coches`,
  reviewsTitle: "Reseñas", viaGoogle: "vía Google", reviewsWord: "reseñas",
  reviewsNoteTitle: "📍 Reseñas de Google Maps",
  reviewsNote: "Las reseñas reales de clientes provienen del perfil de Google Business de la empresa de alquiler. El administrador vinculará el Google Place ID de cada empresa para mostrar reseñas verificadas aquí.",
  metaTitle: (t, ccy, price) => `${t} — desde ${ccy} ${price}/día`,
  metaDesc: (t, ccy, price, specs, company) => `${t}${company ? ` · ${company}` : ""}. ${specs}Reserva directamente con la empresa de alquiler — desde ${ccy} ${price}/día. Sin comisión.`,
  waMessage: (p) => `¡Hola! 👋\n\nVi este coche en Auto to Rental y me gustaría alquilarlo:\n\n🚗 ${p.title}\n📍 ${p.place}\n💰 ${p.price}\n\n🔗 ${p.url}\n\n¿Podríais indicarme:\n• Disponibilidad y opciones de recogida\n• Depósito de seguridad\n• Seguro y límites de kilometraje\n\n¡Gracias!`,
}

const ZH: VehicleContent = {
  securityDeposit: "押金", noDeposit: "无需押金",
  bcHome: "首页", bcCars: "车辆",
  featured: "★ 精选", vehicleVideo: "车辆视频", listedBy: "发布者", availableNow: "现在可租",
  perDay: "/ 天", save: (n) => `省 ${n}%`, daily: "每日", weekly: "每周", monthly: "每月", bestDeal: "最佳优惠",
  contactDirectly: "直接联系", whatsapp: "WhatsApp", callNow: "立即致电", freeIntlCall: "免费国际通话",
  noFees1: "✓ 无佣金 · ✓ 无预订费", noFees2: "您直接联系租车公司",
  quickSpecs: "快速参数", specYear: "年份", specBody: "车身", specTransmission: "变速箱", specFuel: "燃料",
  specSeats: "座位", specDoors: "车门", specColor: "颜色", specMileage: "里程",
  featuresTitle: "功能与配置", aboutTitle: "关于这辆车",
  deliveryTitle: "送车服务", deliverySub: "此车可送达的地点", freeDelivery: "免费送车",
  trustVerified: "认证公司", trustNoFees: "无隐藏费用", trustDirect: "直接联系", trustTopRated: "高分好评",
  promoLabel: "推广位", promoTitle: "需要更多类似车型？",
  promoSub: "按品牌、城市和车身类型浏览类似的认证车源，更快比较价格。",
  allCars: "所有车辆", brandCars: (b) => `${b} 车辆`,
  faqTitle: "此车源租赁常见问题",
  faqReserveQ: "如何预订这辆车？", faqReserveA: "使用上方的 WhatsApp 或致电按钮，直接与公司确认可租情况和租赁条款。",
  faqCompareQ: "我可以比较类似车辆吗？", faqCompareA1: "查看更多 ", faqCompareLink1: "此类别的车辆", faqCompareA2: " 或浏览以下城市的车辆 ",
  faqVerifiedQ: "这家公司经过认证吗？", faqVerifiedA: "是的，Auto to Rental 上的车源均来自拥有公开资料页的认证租车商。",
  listedByLabel: "发布者", viewProfile: "查看资料 →", moreFrom: (n) => `来自 ${n} 的更多车辆`, carsCount: (n) => `${n} 辆车`,
  reviewsTitle: "评价", viaGoogle: "来自 Google", reviewsWord: "条评价",
  reviewsNoteTitle: "📍 来自 Google 地图的评价",
  reviewsNote: "真实客户评价来自租车公司的 Google 商家资料。管理员将为每家公司关联 Google Place ID 以在此处显示已验证的评价。",
  metaTitle: (t, ccy, price) => `${t} — 每天 ${ccy} ${price} 起`,
  metaDesc: (t, ccy, price, specs, company) => `${t}${company ? ` · ${company}` : ""}。${specs}直接联系租车公司 — 每天 ${ccy} ${price} 起。无预订佣金。`,
  waMessage: (p) => `您好！👋\n\n我在 Auto to Rental 上看到这辆车，想要租用：\n\n🚗 ${p.title}\n📍 ${p.place}\n💰 ${p.price}\n\n🔗 ${p.url}\n\n请问能否告知：\n• 可租情况和取车方式\n• 押金\n• 保险和里程限制\n\n谢谢！`,
}

const TH: VehicleContent = {
  securityDeposit: "เงินมัดจำ", noDeposit: "ไม่มีเงินมัดจำ",
  bcHome: "หน้าแรก", bcCars: "รถยนต์",
  featured: "★ แนะนำ", vehicleVideo: "วิดีโอรถ", listedBy: "ลงประกาศโดย", availableNow: "ว่างให้เช่าตอนนี้",
  perDay: "/ วัน", save: (n) => `ประหยัด ${n}%`, daily: "รายวัน", weekly: "รายสัปดาห์", monthly: "รายเดือน", bestDeal: "ดีลดีที่สุด",
  contactDirectly: "ติดต่อโดยตรง", whatsapp: "WhatsApp", callNow: "โทรเลย", freeIntlCall: "โทรต่างประเทศฟรี",
  noFees1: "✓ ไม่มีค่าคอมมิชชั่น · ✓ ไม่มีค่าจอง", noFees2: "คุณติดต่อบริษัทเช่ารถโดยตรง",
  quickSpecs: "ข้อมูลจำเพาะโดยย่อ", specYear: "ปี", specBody: "ตัวถัง", specTransmission: "เกียร์", specFuel: "เชื้อเพลิง",
  specSeats: "ที่นั่ง", specDoors: "ประตู", specColor: "สี", specMileage: "ระยะทาง",
  featuresTitle: "คุณสมบัติและอุปกรณ์", aboutTitle: "เกี่ยวกับรถคันนี้",
  deliveryTitle: "บริการส่งรถ", deliverySub: "พื้นที่ที่ส่งรถคันนี้ได้", freeDelivery: "ส่งฟรี",
  trustVerified: "บริษัทที่ยืนยันแล้ว", trustNoFees: "ไม่มีค่าใช้จ่ายแอบแฝง", trustDirect: "ติดต่อโดยตรง", trustTopRated: "คะแนนสูงสุด",
  promoLabel: "พื้นที่โปรโมชัน", promoTitle: "ต้องการตัวเลือกอื่นแบบรถคันนี้ไหม?",
  promoSub: "สำรวจประกาศที่ยืนยันแล้วคล้ายกันตามยี่ห้อ เมือง และประเภทตัวถังเพื่อเปรียบเทียบราคาได้เร็วขึ้น",
  allCars: "รถทั้งหมด", brandCars: (b) => `รถ ${b}`,
  faqTitle: "คำถามที่พบบ่อยสำหรับประกาศนี้",
  faqReserveQ: "จองรถคันนี้อย่างไร?", faqReserveA: "ใช้ปุ่ม WhatsApp หรือโทรด้านบนเพื่อยืนยันความพร้อมและเงื่อนไขการเช่ากับบริษัทโดยตรง",
  faqCompareQ: "เปรียบเทียบรถที่คล้ายกันได้ไหม?", faqCompareA1: "ดูเพิ่มเติม ", faqCompareLink1: "รถในหมวดนี้", faqCompareA2: " หรือเลือกดูรถใน ",
  faqVerifiedQ: "บริษัทนี้ได้รับการยืนยันหรือไม่?", faqVerifiedA: "ใช่ ประกาศบน Auto to Rental มาจากผู้ให้เช่าที่ได้รับการยืนยันและมีหน้าโปรไฟล์สาธารณะ",
  listedByLabel: "ลงประกาศโดย", viewProfile: "ดูโปรไฟล์ →", moreFrom: (n) => `เพิ่มเติมจาก ${n}`, carsCount: (n) => `${n} คัน`,
  reviewsTitle: "รีวิว", viaGoogle: "ผ่าน Google", reviewsWord: "รีวิว",
  reviewsNoteTitle: "📍 รีวิวจาก Google Maps",
  reviewsNote: "รีวิวจริงจากลูกค้าดึงมาจากโปรไฟล์ Google Business ของบริษัทเช่ารถ ผู้ดูแลจะเชื่อม Google Place ID ของแต่ละบริษัทเพื่อแสดงรีวิวที่ยืนยันแล้วที่นี่",
  metaTitle: (t, ccy, price) => `${t} — เริ่มต้น ${ccy} ${price}/วัน`,
  metaDesc: (t, ccy, price, specs, company) => `${t}${company ? ` · ${company}` : ""} ${specs}จองโดยตรงกับบริษัทเช่ารถ — เริ่มต้น ${ccy} ${price}/วัน ไม่มีค่าคอมมิชชั่น`,
  waMessage: (p) => `สวัสดีครับ/ค่ะ! 👋\n\nผมเห็นรถคันนี้บน Auto to Rental และต้องการเช่า:\n\n🚗 ${p.title}\n📍 ${p.place}\n💰 ${p.price}\n\n🔗 ${p.url}\n\nขอทราบรายละเอียด:\n• ความพร้อมและจุดรับรถ\n• เงินมัดจำ\n• ประกันและขีดจำกัดระยะทาง\n\nขอบคุณครับ/ค่ะ!`,
}

const RU: VehicleContent = {
  securityDeposit: "Залог", noDeposit: "Без залога",
  bcHome: "Главная", bcCars: "Автомобили",
  featured: "★ Рекомендуемое", vehicleVideo: "Видео автомобиля", listedBy: "Размещено", availableNow: "Доступно сейчас",
  perDay: "/ день", save: (n) => `Скидка ${n}%`, daily: "В день", weekly: "В неделю", monthly: "В месяц", bestDeal: "ЛУЧШАЯ ЦЕНА",
  contactDirectly: "Связаться напрямую", whatsapp: "WhatsApp", callNow: "Позвонить", freeIntlCall: "Бесплатный межд. звонок",
  noFees1: "✓ Без комиссии · ✓ Без сбора за бронь", noFees2: "Вы связываетесь с компанией напрямую",
  quickSpecs: "Краткие характеристики", specYear: "Год", specBody: "Кузов", specTransmission: "Коробка передач", specFuel: "Топливо",
  specSeats: "Места", specDoors: "Двери", specColor: "Цвет", specMileage: "Пробег",
  featuresTitle: "Опции и оснащение", aboutTitle: "Об этом автомобиле",
  deliveryTitle: "Доставка", deliverySub: "Куда может быть доставлен этот автомобиль", freeDelivery: "Бесплатная доставка",
  trustVerified: "Проверенная компания", trustNoFees: "Без скрытых платежей", trustDirect: "Прямой контакт", trustTopRated: "Высокий рейтинг",
  promoLabel: "Рекламное место", promoTitle: "Нужны другие варианты, как этот автомобиль?",
  promoSub: "Изучите похожие проверенные объявления по марке, городу и типу кузова, чтобы быстрее сравнить цены.",
  allCars: "Все автомобили", brandCars: (b) => `Автомобили ${b}`,
  faqTitle: "Частые вопросы по этому объявлению",
  faqReserveQ: "Как забронировать этот автомобиль?", faqReserveA: "Используйте кнопку WhatsApp или «Позвонить» выше, чтобы уточнить наличие и условия аренды напрямую у компании.",
  faqCompareQ: "Могу ли я сравнить похожие автомобили?", faqCompareA1: "Смотрите больше ", faqCompareLink1: "автомобилей этой категории", faqCompareA2: " или выберите автомобили в ",
  faqVerifiedQ: "Эта компания проверена?", faqVerifiedA: "Да, объявления на Auto to Rental размещают проверенные арендные компании с публичными страницами профиля.",
  listedByLabel: "Размещено", viewProfile: "Открыть профиль →", moreFrom: (n) => `Ещё от ${n}`, carsCount: (n) => `${n} авто`,
  reviewsTitle: "Отзывы", viaGoogle: "через Google", reviewsWord: "отзывов",
  reviewsNoteTitle: "📍 Отзывы из Google Карт",
  reviewsNote: "Реальные отзывы клиентов берутся из профиля Google Business компании по аренде. Администратор привяжет Google Place ID каждой компании для отображения проверенных отзывов здесь.",
  metaTitle: (t, ccy, price) => `${t} — от ${ccy} ${price}/день`,
  metaDesc: (t, ccy, price, specs, company) => `${t}${company ? ` · ${company}` : ""}. ${specs}Бронируйте напрямую у компании — от ${ccy} ${price}/день. Без комиссии.`,
  waMessage: (p) => `Здравствуйте! 👋\n\nЯ увидел этот автомобиль на Auto to Rental и хочу его арендовать:\n\n🚗 ${p.title}\n📍 ${p.place}\n💰 ${p.price}\n\n🔗 ${p.url}\n\nПодскажите, пожалуйста:\n• Наличие и варианты получения\n• Залог\n• Страховка и лимиты пробега\n\nСпасибо!`,
}

const UR: VehicleContent = {
  securityDeposit: "سیکیورٹی ڈپازٹ", noDeposit: "کوئی ڈپازٹ نہیں",
  bcHome: "ہوم", bcCars: "گاڑیاں",
  featured: "★ نمایاں", vehicleVideo: "گاڑی کی ویڈیو", listedBy: "درج کردہ از", availableNow: "ابھی دستیاب",
  perDay: "/ دن", save: (n) => `${n}% بچائیں`, daily: "روزانہ", weekly: "ہفتہ وار", monthly: "ماہانہ", bestDeal: "بہترین ڈیل",
  contactDirectly: "براہ راست رابطہ", whatsapp: "واٹس ایپ", callNow: "ابھی کال کریں", freeIntlCall: "مفت بین الاقوامی کال",
  noFees1: "✓ کوئی کمیشن نہیں · ✓ کوئی بکنگ فیس نہیں", noFees2: "آپ کرایہ کمپنی سے براہ راست رابطہ کرتے ہیں",
  quickSpecs: "فوری تفصیلات", specYear: "سال", specBody: "باڈی", specTransmission: "ٹرانسمیشن", specFuel: "ایندھن",
  specSeats: "نشستیں", specDoors: "دروازے", specColor: "رنگ", specMileage: "مائلیج",
  featuresTitle: "خصوصیات اور آلات", aboutTitle: "اس گاڑی کے بارے میں",
  deliveryTitle: "ڈیلیوری", deliverySub: "یہ گاڑی کہاں پہنچائی جا سکتی ہے", freeDelivery: "مفت ڈیلیوری",
  trustVerified: "تصدیق شدہ کمپنی", trustNoFees: "کوئی پوشیدہ فیس نہیں", trustDirect: "براہ راست رابطہ", trustTopRated: "اعلیٰ درجہ بندی",
  promoLabel: "تشہیری جگہ", promoTitle: "اس گاڑی جیسی مزید آپشنز چاہیے؟",
  promoSub: "قیمتوں کا تیزی سے موازنہ کرنے کے لیے برانڈ، شہر اور باڈی ٹائپ کے لحاظ سے ملتی جلتی تصدیق شدہ فہرستیں دیکھیں۔",
  allCars: "تمام گاڑیاں", brandCars: (b) => `${b} گاڑیاں`,
  faqTitle: "اس فہرست کے لیے کرایہ کے اکثر سوالات",
  faqReserveQ: "میں یہ گاڑی کیسے بُک کروں؟", faqReserveA: "دستیابی اور کرایہ کی شرائط کمپنی سے براہ راست طے کرنے کے لیے اوپر واٹس ایپ یا کال کا بٹن استعمال کریں۔",
  faqCompareQ: "کیا میں ملتی جلتی گاڑیوں کا موازنہ کر سکتا ہوں؟", faqCompareA1: "مزید دیکھیں ", faqCompareLink1: "اس زمرے کی گاڑیاں", faqCompareA2: " یا اس شہر میں گاڑیاں دیکھیں ",
  faqVerifiedQ: "کیا یہ کمپنی تصدیق شدہ ہے؟", faqVerifiedA: "جی ہاں، Auto to Rental پر فہرستیں عوامی پروفائل صفحات والے تصدیق شدہ کرایہ فراہم کنندگان سے آتی ہیں۔",
  listedByLabel: "درج کردہ از", viewProfile: "پروفائل دیکھیں ←", moreFrom: (n) => `${n} کی مزید`, carsCount: (n) => `${n} گاڑیاں`,
  reviewsTitle: "جائزے", viaGoogle: "گوگل کے ذریعے", reviewsWord: "جائزے",
  reviewsNoteTitle: "📍 گوگل میپس سے جائزے",
  reviewsNote: "اصل گاہک جائزے کرایہ کمپنی کے گوگل بزنس پروفائل سے لیے جاتے ہیں۔ منتظم ہر کمپنی کے لیے Google Place ID جوڑے گا تاکہ یہاں تصدیق شدہ جائزے دکھائے جا سکیں۔",
  metaTitle: (t, ccy, price) => `${t} — ${ccy} ${price}/دن سے`,
  metaDesc: (t, ccy, price, specs, company) => `${t}${company ? ` · ${company}` : ""}۔ ${specs}کرایہ کمپنی سے براہ راست رابطہ — ${ccy} ${price}/دن سے۔ کوئی کمیشن نہیں۔`,
  waMessage: (p) => `السلام علیکم! 👋\n\nمیں نے یہ گاڑی Auto to Rental پر دیکھی اور کرایہ پر لینا چاہتا ہوں:\n\n🚗 ${p.title}\n📍 ${p.place}\n💰 ${p.price}\n\n🔗 ${p.url}\n\nبراہ کرم بتائیں:\n• دستیابی اور پک اپ کے اختیارات\n• سیکیورٹی ڈپازٹ\n• انشورنس اور مائلیج کی حد\n\nشکریہ!`,
}

const VEHICLE: Record<Locale, VehicleContent> = { en: EN, ar: AR, es: ES, zh: ZH, th: TH, ru: RU, ur: UR }

export function vehicleContent(locale: Locale): VehicleContent {
  return VEHICLE[locale] || VEHICLE[DEFAULT_LOCALE]
}
