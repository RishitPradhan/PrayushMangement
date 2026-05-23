import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Prayush Studios — Agency OS',
  description: 'Premium agency management system for Prayush Studios',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable} dark`}>
      <body>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#f0f0f0',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
