import * as React from "react"

// Real professional car photo per body type (served from /static/cartypes-photos).
const BASE = "https://api.autotorental.com/static/cartypes-photos"

const ALIASES: Record<string, string> = {
  sedan: "sedan", saloon: "sedan", wagon: "sedan", estate: "sedan",
  suv: "suv", "sport utility": "suv", "4x4": "suv",
  crossover: "crossover", cuv: "crossover",
  coupe: "coupe",
  convertible: "convertible", cabriolet: "convertible", roadster: "convertible",
  sports: "sports", "sports car": "sports",
  supercar: "supercar", "super car": "supercar", exotic: "supercar",
  luxury: "luxury", premium: "luxury",
  hatchback: "hatchback", hatch: "hatchback",
  compact: "compact", economy: "compact", mini: "compact", small: "compact",
  pickup: "pickup", "pickup truck": "pickup", truck: "pickup", "pick-up": "pickup",
  van: "van", minivan: "van", "mini van": "van", mpv: "van",
  bus: "bus", coach: "bus", minibus: "minibus", "mini bus": "minibus",
  electric: "electric", ev: "electric", "electric car": "electric",
  hybrid: "hybrid", "hybrid car": "hybrid",
}

export default function CarTypeIcon({ name, className }: { name?: string | null; className?: string }) {
  const key = (name || "").trim().toLowerCase()
  const slug = ALIASES[key] || "sedan"
  return (
    <img
      src={`${BASE}/${slug}.webp`}
      alt={name || "car type"}
      loading="lazy"
      className={className}
    />
  )
}
