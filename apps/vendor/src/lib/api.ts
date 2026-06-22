/** Same-origin API — vendor auth cookies must go through seller host (nginx → API). */
export const API = import.meta.env.VITE_BACKEND_URL || "https://partner.autotorental.com"

export const PUBLISHABLE_KEY = import.meta.env.VITE_PUBLISHABLE_KEY || "pk_b9c89660573c5c7d3f54d11eb3132be59d6d919d4bb40c98b14877a2048feea1"
