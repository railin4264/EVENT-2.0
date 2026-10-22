'use client';

import React, { useMemo } from 'react';
import { Globe, Clock } from 'lucide-react';

interface UniversalTimezoneClockProps {
  eventDate: string;
  isVirtual?: boolean;
}

const GLOBAL_HUBS = [
  { city: 'Santo Domingo', flag: '🇩🇴', zone: 'America/Santo_Domingo', label: 'AST' },
  { city: 'Nueva York / Miami', flag: '🇺🇸', zone: 'America/New_York', label: 'ET' },
  { city: 'Madrid / Barcelona', flag: '🇪🇸', zone: 'Europe/Madrid', label: 'CET' },
  { city: 'París', flag: '🇫🇷', zone: 'Europe/Paris', label: 'CET' },
  { city: 'Ciudad de México', flag: '🇲🇽', zone: 'America/Mexico_City', label: 'CST' },
  { city: 'Bogotá', flag: '🇨🇴', zone: 'America/Bogota', label: 'COT' },
  { city: 'Buenos Aires', flag: '🇦🇷', zone: 'America/Argentina/Buenos_Aires', label: 'ART' },
  { city: 'Londres', flag: '🇬🇧', zone: 'Europe/London', label: 'GMT' },
  { city: 'Tokio', flag: '🇯🇵', zone: 'Asia/Tokyo', label: 'JST' }
];

export default function UniversalTimezoneClock({ eventDate, isVirtual }: UniversalTimezoneClockProps) {
  const userZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'America/Santo_Domingo';
    }
  }, []);

  const d = useMemo(() => new Date(eventDate), [eventDate]);

  if (isNaN(d.getTime())) return null;

  return (
    <div className="my-5 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-slate-900 to-purple-950/20 p-5 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              Horario Simultáneo Global
              {isVirtual && (
                <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                  Transmisión Internacional
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400">Comprueba la hora exacta del evento en las principales ciudades</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
        {GLOBAL_HUBS.map(hub => {
          let timeString = '';
          let dateString = '';
          try {
            timeString = new Intl.DateTimeFormat('es-DO', {
              timeZone: hub.zone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).format(d);
            dateString = new Intl.DateTimeFormat('es-DO', {
              timeZone: hub.zone,
              day: 'numeric',
              month: 'short'
            }).format(d);
          } catch {
            timeString = '--:--';
          }

          const isUserCity = userZone === hub.zone;

          return (
            <div
              key={hub.zone}
              className={`flex items-center justify-between rounded-xl p-2.5 text-xs border transition-all ${
                isUserCity
                  ? 'bg-indigo-500/20 border-indigo-500/50 shadow-sm'
                  : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{hub.flag}</span>
                <div className="truncate">
                  <span className="font-semibold text-slate-200 block truncate">{hub.city}</span>
                  <span className="text-[10px] text-slate-400">{hub.label} · {dateString}</span>
                </div>
              </div>
              <div className="text-right shrink-0 pl-1">
                <span className="font-mono font-bold text-white">{timeString}</span>
                {isUserCity && (
                  <span className="block text-[9px] font-bold text-indigo-300">Tu zona</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800">
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
        <span>Sincronizado automáticamente con el huso horario de tu dispositivo ({userZone}).</span>
      </div>
    </div>
  );
}
