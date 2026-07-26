'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Settings, X, Eye, EyeOff } from 'lucide-react'
import { setDebugMode, isDebugMode, resetSessionErrorCount } from '@/lib/utils/errorConfig'

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [debugEnabled, setDebugEnabled] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === 'development') {
      setVisible(true)
      setDebugEnabled(isDebugMode())
    }
  }, [])

  const handleToggleDebug = () => {
    const newState = !debugEnabled
    setDebugEnabled(newState)
    setDebugMode(newState)
    resetSessionErrorCount()
  }

  if (!visible) return null

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-[9999] p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Debug Panel"
      >
        <AlertCircle className="w-5 h-5" />
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed bottom-20 right-4 z-[9998] w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Debug Panel</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Error Reporting Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Error Reporting
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Send console errors to backend
                  </p>
                </div>
                <button
                  onClick={handleToggleDebug}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    debugEnabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                  }`}
                >
                  {debugEnabled ? (
                    <>
                      <Eye className="w-3 h-3" />
                      ON
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3 h-3" />
                      OFF
                    </>
                  )}
                </button>
              </div>

              {/* Clear Cache */}
              <div>
                <button
                  onClick={() => {
                    localStorage.clear()
                    sessionStorage.clear()
                    window.location.reload()
                  }}
                  className="w-full px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Cache & Reload
                </button>
              </div>

              {/* Environment Info */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>Environment: {process.env.NODE_ENV}</div>
                  <div>API: {process.env.NEXT_PUBLIC_API_URL}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default DebugPanel