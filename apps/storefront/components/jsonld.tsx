import { SITE } from "@/lib/seo"
import { SUPPORT_PHONE_E164 } from "@/lib/site-contact"
import { customSchemaFor } from "@/lib/seo-helper"

// Renders admin-defined custom JSON-LD for a given path (set in the SEO Manager).
// Safe: the raw string was JSON-validated both on save (backend) and on read (customSchemaFor).
export async function CustomSchemaJsonLd({ path }: { path: string }) {
  const raw = await customSchemaFor(path)
  if (!raw) return null
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: raw.replace(/</g, "\u003c") }}/>
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/logo.png`,
    image: `${SITE.url}/logo.png`,
    description: SITE.description,
    telephone: SUPPORT_PHONE_E164,
    address: { "@type": "PostalAddress", addressLocality: "Dubai", addressRegion: "Dubai", addressCountry: "AE" },
    areaServed: [ { "@type": "Country", name: "United Arab Emirates" }, { "@type": "Country", name: "Syria" } ],
    sameAs: [
      "https://facebook.com/autotorental",
      "https://instagram.com/autotorental",
      "https://twitter.com/autotorental",
      "https://www.tiktok.com/@autotorental",
    ],
    contactPoint: { "@type": "ContactPoint", telephone: SUPPORT_PHONE_E164, contactType: "customer service", areaServed: ["AE", "SY"], availableLanguage: ["English", "Arabic"] },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}/>
}

export function WebsiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/cars?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}/>
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem", position: i + 1, name: it.name, item: it.url.startsWith("http") ? it.url : `${SITE.url}${it.url}`,
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}/>
}

export function VehicleJsonLd({ v, brand, model, city, seller, body }: any) {
  // Only emit a rating if the seller has REAL Google review data. Never fake it — Google penalises invented ratings.
  const realRating = seller?.metadata?.google_rating
  const realReviews = seller?.metadata?.google_reviews
  const aggregateRating = realRating && realReviews
    ? { "@type": "AggregateRating", ratingValue: String(realRating), reviewCount: Number(realReviews), bestRating: 5 }
    : undefined
  const data: any = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: v.title,
    description: v.description,
    image: Array.isArray(v.photos) && v.photos.length ? v.photos.filter(Boolean).slice(0, 8) : undefined,
    url: `${SITE.url}/cars/${v.slug || v.id}`,
    brand: brand?.name ? { "@type": "Brand", name: brand.name, logo: brand.logo_url || undefined } : undefined,
    model: model?.name || undefined,
    vehicleModelDate: v.year || undefined,
    // Human-readable body type ("Sedan"/"SUV"), never the raw DB id.
    bodyType: body?.name || undefined,
    fuelType: v.fuel_type || undefined,
    vehicleTransmission: v.transmission || undefined,
    seatingCapacity: v.seats || undefined,
    numberOfDoors: v.doors || undefined,
    vehicleIdentificationNumber: v.vin || undefined,
    mileageFromOdometer: v.mileage_km ? { "@type": "QuantitativeValue", value: v.mileage_km, unitCode: "KMT" } : undefined,
    color: v.color || undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: (v.currency_code || "AED").toUpperCase(),
      price: v.sale_daily_price || v.daily_price,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: v.sale_daily_price || v.daily_price,
        priceCurrency: (v.currency_code || "AED").toUpperCase(),
        unitText: "DAY",
      },
      itemCondition: "https://schema.org/UsedCondition",
      availability: v.status === "active" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      // Google requires an address on LocalBusiness/AutoRental. Use the listing
      // city (locality + country) so the offer's seller node validates (its
      // absence caused the 130 "invalid structured data" errors).
      seller: seller ? {
        "@type": "AutoRental",
        name: seller.name,
        image: seller.logo || undefined,
        address: {
          "@type": "PostalAddress",
          addressLocality: city?.name || undefined,
          addressCountry: (city?.country_code || "ae").toString().toUpperCase(),
        },
      } : undefined,
      url: `${SITE.url}/cars/${v.slug || v.id}`,
      areaServed: city?.name ? { "@type": "City", name: city.name } : undefined,
    },
    aggregateRating,
  }
  // Clean undefined
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k])
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}/>
}

export function LocalBusinessJsonLd({ seller, city }: any) {
  const data: any = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: seller.name,
    description: seller.description,
    image: seller.logo,
    url: `${SITE.url}/companies/${seller.id}`,
    telephone: seller.phone,
    address: city && {
      "@type": "PostalAddress",
      addressLocality: city.name,
      addressCountry: city.country_code?.toUpperCase(),
    },
    aggregateRating: (seller.metadata?.google_rating && seller.metadata?.google_reviews)
      ? { "@type": "AggregateRating", ratingValue: String(seller.metadata.google_rating), reviewCount: Number(seller.metadata.google_reviews), bestRating: 5 }
      : undefined,
    sameAs: seller.metadata?.social ? Object.values(seller.metadata.social).filter(Boolean) : undefined,
  }
  Object.keys(data).forEach(k => data[k] === undefined && delete data[k])
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}/>
}

export function FAQPageJsonLd({ faqs }: { faqs: { q: string; a: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}/>
}

export function ItemListJsonLd({ items, name }: { items: { id: string; title: string; price?: number; photo?: string; slug?: string }[]; name: string }) {
  // Google rejects an ItemList/Carousel whose itemListElement is empty (the cause
  // of "structured data items are invalid" on city+brand+duration combos with no
  // matching inventory). Only emit valid items, and emit NOTHING when there are none.
  const valid = (items || []).filter((it) => it && it.id && it.title)
  if (valid.length === 0) return null
  const data = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: valid.slice(0, 30).map((it, i) => ({
      "@type": "ListItem", position: i + 1,
      url: `${SITE.url}/cars/${it.slug || it.id}`,
      name: it.title,
      image: it.photo || undefined,
    })),
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }}/>
}
