import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { apiClient } from '@/services/apiClient';
import { Avatar } from '@/components/ui';
import type { User } from '@/types';

export interface EventSongItem {
  _id: string;
  user: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  };
  title: string;
  artist: string;
  votesCount: number;
  hasVoted: boolean;
  createdAt: string;
}

interface EventSongVotingModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  user: User | null;
}

export default function EventSongVotingModal({
  visible,
  onClose,
  eventId,
  eventTitle,
  user,
}: EventSongVotingModalProps) {
  const [songs, setSongs] = useState<EventSongItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNominateOpen, setIsNominateOpen] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/events/${eventId}/songs`);
      if (res.data?.success && Array.isArray(res.data.data)) {
        setSongs(res.data.data);
      }
    } catch {
      // Fail silently or keep previous state
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (visible) {
      void fetchSongs();
    }
  }, [visible, fetchSongs]);

  const handleToggleVote = async (songId: string) => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para votar por los temas del DJ.');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic update
    setSongs((prev) =>
      prev.map((s) => {
        if (s._id === songId) {
          const nextVoted = !s.hasVoted;
          return {
            ...s,
            hasVoted: nextVoted,
            votesCount: nextVoted ? s.votesCount + 1 : Math.max(0, s.votesCount - 1),
          };
        }
        return s;
      })
    );

    try {
      await apiClient.post(`/events/${eventId}/songs/${songId}/vote`);
    } catch {
      // Revert if error
      void fetchSongs();
    }
  };

  const handleNominateSong = async () => {
    if (!user) {
      Alert.alert('Inicia sesión', 'Inicia sesión para pedir una canción al DJ.');
      return;
    }

    if (!songTitle.trim() || !songArtist.trim()) {
      Alert.alert('Datos requeridos', 'Indica el nombre de la canción y el artista.');
      return;
    }

    setSubmitting(true);
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const res = await apiClient.post(`/events/${eventId}/songs`, {
        title: songTitle.trim(),
        artist: songArtist.trim(),
      });

      if (res.data?.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSongTitle('');
        setSongArtist('');
        setIsNominateOpen(false);
        void fetchSongs();
      } else {
        throw new Error(res.data?.message || 'No se pudo enviar la canción.');
      }
    } catch (err: any) {
      Alert.alert('Aviso', err.response?.data?.message || err.message || 'Error al proponer canción');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <LinearGradient colors={['#ec4899', '#8b5cf6']} style={styles.djIconCircle}>
                <Ionicons name="musical-notes" size={20} color="#fff" />
              </LinearGradient>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.headerTitle}>DJ Crowd Request</Text>
                  <View style={styles.livePill}>
                    <Text style={styles.livePillText}>EN VIVO</Text>
                  </View>
                </View>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {eventTitle}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Equalizer Visual Bar */}
          <LinearGradient
            colors={['rgba(236,72,153,0.15)', 'rgba(139,92,246,0.15)', 'rgba(6,182,212,0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.equalizerBar}
          >
            <Ionicons name="disc" size={16} color="#ec4899" />
            <Text style={styles.equalizerText}>
              Vota los temas que quieres escuchar. El DJ ve los más pedidos.
            </Text>
          </LinearGradient>

          {/* Nominate Form Toggle or Song List */}
          {isNominateOpen ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Pedir tema para este coro</Text>
              <Text style={styles.inputLabel}>Título de la canción</Text>
              <TextInput
                style={styles.input}
                value={songTitle}
                onChangeText={setSongTitle}
                placeholder="Ej. Tití Me Preguntó"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <Text style={styles.inputLabel}>Artista o Banda</Text>
              <TextInput
                style={styles.input}
                value={songArtist}
                onChangeText={setSongArtist}
                placeholder="Ej. Bad Bunny"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <View style={styles.formButtonsRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsNominateOpen(false)}
                >
                  <Text style={styles.cancelBtnText}>Volver a la lista</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={handleNominateSong}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={['#ec4899', '#8b5cf6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitGradient}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={16} color="#fff" />
                        <Text style={styles.submitBtnText}>Pedir al DJ</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* Nominate trigger button */}
              <TouchableOpacity
                style={styles.requestTriggerBtn}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsNominateOpen(true);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['rgba(236,72,153,0.2)', 'rgba(139,92,246,0.2)']}
                  style={styles.requestTriggerGradient}
                >
                  <Ionicons name="add-circle" size={20} color="#ec4899" />
                  <Text style={styles.requestTriggerText}>+ Proponer una canción pal coro</Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Song list */}
              {loading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator color="#ec4899" size="large" />
                </View>
              ) : songs.length === 0 ? (
                <View style={styles.centerContainer}>
                  <Ionicons name="musical-note-outline" size={48} color="rgba(255,255,255,0.2)" />
                  <Text style={styles.emptyTitle}>Aún no hay canciones pedidas</Text>
                  <Text style={styles.emptyDesc}>
                    Sé el primero en pedir un tema para que el DJ lo ponga en el evento.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={songs}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item, index }) => {
                    const authorName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.trim() || item.user?.username || 'Asistente';
                    return (
                      <View style={styles.songCard}>
                        {/* Rank index */}
                        <Text style={[styles.songIndex, index < 3 && styles.topRank]}>
                          #{index + 1}
                        </Text>

                        {/* Song Details */}
                        <View style={styles.songInfo}>
                          <Text style={styles.songTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.songArtist} numberOfLines={1}>
                            {item.artist}
                          </Text>
                          <View style={styles.songAuthorRow}>
                            <Avatar uri={item.user?.avatar} name={authorName} size="sm" />
                            <Text style={styles.songAuthorText} numberOfLines={1}>
                              Por {authorName}
                            </Text>
                          </View>
                        </View>

                        {/* Vote Button */}
                        <TouchableOpacity
                          style={[styles.voteButton, item.hasVoted && styles.voteButtonActive]}
                          onPress={() => handleToggleVote(item._id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={item.hasVoted ? 'flame' : 'flame-outline'}
                            size={18}
                            color={item.hasVoted ? '#fff' : '#ec4899'}
                          />
                          <Text style={[styles.voteCount, item.hasVoted && styles.voteCountActive]}>
                            {item.votesCount}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '82%',
    backgroundColor: '#0f0d18',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  djIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
    maxWidth: 200,
  },
  livePill: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  livePillText: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '900',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  equalizerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  equalizerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    flex: 1,
  },
  requestTriggerBtn: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  requestTriggerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.3)',
    borderRadius: 14,
  },
  requestTriggerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  songIndex: {
    fontSize: 14,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    width: 28,
    textAlign: 'center',
  },
  topRank: {
    color: '#ec4899',
  },
  songInfo: {
    flex: 1,
    marginHorizontal: 10,
  },
  songTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  songArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  songAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  songAuthorText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(236,72,153,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(236,72,153,0.3)',
  },
  voteButtonActive: {
    backgroundColor: '#ec4899',
    borderColor: '#ec4899',
  },
  voteCount: {
    color: '#ec4899',
    fontSize: 13,
    fontWeight: '800',
  },
  voteCountActive: {
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptyDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  formButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
