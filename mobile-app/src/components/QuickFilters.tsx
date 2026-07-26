import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export type QuickFilterType = 'popular' | 'today' | 'weekend' | 'free' | 'new' | 'trending' | null;

interface QuickFilter {
  id: QuickFilterType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  emoji: string;
}

interface QuickFiltersProps {
  activeFilter: QuickFilterType;
  onFilterChange: (filter: QuickFilterType) => void;
}

const filters: QuickFilter[] = [
  {
    id: 'popular',
    label: 'Populares',
    icon: 'flame',
    gradient: ['#FF6B35', '#F7931E'],
    emoji: '🔥'
  },
  {
    id: 'today',
    label: 'Hoy',
    icon: 'calendar',
    gradient: ['#667EEA', '#764BA2'],
    emoji: '📅'
  },
  {
    id: 'weekend',
    label: 'Fin de Semana',
    icon: 'beer',
    gradient: ['#F093FB', '#F5576C'],
    emoji: '🎉'
  },
  {
    id: 'free',
    label: 'Gratis',
    icon: 'pricetag',
    gradient: ['#4FACFE', '#00F2FE'],
    emoji: '💰'
  },
  {
    id: 'new',
    label: 'Nuevos',
    icon: 'sparkles',
    gradient: ['#43E97B', '#38F9D7'],
    emoji: '🆕'
  },
  {
    id: 'trending',
    label: 'Trending',
    icon: 'trending-up',
    gradient: ['#FA709A', '#FEE140'],
    emoji: '📈'
  }
];

export default function QuickFilters({ activeFilter, onFilterChange }: QuickFiltersProps) {
  const handlePress = (filterId: QuickFilterType) => {
    if (activeFilter === filterId) {
      onFilterChange(null);
    } else {
      onFilterChange(filterId);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;

          return (
            <TouchableOpacity
              key={filter.id}
              onPress={() => handlePress(filter.id)}
              activeOpacity={0.7}
              style={styles.filterButton}
            >
              <LinearGradient
                colors={isActive ? filter.gradient : ['#FFFFFF', '#F8F8F8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.gradientButton,
                  !isActive && styles.inactiveButton
                ]}
              >
                {isActive && (
                  <Animated.View style={styles.shimmer}>
                    <LinearGradient
                      colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                )}

                <Text style={styles.emoji}>{filter.emoji}</Text>

                <View style={styles.textContainer}>
                  <Text style={[
                    styles.label,
                    isActive ? styles.activeLabel : styles.inactiveLabel
                  ]}>
                    {filter.label}
                  </Text>
                </View>

                {isActive && (
                  <View style={styles.activeIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    minHeight: 44,
    position: 'relative',
  },
  inactiveButton: {
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 20,
  },
  textContainer: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  activeLabel: {
    color: '#FFFFFF',
  },
  inactiveLabel: {
    color: '#666666',
  },
  activeIndicator: {
    marginLeft: 4,
  },
});
