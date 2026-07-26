'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Music, Trophy, Laptop, Palette, Utensils, Users, Heart, Camera, Book, Plane } from 'lucide-react'

export const AVAILABLE_INTERESTS = [
  { id: 'music', label: 'Música', icon: Music, color: 'from-purple-500 to-pink-500' },
  { id: 'sports', label: 'Deportes', icon: Trophy, color: 'from-green-500 to-emerald-500' },
  { id: 'technology', label: 'Tecnología', icon: Laptop, color: 'from-blue-500 to-cyan-500' },
  { id: 'art', label: 'Arte', icon: Palette, color: 'from-orange-500 to-red-500' },
  { id: 'food', label: 'Gastronomía', icon: Utensils, color: 'from-yellow-500 to-orange-500' },
  { id: 'networking', label: 'Networking', icon: Users, color: 'from-indigo-500 to-purple-500' },
  { id: 'wellness', label: 'Bienestar', icon: Heart, color: 'from-pink-500 to-rose-500' },
  { id: 'photography', label: 'Fotografía', icon: Camera, color: 'from-gray-500 to-slate-500' },
  { id: 'education', label: 'Educación', icon: Book, color: 'from-teal-500 to-cyan-500' },
  { id: 'travel', label: 'Viajes', icon: Plane, color: 'from-sky-500 to-blue-500' }
]

interface InterestsSelectorProps {
  selectedInterests: string[]
  onChange: (interests: string[]) => void
  min?: number
  max?: number
}

export default function InterestsSelector({
  selectedInterests,
  onChange,
  min = 3,
  max = 5
}: InterestsSelectorProps) {
  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      onChange(selectedInterests.filter(id => id !== interestId))
    } else {
      if (selectedInterests.length < max) {
        onChange([...selectedInterests, interestId])
      }
    }
  }

  const isSelected = (interestId: string) => selectedInterests.includes(interestId)
  const isMaxReached = selectedInterests.length >= max

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Selecciona tus intereses
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Elige entre {min} y {max} categorías que te interesen
          </p>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {selectedInterests.length}/{max}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {AVAILABLE_INTERESTS.map((interest) => {
          const Icon = interest.icon
          const selected = isSelected(interest.id)
          const disabled = !selected && isMaxReached

          return (
            <motion.button
              key={interest.id}
              type="button"
              onClick={() => toggleInterest(interest.id)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.05 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              className={`
                relative p-4 rounded-xl border-2 transition-all
                ${selected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }
                ${disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer'
                }
              `}
            >
              {/* Icon with gradient */}
              <div className={`
                inline-flex items-center justify-center w-12 h-12 rounded-xl mb-2
                bg-gradient-to-br ${interest.color}
              `}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Label */}
              <div className="text-left">
                <p className={`
                  text-sm font-medium
                  ${selected
                    ? 'text-primary-700 dark:text-primary-300'
                    : 'text-gray-700 dark:text-gray-300'
                  }
                `}>
                  {interest.label}
                </p>
              </div>

              {/* Selected indicator */}
              {selected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          )
        })}
      </div>

      {/* Validation message */}
      {selectedInterests.length < min && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Selecciona al menos {min} intereses para personalizar tu experiencia
        </p>
      )}
    </div>
  )
}
