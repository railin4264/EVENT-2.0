'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Check, Info } from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0
const HelpCircle = Info
import { cn } from '@/lib/utils'
import { Button } from './Button'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type ModalType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'confirmation'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: React.ReactNode
  size?: ModalSize
  type?: ModalType
  showCloseButton?: boolean
  closeOnOverlay?: boolean
  closeOnEscape?: boolean
  preventClose?: boolean
  className?: string
  overlayClassName?: string
  contentClassName?: string
  footer?: React.ReactNode
  icon?: React.ComponentType<any>
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[95vw] max-h-[95vh]'
}

const typeConfig: Record<ModalType, { icon: React.ComponentType<any>; colorClass: string }> = {
  default: { icon: Info, colorClass: 'text-gray-500' },
  success: { icon: Check, colorClass: 'text-green-500' },
  error: { icon: AlertTriangle, colorClass: 'text-red-500' },
  warning: { icon: AlertTriangle, colorClass: 'text-yellow-500' },
  info: { icon: Info, colorClass: 'text-blue-500' },
  confirmation: { icon: HelpCircle, colorClass: 'text-orange-500' }
}

export function EnhancedModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  type = 'default',
  showCloseButton = true,
  closeOnOverlay = true,
  closeOnEscape = true,
  preventClose = false,
  className,
  overlayClassName,
  contentClassName,
  footer,
  icon: CustomIcon
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!closeOnEscape) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !preventClose) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, closeOnEscape, preventClose])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlay && !preventClose) {
      onClose()
    }
  }

  const handleClose = () => {
    if (!preventClose) {
      onClose()
    }
  }

  if (!mounted) return null

  const IconComponent = CustomIcon || typeConfig[type].icon

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'absolute inset-0 bg-black/50 backdrop-blur-sm',
              overlayClassName
            )}
            onClick={handleOverlayClick}
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className={cn(
              'relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full mx-4',
              sizeClasses[size],
              size === 'full' && 'h-full overflow-hidden',
              contentClassName
            )}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  {(IconComponent || type !== 'default') && (
                    <div className={cn('p-2 rounded-full bg-gray-100 dark:bg-gray-700', typeConfig[type].colorClass)}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    {title && (
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {title}
                      </h2>
                    )}
                    {description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
                
                {showCloseButton && !preventClose && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={cn(
              'p-6',
              size === 'full' && 'flex-1 overflow-auto'
            )}>
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// Confirmation modal hook
export function useConfirmationModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void | Promise<void>
    onCancel?: () => void
    type?: ModalType
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const confirm = (options: {
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    type?: ModalType
  }) => {
    return new Promise<boolean>((resolve) => {
      setConfig({
        ...options,
        onConfirm: async () => {
          setIsLoading(true)
          try {
            resolve(true)
          } finally {
            setIsLoading(false)
            setIsOpen(false)
          }
        },
        onCancel: () => {
          resolve(false)
          setIsOpen(false)
        }
      })
      setIsOpen(true)
    })
  }

  const ConfirmationModal = () => {
    if (!config) return null

    return (
      <EnhancedModal
        isOpen={isOpen}
        onClose={() => config.onCancel?.()}
        title={config.title}
        description={config.description}
        type={config.type || 'confirmation'}
        size="sm"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => config.onCancel?.()}
              disabled={isLoading}
            >
              {config.cancelText || 'Cancelar'}
            </Button>
            <Button
              onClick={() => config.onConfirm()}
              disabled={isLoading}
              className={cn(
                config.type === 'error' && 'bg-red-600 hover:bg-red-700',
                config.type === 'warning' && 'bg-yellow-600 hover:bg-yellow-700'
              )}
            >
              {isLoading ? 'Procesando...' : (config.confirmText || 'Confirmar')}
            </Button>
          </div>
        }
      />
    )
  }

  return { confirm, ConfirmationModal }
}

// Alert modal hook
export function useAlertModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    description?: string
    buttonText?: string
    type?: ModalType
  } | null>(null)

  const alert = (options: {
    title: string
    description?: string
    buttonText?: string
    type?: ModalType
  }) => {
    return new Promise<void>((resolve) => {
      setConfig({
        ...options,
      })
      setIsOpen(true)
      
      // Auto resolve when modal closes
      const timer = setTimeout(() => {
        resolve()
      }, 100)
      
      return () => clearTimeout(timer)
    })
  }

  const AlertModal = () => {
    if (!config) return null

    return (
      <EnhancedModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={config.title}
        description={config.description}
        type={config.type || 'info'}
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setIsOpen(false)}>
              {config.buttonText || 'Entendido'}
            </Button>
          </div>
        }
      />
    )
  }

  return { alert, AlertModal }
}

// Quick action modals
export const modalHelpers = {
  success: (title: string, description?: string) => {
    // Implementation would use a modal store or context
    console.log('Success modal:', { title, description })
  },
  
  error: (title: string, description?: string) => {
    console.log('Error modal:', { title, description })
  },
  
  confirm: (title: string, description?: string) => {
    return new Promise<boolean>((resolve) => {
      // Implementation would use a modal store or context
      console.log('Confirm modal:', { title, description })
      resolve(window.confirm(title))
    })
  }
}