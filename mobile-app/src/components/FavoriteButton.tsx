import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface FavoriteButtonProps {
  eventId: string;
  size?: number;
  color?: string;
  onToggle?: (isFavorite: boolean) => void;
  style?: any;
}

const FAVORITES_KEY = '@favorites';

export default function FavoriteButton({
  eventId,
  size = 28,
  color = '#FF1744',
  onToggle,
  style
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavoriteStatus();
  }, [eventId]);

  const loadFavoriteStatus = async () => {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
      if (favoritesJson) {
        const favorites: string[] = JSON.parse(favoritesJson);
        setIsFavorite(favorites.includes(eventId));
      }
    } catch (error) {
      console.error('Error loading favorite status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async () => {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
      let favorites: string[] = favoritesJson ? JSON.parse(favoritesJson) : [];

      const newIsFavorite = !isFavorite;

      if (newIsFavorite) {
        // Add to favorites
        favorites.push(eventId);
        animateHeart();
      } else {
        // Remove from favorites
        favorites = favorites.filter(id => id !== eventId);
      }

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      setIsFavorite(newIsFavorite);
      onToggle?.(newIsFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const animateHeart = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (loading) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={toggleFavorite}
      activeOpacity={0.7}
      style={[styles.container, style]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        {isFavorite ? (
          <>
            <Ionicons
              name="heart"
              size={size}
              color={color}
              style={styles.icon}
            />
            {Platform.OS === 'ios' && (
              <Ionicons
                name="heart"
                size={size + 6}
                color={`${color}30`}
                style={[styles.icon, styles.glow]}
              />
            )}
          </>
        ) : (
          <Ionicons
            name="heart-outline"
            size={size}
            color={color}
            style={styles.icon}
          />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  icon: {
    position: 'absolute',
  },
  glow: {
    opacity: 0.3,
  },
});

// Hook personalizado para manejar favoritos en toda la app
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const favoritesJson = await AsyncStorage.getItem(FAVORITES_KEY);
      if (favoritesJson) {
        setFavorites(JSON.parse(favoritesJson));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (eventId: string) => {
    try {
      let newFavorites: string[];

      if (favorites.includes(eventId)) {
        newFavorites = favorites.filter(id => id !== eventId);
      } else {
        newFavorites = [...favorites, eventId];
      }

      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);

      return !favorites.includes(eventId);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  };

  const isFavorite = (eventId: string) => {
    return favorites.includes(eventId);
  };

  const clearFavorites = async () => {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
      setFavorites([]);
    } catch (error) {
      console.error('Error clearing favorites:', error);
    }
  };

  return {
    favorites,
    loading,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    count: favorites.length,
  };
}
