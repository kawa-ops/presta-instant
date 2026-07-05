import type { Metadata } from 'next'
import { Inter, Syne } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400', '700', '800'] })

export const metadata: Metadata = {
  title: 'instant. — Post-Production',
  description: 'Gestion des post-productions instant.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${syne.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
