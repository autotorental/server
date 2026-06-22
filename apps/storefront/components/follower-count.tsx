"use client"
import { useEffect, useState } from "react"
import { Users } from "lucide-react"

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.autotorental.com"
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY || ""

export default function FollowerCount({ sellerId, className = "" }: { sellerId: string; className?: string }) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    fetch(`${API}/store/sellers/${sellerId}/follow-count`, { headers: { "x-publishable-api-key": PK } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && typeof d.count === "number") setCount(d.count) })
      .catch(() => {})
  }, [sellerId])
  if (count == null) return null
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold ${className}`}>
      <Users size={12}/> {count.toLocaleString()} {count === 1 ? "follower" : "followers"}
    </span>
  )
}
