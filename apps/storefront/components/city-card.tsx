"use client"
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

// City-name → verified Unsplash photo (with explicit city imagery)
const IMG: Record<string, string> = {
  "Dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80&auto=format",
  "Abu Dhabi": "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80&auto=format",
  "Sharjah": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=600&q=80&auto=format",
  "Ajman": "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&q=80&auto=format",
  "Ras Al Khaimah": "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?w=600&q=80&auto=format",
  "Fujairah": "https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=600&q=80&auto=format",
  "Umm Al Quwain": "https://images.unsplash.com/photo-1559825481-12a05cc00344?w=600&q=80&auto=format",
  "Al Ain": "https://images.unsplash.com/photo-1542156822-6924d1a71ace?w=600&q=80&auto=format",
  "Damascus": "https://images.unsplash.com/photo-1554731617-1f4f5f0e15bc?w=600&q=80&auto=format",
  "Aleppo": "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=600&q=80&auto=format",
  "Latakia": "https://images.unsplash.com/photo-1591301394050-e9a6b1d4d77f?w=600&q=80&auto=format",
  "Homs": "https://images.unsplash.com/photo-1591301394050-e9a6b1d4d77f?w=600&q=80&auto=format",
  "Hama": "https://images.unsplash.com/photo-1564507004663-b6dfb3c824d5?w=600&q=80&auto=format",
  "Tartus": "https://images.unsplash.com/photo-1568051243851-f9b136146e97?w=600&q=80&auto=format",
  "Deir ez-Zor": "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=600&q=80&auto=format",
  "Raqqa": "https://images.unsplash.com/photo-1565967511849-76a60a516170?w=600&q=80&auto=format",
}

// Color gradient per city for fallback (when image fails)
const GRAD: Record<string, string> = {
  "Dubai": "from-blue-600 via-blue-700 to-indigo-900",
  "Abu Dhabi": "from-amber-600 via-orange-700 to-red-900",
  "Sharjah": "from-emerald-600 via-teal-700 to-cyan-900",
  "Ajman": "from-rose-500 via-pink-700 to-purple-900",
  "Ras Al Khaimah": "from-yellow-600 via-amber-700 to-orange-900",
  "Fujairah": "from-sky-500 via-blue-700 to-indigo-900",
  "Umm Al Quwain": "from-violet-500 via-purple-700 to-pink-900",
  "Al Ain": "from-orange-500 via-red-700 to-rose-900",
  "Damascus": "from-lime-600 via-emerald-700 to-teal-900",
  "Aleppo": "from-amber-700 via-yellow-800 to-orange-900",
  "Latakia": "from-blue-500 via-sky-700 to-cyan-900",
  "Homs": "from-red-600 via-rose-800 to-pink-900",
  "Hama": "from-teal-600 via-cyan-800 to-blue-900",
  "Tartus": "from-cyan-500 via-blue-700 to-indigo-900",
}

export default function CityCard({ id, slug, name, nameAr, country, imageUrl }: { id: string; slug?: string; name: string; nameAr?: string; country: string; imageUrl?: string }) {
  const [error, setError] = useState(false)
  
  // Try to use the image from backend, fallback to Unsplash dictionary
  let src = ""
  if (!error) {
    if (imageUrl && imageUrl.trim() !== "") src = imageUrl
    else if (IMG[name]) src = IMG[name]
  }

  const grad = GRAD[name] || "from-brand-600 via-brand-700 to-brand-900"
  return (
    <Link href={slug ? `/cars/city/${slug}` : `/cars?city=${id}`} className="group relative aspect-[4/3] rounded-xl overflow-hidden block">
      {src ? (
        <Image src={src} alt={name} fill sizes="(max-width: 768px) 50vw, 25vw" onError={() => setError(true)} quality={85} className="object-cover group-hover:scale-110 transition-transform duration-700"/>
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
          <div className="text-center text-white px-4">
            <div className="text-5xl mb-2 opacity-30">🏙️</div>
            <div className="text-3xl font-black drop-shadow-lg">{name}</div>
            {nameAr && <div className="text-lg opacity-80 mt-1">{nameAr}</div>}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent"/>
      <div className="absolute bottom-0 inset-x-0 p-4 text-white">
        <div className="font-bold text-lg leading-tight">{name}</div>
        {nameAr && <div className="text-xs opacity-80">{nameAr}</div>}
        <div className="text-[10px] uppercase tracking-wider opacity-70 mt-1">{country}</div>
      </div>
    </Link>
  )
}
