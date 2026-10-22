import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { gamificationService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');
const GOLD = '#f59e0b';
const BG = '#0C0B10';
const SURF = 'rgba(255,255,255,0.05)';
const BORDER = 'rgba(255,255,255,0.08)';
const TXT = '#ffffff';
const TXTS = 'rgba(255,255,255,0.6)';

const STAMP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Music: 'musical-notes',
  Compass: 'compass',
  Sparkles: 'sparkles',
  Lock: 'lock-closed',
  Code: 'code-slash',
  Users: 'people',
};

export default function PassportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [passport, setPassport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'stamps' | 'perks'>('stamps');

  const loadPassport = useCallback(async () => {
    try {
      const data = await gamificationService.getPassport();
      setPassport(data);
    } catch (err: any) {
      console.error('Error loading passport:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPassport();
  }, [loadPassport]);

  const handleClaimPerk = (perk: any) => {
    if (!perk.isEligible) {
      Alert.alert(
        'Sellos Insuficientes',
        `Necesitas al menos ${perk.requiredStamps} sellos culturales para desbloquear este beneficio en ${perk.partner}.`
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      'Beneficio Desbloqueado 🎉',
      `Presenta este Pasaporte Cultural en ${perk.partner} para reclamar tu beneficio:\n\n"${perk.offer}"\n\nTu Pasaporte: ${passport?.passportNumber}`
    );
  };

  const stamps = passport?.stamps || [];
  const perks = passport?.perks || [];

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={TXT} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Pasaporte Cultural</Text>
          <Text style={styles.headerSubtitle}>República Dominicana 🇩🇴</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPassport();
            }}
            tintColor={GOLD}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      >
        {/* Passport Booklet Card */}
        <LinearGradient
          colors={['#1c142b', '#120d20', '#0a0714']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bookletCard}
        >
          <View style={styles.bookletHeader}>
            <View>
              <Text style={styles.bookletLabel}>REPÚBLICA DOMINICANA</Text>
              <Text style={styles.bookletTitle}>PASAPORTE DE EXPERIENCIAS</Text>
            </View>
            <View style={styles.emblemBadge}>
              <Text style={{ fontSize: 24 }}>🇩🇴</Text>
            </View>
          </View>

          <View style={styles.bookletDivider} />

          <View style={styles.bookletBody}>
            <View style={styles.bookletRow}>
              <View>
                <Text style={styles.dataLabel}>TITULAR</Text>
                <Text style={styles.dataValue}>
                  {passport?.holderName || user?.firstName || user?.username || 'Explorador'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.dataLabel}>NO. PASAPORTE</Text>
                <Text style={[styles.dataValue, { color: GOLD, fontFamily: 'SpaceMono' }]}>
                  {passport?.passportNumber || 'RD-EN-OFFICIAL'}
                </Text>
              </View>
            </View>

            <View style={[styles.bookletRow, { marginTop: 12 }]}>
              <View>
                <Text style={styles.dataLabel}>RANGO CULTURAL</Text>
                <Text style={[styles.dataValue, { color: '#a78bfa' }]}>
                  {passport?.tier || 'Turista Novato'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.dataLabel}>SELLOS OBTENIDOS</Text>
                <Text style={styles.dataValue}>
                  {passport?.unlockedCount || 0} de {passport?.totalStamps || 6}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarWrap}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${passport?.progressPercent || 0}%` },
                ]}
              />
            </View>
          </View>
        </LinearGradient>

        {/* Tab switch: Sellos vs Beneficios */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'stamps' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('stamps');
            }}
          >
            <Ionicons
              name="ribbon"
              size={18}
              color={activeTab === 'stamps' ? '#fff' : TXTS}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'stamps' && { color: '#fff', fontWeight: '800' },
              ]}
            >
              Sellos Culturales ({passport?.unlockedCount || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'perks' && styles.tabButtonActive]}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab('perks');
            }}
          >
            <Ionicons
              name="gift"
              size={18}
              color={activeTab === 'perks' ? '#fff' : TXTS}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'perks' && { color: '#fff', fontWeight: '800' },
              ]}
            >
              Beneficios Locales ({perks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 40 }} />
        ) : activeTab === 'stamps' ? (
          <View style={{ gap: 12 }}>
            {stamps.map((stamp: any) => {
              const iconName = STAMP_ICONS[stamp.icon] || 'trophy';
              const isUnlocked = stamp.unlocked;

              return (
                <View
                  key={stamp.id}
                  style={[
                    styles.stampCard,
                    isUnlocked ? styles.stampCardUnlocked : styles.stampCardLocked,
                  ]}
                >
                  <LinearGradient
                    colors={
                      isUnlocked
                        ? ['rgba(245, 158, 11, 0.25)', 'rgba(217, 119, 6, 0.15)']
                        : ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.02)']
                    }
                    style={styles.stampIconWrap}
                  >
                    <Ionicons
                      name={iconName}
                      size={26}
                      color={isUnlocked ? GOLD : 'rgba(255,255,255,0.3)'}
                    />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.stampTitle, isUnlocked && { color: '#fff' }]}>
                        {stamp.title}
                      </Text>
                      <View
                        style={[
                          styles.stampBadge,
                          {
                            backgroundColor: isUnlocked
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(255,255,255,0.08)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stampBadgeText,
                            { color: isUnlocked ? '#10b981' : TXTS },
                          ]}
                        >
                          {isUnlocked ? 'SELLADO ✓' : 'POR DESCUBRIR'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.stampDesc}>{stamp.description}</Text>

                    <View style={styles.stampMetaRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="location-outline" size={12} color={TXTS} />
                        <Text style={styles.stampZone}>{stamp.zone}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="star" size={12} color={GOLD} />
                        <Text style={{ fontSize: 11, color: GOLD, fontWeight: '700' }}>
                          +{stamp.pointsReward} XP
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {perks.map((perk: any) => {
              return (
                <View key={perk.id} style={styles.perkCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perkPartner}>{perk.partner}</Text>
                      <Text style={styles.perkOffer}>{perk.offer}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <Ionicons name="ribbon-outline" size={14} color={GOLD} />
                        <Text style={{ fontSize: 12, color: GOLD, fontWeight: '600' }}>
                          Requiere {perk.requiredStamps} sellos culturales
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.claimBtn,
                        perk.isEligible ? styles.claimBtnActive : styles.claimBtnDisabled,
                      ]}
                      onPress={() => handleClaimPerk(perk)}
                    >
                      <Text style={styles.claimBtnText}>
                        {perk.isEligible ? 'Reclamar' : 'Bloqueado'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: SURF,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: TXT,
  },
  headerSubtitle: {
    fontSize: 12,
    color: GOLD,
    fontWeight: '600',
    marginTop: 1,
  },
  bookletCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    padding: 20,
    marginBottom: 20,
    shadowColor: GOLD,
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  bookletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookletLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: GOLD,
    fontWeight: '800',
  },
  bookletTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  emblemBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookletDivider: {
    height: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    marginVertical: 16,
  },
  bookletBody: {
    gap: 8,
  },
  bookletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '700',
    marginBottom: 2,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  progressBarWrap: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: GOLD,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: SURF,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  tabButtonText: {
    fontSize: 12,
    color: TXTS,
    fontWeight: '600',
  },
  stampCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  stampCardUnlocked: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  stampCardLocked: {
    backgroundColor: SURF,
    borderColor: BORDER,
    opacity: 0.65,
  },
  stampIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stampTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  stampBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stampBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stampDesc: {
    fontSize: 12,
    color: TXTS,
    lineHeight: 16,
    marginTop: 3,
  },
  stampMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stampZone: {
    fontSize: 11,
    color: TXTS,
  },
  perkCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: SURF,
    borderWidth: 1,
    borderColor: BORDER,
  },
  perkPartner: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  perkOffer: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 3,
    lineHeight: 18,
  },
  claimBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  claimBtnActive: {
    backgroundColor: GOLD,
  },
  claimBtnDisabled: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  claimBtnText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '800',
  },
});
