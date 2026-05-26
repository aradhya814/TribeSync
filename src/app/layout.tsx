import type { Metadata } from 'next'

import { Providers } from '@/components/shared/Providers'

import './globals.css'

export const metadata: Metadata = {
  title: 'TribeSync',
  description: 'Agentic influencer deal infrastructure for Indian MSMEs.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
