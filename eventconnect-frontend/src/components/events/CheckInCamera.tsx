'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { isAdmissionCode } from './check-in-contract'

export function CheckInCamera({ onCode, onStart, disabled }: { onCode: (code: string) => void; onStart: () => void; disabled: boolean }) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const generation = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const [active, setActive] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')

  const stop = useCallback(() => {
    generation.current++
    clearTimeout(timer.current)
    stream.current?.getTracks().forEach(track => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }, [])

  useEffect(() => {
    const suspend = () => { stop(); setActive(false); setStarting(false) }
    const visibility = () => { if (document.hidden) suspend() }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('pagehide', suspend)
    return () => { stop(); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', suspend) }
  }, [stop])

  useEffect(() => { if (disabled) { stop(); setActive(false); setStarting(false) } }, [disabled, stop])

  async function start() {
    if (starting || active || disabled) return
    setError('')
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('La cámara necesita HTTPS o localhost y un navegador compatible. Puedes usar el código manual.')
      return
    }
    onStart()
    stop()
    const run = generation.current
    setStarting(true)
    try {
      const { default: decode } = await import('jsqr')
      if (run !== generation.current) return
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } })
      if (run !== generation.current || document.hidden) { media.getTracks().forEach(track => track.stop()); return }
      stream.current = media
      if (!video.current) { stop(); return }
      video.current.srcObject = media
      await video.current.play()
      if (run !== generation.current) return
      setActive(true)
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('No se pudo preparar el lector')
      const scan = () => {
        if (run !== generation.current) return
        try {
        const player = video.current
        if (player && player.readyState >= 2 && player.videoWidth > 0) {
          canvas.width = Math.min(player.videoWidth, 720)
          canvas.height = Math.round(canvas.width * player.videoHeight / player.videoWidth)
          context.drawImage(player, 0, 0, canvas.width, canvas.height)
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
          const result = decode(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' })
          if (result && isAdmissionCode(result.data)) {
            stop(); setActive(false); setStarting(false); onCode(result.data.trim()); return
          }
          if (result) setError('Este QR no es una entrada EventNow válida. Busca el código EC de la boleta.')
        }
        timer.current = setTimeout(scan, 160)
        } catch {
          stop(); setActive(false); setStarting(false)
          setError('No se pudo leer la cámara. Reinicia el lector o usa el código manual.')
        }
      }
      scan()
    } catch (failure) {
      if (run !== generation.current) return
      stop(); setActive(false); setStarting(false)
      const name = (failure as Error)?.name
      setError(name === 'NotAllowedError' ? 'No se permitió usar la cámara. Habilítala en el navegador o pega el código manual.' : 'No se pudo abrir la cámara. Comprueba que esté disponible o usa el código manual.')
    } finally {
      if (run === generation.current) setStarting(false)
    }
  }

  return <div className="mt-7 rounded-2xl border border-border bg-card p-5">
    <h2 className="font-semibold">Escanear con la cámara</h2>
    <p className="mt-2 text-sm text-muted-foreground">Apunta al QR completo. La entrada se confirma con el servidor; necesitas conexión.</p>
    <video ref={video} muted playsInline aria-label="Vista de la cámara para leer entradas" className={`mt-4 aspect-video w-full rounded-xl bg-black object-cover ${active || starting ? '' : 'hidden'}`} />
    <button type="button" disabled={disabled || starting} onClick={() => { if (active) { stop(); setActive(false); setStarting(false) } else void start() }} className="mt-4 w-full rounded-xl border border-primary px-4 py-3 font-semibold text-primary disabled:opacity-50">{starting ? 'Abriendo cámara…' : active ? 'Detener cámara' : 'Activar cámara'}</button>
    {error && <p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-300">{error}</p>}
  </div>
}
