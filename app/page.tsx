"use client"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import PeerDiscovery from "@/components/peer-discovery"
import FileDropZone from "@/components/file-drop-zone"
import TransferProgress from "@/components/transfer-progress"
import ConnectionStatus from "@/components/connection-status"
import useWebRTC from "@/hooks/use-webrtc" // Declare the useWebRTC hook

export default function HomePage() {
  const {
    self,
    peers,
    connectionStates,
    transfers,
    selectPeerAndConnect,
    selectedPeerId,
    setSelectedPeerId,
    sendFileToSelectedPeer,
    cancelTransfer,
    reconnectSignaling,
    signalingStatus,
    signalingUrl,
    setSignalingUrl,
    isMixedContent,
    acceptTransfer,
    declineTransfer,
  } = useWebRTC()

  const [sigUrlDraft, setSigUrlDraft] = useState<string>("")
  useEffect(() => {
    setSigUrlDraft(signalingUrl)
  }, [signalingUrl])

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold text-pretty">AirDrop-like P2P Transfer</h1>
        <div className="flex items-center gap-3">
          <ConnectionStatus status={signalingStatus} peersCount={peers.length} />
          <Button variant="outline" onClick={reconnectSignaling}>
            Reconnect
          </Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm opacity-80">You are</p>
            <p className="font-medium">{self?.name || "Connecting..."}</p>
          </div>
          <div className="text-sm opacity-80">STUN: stun.l.google.com:19302</div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <label className="text-sm font-medium">Signaling server URL</label>
          <div className="flex items-center gap-2">
            <Input
              value={sigUrlDraft}
              onChange={(e) => setSigUrlDraft(e.target.value)}
              placeholder="ws://192.168.1.10:3001 or wss://your-domain.tld"
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSignalingUrl(sigUrlDraft)
                reconnectSignaling()
              }}
            >
              Apply
            </Button>
          </div>
          {isMixedContent && (
            <p className="text-xs text-[hsl(10,80%,45%)]">
              Warning: You are on HTTPS but using ws://. Browsers will block mixed content. Use a wss:// signaling URL.
            </p>
          )}
          {sigUrlDraft.includes("localhost") || sigUrlDraft.includes("127.0.0.1") ? (
            <p className="text-xs opacity-80">
              Note: On phones or other devices, "localhost" points to the device itself. Use your computer's LAN IP
              instead.
            </p>
          ) : null}
        </div>
      </Card>

      <PeerDiscovery
        peers={peers}
        selectedPeerId={selectedPeerId}
        onSelect={(peerId) => {
          setSelectedPeerId(peerId)
          selectPeerAndConnect(peerId)
        }}
        connectionStates={connectionStates}
      />

      <FileDropZone
        disabled={!selectedPeerId}
        onFiles={(files) => {
          if (files.length > 0) {
            for (const f of files) sendFileToSelectedPeer(f)
          }
        }}
      />

      <TransferProgress
        transfers={transfers}
        onCancel={cancelTransfer}
        onAccept={(id) => acceptTransfer(id)}
        onDecline={(id) => declineTransfer(id)}
      />

      <footer className="text-center text-sm opacity-70 pt-6">
        Files are end-to-end transferred via WebRTC. Signaling happens over WebSocket; no files are logged or stored.
      </footer>
    </main>
  )
}
