import { assetRecoveryScript } from './asset-recovery-script'
import vm from 'node:vm'
import { describe, it, expect, vi } from 'vitest'

function run() {
  const listeners: Record<string, (e: any) => void> = {}
  const saved = new Map<string, string>()
  const reload = vi.fn()
  const context = { window: { addEventListener: (name: string, fn: (e: any) => void) => { listeners[name] = fn } }, navigator: { onLine: true }, location: { href: 'https://eventnow.test/plans', origin: 'https://eventnow.test', reload }, sessionStorage: { getItem: (key: string) => saved.get(key), setItem: (key: string, value: string) => saved.set(key, value) }, URL, Date }
  const code = assetRecoveryScript
  vm.runInNewContext(code, context)
  return { listeners, reload, context, code }
}

describe('release asset recovery', () => {
  it('reloads once when a stylesheet from this app fails and caps repeated failures', () => {
    const app = run()
    const error = { target: { tagName: 'LINK', rel: 'stylesheet', href: 'https://eventnow.test/_next/static/css/missing.css' } }
    app.listeners.error(error)
    expect(app.reload).toHaveBeenCalledTimes(1)
    vm.runInNewContext(app.code, app.context)
    app.listeners.error(error)
    expect(app.reload).toHaveBeenCalledTimes(1)
  })
  it('ignores image failures, external scripts and offline errors', () => {
    const app = run()
    app.listeners.error({ target: { tagName: 'IMG', src: 'https://eventnow.test/missing.png' } })
    app.listeners.error({ target: { tagName: 'SCRIPT', src: 'https://example.org/_next/static/missing.js' } })
    app.context.navigator.onLine = false
    app.listeners.unhandledrejection({ reason: new Error('ChunkLoadError') })
    expect(app.reload).not.toHaveBeenCalled()
  })
})
