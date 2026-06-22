"use client"
import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Menu, X, Phone, Heart, User } from "lucide-react"
import CountrySwitcher from "./country-switcher"
import { LangSwitcher, CcySwitcher } from "./prefs-switcher"
import SearchModal from "./search-modal"
import ThemeToggle from "./theme-toggle"
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from "../lib/site-contact"
import { localizedPath, type Locale } from "../lib/locales"
import { t } from "../lib/i18n"

export default function Nav({ locale = "en" }: { locale?: Locale }) {
  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on(); window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  const lp = (p: string) => localizedPath(p, locale)
  const LINKS = [
    { href: lp("/cars"), label: t(locale, "nav_browse_cars") },
    { href: lp("/brands"), label: t(locale, "nav_brands") },
    { href: lp("/monthly-car-rental-dubai"), label: t(locale, "nav_monthly") },
    { href: lp("/companies"), label: t(locale, "nav_companies") },
    { href: lp("/features"), label: t(locale, "nav_features") },
    { href: lp("/blog"), label: t(locale, "nav_blog") },
    { href: lp("/list-your-car"), label: t(locale, "nav_list_car") },
  ]
  return (
    <>
      <div className="bg-ink-900 dark:bg-ink-950 text-white border-b border-ink-800 text-[12px] py-2">
        <div className="mx-auto max-w-7xl px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-5">
            <CountrySwitcher compact/>
            <LangSwitcher/>
            <CcySwitcher/>
          </div>
          <div className="flex items-center gap-4">
            <a href={SUPPORT_PHONE_TEL} className="hidden sm:flex items-center gap-1.5 hover:text-brand-300"><Phone size={12}/> {SUPPORT_PHONE_DISPLAY}</a>
            <a href={lp("/list-your-car")} className="hidden md:inline hover:text-brand-300">{t(locale, "nav_list_free")}</a>
          </div>
        </div>
      </div>

      <header className={`sticky top-0 z-30 bg-white dark:bg-ink-900 dark:border-b dark:border-ink-800 transition-shadow ${scrolled ? "shadow-md" : "border-b border-ink-100 dark:border-ink-800"}`}>
        <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-6">
          <Link href={lp("/")} className="flex items-center gap-3">
            <img src="/logo.png" alt="Auto to Rental" className="h-10 md:h-12 w-auto dark:hidden" fetchPriority="high" />
            <img src="/logo-dark.png" alt="Auto to Rental" className="h-10 md:h-12 w-auto hidden dark:block" fetchPriority="high" />
          </Link>

          <nav className="hidden lg:flex items-center gap-7">
            {LINKS.map(l => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-ink-700 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-300">{l.label}</Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(true)} aria-label={t(locale, "nav_search")} className="hidden md:inline-flex w-10 h-10 items-center justify-center rounded-lg text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:bg-ink-900/50 dark:hover:bg-ink-800 hover:text-brand-600"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg></button>
            <ThemeToggle/>
            <Link href={lp("/favorites")} aria-label={t(locale, "nav_favorites")} className="hidden md:inline-flex w-10 h-10 items-center justify-center rounded-lg text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:bg-ink-900/50 dark:hover:bg-ink-800 hover:text-brand-600"><Heart size={18}/></Link>
            <Link href={lp("/account")} aria-label={t(locale, "nav_account")} className="hidden md:inline-flex w-10 h-10 items-center justify-center rounded-lg text-ink-600 dark:text-ink-300 hover:bg-ink-50 dark:bg-ink-900/50 dark:hover:bg-ink-800 hover:text-brand-600"><User size={18}/></Link>
            <button onClick={() => setOpen(o => !o)} className="lg:hidden p-2 text-ink-700 dark:text-ink-300" aria-label={t(locale, "nav_menu")}>
              {open ? <X size={22}/> : <Menu size={22}/>}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden border-t border-ink-100 dark:border-ink-800 bg-white dark:bg-ink-900">
            <div className="px-4 py-4 flex flex-col gap-1">
              {LINKS.map(l => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 px-3 rounded-lg text-ink-800 dark:text-ink-200 hover:bg-ink-50 dark:bg-ink-900/50">{l.label}</Link>
              ))}
              <Link href={lp("/list-your-car")} onClick={() => setOpen(false)} className="mt-2 btn-primary justify-center">{t(locale, "nav_list_car")}</Link>
            </div>
          </div>
        )}
      </header>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)}/>
    </>
  )
}
