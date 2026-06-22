// Labels + DB-enum value translations for the vehicle card (client component).
// Passed `locale` as a prop from server parents so the SSR HTML is already
// localized (good for SEO, no hydration flash).
import { Locale, DEFAULT_LOCALE } from "./locales"

export type CardLabels = {
  featured: string
  off: (n: number) => string
  by: string
  perDay: string
  perWeek: string
  perMonth: string
  viewDeal: string
  availableNow: string
  replyWithin: string
}

const LABELS: Record<Locale, CardLabels> = {
  en: { featured: "★ Featured", off: (n) => `-${n}% OFF`, by: "by", perDay: "per day", perWeek: "per week", perMonth: "per month", viewDeal: "View Deal →", availableNow: "Available Now", replyWithin: "Reply within 24h" },
  ar: { featured: "★ مميّزة", off: (n) => `خصم ${n}٪`, by: "من", perDay: "لليوم", perWeek: "للأسبوع", perMonth: "للشهر", viewDeal: "عرض التفاصيل ←", availableNow: "متوفّرة الآن", replyWithin: "يرد خلال 24 ساعة" },
  es: { featured: "★ Destacado", off: (n) => `-${n}% DTO`, by: "por", perDay: "por día", perWeek: "por semana", perMonth: "por mes", viewDeal: "Ver oferta →", availableNow: "Disponible ahora", replyWithin: "Responde en 24 h" },
  zh: { featured: "★ 精选", off: (n) => `立减 ${n}%`, by: "来自", perDay: "每天", perWeek: "每周", perMonth: "每月", viewDeal: "查看详情 →", availableNow: "现可预订", replyWithin: "24小时内回复" },
  th: { featured: "★ แนะนำ", off: (n) => `ลด ${n}%`, by: "โดย", perDay: "ต่อวัน", perWeek: "ต่อสัปดาห์", perMonth: "ต่อเดือน", viewDeal: "ดูข้อเสนอ →", availableNow: "ว่างให้เช่าตอนนี้", replyWithin: "ตอบกลับใน 24 ชม." },
  ru: { featured: "★ Рекомендуем", off: (n) => `-${n}%`, by: "от", perDay: "в день", perWeek: "в неделю", perMonth: "в месяц", viewDeal: "Подробнее →", availableNow: "Доступно сейчас", replyWithin: "Ответ в течение 24 ч" },
  ur: { featured: "★ نمایاں", off: (n) => `${n}٪ رعایت`, by: "بذریعہ", perDay: "فی دن", perWeek: "فی ہفتہ", perMonth: "فی ماہ", viewDeal: "تفصیل دیکھیں ←", availableNow: "ابھی دستیاب", replyWithin: "24 گھنٹے میں جواب" },
}

export function cardLabels(locale: Locale): CardLabels {
  return LABELS[locale] || LABELS[DEFAULT_LOCALE]
}

// Translate common fuel-type / transmission DB enum values. Unknown values
// fall back to the original (capitalized) string.
const FUEL: Record<string, Partial<Record<Locale, string>>> = {
  petrol: { ar: "بنزين", es: "Gasolina", zh: "汽油", th: "เบนซิน", ru: "Бензин", ur: "پٹرول" },
  gasoline: { ar: "بنزين", es: "Gasolina", zh: "汽油", th: "เบนซิน", ru: "Бензин", ur: "پٹرول" },
  diesel: { ar: "ديزل", es: "Diésel", zh: "柴油", th: "ดีเซล", ru: "Дизель", ur: "ڈیزل" },
  electric: { ar: "كهربائي", es: "Eléctrico", zh: "电动", th: "ไฟฟ้า", ru: "Электро", ur: "الیکٹرک" },
  hybrid: { ar: "هايبرد", es: "Híbrido", zh: "混合动力", th: "ไฮบริด", ru: "Гибрид", ur: "ہائبرڈ" },
  "plug-in hybrid": { ar: "هايبرد قابل للشحن", es: "Híbrido enchufable", zh: "插电混动", th: "ปลั๊กอินไฮบริด", ru: "Плагин-гибрид", ur: "پلگ ان ہائبرڈ" },
}

const TRANSMISSION: Record<string, Partial<Record<Locale, string>>> = {
  automatic: { ar: "أوتوماتيك", es: "Automático", zh: "自动挡", th: "เกียร์อัตโนมัติ", ru: "Автомат", ur: "آٹومیٹک" },
  manual: { ar: "يدوي", es: "Manual", zh: "手动挡", th: "เกียร์ธรรมดา", ru: "Механика", ur: "مینوئل" },
  cvt: { ar: "علبة تروس CVT", es: "CVT", zh: "无级变速", th: "เกียร์ CVT", ru: "Вариатор", ur: "سی وی ٹی" },
}

function lookup(map: Record<string, Partial<Record<Locale, string>>>, raw: string, locale: Locale): string {
  const clean = (raw || "").trim()
  if (locale === DEFAULT_LOCALE || !clean) return clean
  const hit = map[clean.toLowerCase()]
  return (hit && hit[locale]) || clean
}

export function fuelLabel(raw: string, locale: Locale): string {
  return lookup(FUEL, raw, locale)
}
export function transmissionLabel(raw: string, locale: Locale): string {
  return lookup(TRANSMISSION, raw, locale)
}
