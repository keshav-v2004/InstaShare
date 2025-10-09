"use client"

import { cn } from "@/lib/utils"

export default function ConnectionStatus({
  status,
  peersCount,
}: {
  status: "connecting" | "open" | "closed" | "error"
  peersCount: number
}) {
  const color = status === "open" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500" : "bg-destructive"
  return (
    <div className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full border">
      <span className={cn("h-2 w-2 rounded-full", color)} aria-hidden />
      <span className="sr-only">Signaling status:</span>
      <span>{status}</span>
      <span className="opacity-70">•</span>
      <span className="whitespace-nowrap">{peersCount} peers</span>
    </div>
  )
}
