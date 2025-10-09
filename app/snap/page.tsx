"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useWebRTC } from "@/hooks/use-webrtc"
import { PeerList } from "@/components/peer-list"
import { FileDropZone } from "@/components/file-drop-zone"
import { TransferProgress } from "@/components/transfer-progress"

export default function SnapPage() {
  const {
    myId,
    peers,
    connectToPeer,
    selectedPeerId,
    setSelectedPeerId,
    connectionStatus,
    sendFile,
    sending,
    receiving,
    cancelSend,
  } = useWebRTC()

  return (
    <main className="container mx-auto max-w-3xl p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-pretty">Snapdrop-like</h1>
        <p className="text-sm text-muted-foreground">{"Share files directly, device-to-device."}</p>
      </header>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{"Your ID"}</div>
            <div className="font-mono text-sm">{myId || "..."}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                location.reload()
              }}
            >
              {"Reconnect"}
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <PeerList
          peers={peers}
          selectedPeerId={selectedPeerId}
          onSelect={(pid) => setSelectedPeerId(pid)}
          onConnect={(pid) => connectToPeer(pid)}
          connectionStatus={connectionStatus}
        />

        <Separator className="my-4" />

        <FileDropZone
          disabled={!selectedPeerId}
          onFiles={(files) => {
            if (!selectedPeerId || files.length === 0) return
            sendFile(files[0], selectedPeerId)
          }}
        />

        <TransferProgress sending={sending} receiving={receiving} onCancelSend={cancelSend} />
      </Card>

      <footer className="mt-6 text-center text-xs text-muted-foreground">
        {"Signaling: "}
        <span className="font-mono">{process.env.NEXT_PUBLIC_SIGNALING_URL || "ws://localhost:3001"}</span>
      </footer>
    </main>
  )
}
