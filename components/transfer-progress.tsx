"use client"

import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export type Transfer = {
  id: string
  peerId: string
  peerName: string
  fileName: string
  mime: string
  size: number
  direction: "send" | "receive"
  bytes: number
  status: "pending" | "in-progress" | "completed" | "canceled" | "error"
  error?: string
  downloadUrl?: string
}

type Props = {
  transfers: Transfer[]
  onCancel: (id: string) => void
  onAccept?: (id: string) => void
  onDecline?: (id: string) => void
}

export default function TransferProgress({ transfers, onCancel, onAccept, onDecline }: Props) {
  if (transfers.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Transfers</h2>
      <div className="space-y-3">
        {transfers.map((t) => {
          const pct = Math.min(100, Math.floor((t.bytes / Math.max(1, t.size)) * 100))
          return (
            <Card key={t.id} className="p-4 animate-slide-fade-in">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{t.fileName}</p>
                  <p className="text-xs opacity-70 truncate">
                    {t.direction === "send" ? "Sending to" : "Receiving from"} {t.peerName} • {pct}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.direction === "receive" && t.status === "pending" && (
                    <>
                      <Button size="sm" variant="default" onClick={() => onAccept?.(t.id)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onDecline?.(t.id)}>
                        Decline
                      </Button>
                    </>
                  )}
                  {t.direction === "send" && t.status === "pending" && (
                    <Button size="sm" variant="destructive" onClick={() => onCancel(t.id)}>
                      Cancel
                    </Button>
                  )}
                  {t.status === "in-progress" && (
                    <Button size="sm" variant="destructive" onClick={() => onCancel(t.id)}>
                      Cancel
                    </Button>
                  )}
                  {t.status === "completed" && t.downloadUrl && (
                    <a href={t.downloadUrl} download={t.fileName} className="text-sm underline">
                      Download
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <Progress value={pct} />
              </div>
              {t.status === "pending" && t.direction === "send" && (
                <p className="text-xs opacity-70 mt-2">Waiting for recipient to accept…</p>
              )}
              {t.error && <p className="text-xs text-destructive mt-2">{t.error}</p>}
            </Card>
          )
        })}
      </div>
    </section>
  )
}

export { TransferProgress }
