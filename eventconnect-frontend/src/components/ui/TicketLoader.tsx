'use client'

import { motion } from 'framer-motion'
import { Star , Ticket} from 'lucide-react'

// Alias para icono no disponible en lucide-react 0.408.0

interface TicketLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
}

export function TicketLoader({
  size = 'md',
  text = 'Cargando eventos...',
  className = ''
}: TicketLoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} text-primary-500 relative`}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{
          rotate: { duration: 2, repeat: Infinity, ease: "linear" },
          scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        <Ticket className="w-full h-full" />

        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-primary-500/20 blur-md"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {text && (
        <motion.p
          className={`${textSizes[size]} text-gray-600 dark:text-gray-400 font-medium`}
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {text}
        </motion.p>
      )}

      {/* Floating dots animation */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary-500 rounded-full"
            animate={{
              y: [-5, 5, -5],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Mini loader for inline use
export function MiniTicketLoader({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`inline-flex items-center justify-center w-4 h-4 text-primary-500 ${className}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    >
      <Ticket className="w-full h-full" />
    </motion.div>
  )
}

// Full screen loader
export function FullScreenTicketLoader({ text = 'Cargando...' }: { text?: string }) {
  return (
    <motion.div
      className="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <TicketLoader size="lg" text={text} />
    </motion.div>
  )
}