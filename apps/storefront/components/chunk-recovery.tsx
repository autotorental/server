"use client"
import { useEffect } from "react"
import { isChunkError, maybeReloadOnce } from "@/lib/chunk-error"

// Renders nothing. Catches stale-chunk / failed-dynamic-import errors that never
// reach a React error boundary (e.g. lazy imports fired from event handlers,
// async chunk rejections) and performs the same guarded single hard-reload that
// global-error.tsx does. Mounted high in the root layout so it is always active.
export default function ChunkRecovery() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.error || e.message)) maybeReloadOnce()
    }
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) maybeReloadOnce()
    }
    window.addEventListener("error", onError)
    window.addEventListener("unhandledrejection", onRejection)
    return () => {
      window.removeEventListener("error", onError)
      window.removeEventListener("unhandledrejection", onRejection)
    }
  }, [])

  return null
}
