import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Product Image AI Generator',
  description: 'Gere imagens de produto com Nano Banana e DALL-E 3',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
