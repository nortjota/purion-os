import type { Metadata } from 'next'
import { Montserrat } from 'next/font/google'
import './globals.css'
import { StoreProvider }  from '@/components/providers/StoreProvider'
import { ThemeProvider }  from '@/components/providers/ThemeProvider'
import { AuthProvider }   from '@/components/providers/AuthProvider'
import { ConditionalShell } from '@/components/layout/ConditionalShell'

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s — PURION OS',
    default: 'PURION OS',
  },
  description: 'Sistema operacional para marcas DTC',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${montserrat.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <ThemeProvider>
          <AuthProvider>
            <StoreProvider>
              <ConditionalShell>
                {children}
              </ConditionalShell>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
