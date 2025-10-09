"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Peer = { id: string; name?: string }
type ConnectionStatus = "disconnected" | "connecting" | "connected" | "failed"

export function PeerList({
  peers,
  selectedPeerId,
  onSelect,
  onConnect,
  connectionStatus,
}: {
  peers: Peer[]
  selectedPeerId?: string
  onSelect: (id: string) => void
  onConnect: (id: string) => void
  connectionStatus: Record<string, ConnectionStatus>
}) {
  if (peers.length === 0) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
        {"No peers discovered yet. Open this page on another device."}
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {peers.map((p) => {
        const status = connectionStatus[p.id] || "disconnected"
        return (
          <li
            key={p.id}
            className={cn(
              "flex items-center justify-between rounded-md border p-3",
              selectedPeerId === p.id ? "ring-2 ring-primary" : "",
            )}
          >
            <div className="min-w-0">
              <div className="font-medium truncate">{p.name || p.id.slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground font-mono truncate">{p.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={status === "connected" ? "default" : status === "connecting" ? "secondary" : "outline"}>
                {status}
              </Badge>
              <Button
                size="sm"
                variant={selectedPeerId === p.id ? "default" : "secondary"}
                onClick={() => {
                  onSelect(p.id)
                  if (status === "disconnected") onConnect(p.id)
                }}
              >
                {status === "connected" ? "Selected" : status === "connecting" ? "Connecting" : "Connect"}
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
