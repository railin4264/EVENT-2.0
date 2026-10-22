'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Users, UserPlus, HeartHandshake, MapPin, MessageSquare, Check, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';

interface SoloAttendee {
  _id: string;
  firstName?: string;
  username?: string;
  avatar?: string;
  soloNote?: string;
  languages?: string[];
  travelOrigin?: string;
}

interface SoloData {
  isSoloFriendly: boolean;
  welcomeNote: string;
  welcomeHost?: {
    name?: string;
    meetingSpot?: string;
    timeWindow?: string;
    confirmed?: boolean;
  };
  count: number;
  attendees: SoloAttendee[];
  isUserSolo: boolean;
  currentUserBuddyProfile?: {
    soloNote?: string;
    languages?: string[];
    travelOrigin?: string;
  };
}

const LANGUAGE_OPTIONS = [
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'Inglés', flag: '🇺🇸' },
  { code: 'fr', label: 'Francés', flag: '🇫🇷' },
  { code: 'de', label: 'Alemán', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Portugués', flag: '🇵🇹' }
];

interface SoloTravelerBuddySectionProps {
  eventId: string;
}

export default function SoloTravelerBuddySection({ eventId }: SoloTravelerBuddySectionProps) {
  const { isAuthenticated } = useAuthStore();
  const [data, setData] = useState<SoloData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form states
  const [travelOrigin, setTravelOrigin] = useState<string>('');
  const [soloNote, setSoloNote] = useState<string>('');
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['es']);

  const loadData = () => {
    apiClient.get(`/api/events/${eventId}/solo-attendees`)
      .then(res => {
        if (res.data?.success && res.data?.data) {
          setData(res.data.data);
          if (res.data.data.currentUserBuddyProfile) {
            setTravelOrigin(res.data.data.currentUserBuddyProfile.travelOrigin || '');
            setSoloNote(res.data.data.currentUserBuddyProfile.soloNote || '');
            if (res.data.data.currentUserBuddyProfile.languages?.length) {
              setSelectedLangs(res.data.data.currentUserBuddyProfile.languages);
            }
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [eventId]);

  const toggleLanguage = (code: string) => {
    if (selectedLangs.includes(code)) {
      if (selectedLangs.length > 1) {
        setSelectedLangs(selectedLangs.filter(l => l !== code));
      }
    } else {
      setSelectedLangs([...selectedLangs, code]);
    }
  };

  const handleJoinOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/events/${eventId}`;
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/api/events/${eventId}/solo-buddy`, {
        languages: selectedLangs,
        travelOrigin,
        soloNote
      });
      if (res.data?.success) {
        setIsEditing(false);
        loadData();
      }
    } catch {
      // Handled
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data || data.isSoloFriendly === false) return null;

  return (
    <div className="my-6 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/25 via-slate-900 to-orange-950/20 p-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
                Mesa Cultural & Solo Traveler Friendly
              </span>
              <span className="text-xs text-slate-400">
                · {data.count} {data.count === 1 ? 'persona asistiendo sola' : 'personas asistiendo solas'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-1">
              ¿Vienes solo o eres viajero? ¡Aquí nunca estás aislado!
            </h3>
            <p className="text-xs text-amber-200/80 mt-0.5">
              {data.welcomeNote || 'Espacio abierto para intercambiar idiomas, hacer amigos locales y disfrutar del evento juntos.'}
            </p>
          </div>
        </div>

        <div>
          {!data.isUserSolo && !isEditing ? (
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  window.location.href = `/login?redirect=/events/${eventId}`;
                } else {
                  setIsEditing(true);
                }
              }}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md hover:brightness-110 transition-all"
            >
              <UserPlus className="h-4 w-4" />
              Unirme a la Mesa Solo
            </button>
          ) : !isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all"
            >
              <Check className="h-4 w-4 text-emerald-400" />
              Estás en la Mesa · Editar Perfil
            </button>
          ) : null}
        </div>
      </div>

      {/* Host Welcome Spot info */}
      {data.welcomeHost?.confirmed && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-900/80 p-3.5 border border-amber-500/20 text-xs">
          <span className="text-xl">📍</span>
          <div>
            <span className="font-bold text-amber-300">Punto de Acogida Presencial:</span>
            <span className="text-slate-300 ml-1">
              {data.welcomeHost.meetingSpot} (Horario: {data.welcomeHost.timeWindow}) · Coordinado por {data.welcomeHost.name}
            </span>
          </div>
        </div>
      )}

      {/* Profile edit form */}
      {isEditing && (
        <form onSubmit={handleJoinOrUpdate} className="mt-5 rounded-2xl bg-slate-950/70 p-4 border border-amber-500/30 animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" /> Tu Ficha de Cultural Buddy
            </h4>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                ¿De dónde vienes o cuál es tu ciudad base?
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={travelOrigin}
                  onChange={e => setTravelOrigin(e.target.value)}
                  placeholder="Ej: Viajando desde Nueva York / Local de Santo Domingo"
                  className="w-full rounded-xl bg-slate-800/80 pl-9 pr-3 py-2 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-amber-400"
                  maxLength={60}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Idiomas que hablas o quieres practicar:
              </label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map(lang => {
                  const isSelected = selectedLangs.includes(lang.code);
                  return (
                    <button
                      type="button"
                      key={lang.code}
                      onClick={() => toggleLanguage(lang.code)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-400 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Mensaje rompehielo o qué te gustaría compartir (Opcional):
              </label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={soloNote}
                  onChange={e => setSoloNote(e.target.value)}
                  placeholder="Ej: Es mi primera vez en la ciudad, busco amigos para tomar un café antes del show"
                  className="w-full rounded-xl bg-slate-800/80 pl-9 pr-3 py-2 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-amber-400"
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Guardando...' : 'Confirmar en la Mesa'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Grid of buddies */}
      {data.attendees.length > 0 && (
        <div className="mt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300/80 mb-2.5">
            Exploradores que van al evento solos:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {data.attendees.map(attendee => (
              <div
                key={attendee._id}
                className="flex items-start gap-2.5 rounded-2xl bg-slate-800/40 p-3 border border-slate-700/50 hover:border-amber-500/30 transition-all"
              >
                <div className="relative h-9 w-9 shrink-0 rounded-full overflow-hidden bg-slate-700 border border-amber-500/20">
                  {attendee.avatar ? (
                    <Image
                      src={attendee.avatar}
                      alt={attendee.firstName || 'Usuario'}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-bold text-amber-400">
                      {(attendee.firstName || attendee.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">
                      {attendee.firstName || attendee.username || 'Explorador'}
                    </span>
                    {attendee.languages && attendee.languages.length > 0 && (
                      <div className="flex gap-1 shrink-0">
                        {attendee.languages.map(code => (
                          <span key={code} className="text-[10px] uppercase font-mono px-1 rounded bg-slate-700 text-slate-300">
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {attendee.travelOrigin && (
                    <p className="text-[11px] text-amber-300/80 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{attendee.travelOrigin}</span>
                    </p>
                  )}

                  {attendee.soloNote && (
                    <p className="text-[11px] text-slate-300 italic mt-1 line-clamp-2 bg-slate-900/50 rounded-lg p-1.5 border border-slate-800">
                      &ldquo;{attendee.soloNote}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
