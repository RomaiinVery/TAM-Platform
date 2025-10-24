import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import ConnectWallet from '@/components/ConnectWallet';
import Nav from '@/components/Nav';
import { Playfair_Display } from 'next/font/google'
const brandFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-brand',
})

export const metadata: Metadata = {
  title: 'TAM Platform',
  description: 'RWA ↔︎ DeFi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${brandFont.variable} h-full`}>
      <body className="min-h-screen bg-neutral-800 text-white antialiased">
        <Providers>
          <header className="sticky top-0 z-30 bg-neutral-800 shadow-sm">
            <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 px-4 py-3">
              <a href="/" className="shrink-0">
                <h1 className="font-brand text-3xl sm:text-4xl tracking-tight">
                  TAM Platform
                </h1>
              </a>

              <div className="flex-1 hidden md:flex justify-center">
                <Nav />
              </div>

              <div className="shrink-0">
                <ConnectWallet />
              </div>
            </div>

            <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
              <Nav />
            </div>
          </header>

          <main className="mx-auto max-w-6xl p-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
