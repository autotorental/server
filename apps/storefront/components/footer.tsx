import Link from "next/link"
import Image from "next/image"
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react"
import { localizedPath, type Locale } from "../lib/locales"
import { t } from "../lib/i18n"

export default function Footer({ locale = "en" }: { locale?: Locale }) {
  const lp = (p: string) => localizedPath(p, locale)
  return (
    <footer className="bg-ink-950 text-ink-300 mt-20">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href={lp("/")} className="inline-block">
              <img src="/logo-dark.png" alt="Auto to Rental" className="h-10 md:h-11 w-auto" />
            </Link>
            <p className="mt-5 text-sm text-ink-400 max-w-md leading-relaxed">
              {t(locale, "footer_tagline")}
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { I: Facebook, label: "Facebook", href: "https://facebook.com/autotorental" },
                { I: Instagram, label: "Instagram", href: "https://instagram.com/autotorental" },
                { I: Twitter, label: "X (Twitter)", href: "https://x.com/autotorental" },
                { I: Youtube, label: "YouTube", href: "https://youtube.com/@autotorental" },
              ].map(({ I, label, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-ink-800/80 text-ink-300 hover:bg-brand-600 hover:text-white transition-colors">
                  <I size={16}/>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-[11px] uppercase tracking-wider">{t(locale, "footer_explore")}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={lp("/cars")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_all_cars")}</Link></li>
              <li><Link href={lp("/daily-car-rental-dubai")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_daily")}</Link></li>
              <li><Link href={lp("/weekly-car-rental-dubai")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_weekly")}</Link></li>
              <li><Link href={lp("/monthly-car-rental-dubai")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_monthly")}</Link></li>
              <li><Link href={lp("/brands")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_browse_brand")}</Link></li>
              <li><Link href={lp("/companies")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "nav_companies")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-[11px] uppercase tracking-wider">{t(locale, "footer_cities")}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={lp("/cars?city=dubai")} className="text-ink-400 hover:text-white transition-colors">Dubai</Link></li>
              <li><Link href={lp("/cars?city=abu-dhabi")} className="text-ink-400 hover:text-white transition-colors">Abu Dhabi</Link></li>
              <li><Link href={lp("/cars?city=sharjah")} className="text-ink-400 hover:text-white transition-colors">Sharjah</Link></li>
              <li><Link href={lp("/cars?city=damascus")} className="text-ink-400 hover:text-white transition-colors">Damascus</Link></li>
              <li><Link href={lp("/cars?city=aleppo")} className="text-ink-400 hover:text-white transition-colors">Aleppo</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-[11px] uppercase tracking-wider">{t(locale, "footer_company")}</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href={lp("/about")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_about")}</Link></li>
              <li><Link href={lp("/features")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "nav_features")}</Link></li>
              <li><Link href={lp("/blog")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "nav_blog")}</Link></li>
              <li><Link href={lp("/list-your-car")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_list_car")}</Link></li>
              <li><a href="https://partner.autotorental.com/rental/login" className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_vendor_login")}</a></li>
              <li><Link href={lp("/contact")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_contact")}</Link></li>
              <li><Link href={lp("/help")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_help")}</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-ink-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
          <div className="text-ink-500">© {new Date().getFullYear()} Auto to Rental. {t(locale, "footer_rights")}</div>
          <div className="flex gap-5 text-ink-400">
            <Link href={lp("/privacy")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_privacy")}</Link>
            <Link href={lp("/terms")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_terms")}</Link>
            <Link href={lp("/cookies")} className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_cookies")}</Link>
            <Link href="/sitemap.xml" className="text-ink-400 hover:text-white transition-colors">{t(locale, "footer_sitemap")}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
