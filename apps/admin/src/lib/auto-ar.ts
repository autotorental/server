// Global admin localisation: when the UI language is NOT English, swap known
// English UI strings -> target language across EVERY page, and set RTL/LTR.
// Arabic ships hand-translated (instant). Any other language (French, Spanish…)
// is auto-translated via the backend (Google) — UI strings only, never live data.
import { getLang } from "./lang"
import { API } from "./api"

// English UI string -> Arabic. Keys = the master UI-string list (also used to
// build other languages via machine translation).
const AR: Record<string, string> = {
  "Save": "حفظ", "Cancel": "إلغاء", "Delete": "حذف", "Edit": "تعديل", "Add": "إضافة", "Remove": "إزالة",
  "Search": "بحث", "Close": "إغلاق", "Back": "رجوع", "Next": "التالي", "Previous": "السابق",
  "Loading": "جارٍ التحميل", "Loading…": "جارٍ التحميل…", "Loading...": "جارٍ التحميل...",
  "Submit": "إرسال", "Confirm": "تأكيد", "Yes": "نعم", "No": "لا", "Done": "تم", "Update": "تحديث",
  "Create": "إنشاء", "View": "عرض", "Refresh": "تحديث", "Export": "تصدير", "Import": "استيراد",
  "Filter": "تصفية", "Filters": "التصفية", "Clear": "مسح", "Apply": "تطبيق", "Select": "اختر", "Selected": "محدد",
  "All": "الكل", "None": "لا شيء", "Active": "نشط", "Inactive": "غير نشط", "Enabled": "مفعّل", "Disabled": "معطّل",
  "Status": "الحالة", "Name": "الاسم", "Email": "البريد الإلكتروني", "Phone": "الهاتف", "Price": "السعر",
  "Date": "التاريخ", "Actions": "إجراءات", "Action": "إجراء", "Type": "النوع", "Category": "الفئة", "Categories": "الفئات",
  "Description": "الوصف", "Title": "العنوان", "Link": "الرابط", "Image": "الصورة", "Photo": "الصورة", "Photos": "الصور",
  "Upload": "رفع", "Download": "تنزيل", "Settings": "الإعدادات", "Profile": "الملف الشخصي", "Language": "اللغة",
  "Country": "الدولة", "Countries": "الدول", "City": "المدينة", "Cities": "المدن", "Currency": "العملة",
  "Live": "مباشر", "Off": "معطّل", "On": "مفعّل", "Saved": "تم الحفظ", "Saved ✓": "تم الحفظ ✓",
  "Optional": "اختياري", "Required": "مطلوب", "Total": "الإجمالي", "Today": "اليوم", "Yesterday": "أمس",
  "Enable": "تفعيل", "Disable": "تعطيل", "Manage": "إدارة", "Manage Categories": "إدارة الفئات",
  "Hidden": "مخفي", "Show": "إظهار", "Hide": "إخفاء", "Copy": "نسخ", "Copied": "تم النسخ", "Open": "فتح", "Send": "إرسال",
  "Reply": "رد", "Compose": "إنشاء رسالة", "Mark as read": "تعليم كمقروء", "Unread": "غير مقروء", "Read": "مقروء",
  "Created": "أُنشئ", "Updated": "حُدّث", "Order": "الترتيب", "Default": "افتراضي", "General": "عام", "Details": "التفاصيل",
  "Rating": "التقييم", "Notes": "ملاحظات", "Slug": "المعرّف", "Address": "العنوان", "Amount": "المبلغ",
  // entities
  "Company": "الشركة", "Companies": "الشركات", "Vehicle": "المركبة", "Vehicles": "المركبات",
  "Brand": "الماركة", "Brands": "الماركات", "Model": "الموديل", "Models": "الموديلات", "Year": "السنة",
  "Color": "اللون", "Seats": "المقاعد", "Doors": "الأبواب", "Fuel": "الوقود", "Transmission": "ناقل الحركة",
  "Mileage": "المسافة المقطوعة", "Followers": "المتابعون", "Reviews": "التقييمات", "Review": "تقييم",
  "Subscription": "الاشتراك", "Subscriptions": "الاشتراكات", "License": "الرخصة", "Joined": "تاريخ الانضمام",
  "Customer": "العميل", "Customers": "العملاء", "Seller": "البائع", "Sellers": "البائعون",
  "Feature": "ميزة", "Features": "المزايا", "Location": "الموقع", "Locations": "المواقع",
  "Brand · City": "الماركة · المدينة",
  // statuses
  "Pending": "قيد الانتظار", "Pending Approval": "بانتظار الموافقة", "⏳ Pending Approval": "⏳ بانتظار الموافقة",
  "Approved": "معتمد", "Rejected": "مرفوض", "Draft": "مسودّة", "Paused": "موقوف", "Rented": "مؤجّر",
  "Unavailable": "غير متاح", "✅ Active": "✅ نشط", "❌ Rejected": "❌ مرفوض", "📝 Draft": "📝 مسودّة",
  "Verified": "موثّق", "Not verified": "غير موثّق", "Expired": "منتهية", "Trial": "تجريبي", "Expiring soon": "تنتهي قريباً",
  // actions / buttons
  "Approve": "اعتماد", "Reject": "رفض", "Take down": "إيقاف", "Re-approve": "إعادة اعتماد",
  "View details": "عرض التفاصيل", "Edit company": "تعديل الشركة", "Reset password": "إعادة تعيين كلمة المرور",
  "Delete company": "حذف الشركة", "Add Vehicle": "إضافة مركبة", "Add Vehicle Type": "إضافة نوع مركبة",
  "Add Brand": "إضافة ماركة", "Add City": "إضافة مدينة", "Add Country": "إضافة دولة", "Add Model": "إضافة موديل",
  "Add Feature": "إضافة ميزة", "Add a review": "إضافة تقييم", "Add review": "إضافة تقييم", "Reviewer name": "اسم المُقيّم",
  "Review text (optional)": "نص التقييم (اختياري)", "Save changes": "حفظ التغييرات",
  // empty / phrases
  "No results": "لا نتائج", "No data": "لا توجد بيانات", "No vehicles": "لا توجد مركبات", "No reviews yet": "لا توجد تقييمات بعد",
  "No companies match your search": "لا توجد شركات تطابق بحثك", "No brands yet": "لا توجد ماركات بعد",
  "No categories yet": "لا توجد فئات بعد", "No cities yet.": "لا توجد مدن بعد.",
  "Add the first review using the form above.": "أضف أول تقييم باستخدام النموذج أعلاه.",
  "Public reviews are disabled to block spam. The reviews shown on the website are curated here by your team.":
    "التقييمات العامة معطّلة لمنع البريد المزعج. التقييمات الظاهرة على الموقع يتم تنسيقها هنا من قِبل فريقك.",
  "Showing": "عرض", "of": "من",
  // headers / nav
  "Overview": "نظرة عامة", "Rental Companies": "شركات التأجير", "Marketing": "التسويق", "Reports": "التقارير",
  "Pending Approvals": "بانتظار الموافقة", "Listing Moderation": "مراجعة الإعلانات", "Profit Calculator": "حاسبة الأرباح",
  "News Ticker": "شريط الأخبار", "Live Traffic": "الزيارات المباشرة", "Vehicle Types": "أنواع المركبات",
  "Customer Locations": "مواقع العملاء", "Users & Roles": "المستخدمون والأدوار", "Sales Toolkit": "أدوات المبيعات",
  "SEO Manager": "إدارة SEO", "Google Ads": "إعلانات Google", "Search Console": "كونسول البحث",
  "Traffic Reports": "تقارير الزيارات", "Recordings": "التسجيلات", "Pages": "الصفحات", "Blog": "المدوّنة",
  "Inbox": "البريد الوارد", "Live Chat": "الدردشة المباشرة", "Support Center": "مركز الدعم", "Call Logs": "سجلّات المكالمات",
  "Vendor Email": "بريد التجّار",
}

const RTL = new Set(["ar", "ur", "fa", "he", "ps", "sd", "ckb"])
let DICT: Record<string, string> = {}

function applyDir(lang: string) {
  try {
    document.documentElement.dir = RTL.has(lang.slice(0, 2)) ? "rtl" : "ltr"
    document.documentElement.lang = lang
  } catch { /* ignore */ }
}
function tNode(t: Text) {
  const raw = t.nodeValue || ""
  const k = raw.trim()
  if (!k || k.length > 120) return
  const v = DICT[k]
  if (v && v !== k) t.nodeValue = raw.replace(k, v)
}
function tEl(el: Element) {
  for (const a of ["placeholder", "title", "aria-label"]) {
    const v = el.getAttribute?.(a)
    if (v && DICT[v.trim()]) el.setAttribute(a, DICT[v.trim()])
  }
}
function walk(root: Node) {
  try {
    if (root.nodeType === 3) { tNode(root as Text); return }
    if (root.nodeType !== 1) return
    if ((root as Element).querySelectorAll) (root as Element).querySelectorAll("[placeholder],[title],[aria-label]").forEach(tEl)
    tEl(root as Element)
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let n: Node | null; const nodes: Text[] = []
    while ((n = w.nextNode())) nodes.push(n as Text)
    nodes.forEach(tNode)
  } catch { /* ignore */ }
}

async function buildDict(lang: string) {
  if (lang.startsWith("ar")) { DICT = AR; return }
  const keys = Object.keys(AR)
  const ck = "uitr_" + lang.slice(0, 5)
  try {
    const cached = JSON.parse(localStorage.getItem(ck) || "null")
    if (cached && Object.keys(cached).length >= keys.length * 0.7) { DICT = cached; return }
  } catch { /* ignore */ }
  try {
    const r = await fetch(`${API}/admin/ui-translate`, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: keys, to: lang.slice(0, 5) }),
    })
    const d = await r.json()
    DICT = (d && d.map) || {}
    try { localStorage.setItem(ck, JSON.stringify(DICT)) } catch { /* ignore */ }
  } catch { DICT = {} }
}

export function initAutoArabic() {
  const lang = getLang() || "en"
  if (typeof document === "undefined") return
  applyDir(lang)                                  // fix RTL/LTR for every language
  if (lang.startsWith("en")) return               // English = native, nothing to swap
  const start = async () => {
    await buildDict(lang)
    walk(document.body)
    const rtl = RTL.has(lang.slice(0, 2))
    const obs = new MutationObserver((muts) => {
      if (rtl && document.documentElement.dir !== "rtl") document.documentElement.dir = "rtl"
      for (const m of muts) {
        if (m.type === "characterData") tNode(m.target as Text)
        else m.addedNodes.forEach(walk)
      }
    })
    obs.observe(document.body, { childList: true, subtree: true, characterData: true })
  }
  if (document.body) start(); else window.addEventListener("DOMContentLoaded", start)
}
