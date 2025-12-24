"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export default function ThemeToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = useMemo(() => {
    return (resolvedTheme || "light") === "dark"
  }, [resolvedTheme])

  if (!mounted) {
    return (
      <div className={cn("flex items-center gap-2", className)} aria-hidden>
        <span className="text-sm opacity-70">Theme</span>
        <Switch checked={false} disabled />
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm opacity-70">Theme</span>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
    </div>
  )
}
