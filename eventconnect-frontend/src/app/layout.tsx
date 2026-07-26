import type { Metadata, Viewport } from 'next'
import { Inter, Outfit } from 'next/font/google'
import '../styles/globals.css'
import Providers from '@/lib/providers/Providers'
import ClientLayout from '@/components/layout/ClientLayout'
import { ErrorBoundary } from '@/components/redesign/ui/error-boundary'
import { Toaster } from 'react-hot-toast'
import GeolocationNotificationProvider from '@/components/providers/GeolocationNotificationProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: {
    default: 'EventConnect 2.0',
    template: '%s | EventConnect 2.0'
  },
  description: 'Discover amazing events, connect with like-minded people, and create unforgettable experiences.',
  keywords: ['events', 'social', 'community', 'networking', 'meetups', 'activities'],
  authors: [{ name: 'EventConnect Team' }],
  creator: 'EventConnect Team',
  publisher: 'EventConnect',
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
    locale: 'en_US',
    url: '/',
    title: 'EventConnect 2.0',
    description: 'Discover amazing events, connect with like-minded people, and create unforgettable experiences.',
    siteName: 'EventConnect 2.0',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EventConnect 2.0',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EventConnect 2.0',
    description: 'Discover amazing events, connect with like-minded people, and create unforgettable experiences.',
    images: ['/og-image.png'],
    creator: '@eventconnect',
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
    title: 'EventConnect 2.0',
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
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning className="dark">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          <ErrorBoundary>
            <GeolocationNotificationProvider />

            {/* ── Dark & Electric Aurora Background ──────────────── */}
            <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden" style={{ background: '#04040A' }}>

              {/* Primary violet aurora — top left */}
              <div
                className="absolute top-[-20%] left-[-15%] w-[65%] h-[70%] rounded-full opacity-60 animate-aurora"
                style={{
                  background: 'radial-gradient(ellipse, rgba(139,92,246,0.22) 0%, transparent 70%)',
                  filter: 'blur(80px)',
                  animationDuration: '14s',
                }}
              />
              {/* Cyan aurora — top right */}
              <div
                className="absolute top-[-5%] right-[-10%] w-[55%] h-[55%] rounded-full opacity-50"
                style={{
                  background: 'radial-gradient(ellipse, rgba(6,182,212,0.18) 0%, transparent 70%)',
                  filter: 'blur(90px)',
                  animation: 'aurora 16s ease-in-out infinite alternate-reverse',
                }}
              />
              {/* Pink aurora — bottom center */}
              <div
                className="absolute bottom-[-15%] left-[25%] w-[50%] h-[55%] rounded-full opacity-40"
                style={{
                  background: 'radial-gradient(ellipse, rgba(236,72,153,0.16) 0%, transparent 70%)',
                  filter: 'blur(100px)',
                  animation: 'aurora 18s ease-in-out 3s infinite alternate',
                }}
              />
              {/* Small sharp accent — center */}
              <div
                className="absolute top-[35%] left-[45%] w-[20%] h-[20%] rounded-full opacity-30"
                style={{
                  background: 'radial-gradient(ellipse, rgba(139,92,246,0.35) 0%, transparent 70%)',
                  filter: 'blur(40px)',
                  animation: 'pulse 6s ease-in-out infinite',
                }}
              />
              {/* Noise texture overlay */}
              <div className="absolute inset-0 opacity-[0.025]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
              />
              {/* Subtle grid */}
              <div className="absolute inset-0 opacity-[0.025]"
                style={{ backgroundImage: 'linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
              />
            </div>

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