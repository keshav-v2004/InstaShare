// this has path components/AppClientLayout.tsx

"use client";

import { useState, useEffect } from "react";
import { BootAnimation } from "@/components/ui/boot-animation";
import path from "path";

export default function AppClientLayout({ children }: { children: React.ReactNode }) {
  // Start in booting state by default
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    // Check if the animation has already run in this session
    if (sessionStorage.getItem("booted")) {
      setIsBooting(false);
    }
  }, []);

  const handleBootFinished = () => {
    // Mark as booted in session storage and update state
    sessionStorage.setItem("booted", "true");
    setIsBooting(false);
  };

  return (
    <>
      {isBooting && <BootAnimation onFinished={handleBootFinished} />}
      {/* The main content is always rendered, but hidden behind the animation */}
      {children}
    </>
  );
}