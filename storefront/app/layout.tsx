import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '셀리파이 쇼핑몰',
  description: '셀러 전용 쇼핑몰',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">{children}</body>
    </html>
  )
}
