import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Car Rental Blog — Tips, Guides, Reviews | Auto to Rental",
  description:
    "Expert guides on car rental in Dubai and UAE. Cheapest car rental tips, luxury car reviews, tourist guides, and money-saving strategies.",
  metadataBase: new URL("https://autotorental.com"),
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://autotorental.com/blog",
  },
  openGraph: {
    title: "Car Rental Blog — Tips, Guides, Reviews | Auto to Rental",
    description:
      "Expert guides on car rental in Dubai and UAE. Cheapest car rental tips, luxury car reviews, tourist guides, and money-saving strategies.",
    url: "https://autotorental.com/blog",
    siteName: "Auto to Rental",
    type: "website",
    locale: "en_AE",
    images: ["https://autotorental.com/og-default.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://autotorental.com/og-default.jpg"],
    title: "Car Rental Blog — Tips, Guides, Reviews | Auto to Rental",
    description:
      "Expert guides on car rental in Dubai and UAE. Cheapest car rental tips, luxury car reviews, tourist guides, and money-saving strategies.",
  },
  icons: {
    icon: [
      { url: "https://autotorental.com/favicon.ico" },
      { url: "https://autotorental.com/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    shortcut: "https://autotorental.com/favicon.ico",
    apple: "https://autotorental.com/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="__variable_472ac2">
      <body className="font-sans bg-white text-ink-900 antialiased transition-colors">
        <link rel="preconnect" href="https://api.autotorental.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://api.autotorental.com" />
        <div className="bg-ink-900 text-white border-b border-ink-800 text-[12px] py-2">
          <div className="mx-auto max-w-7xl px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium">🇦🇪 AE <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> English <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium">$ AED <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>
            </div>
            <div className="flex items-center gap-4">
              <a href="tel:+971508989060" className="hidden sm:flex items-center gap-1.5 hover:text-brand-300"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> +971 50 898 9060</a>
              <a href="https://autotorental.com/list-your-car" className="hidden md:inline hover:text-brand-300">List your car free</a>
            </div>
          </div>
        </div>
        <header className="sticky top-0 z-30 bg-white dark:bg-ink-900 border-b border-ink-100 dark:border-ink-800 transition-shadow">
          <div className="mx-auto max-w-7xl px-4 h-16 flex items-center justify-between gap-6">
            <a className="flex items-center gap-3" href="https://autotorental.com">
              <img src="/logo.png" alt="Auto to Rental" className="h-12 md:h-14 w-auto" />
            </a>
            <nav className="hidden lg:flex items-center gap-7">
              <a className="text-sm font-medium text-ink-700 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-300" href="https://autotorental.com/cars">Browse Cars</a>
              <a className="text-sm font-medium text-ink-700 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-300" href="https://autotorental.com/brands">Brands</a>
              <a className="text-sm font-medium text-ink-700 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-300" href="https://autotorental.com/cars?period=monthly">Monthly</a>
              <a className="text-sm font-medium text-ink-700 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-300" href="https://autotorental.com/companies">Rental Companies</a>
              <a className="text-sm font-medium text-brand-600" href="/blog">Blog</a>
              <a className="text-sm font-medium text-ink-700 dark:text-ink-200 hover:text-brand-600 dark:hover:text-brand-300" href="https://autotorental.com/list-your-car">List Your Car</a>
            </nav>
            <div className="flex items-center gap-1">
              <a aria-label="Search" href="https://autotorental.com/cars" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></a>
              <button id="atr-theme" aria-label="Theme" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg></button>
              <a aria-label="Favorites" href="https://autotorental.com/favorites" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg></a>
              <a aria-label="Account" href="https://autotorental.com/account" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-700 dark:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></a>
            </div>
          </div>
        </header>
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{if(localStorage.getItem(\"theme\")===\"dark\")document.documentElement.classList.add(\"dark\");var b=document.getElementById(\"atr-theme\");if(b)b.addEventListener(\"click\",function(){var on=document.documentElement.classList.toggle(\"dark\");try{localStorage.setItem(\"theme\",on?\"dark\":\"light\")}catch(e){}})}catch(e){}})()" }} />
        <main className="min-h-screen">{children}</main>
        <footer className="bg-ink-950 text-ink-200 mt-20">
          <div className="mx-auto max-w-7xl px-4 py-14">
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <img src="/logo.png" alt="Auto to Rental" className="h-12 md:h-14 w-auto bg-white p-2 rounded-lg"/>
                <p className="mt-5 text-sm text-ink-300 max-w-md leading-relaxed">
                  The largest car rental marketplace for UAE and Syria. Browse 1000+ vehicles, contact the rental company directly. No commission, no booking fees, no middleman.
                </p>
              </div>
              <div>
                <div className="text-white font-semibold mb-4 text-sm">Explore</div>
                <ul className="space-y-2.5 text-sm">
                  <li><a className="hover:text-white" href="https://autotorental.com/cars">All Cars</a></li>
                  <li><a className="hover:text-white" href="https://autotorental.com/cars?period=daily">Daily Rental</a></li>
                  <li><a className="hover:text-white" href="https://autotorental.com/cars?period=monthly">Monthly Rental</a></li>
                  <li><a className="hover:text-white" href="https://autotorental.com/brands">Browse by Brand</a></li>
                  <li><a className="hover:text-white" href="https://autotorental.com/companies">Rental Companies</a></li>
                </ul>
              </div>
              <div>
                <div className="text-white font-semibold mb-4 text-sm">Company</div>
                <ul className="space-y-2.5 text-sm">
                  <li><a className="hover:text-white" href="https://autotorental.com/about">About Us</a></li>
                  <li><a className="hover:text-white" href="/blog">Blog</a></li>
                  <li><a className="hover:text-white" href="https://autotorental.com/list-your-car">List Your Car</a></li>
                  <li><a href="https://partner.autotorental.com/rental/login" className="hover:text-white">Vendor Login</a></li>
                  <li><a className="hover:text-white" href="https://autotorental.com/contact">Contact</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-ink-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-xs">
              <div className="text-ink-300">© {new Date().getFullYear()} Auto to Rental. All rights reserved.</div>
              <div className="flex gap-5 text-ink-300">
                <a className="hover:text-white" href="https://autotorental.com/privacy">Privacy</a>
                <a className="hover:text-white" href="https://autotorental.com/terms">Terms</a>
                <a className="hover:text-white" href="https://autotorental.com/cookies">Cookies</a>
                <a className="hover:text-white" href="https://autotorental.com/sitemap.xml">Sitemap</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
