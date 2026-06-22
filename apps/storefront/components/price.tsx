"use client"
import { useEffect, useState } from "react"
import { useCcy, convert, SYMBOL, DECIMALS, Ccy } from "@/lib/prefs"

function formatAmount(value: number, ccy: Ccy) {
  const decimals = DECIMALS[ccy] ?? 0
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default function Price({ amount, from = "AED", className }: { amount?: number; from?: Ccy; className?: string }) {
  const [ccy, _] = useCcy()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (amount == null) return null
  // SSR: show original
  if (!mounted) return <span className={className}>{SYMBOL[from]} {formatAmount(amount, from)}</span>
  const converted = convert(amount, from, ccy)
  if (converted == null) return <span className={className}>{SYMBOL[from]} {formatAmount(amount, from)}</span>
  return <span className={className}>{SYMBOL[ccy]} {formatAmount(converted, ccy)}</span>
}
