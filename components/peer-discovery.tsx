"use client"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { Wifi } from "lucide-react"

type Peer = { id: string; name: string }
type Props = {
  peers: Peer[]
  selectedPeerId?: string | null
  onSelect: (peerId: string) => void
  connectionStates: Record<string, { pc?: RTCPeerConnection["connectionState"]; dc?: RTCDataChannel["readyState"] }>
}

export default function PeerDiscovery({ peers, selectedPeerId, onSelect, connectionStates }: Props) {
  return (
    <section>
      <h2 className="text-lg font-medium mb-3">Nearby Devices</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {peers.length === 0 ? (
          <Card className="p-6 flex items-center justify-center">
            <p className="opacity-70 text-sm">No peers yet. Open this page on another device.</p>
          </Card>
        ) : (
          peers.map((p) => {
            const conn = connectionStates[p.id]
            const connected = conn?.pc === "connected" || conn?.dc === "open"
            return (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={cn(
                  "relative group rounded-lg border p-4 text-left transition-colors",
                  selectedPeerId === p.id ? "bg-accent" : "hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10">
                    <div className={cn("absolute inset-0 rounded-full bg-primary/10", "animate-pulse")} />
                    <div className="absolute inset-1 rounded-full bg-primary/20" />
                    <div className="relative z-10 h-full w-full rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Wifi className="h-5 w-5" aria-hidden />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className={cn("text-xs", connected ? "text-emerald-600 dark:text-emerald-400" : "opacity-70")}>
                      {connected ? "Connected" : conn?.pc || "disconnected"}
                    </p>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </section>
  )
}
