import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { assetRecoveryScript } from '@/lib/asset-recovery-script'
import '../styles/globals.css'
import Providers from '@/lib/providers/Providers'
import ClientLayout from '@/components/layout/ClientLayout'
import { ErrorBoundary } from '@/components/redesign/ui/error-boundary'
import { Toaster } from 'react-hot-toast'
import GeolocationNotificationProvider from '@/components/providers/GeolocationNotificationProvider'

const inter = localFont({ src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', variable: '--font-inter', weight: '100 900', display: 'swap' })
const outfit = localFont({ src: '../../node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', variable: '--font-outfit', weight: '100 900', display: 'swap' })

export const metadata: Metadata = {
  title: {
    default: 'EventNow',
    template: '%s | EventNow'
  },
  description: 'Descubre eventos, encuentra tu comunidad y organiza planes cerca de ti.',
  keywords: ['events', 'social', 'community', 'networking', 'meetups', 'activities'],
  authors: [{ name: 'EventNow' }],
  creator: 'EventNow',
  publisher: 'EventNow',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'es_DO',
    url: '/',
    title: 'EventNow',
    description: 'Descubre eventos, encuentra tu comunidad y organiza planes cerca de ti.',
    siteName: 'EventNow',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EventNow',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EventNow',
    description: 'Descubre eventos, encuentra tu comunidad y organiza planes cerca de ti.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
  },
  verification: {
    google: process.env.GOOGLE_VERIFICATION_ID,
  },
  appleWebApp: {
    statusBarStyle: 'default',
    title: 'EventNow',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning className="dark">
      <head><script id="asset-recovery" dangerouslySetInnerHTML={{ __html: assetRecoveryScript }} /></head>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-background focus:p-4 focus:text-foreground">Saltar al contenido</a>
        <Providers>
          <ErrorBoundary>
            <GeolocationNotificationProvider />

            <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-background" />

            <div id="root" className="min-h-screen text-foreground">
              <ClientLayout>
                {children}
              </ClientLayout>
            </div>
            <div id="portal-root" />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'rgba(9,9,14,0.9)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(139,92,246,0.20)',
                  color: '#F8FAFC',
                  borderRadius: '12px',
                },
              }}
            />
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
