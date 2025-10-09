"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useWebRTC } from "@/hooks/use-webrtc"
import PeerDiscovery from "@/components/peer-discovery"
import { FileDropZone } from "@/components/file-drop-zone"
import { TransferProgress } from "@/components/transfer-progress"
import ConnectionStatus from "@/components/connection-status"

export default function SnapPage() {
  const {
    self,
    peers,
    selectedPeerId,
    setSelectedPeerId,
    selectPeerAndConnect,
    sendFileToSelectedPeer,
    transfers,
    cancelTransfer,
    acceptTransfer,
    declineTransfer,
    connectionStates,
    signalingStatus,
    reconnectSignaling,
    signalingUrl,
  } = useWebRTC()

  return (
    <main className="container mx-auto max-w-3xl p-4">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-pretty">Snapdrop-like</h1>
        <p className="text-sm text-muted-foreground">
          Share files directly, device-to-device.
        </p>
      </header>

      <Card className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">You are</div>
            <div className="font-medium">{self?.name || "Connecting..."}</div>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus 
              status={signalingStatus} 
              peersCount={peers.length} 
            />
            <Button variant="secondary" onClick={reconnectSignaling}>
              Reconnect
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        <PeerDiscovery
          peers={peers}
          selectedPeerId={selectedPeerId}
          onSelect={(peerId) => {
            setSelectedPeerId(peerId)
            selectPeerAndConnect(peerId)
          }}
          connectionStates={connectionStates}
        />

        <Separator className="my-4" />

        <FileDropZone
          disabled={!selectedPeerId}
          onFiles={(files) => {
            if (files.length > 0) {
              for (const f of files) {
                sendFileToSelectedPeer(f)
              }
            }
          }}
        />

        <TransferProgress
          transfers={transfers}
          onCancel={cancelTransfer}
          onAccept={acceptTransfer}
          onDecline={declineTransfer}
        />
      </Card>

      <footer className="mt-6 text-center text-xs text-muted-foreground">
        Signaling: <span className="font-mono">{signalingUrl}</span>
      </footer>
    </main>
  )
}
