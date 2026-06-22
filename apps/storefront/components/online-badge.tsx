export default function OnlineBadge({ online = true, size = "sm", label }: { online?: boolean; size?: "sm" | "md"; label?: string }) {
  const dotSize = size === "md" ? "w-2.5 h-2.5" : "w-2 h-2"
  return (
    <span className={`inline-flex items-center gap-1.5 ${size === "md" ? "text-xs" : "text-[11px]"} font-semibold`}>
      <span className="relative inline-flex">
        <span className={`${dotSize} rounded-full ${online ? "bg-green-500" : "bg-ink-400"}`}/>
        {online && <span className={`absolute inset-0 ${dotSize} rounded-full bg-green-500 animate-ping opacity-70`}/>}
      </span>
      <span className={online ? "text-green-700" : "text-ink-500"}>
        {label || (online ? "Available Now" : "Reply within 24h")}
      </span>
    </span>
  )
}
