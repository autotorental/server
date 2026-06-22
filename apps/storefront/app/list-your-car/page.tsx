import Link from "next/link"
import { Check, TrendingUp, Users, Shield, BadgeCheck, Zap, MessageCircle } from "lucide-react"
import { seoFor } from "@/lib/seo-helper"

export async function generateMetadata() {
  return seoFor("/list-your-car", {
    title: "List Your Car for Rent — Grow Your Fleet Bookings",
    description: "List your rental cars on Auto to Rental and get direct customer enquiries across UAE and Syria with zero commission.",
  })
}

export default function ListYourCarPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-700 via-brand-800 to-ink-900 text-white py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=2400" alt="" className="w-full h-full object-cover"/>
        </div>
        <div className="mx-auto max-w-7xl px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-amber-300 text-ink-950 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">Free to Join · No Commission</div>
              <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight">List your cars.<br/><span className="text-brand-300">Get more bookings.</span></h1>
              <p className="mt-5 text-lg text-ink-200 max-w-lg leading-relaxed">Join 500+ rental companies across UAE and Syria. Customers contact you directly via WhatsApp, phone or live video. You keep 100% of every booking.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/list-your-car/signup" className="bg-white dark:bg-ink-900 text-brand-700 hover:bg-amber-300 hover:text-ink-900 dark:text-ink-100 font-bold px-7 py-4 rounded-xl transition">Create Free Account →</a>
                <a href="#how" className="border border-white/30 hover:border-white text-white font-semibold px-7 py-4 rounded-xl">See how it works</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-5 text-sm text-ink-200">
                <span className="inline-flex items-center gap-2"><Check size={16} className="text-green-400"/>No setup fees</span>
                <span className="inline-flex items-center gap-2"><Check size={16} className="text-green-400"/>Approved in 24h</span>
                <span className="inline-flex items-center gap-2"><Check size={16} className="text-green-400"/>Cancel anytime</span>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {[{n:"500+",l:"Rental Companies"},{n:"1,200+",l:"Vehicles Listed"},{n:"0%",l:"Commission"},{n:"24h",l:"Approval Time"}].map(s => (
                <div key={s.l} className="bg-white/10 backdrop-blur rounded-2xl p-7 border border-white/15">
                  <div className="text-4xl font-black text-brand-300">{s.n}</div>
                  <div className="text-sm text-ink-200 mt-2">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="page-section">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <div className="text-brand-600 font-bold text-sm uppercase tracking-wider mb-2">How it works</div>
            <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">Start in 3 simple steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { i: BadgeCheck, t: "Create your account", s: "Sign up free and get verified within 24 hours. We confirm your trade license and identity to build customer trust." },
              { i: Zap, t: "List your fleet", s: "Add cars with photos, prices and features in minutes. Brand → Model dropdowns and built-in pricing for daily, weekly, monthly." },
              { i: MessageCircle, t: "Get direct enquiries", s: "Customers call, WhatsApp or video-chat you directly. No middleman. No commission. You keep 100% of every deal." },
            ].map((x, i) => (
              <div key={i} className="surface-card interactive-card p-7">
                <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5"><x.i size={22}/></div>
                <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-1">Step {i+1}</div>
                <h3 className="font-bold text-lg text-ink-900 dark:text-ink-100 mb-2">{x.t}</h3>
                <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{x.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section section-muted">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100">Why Auto to Rental?</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { i: TrendingUp, t: "More bookings", s: "Reach 100,000+ monthly customers across UAE & Syria." },
              { i: Users, t: "Direct contact", s: "Customers call you directly — no automated systems, no delays." },
              { i: Shield, t: "Verified trust", s: "Buyers trust verified companies. Earn the green checkmark." },
              { i: Zap, t: "Smart tools", s: "Inventory, pricing, promotions and analytics in one dashboard." },
            ].map((x, i) => (
              <div key={i} className="surface-card p-6">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4"><x.i size={20}/></div>
                <h3 className="font-bold text-ink-900 dark:text-ink-100 mb-2">{x.t}</h3>
                <p className="text-sm text-ink-600 dark:text-ink-400 leading-relaxed">{x.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          <div className="rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-50 via-white to-brand-50 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-brand-700">Promotional Slot</div>
              <h2 className="text-xl font-black text-ink-900 dark:text-ink-100 mt-1">Boost your cars with featured placement</h2>
              <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">Promote selected models in high-traffic search pages and get more qualified WhatsApp leads.</p>
            </div>
            <Link href="/list-your-car/signup" className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 transition">
              Start free now
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-14">
        <div className="mx-auto max-w-7xl px-4 grid gap-6 lg:grid-cols-2">
          <div className="surface-card p-6">
            <h2 className="text-2xl font-black text-ink-900 dark:text-ink-100">SEO benefits for rental companies</h2>
            <p className="mt-3 text-sm text-ink-600 dark:text-ink-400 leading-relaxed">
              Your profile and cars are indexed with keyword-rich content, structured page headings, and internal links to cities, brands, and vehicle categories. That helps qualified customers find your fleet faster.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/companies" className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">View company directory</Link>
              <Link href="/cars" className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">Browse live car listings</Link>
              <Link href="/blog" className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs font-semibold text-ink-700 dark:text-ink-300 hover:border-brand-300 hover:text-brand-700">Read growth tips</Link>
            </div>
          </div>
          <div className="rounded-2xl border border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/50 p-6">
            <h2 className="text-xl font-black text-ink-900 dark:text-ink-100">FAQ for new partners</h2>
            <div className="mt-3 space-y-2 text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
              <p><strong>How much does it cost to join?</strong> Joining is free with zero commission on direct enquiries.</p>
              <p><strong>How fast can we go live?</strong> Most company accounts are reviewed and approved within 24 hours.</p>
              <p><strong>Can we manage daily and monthly rates?</strong> Yes, you can publish daily, weekly, and monthly pricing for every car.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-black text-ink-900 dark:text-ink-100 mb-4">Ready to grow your rental business?</h2>
          <p className="text-ink-600 dark:text-ink-400 mb-7 text-lg">Join hundreds of rental companies already using Auto to Rental.</p>
          <a href="/list-your-car/signup" className="btn-primary inline-flex text-base">Create your free account →</a>
        </div>
      </section>
    </>
  )
}
