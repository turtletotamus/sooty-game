import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeScript } from "@/components/theme-script"
import { LanguageProvider } from "@/components/language-context"
import { BackgroundSoundProvider } from "@/components/background-sound-context"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Sooty - Desktop Pet',
  description: 'Meet Sooty, your adorable desktop companion! Feed, play, and care for your very own Soot Sprite.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`font-sans antialiased`}>
        <LanguageProvider>
          <BackgroundSoundProvider>
            {children}
            <Analytics />
          </BackgroundSoundProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
