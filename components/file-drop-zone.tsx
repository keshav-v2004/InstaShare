"use client"

import { useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { UploadCloud } from "lucide-react"

type Props = {
  disabled?: boolean
  onFiles: (files: FileList | File[]) => void
}

function FileDropZone({ disabled, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <section>
      <h2 className="text-lg font-medium mb-3">Send Files</h2>
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center transition-colors transition-transform duration-200 ease-out",
          dragOver ? "bg-accent scale-[1.01] ring-2 ring-ring/50" : "hover:bg-muted",
          disabled && "opacity-50 pointer-events-none",
        )}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files)
        }}
        role="region"
        aria-disabled={disabled}
        aria-label="File drop zone"
      >
        <UploadCloud className="h-8 w-8 mb-2 opacity-80" aria-hidden />
        <p className="mb-3 text-sm opacity-80">Drag and drop files here, or</p>
        <Button onClick={() => inputRef.current?.click()} variant="default">
          Choose Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files)
          }}
        />
      </div>
    </section>
  )
}

export { FileDropZone }
export default FileDropZone
