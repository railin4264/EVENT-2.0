'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Star , Smartphone} from 'lucide-react'

// Alias para iconos no disponibles en lucide-react 0.408.0
import { usePWA, useServiceWorker } from '@/hooks/usePWA'

export function InstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const { isInstallable, isInstalled, installApp } = usePWA()

  useEffect(() => {
    // Check if banner was previously dismissed
    const dismissed = localStorage.getItem('install-banner-dismissed')
    if (dismissed) {
      setIsDismissed(true)
      return
    }

    // Show banner if app is installable and not already installed
    if (isInstallable && !isInstalled) {
      // Wait a bit before showing to avoid immediate popup
      const timer = setTimeout(() => {
        setShowBanner(true)
      }, 5000) // Show after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [isInstallable, isInstalled])

  const handleInstall = async () => {
    await installApp()
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    setIsDismissed(true)
    localStorage.setItem('install-banner-dismissed', 'true')
  }

  if (!showBanner || isDismissed || isInstalled) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
        className="fixed bottom-4 left-4 right-4 md:left-6 md:right-6 z-50 max-w-md mx-auto"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Instalar EventConnect
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Instala la app para acceso rápido y experiencia mejorada
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleInstall}
                  className="flex-1 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Instalar
                </motion.button>
                
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export function OfflineBanner() {
  const { isOnline } = useServiceWorker()
  const [showBanner, setShowBanner] = useState(!isOnline)

  useEffect(() => {
    setShowBanner(!isOnline)
  }, [isOnline])

  if (!showBanner) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium"
      >
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full opacity-75" />
          Sin conexión a internet. Algunas funciones pueden no estar disponibles.
        </div>
      </motion.div>
    </AnimatePresence>
  )
}