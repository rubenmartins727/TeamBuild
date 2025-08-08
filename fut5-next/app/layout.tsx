import './globals.css'
import type { Metadata } from 'next'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Fut5 — Gestor de Equipas 5×5',
  description: 'Cria a lista de 10, cada um propõe as equipas, e vemos o consenso.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <Toaster richColors />
        {children}
      </body>
    </html>
  )
}
