"use client"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle({ compact }: { compact?: boolean }) {
  const [mode, setMode] = useState<"light" | "dark">("light")

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as "light" | "dark" | null)
    const prefers = window.matchMedia?.("(prefers-color-scheme: dark)").matches
    const m = saved || (prefers ? "dark" : "light")
    setMode(m)
    document.documentElement.classList.toggle("dark", m === "dark")
  }, [])

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark"
    setMode(next)
    localStorage.setItem("theme", next)
    document.documentElement.classList.toggle("dark", next === "dark")
  }

  return (
    <button onClick={toggle} aria-label="Toggle theme"
      className={`inline-flex items-center justify-center transition-colors ${compact ? "hover:text-brand-300" : "w-10 h-10 rounded-lg text-ink-600 dark:text-ink-400 hover:bg-ink-50 dark:bg-ink-900/50 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-brand-300"}`}>
      {mode === "dark" ? <Sun size={compact ? 14 : 18}/> : <Moon size={compact ? 14 : 18}/>}
    </button>
  )
}
