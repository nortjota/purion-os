import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { StoreProvider }  from '@/components/providers/StoreProvider'
import { ThemeProvider }  from '@/components/providers/ThemeProvider'
import { AuthProvider }   from '@/components/providers/AuthProvider'
import { ConditionalShell } from '@/components/layout/ConditionalShell'
import { ToastProvider } from '@/components/ui/Toast'

// Brand Book PURION GT: Archivo (títulos — substituta oficial da Grift),
// Geist (texto) e Geist Mono (rótulos, números, preço).
// Fontes servidas do próprio repositório (variáveis, subset latin): o build não depende
// mais do Google Fonts — falhas intermitentes de download derrubavam deploys na Vercel.
const archivo = localFont({
  src: './fonts/archivo.woff2',
  variable: '--font-archivo',
  weight: '100 900',
  display: 'swap',
})
const geist = localFont({
  src: './fonts/geist.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
})
const geistMono = localFont({
  src: './fonts/geist-mono.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: 'PURION OS — %s',
    default: 'PURION OS',
  },
  description: 'Sistema operacional para marcas DTC',
  icons: [
    { rel: 'icon', url: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'icon', url: '/favicon.ico', sizes: '32x32' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${geist.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <ToastProvider>
                <ConditionalShell>
                  {children}
                </ConditionalShell>
              </ToastProvider>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
