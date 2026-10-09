import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "E-Rakshak AI — Emergency Care Resource Orchestration Platform",
  description:
    "E-Rakshak AI is an AI-powered emergency-care resource orchestration platform that connects emergency cases with the right ambulances, hospitals, and specialists in real time.",
  keywords: [
    "emergency care",
    "resource orchestration",
    "ambulance dispatch",
    "hospital matching",
    "AI triage",
  ],
  authors: [{ name: "E-Rakshak AI Team" }],
  openGraph: {
    title: "E-Rakshak AI",
    description: "Emergency Care Resource Orchestration Platform",
    type: "website",
  },
};

import { Suspense } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Suspense fallback={<div>Loading...</div>}>
            <AppShell>
              {children}
            </AppShell>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
