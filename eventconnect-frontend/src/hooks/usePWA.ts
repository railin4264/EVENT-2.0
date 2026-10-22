'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const isIOSInstalled = (window.navigator as any).standalone === true
    setIsInstalled(isStandalone || isIOSInstalled)

    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'development') {
      // An old production worker must not serve stale HTML during local development.
      void navigator.serviceWorker.getRegistration().then(registration => registration?.unregister()).catch(() => {})
    }
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          void registration.update().catch(() => {})
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError)
        })
    }

    // Handle install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstallable(false)
        setInstallPrompt(null)
      }
    } catch (error) {
      console.error('Error installing app:', error)
    }
  }

  return {
    isInstallable,
    isInstalled,
    installApp,
  }
}

export function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true)
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const initiallyControlled = Boolean(navigator.serviceWorker?.controller)
    const controllerChanged = () => { if (initiallyControlled) setSwUpdateAvailable(true) }
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', controllerChanged)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged)
    }
  }, [])

  const updateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        await registration?.update()
        registration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
      } catch { /* The user can still reload a network-only build. */ }
    }
    window.location.reload()
  }

  return {
    isOnline,
    swUpdateAvailable,
    updateServiceWorker,
  }
}
