'use client'

import { useEffect, useState } from 'react'
import { CloudSun, Droplets, Wind, AlertCircle, Sun, CloudRain } from 'lucide-react'

interface WeatherData {
  temperature: number
  humidity: number
  precipitation: number
  windSpeed: number
  weatherCode: number
  conditionLabel: string
  advice: string
  icon: 'sun' | 'cloud-sun' | 'rain' | 'cloud'
}

function getWeatherInfo(code: number, rain: number): { condition: string; advice: string; icon: 'sun' | 'cloud-sun' | 'rain' | 'cloud' } {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { condition: 'Nieve', advice: 'Condiciones actuales en la zona. Revisa el pronóstico y las indicaciones del organizador antes de salir.', icon: 'cloud' }
  if (rain > 1 || [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
    return {
      condition: code >= 95 ? 'Tormenta eléctrica' : 'Lluvia',
      advice: '🌧️ Alta probabilidad de agua. Si el evento es al aire libre, lleva paraguas o ten un Plan B techado.',
      icon: 'rain'
    }
  }
  if ([51, 53, 55].includes(code)) {
    return {
      condition: 'Llovizna ligera',
      advice: '🌦️ Llovizna fresca pasajera. Clima fresco para salir con un abrigo ligero.',
      icon: 'cloud-sun'
    }
  }
  if ([1, 2, 3].includes(code)) {
    return {
      condition: 'Parcialmente nublado con brisa',
      advice: 'Condiciones actuales. Consulta el pronóstico de la fecha del evento antes de salir.',
      icon: 'cloud-sun'
    }
  }
  return {
    condition: code === 0 ? 'Cielo despejado' : 'Condiciones variables',
    advice: 'Condiciones actuales. No representan el pronóstico para la fecha del evento.',
    icon: code === 0 ? 'sun' : 'cloud'
  }
}

interface EventWeatherCardProps {
  coordinates?: [number, number]
  locationName?: string
}

export default function EventWeatherCard({ coordinates, locationName }: EventWeatherCardProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const validCoordinates = Array.isArray(coordinates) && coordinates.length === 2 && coordinates.every(Number.isFinite) && Math.abs(coordinates[0]) <= 180 && Math.abs(coordinates[1]) <= 90
  const [lng, lat] = validCoordinates ? coordinates! : [undefined, undefined]

  useEffect(() => {
    if (!validCoordinates) { setWeather(null); setLoading(false); return }
    let isMounted = true
    async function fetchWeather() {
      setLoading(true)
      setError(false)
      setWeather(null)
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Weather API error')
        const data = await res.json()
        const cur = data.current
        if (!cur) throw new Error('No current weather')

        const info = getWeatherInfo(cur.weather_code, cur.precipitation)
        if (isMounted) {
          setWeather({
            temperature: Math.round(cur.temperature_2m),
            humidity: Math.round(cur.relative_humidity_2m),
            precipitation: cur.precipitation,
            windSpeed: Math.round(cur.wind_speed_10m),
            weatherCode: cur.weather_code,
            conditionLabel: info.condition,
            advice: info.advice,
            icon: info.icon
          })
        }
      } catch {
        if (isMounted) setError(true)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void fetchWeather()
    return () => { isMounted = false }
  }, [lat, lng, validCoordinates])

  if (error || (!loading && !weather)) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/40 via-blue-950/20 to-slate-900/60 p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between pb-3 border-b border-sky-500/10">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
            {weather?.icon === 'sun' ? <Sun className="h-4 w-4" /> : weather?.icon === 'rain' ? <CloudRain className="h-4 w-4" /> : <CloudSun className="h-4 w-4" />}
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Clima actual en la zona
            </h4>
            <p className="text-xs text-gray-400">
              {locationName ? locationName : 'Zona del evento'} · Open-Meteo
            </p>
          </div>
        </div>

        {weather && (
          <div className="text-right">
            <span className="text-2xl font-extrabold text-white">{weather.temperature}°C</span>
            <span className="block text-[11px] font-medium text-sky-300">{weather.conditionLabel}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-4 text-center text-xs text-gray-400 animate-pulse">
          Consultando condiciones actuales de la zona…
        </div>
      ) : weather ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-4 text-xs text-gray-300">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-cyan-400" />
              <span>Humedad: {weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5 text-sky-400" />
              <span>Brisa: {weather.windSpeed} km/h</span>
            </div>
            {weather.precipitation > 0 && (
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Lluvia: {weather.precipitation} mm</span>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-sky-950/40 p-2.5 text-xs text-sky-200 border border-sky-500/20">
            {weather.advice}
          </div>
        </div>
      ) : null}
    </div>
  )
}
