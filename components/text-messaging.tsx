// this has path components/text-messaging.tsx

"use client"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Send, MessageSquare, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TextMessage } from "@/hooks/use-webrtc"

type Props = {
  messages: TextMessage[]
  selectedPeerId: string | null
  selectedPeerName?: string
  onSendMessage: (text: string) => Promise<boolean>
  disabled?: boolean
}

export default function TextMessaging({
  messages,
  selectedPeerId,
  selectedPeerName,
  onSendMessage,
  disabled,
}: Props) {
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter messages for selected peer
  const filteredMessages = messages.filter((m) => m.peerId === selectedPeerId)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredMessages.length, isExpanded])

  const handleSend = async () => {
    if (!inputText.trim() || isSending || disabled) return

    setIsSending(true)
    const success = await onSendMessage(inputText)
    setIsSending(false)

    if (success) {
      setInputText("")
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Count unread messages (simple implementation - all received messages from current peer)
  const unreadCount = filteredMessages.filter(m => m.direction === "received").length

  if (!isExpanded) {
    // Collapsed view - floating button
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg relative"
          onClick={() => setIsExpanded(true)}
          title={!selectedPeerId ? "Select a peer first" : "Open messages"}
        >
          <MessageSquare className="h-6 w-6" />
          {unreadCount > 0 && selectedPeerId && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </div>
    )
  }

  return (
    <Card className="fixed bottom-6 right-6 w-96 h-[500px] z-50 flex flex-col shadow-2xl animate-slide-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-sm">
              {selectedPeerName || "Messages"}
            </h3>
            {selectedPeerId && (
              <p className="text-xs text-muted-foreground">
                {filteredMessages.length} message{filteredMessages.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {!selectedPeerId ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">Select a peer to start messaging</p>
            <p className="text-xs text-muted-foreground mt-1">Choose a device from "Nearby Devices" above</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Send className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">Send the first message to {selectedPeerName}!</p>
          </div>
        ) : (
          filteredMessages
            .slice()
            .reverse()
            .map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.direction === "sent" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    msg.direction === "sent"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-card">
        {!selectedPeerId && (
          <p className="text-xs text-muted-foreground text-center mb-2">
            Select a peer from "Nearby Devices" to start messaging
          </p>
        )}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled || !selectedPeerId
                ? "Select a peer first..."
                : "Type a message..."
            }
            disabled={disabled || !selectedPeerId || isSending}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            onClick={handleSend}
            disabled={!inputText.trim() || disabled || !selectedPeerId || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

export { TextMessaging }