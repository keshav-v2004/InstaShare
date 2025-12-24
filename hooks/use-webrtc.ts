// this has path hooks/use-webrtc.ts

"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { Transfer } from "@/components/transfer-progress"

type Peer = { id: string; name: string }

type SignalMessage =
  | { type: "init"; self: Peer; peers: Peer[] }
  | { type: "peer-join"; peer: Peer }
  | { type: "peer-leave"; id: string }
  | { type: "peer-rename"; id: string; name: string }
  | { type: "signal"; from: string; data: any }

type DCControl =
  | { kind: "file-offer"; id: string; name: string; size: number; mime: string }
  | { kind: "file-accept"; id: string }
  | { kind: "file-decline"; id: string; reason?: string }
  | { kind: "file-meta"; id: string; name: string; size: number; mime: string }
  | { kind: "file-complete"; id: string }
  | { kind: "file-cancel"; id: string; reason?: string }
  | { kind: "text-message"; id: string; text: string; timestamp: number }
  | { kind: "ping" }

type TextMessage = {
  id: string
  peerId: string
  peerName: string
  text: string
  timestamp: number
  direction: "sent" | "received"
}

const STUN = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
const CHUNK_SIZE = 64 * 1024

function computeWSUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SIGNALING_URL;
  if (fromEnv && typeof fromEnv === "string" && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  if (typeof window !== "undefined") {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const protocol = window.location.protocol === "https:" ? "wss://" : "ws://";

    if (isLocal) {
      return "ws://localhost:3001";
    }

    return `${protocol}${window.location.hostname}:3001`;
  }

  return "ws://localhost:3001";
}

function useWebRTC() {
  const [self, setSelf] = useState<Peer | null>(null)
  const [peers, setPeers] = useState<Peer[]>([])
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null)
  const [signalingStatus, setSignalingStatus] = useState<"connecting" | "open" | "closed" | "error">("connecting")
  const [messages, setMessages] = useState<TextMessage[]>([])

  const [connTick, setConnTick] = useState(0)

  const [transfers, setTransfers] = useState<Transfer[]>([])
  const pcs = useRef(new Map<string, RTCPeerConnection>())
  const dcs = useRef(new Map<string, RTCDataChannel>())
  const connState = useRef(new Map<string, { pc?: RTCPeerConnection["connectionState"]; dc?: RTCDataChannel["readyState"] }>())
  const connectionStates = useMemo(() => {
    const out: Record<string, { pc?: RTCPeerConnection["connectionState"]; dc?: RTCDataChannel["readyState"] }> = {}
    for (const [k, v] of connState.current) out[k] = { ...v }
    return out
  }, [peers, transfers, connTick])

  const activeReceive = useRef<{
    peerId: string
    id: string
    name: string
    mime: string
    size: number
    chunks: Uint8Array[]
    bytes: number
  } | null>(null)
  const cancelSendFlags = useRef(new Set<string>())

  const wsRef = useRef<WebSocket | null>(null)

  const cleanupPeer = (peerId: string) => {
    dcs.current.get(peerId)?.close()
    dcs.current.delete(peerId)
    pcs.current.get(peerId)?.close()
    pcs.current.delete(peerId)
    connState.current.set(peerId, { pc: "closed", dc: "closed" })
    bumpConn()
  }

  const bumpConn = () => setConnTick((n) => n + 1)

  const pendingReceives = useRef(new Map<string, { peerId: string; name: string; size: number; mime: string; chunks: Uint8Array[]; bytes: number }>())
  const acceptWaiters = useRef(new Map<string, (ok: boolean) => void>())

  const addTransfer = (t: Omit<Transfer, "bytes" | "status">) => {
    const tx: Transfer = { ...t, bytes: 0, status: "pending" }
    setTransfers((prev) => [tx, ...prev])
    return t.id
  }

  const updateTransfer = (id: string, patch: Partial<Transfer>) => {
    setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }

  const findTransfer = (id: string) => {
    return transfers.find((t) => t.id === id)
  }

  const [signalingUrlState, setSignalingUrlState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const q = params.get("signal") || params.get("ws") || params.get("signaling") || params.get("url")
      if (q && q.trim()) return q.trim()
      try {
        const stored = window.localStorage.getItem("signalingUrl")
        if (stored && stored.trim()) {
          const value = stored.trim()
          const isLocalHost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          if (isLocalHost) {
            // Auto-upgrade common local defaults from :3000 to :3001 for signaling
            const needsUpgrade = /^ws:\/\/(localhost|127\.0\.0\.1):3000\/?$/i.test(value)
            if (needsUpgrade) {
              const upgraded = "ws://localhost:3001"
              try { window.localStorage.setItem("signalingUrl", upgraded) } catch {}
              return upgraded
            }
          }
          return value
        }
      } catch {}
    }
    return computeWSUrl()
  })
  const signalingUrl = signalingUrlState
  const isMixedContent = typeof window !== "undefined" && window.location.protocol === "https:" && signalingUrl.startsWith("ws://")

  const setSignalingUrl = (next: string) => {
    const clean = (next || "").trim()
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("signalingUrl", clean)
      }
    } catch {}
    setSignalingUrlState(clean)
  }

  const declineTransfer = useCallback((id: string) => {
    const meta = pendingReceives.current.get(id)
    if (!meta) return
    const { peerId } = meta
    const dc = dcs.current.get(peerId)
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify({ kind: "file-decline", id } as DCControl))
    }
    pendingReceives.current.delete(id)
    updateTransfer(id, { status: "canceled", error: "Declined" })
  }, [])

  const acceptTransfer = useCallback((id: string) => {
    const meta = pendingReceives.current.get(id)
    if (!meta) return
    const { peerId, name, size, mime } = meta
    const dc = dcs.current.get(peerId)
    if (!dc || dc.readyState !== "open") return
    dc.send(JSON.stringify({ kind: "file-accept", id } as DCControl))
    activeReceive.current = { peerId, id, name, mime, size, chunks: [], bytes: 0 }
    updateTransfer(id, { status: "in-progress" })
  }, [])

  const setupSignaling = useCallback(() => {
    try {
      const url = signalingUrl
      const ws = new WebSocket(url)
      wsRef.current = ws
      setSignalingStatus("connecting")

      ws.onopen = () => setSignalingStatus("open")
      ws.onclose = () => setSignalingStatus("closed")
      ws.onerror = () => setSignalingStatus("error")

      ws.onmessage = async (ev) => {
        let msg: SignalMessage
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg.type === "init") {
          setSelf(msg.self)
          setPeers(msg.peers)
        } else if (msg.type === "peer-join") {
          setPeers((prev) => {
            if (prev.find((p) => p.id === msg.peer.id)) return prev
            return [msg.peer, ...prev]
          })
        } else if (msg.type === "peer-leave") {
          setPeers((prev) => prev.filter((p) => p.id !== msg.id))
          cleanupPeer(msg.id)
        } else if (msg.type === "peer-rename") {
          setPeers((prev) => prev.map((p) => (p.id === msg.id ? { ...p, name: msg.name } : p)))
        } else if (msg.type === "signal") {
          await handleSignal(msg.from, msg.data)
        }
      }
    } catch {
      setSignalingStatus("error")
    }
  }, [signalingUrl])

  useEffect(() => {
    setupSignaling()
    return () => {
      wsRef.current?.close()
      for (const id of pcs.current.keys()) cleanupPeer(id)
    }
  }, [setupSignaling])

  const reconnectSignaling = useCallback(() => {
    wsRef.current?.close()
    setupSignaling()
  }, [setupSignaling])

  const sendSignal = (to: string, data: any) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== ws.OPEN) return
    ws.send(JSON.stringify({ type: "signal", to, data }))
  }

  const ensurePeerConnection = async (peerId: string, initiator: boolean) => {
    let pc = pcs.current.get(peerId)
    if (!pc) {
      pc = new RTCPeerConnection(STUN)
      pcs.current.set(peerId, pc)

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(peerId, { type: "candidate", candidate: e.candidate })
      }
      pc.onconnectionstatechange = () => {
        connState.current.set(peerId, { ...(connState.current.get(peerId) || {}), pc: pc?.connectionState })
        bumpConn()
      }
      pc.ondatachannel = (e) => {
        setupDataChannel(peerId, e.channel)
      }

      if (initiator) {
        const dc = pc.createDataChannel("file")
        setupDataChannel(peerId, dc)
      }
    }

    if (initiator) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      sendSignal(peerId, { type: "offer", sdp: offer })
    }
    return pc
  }

  const setupDataChannel = (peerId: string, dc: RTCDataChannel) => {
    dcs.current.set(peerId, dc)
    dc.binaryType = "arraybuffer"
    dc.onopen = () => {
      connState.current.set(peerId, { ...(connState.current.get(peerId) || {}), dc: "open" })
      bumpConn()
    }
    dc.onclose = () => {
      connState.current.set(peerId, { ...(connState.current.get(peerId) || {}), dc: "closed" })
      bumpConn()
    }
    dc.onerror = () => {
      connState.current.set(peerId, { ...(connState.current.get(peerId) || {}), dc: "closed" })
      bumpConn()
    }
    dc.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        let payload: DCControl | null = null
        try {
          payload = JSON.parse(ev.data)
        } catch {}
        if (!payload) return

        // ✨ NEW: Handle text messages
        if (payload.kind === "text-message") {
          const { id, text, timestamp } = payload
          const peerName = peers.find((p) => p.id === peerId)?.name || "Peer"
          
          const newMessage: TextMessage = {
            id,
            peerId,
            peerName,
            text,
            timestamp,
            direction: "received"
          }
          
          setMessages((prev) => [newMessage, ...prev])
          
          // Show actionable notification
          toast.message(`Message from ${peerName}`, {
            description: text.length > 100 ? text.substring(0, 100) + "..." : text,
            action: {
              label: "Reply",
              onClick: () => {
                setSelectedPeerId(peerId)
                // You can add auto-focus to text input here if needed
              },
            },
            duration: 10000,
          })
          return
        }

        if (payload.kind === "file-offer") {
          const { id, name, size, mime } = payload
          const peerName = peers.find((p) => p.id === peerId)?.name || "Peer"
          pendingReceives.current.set(id, { peerId, name, size, mime, chunks: [], bytes: 0 })
          setTransfers((prev) => [{ id, peerId, peerName, fileName: name, mime, size, direction: "receive", bytes: 0, status: "pending" }, ...prev])

          toast.info(`Incoming file from ${peerName}: ${name}`, {
            action: {
              label: "Accept",
              onClick: () => acceptTransfer(id),
            },
            cancel: {
              label: "Decline",
              onClick: () => declineTransfer(id),
            },
            duration: 30000,
          })
          return
        }
        if (payload.kind === "file-accept") {
          const waiter = acceptWaiters.current.get(payload.id)
          if (waiter) {
            acceptWaiters.current.delete(payload.id)
            waiter(true)
          }
          return
        }
        if (payload.kind === "file-decline") {
          const waiter = acceptWaiters.current.get(payload.id)
          if (waiter) {
            acceptWaiters.current.delete(payload.id)
            waiter(false)
          }
          updateTransfer(payload.id, { status: "canceled", error: payload.reason || "Declined by recipient" })
          return
        }
        if (payload.kind === "file-complete") {
          const ar = activeReceive.current
          if (ar && ar.id === payload.id) {
            const blob = new Blob(ar.chunks.map(chunk => new Uint8Array(chunk)), { type: ar.mime || "application/octet-stream" })
            const url = URL.createObjectURL(blob)
            updateTransfer(ar.id, { status: "completed", downloadUrl: url, bytes: ar.bytes })
            activeReceive.current = null
          }
        } else if (payload.kind === "file-cancel") {
          const ar = activeReceive.current
          if (ar && ar.id === payload.id) {
            updateTransfer(ar.id, { status: "canceled" })
            activeReceive.current = null
          }
        }
      } else if (ev.data instanceof ArrayBuffer) {
        const ar = activeReceive.current
        if (!ar) return
        const chunk = new Uint8Array(ev.data)
        ar.chunks.push(chunk)
        ar.bytes += chunk.byteLength
        updateTransfer(ar.id, { bytes: ar.bytes })
      }
    }
  }

  const handleSignal = async (from: string, data: any) => {
    let pc = pcs.current.get(from)
    if (data.type === "offer") {
      if (!pc) pc = new RTCPeerConnection(STUN)
      pcs.current.set(from, pc)
      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal(from, { type: "candidate", candidate: e.candidate })
      }
      pc.onconnectionstatechange = () => {
        connState.current.set(from, { ...(connState.current.get(from) || {}), pc: pc?.connectionState })
        bumpConn()
      }
      pc.ondatachannel = (e) => setupDataChannel(from, e.channel)
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      sendSignal(from, { type: "answer", sdp: answer })
    } else if (data.type === "answer") {
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp))
    } else if (data.type === "candidate") {
      if (!pc) return
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
      } catch {}
    }
  }

  const selectPeerAndConnect = useCallback(async (peerId: string) => {
    try {
      await ensurePeerConnection(peerId, true)
      
      // Wait for data channel to open
      const maxWait = 100 // 10 seconds
      let tries = 0
      
      const waitForChannel = setInterval(() => {
        const dc = dcs.current.get(peerId)
        tries++
        
        if (dc && dc.readyState === "open") {
          clearInterval(waitForChannel)
          toast.success(`Connected to ${peers.find(p => p.id === peerId)?.name || "peer"}`)
        } else if (tries > maxWait) {
          clearInterval(waitForChannel)
          console.warn("Data channel took longer than expected to open")
        }
      }, 100)
    } catch (error) {
      console.error("Failed to connect:", error)
      toast.error("Failed to establish connection")
    }
  }, [peers])

  // ✨ NEW: Send text message function
  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!selectedPeerId || !text.trim()) return false
      
      const peerId = selectedPeerId
      await ensurePeerConnection(peerId, true)

      const dc = dcs.current.get(peerId)
      if (!dc || dc.readyState !== "open") {
        toast.error("Connection not ready. Please wait...")
        return false
      }

      const messageId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
      const timestamp = Date.now()
      const peerName = peers.find((p) => p.id === peerId)?.name || "Peer"

      const messagePayload: DCControl = {
        kind: "text-message",
        id: messageId,
        text: text.trim(),
        timestamp,
      }

      try {
        dc.send(JSON.stringify(messagePayload))
        
        // Add to local messages
        const newMessage: TextMessage = {
          id: messageId,
          peerId,
          peerName,
          text: text.trim(),
          timestamp,
          direction: "sent"
        }
        
        setMessages((prev) => [newMessage, ...prev])
        
        toast.success(`Message sent to ${peerName}`)
        return true
      } catch (error) {
        toast.error("Failed to send message")
        return false
      }
    },
    [selectedPeerId, peers]
  )

  const sendFileToSelectedPeer = useCallback(
    async (file: File) => {
      if (!selectedPeerId) return
      const peerId = selectedPeerId
      await ensurePeerConnection(peerId, true)

      const dc = dcs.current.get(peerId)
      if (!dc || dc.readyState !== "open") {
        const ok = await new Promise<boolean>((res) => {
          let tries = 0
          const i = setInterval(() => {
            tries++
            if (dcs.current.get(peerId)?.readyState === "open") {
              clearInterval(i)
              res(true)
            } else if (tries > 100) {
              clearInterval(i)
              res(false)
            }
          }, 100)
        })
        if (!ok) {
          toast.error("Failed to establish data channel.")
          return
        }
      }

      const transferId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
      const peerName = peers.find((p) => p.id === peerId)?.name || "Peer"
      addTransfer({ id: transferId, peerId, peerName, fileName: file.name, mime: file.type || "application/octet-stream", size: file.size, direction: "send" })

      const offerMsg: DCControl = { kind: "file-offer", id: transferId, name: file.name, size: file.size, mime: file.type || "application/octet-stream" }
      dcs.current.get(peerId)?.send(JSON.stringify(offerMsg))

      const accepted = await new Promise<boolean>((resolve) => {
        acceptWaiters.current.set(transferId, resolve)
        setTimeout(() => {
          if (acceptWaiters.current.delete(transferId)) resolve(false)
        }, 30000)
      })

      if (!accepted) {
        updateTransfer(transferId, { status: "canceled", error: "Declined or timed out" })
        return
      }

      updateTransfer(transferId, { status: "in-progress" })
      cancelSendFlags.current.delete(transferId)

      let offset = 0
      try {
        while (offset < file.size) {
          if (cancelSendFlags.current.has(transferId)) {
            dcs.current.get(peerId)?.send(JSON.stringify({ kind: "file-cancel", id: transferId } as DCControl))
            updateTransfer(transferId, { status: "canceled" })
            break
          }
          const slice = file.slice(offset, Math.min(offset + CHUNK_SIZE, file.size))
          const buf = await slice.arrayBuffer()
          const channel = dcs.current.get(peerId)
          if (!channel || channel.readyState !== "open") throw new Error("Channel closed")
          if (channel.bufferedAmount > 1_000_000) {
            await new Promise((res) => {
              const onLow = () => {
                channel.removeEventListener("bufferedamountlow", onLow as any)
                res(null)
              }
              channel.bufferedAmountLowThreshold = 512_000
              channel.addEventListener("bufferedamountlow", onLow as any)
              setTimeout(() => {
                channel.removeEventListener("bufferedamountlow", onLow as any)
                res(null)
              }, 100)
            })
          }
          channel.send(buf)
          offset += (buf as ArrayBuffer).byteLength
          updateTransfer(transferId, { bytes: offset })
        }

        if (offset >= file.size && !cancelSendFlags.current.has(transferId)) {
          dcs.current.get(peerId)?.send(JSON.stringify({ kind: "file-complete", id: transferId } as DCControl))
          updateTransfer(transferId, { status: "completed" })
        }
      } catch (e: any) {
        updateTransfer(transferId, { status: "error", error: e?.message || "Send failed" })
      }
    },
    [selectedPeerId, peers],
  )

  const cancelTransfer = useCallback(
    (id: string) => {
      const tx = findTransfer(id)
      if (!tx) return
      if (tx.direction === "send") {
        cancelSendFlags.current.add(id)
      } else if (tx.direction === "receive" && tx.status !== "completed") {
        declineTransfer(id)
      }
    },
    [transfers, declineTransfer],
  )

  return {
    self,
    peers,
    selectedPeerId,
    setSelectedPeerId,
    selectPeerAndConnect,
    sendFileToSelectedPeer,
    sendTextMessage, // ✨ NEW
    messages, // ✨ NEW
    cancelTransfer,
    signalingStatus,
    reconnectSignaling,
    transfers,
    connectionStates,
    signalingUrl,
    setSignalingUrl,
    isMixedContent,
    acceptTransfer,
    declineTransfer,
  }
}

export default useWebRTC
export { useWebRTC }
export type { TextMessage, Peer }