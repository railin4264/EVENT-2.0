'use client'

// Image optimization and lazy loading utilities
export interface ImageOptimizationConfig {
  quality?: number
  width?: number
  height?: number
  format?: 'webp' | 'avif' | 'png' | 'jpg'
  blur?: boolean
}

// Generate optimized image URL
export function getOptimizedImageUrl(
  src: string,
  config: ImageOptimizationConfig = {}
): string {
  if (!src) return ''
  
  // If it's already a data URL or blob, return as is
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src
  }
  
  // For external URLs, return as is (Next.js Image component will handle optimization)
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }
  
  // For relative URLs, construct Next.js optimized URL
  const params = new URLSearchParams()
  
  if (config.quality) params.set('q', config.quality.toString())
  if (config.width) params.set('w', config.width.toString())
  if (config.height) params.set('h', config.height.toString())
  if (config.format) params.set('f', config.format)
  
  const queryString = params.toString()
  return queryString ? `${src}?${queryString}` : src
}

// Generate responsive image sources
export function generateResponsiveSources(
  src: string,
  sizes: number[] = [320, 480, 768, 1024, 1280]
): Array<{ src: string; width: number }> {
  return sizes.map(width => ({
    src: getOptimizedImageUrl(src, { width, quality: 80, format: 'webp' }),
    width
  }))
}

// Preload critical images
export function preloadImage(src: string, priority: boolean = false): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => resolve()
    img.onerror = reject
    
    // Set loading priority
    if (priority) {
      img.loading = 'eager'
    }
    
    img.src = src
  })
}

// Lazy load images with intersection observer
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null
  private imageQueue: Set<HTMLImageElement> = new Set()

  constructor(options: IntersectionObserverInit = {}) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            this.loadImage(img)
          }
        })
      }, {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      })
    }
  }

  observe(img: HTMLImageElement): void {
    if (this.observer) {
      this.observer.observe(img)
      this.imageQueue.add(img)
    } else {
      // Fallback for browsers without IntersectionObserver
      this.loadImage(img)
    }
  }

  private loadImage(img: HTMLImageElement): void {
    const dataSrc = img.getAttribute('data-src')
    const dataSrcSet = img.getAttribute('data-srcset')
    
    if (dataSrc) {
      img.src = dataSrc
      img.removeAttribute('data-src')
    }
    
    if (dataSrcSet) {
      img.srcset = dataSrcSet
      img.removeAttribute('data-srcset')
    }
    
    img.classList.remove('lazy')
    img.classList.add('loaded')
    
    if (this.observer) {
      this.observer.unobserve(img)
    }
    
    this.imageQueue.delete(img)
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
    this.imageQueue.clear()
  }
}

// Create global lazy loader instance
export const globalLazyLoader = typeof window !== 'undefined' ? new LazyImageLoader() : null

// Image compression for file uploads
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          })
          resolve(compressedFile)
        } else {
          resolve(file)
        }
      }, 'image/jpeg', quality)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

// Convert image to WebP format if supported
export function convertToWebP(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    // Check WebP support
    const canvas = document.createElement('canvas')
    const webpSupported = canvas.toDataURL('image/webp').indexOf('image/webp') === 5
    
    if (!webpSupported) {
      resolve(file)
      return
    }
    
    const img = new Image()
    const ctx = canvas.getContext('2d')!
    
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      
      canvas.toBlob((blob) => {
        if (blob) {
          const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
            type: 'image/webp',
            lastModified: Date.now()
          })
          resolve(webpFile)
        } else {
          resolve(file)
        }
      }, 'image/webp', quality)
    }
    
    img.src = URL.createObjectURL(file)
  })
}

// Generate blur placeholder for images
export function generateBlurPlaceholder(width: number = 4, height: number = 3): string {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  
  canvas.width = width
  canvas.height = height
  
  // Create simple gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#f3f4f6')
  gradient.addColorStop(1, '#e5e7eb')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

// Performance monitoring for images
export class ImagePerformanceMonitor {
  private metrics: Map<string, number> = new Map()
  
  startLoad(src: string): void {
    this.metrics.set(src, performance.now())
  }
  
  endLoad(src: string): number {
    const startTime = this.metrics.get(src)
    if (startTime) {
      const loadTime = performance.now() - startTime
      this.metrics.delete(src)
      
      // Log slow loading images
      if (loadTime > 2000) {
        console.warn(`Slow image load: ${src} took ${loadTime.toFixed(2)}ms`)
      }
      
      return loadTime
    }
    return 0
  }
}

export const imagePerformanceMonitor = new ImagePerformanceMonitor()