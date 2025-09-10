import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sistema de Contabilidad Postcosecha',
  description: 'Sistema para calcular pagos por entregas de cosecha con reglas condicionales',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <header className="border-b">
            <div className="container mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold">Sistema de Contabilidad Postcosecha</h1>
        <nav className="mt-2">
          <div className="flex space-x-4">
            <a href="/upload" className="text-blue-600 hover:underline">1. Subir Excel</a>
            <a href="/pricing" className="text-blue-600 hover:underline">2. Configurar Precios</a>
            <a href="/export" className="text-blue-600 hover:underline">3. Exportar</a>
          </div>
        </nav>
            </div>
          </header>
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
