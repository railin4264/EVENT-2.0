'use client'

import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface ParallaxCardProps {
    children: React.ReactNode
    className?: string
    onClick?: () => void
    disabled?: boolean
}

export default function ParallaxCard({ children, className = '', onClick, disabled = false }: ParallaxCardProps) {
    const ref = useRef<HTMLDivElement>(null)

    // Motion values for mouse position
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    // Smooth spring physics for natural feeling
    const springConfig = { damping: 20, stiffness: 200, mass: 0.5 }
    const mouseXSpring = useSpring(x, springConfig)
    const mouseYSpring = useSpring(y, springConfig)

    // Transform mouse position into rotation degrees (-5 to 5 degrees)
    // Adjusted for standard web mouse behavior
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7deg', '-7deg'])
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7deg', '7deg'])

    // Glare effect transforms
    const backgroundX = useTransform(mouseXSpring, [-0.5, 0.5], ['100%', '0%'])
    const backgroundY = useTransform(mouseYSpring, [-0.5, 0.5], ['100%', '0%'])

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (disabled || !ref.current) return
        const rect = ref.current.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        // Calculate relative mouse position (-0.5 to 0.5)
        const mouseX = (e.clientX - rect.left) / width - 0.5
        const mouseY = (e.clientY - rect.top) / height - 0.5
        x.set(mouseX)
        y.set(mouseY)
    }

    const handleMouseLeave = () => {
        if (disabled) return
        x.set(0)
        y.set(0)
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            style={{
                rotateX: disabled ? 0 : rotateX,
                rotateY: disabled ? 0 : rotateY,
                transformStyle: 'preserve-3d',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-2xl transition-all duration-200 ease-out cursor-pointer ${className}`}
        >
            {/* Glare effect */}
            {!disabled && (
                <motion.div
                    className="absolute inset-0 z-50 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                        background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 80%)',
                        left: backgroundX,
                        top: backgroundY,
                        width: '200%',
                        height: '200%',
                        transform: 'translate(-50%, -50%)',
                        mixBlendMode: 'overlay',
                    }}
                />
            )}

            {/* Elevate children to pop out */}
            <div
                style={{ transform: disabled ? 'none' : 'translateZ(30px)' }}
                className="w-full h-full relative z-10"
            >
                {children}
            </div>
        </motion.div>
    )
}
