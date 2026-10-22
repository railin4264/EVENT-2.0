'use client';

import React, { useEffect, useState } from 'react';
import { CloudRain, Wind, Droplets, ShieldAlert, Sparkles, SunMedium } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  precipitationProbability: number;
  weatherCode: number;
  label: string;
  emoji: string;
  condition: string;
  advice: string;
  isOutdoorFriendly: boolean;
  timestamp: string;
}

interface EventWeatherBadgeProps {
  eventId: string;
  isVirtual?: boolean;
}

export default function EventWeatherBadge({ eventId, isVirtual }: EventWeatherBadgeProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isVirtual || !eventId) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    apiClient.get(`/api/events/${eventId}/weather`)
      .then(res => {
        if (isMounted && res.data?.success && res.data?.available && res.data?.data) {
          setWeather(res.data.data);
        }
      })
      .catch(() => {
        // Silently fallback if weather is unavailable
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId, isVirtual]);

  if (isVirtual || loading || !weather) return null;

  return (
    <div className="my-4 rounded-2xl border border-sky-500/20 bg-gradient-to-r from-sky-950/30 via-slate-900 to-indigo-950/20 p-4 shadow-md backdrop-blur-md transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-2xl border border-sky-500/30 shadow-inner">
            {weather.emoji || '🌤️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                Escudo Meteorológico Inteligente
              </span>
              {weather.isOutdoorFriendly ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-3 h-3" /> Clima Favorable
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                  <ShieldAlert className="w-3 h-3" /> Previsión Clima
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-extrabold text-white">{weather.temperature}°C</span>
              <span className="text-xs text-slate-300 font-medium">· {weather.label}</span>
              <span className="text-[11px] text-slate-400"> (Sensación {weather.feelsLike}°C)</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 px-3 py-1.5 text-xs font-semibold text-sky-300 transition-colors"
        >
          {isOpen ? 'Ocultar detalles' : 'Ver pronóstico y consejos'}
        </button>
      </div>

      {/* Quick metrics bar */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <CloudRain className="w-3.5 h-3.5 text-sky-400" />
          <span>Lluvia: <strong className="text-white">{weather.precipitationProbability}%</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Droplets className="w-3.5 h-3.5 text-indigo-400" />
          <span>Humedad: <strong className="text-white">{weather.humidity}%</strong></span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="w-3.5 h-3.5 text-teal-400" />
          <span>Viento: <strong className="text-white">{weather.windSpeed} km/h</strong></span>
        </div>
      </div>

      {/* Expanded Advice & Contingency */}
      {isOpen && (
        <div className="mt-3 rounded-xl bg-slate-950/60 p-3 border border-sky-500/20 text-xs leading-relaxed text-sky-200/90 animate-in fade-in duration-200">
          <div className="flex items-start gap-2">
            <SunMedium className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-sky-300 block mb-0.5">Recomendación para este evento:</strong>
              {weather.advice}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
