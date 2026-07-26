// Throttled logger to prevent excessive error messages

interface LogEntry {
  timestamp: number
  count: number
}

class ThrottledLogger {
  private errorCache = new Map<string, LogEntry>()
  private readonly throttleWindow = 5000 // 5 seconds
  private readonly maxOccurrences = 3

  error(message: string, ...args: any[]) {
    const key = this.getKey(message)
    const now = Date.now()
    const entry = this.errorCache.get(key)

    if (!entry) {
      // First occurrence
      this.errorCache.set(key, { timestamp: now, count: 1 })
      console.error(message, ...args)
      return
    }

    // Check if within throttle window
    if (now - entry.timestamp < this.throttleWindow) {
      entry.count++
      // Only log if under max occurrences
      if (entry.count <= this.maxOccurrences) {
        console.error(message, ...args)
      } else if (entry.count === this.maxOccurrences + 1) {
        console.error(`[THROTTLED] Previous error occurred ${entry.count} times. Suppressing further logs for ${this.throttleWindow/1000}s`)
      }
    } else {
      // Reset window
      this.errorCache.set(key, { timestamp: now, count: 1 })
      console.error(message, ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    const key = this.getKey(message)
    const now = Date.now()
    const entry = this.errorCache.get(key)

    if (!entry) {
      this.errorCache.set(key, { timestamp: now, count: 1 })
      console.warn(message, ...args)
      return
    }

    if (now - entry.timestamp < this.throttleWindow) {
      entry.count++
      if (entry.count <= this.maxOccurrences) {
        console.warn(message, ...args)
      }
    } else {
      this.errorCache.set(key, { timestamp: now, count: 1 })
      console.warn(message, ...args)
    }
  }

  info(message: string, ...args: any[]) {
    console.log(message, ...args)
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(message, ...args)
    }
  }

  private getKey(message: string): string {
    // Create a key based on the first 100 chars of the message
    return message.slice(0, 100)
  }

  // Clean up old entries
  cleanup() {
    const now = Date.now()
    const keysToDelete: string[] = []
    this.errorCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.throttleWindow * 2) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.errorCache.delete(key))
  }
}

export const logger = new ThrottledLogger()

// Auto cleanup every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => logger.cleanup(), 30000)
}