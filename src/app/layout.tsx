import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionPreferenceProvider } from "@/features/settings/motion-preference-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ChessForge",
    template: "%s | ChessForge",
  },
  description:
    "A local-first chess analysis and video creation studio. Import games, study with Stockfish, and build chess videos in the browser.",
  applicationName: "ChessForge",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-motion="full"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <TooltipProvider delayDuration={180}>{children}</TooltipProvider>
        <Toaster position="bottom-right" />
        <MotionPreferenceProvider />
      </body>
    </html>
  );
}
