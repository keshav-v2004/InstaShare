// this has path backend/server.js

// Simple WebSocket signaling server using Express + ws. No file storage.
// It assigns each client a random "codename" and broadcasts presence.
// Messages:
// - init: sent to new client with { self, peers }
// - peer-join: broadcast when a client joins
// - peer-leave: broadcast when a client disconnects
// - signal: route WebRTC SDP/ICE payload to a specific peer { to, data }

import express from "express"
import http from "http"
import { WebSocketServer } from "ws"
import { randomUUID } from "crypto"

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const PORT = process.env.PORT || 3001

// In-memory client tracking
// id -> { id, name, ws }
const clients = new Map()

const ADJECTIVES = [
  "Blue",
  "Green",
  "Swift",
  "Quiet",
  "Bold",
  "Golden",
  "Crimson",
  "Azure",
  "Misty",
  "Sunny",
  "Brave",
  "Lucky",
  "Gentle",
  "Silent",
  "Bright",
  "Rapid",
  "Calm",
  "Icy",
  "Amber",
  "Silver",
]
const ANIMALS = [
  "Fox",
  "Panda",
  "Hawk",
  "Otter",
  "Tiger",
  "Wolf",
  "Koala",
  "Falcon",
  "Dolphin",
  "Bear",
  "Eagle",
  "Seal",
  "Lynx",
  "Stag",
  "Bison",
  "Whale",
  "Cobra",
  "Heron",
  "Moose",
  "Raven",
]
function randomName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const b = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  return `${a} ${b}`
}

function broadcast(type, payload, exceptId) {
  const msg = JSON.stringify({ type, ...payload })
  for (const [id, client] of clients) {
    if (exceptId && id === exceptId) continue
    try {
      client.ws.send(msg)
    } catch {}
  }
}

function safeSend(ws, obj) {
  try {
    ws.send(JSON.stringify(obj))
  } catch {}
}

wss.on("connection", (ws) => {
  // Assign ID as incremental counter string or UUID-like
  const id = typeof randomUUID === "function" ? randomUUID() : String(Date.now() + Math.random())
  const name = randomName()
  clients.set(id, { id, name, ws })

  // Send init payload: self and peers list
  const peers = [...clients.values()].filter((c) => c.id !== id).map((c) => ({ id: c.id, name: c.name }))
  safeSend(ws, { type: "init", self: { id, name }, peers })

  // Broadcast join to others
  broadcast("peer-join", { peer: { id, name } }, id)

  ws.on("message", (data) => {
    let msg
    try {
      msg = JSON.parse(data.toString())
    } catch {
      return
    }
    const sender = clients.get(id)
    if (!sender) return

    switch (msg.type) {
      case "signal": {
        // { to, data }
        const target = clients.get(msg.to)
        if (target) {
          safeSend(target.ws, { type: "signal", from: id, data: msg.data })
        }
        break
      }
      case "rename": {
        // Optional: allow clients to rename
        if (typeof msg.name === "string" && msg.name.trim()) {
          sender.name = msg.name.trim()
          broadcast("peer-rename", { id, name: sender.name }, id)
        }
        break
      }
      default:
        // ignore
        break
    }
  })

  ws.on("close", () => {
    clients.delete(id)
    broadcast("peer-leave", { id })
  })
})

server.listen(PORT, () => {
  console.log(`[signaling] listening on :${PORT}`)
})
