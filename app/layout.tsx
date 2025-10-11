import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import AppClientLayout from "@/components/AppClientLayout"; // 1. Import the wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "P2P File Transfer",
  description: "Share files directly, device-to-device with WebRTC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        {/* 2. Wrap the children with AppClientLayout */}
        <AppClientLayout>
          {children}
        </AppClientLayout>

        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}