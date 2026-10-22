import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './apiClient';
import { STORAGE_KEYS } from '@/constants';

export const SANTO_DOMINGO_COORDS = {
  latitude: 18.4861,
  longitude: -69.9312,
};

export interface LiveCoordinates {
  latitude: number;
  longitude: number;
  isFallback: boolean;
  accuracy?: number | null;
  updatedAt: number;
}

export interface ContinuousLocationOptions {
  syncWithBackend?: boolean;
  timeIntervalMs?: number;
  distanceIntervalMeters?: number;
}

type LocationSubscriber = (_coords: LiveCoordinates) => void;

class LocationService {
  private currentCoords: LiveCoordinates = {
    ...SANTO_DOMINGO_COORDS,
    isFallback: true,
    updatedAt: Date.now(),
  };

  private watchSubscription: Location.LocationSubscription | null = null;
  private subscribers = new Set<LocationSubscriber>();
  private lastBackendSyncAt = 0;
  private lastSyncedCoords: { latitude: number; longitude: number } | null = null;

  public getLastKnownCoords(): LiveCoordinates {
    return this.currentCoords;
  }

  public async syncWithBackend(
    latitude: number,
    longitude: number,
    address?: string
  ): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return false;

      const now = Date.now();
      if (
        this.lastSyncedCoords &&
        now - this.lastBackendSyncAt < 10000 &&
        Math.abs(this.lastSyncedCoords.latitude - latitude) < 0.0002 &&
        Math.abs(this.lastSyncedCoords.longitude - longitude) < 0.0002
      ) {
        return true;
      }

      await apiClient.put('/users/me/location', {
        latitude,
        longitude,
        lat: latitude,
        lng: longitude,
        coordinates: [longitude, latitude],
        ...(address ? { address } : {}),
      });

      this.lastBackendSyncAt = now;
      this.lastSyncedCoords = { latitude, longitude };
      return true;
    } catch {
      return false;
    }
  }

  private notifySubscribers(coords: LiveCoordinates) {
    this.currentCoords = coords;
    this.subscribers.forEach((cb) => {
      try {
        cb(coords);
      } catch {
        // Ignore subscriber error
      }
    });
  }

  public async getCurrentLocation(syncWithBackend = true): Promise<LiveCoordinates> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        const fallback: LiveCoordinates = {
          ...SANTO_DOMINGO_COORDS,
          isFallback: true,
          updatedAt: Date.now(),
        };
        this.notifySubscribers(fallback);
        return fallback;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const live: LiveCoordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        isFallback: false,
        updatedAt: Date.now(),
      };

      this.notifySubscribers(live);
      if (syncWithBackend) {
        await this.syncWithBackend(live.latitude, live.longitude);
      }
      return live;
    } catch {
      const fallback: LiveCoordinates = {
        ...SANTO_DOMINGO_COORDS,
        isFallback: true,
        updatedAt: Date.now(),
      };
      this.notifySubscribers(fallback);
      return fallback;
    }
  }

  public async startContinuousWatch(
    onUpdate?: LocationSubscriber,
    options: ContinuousLocationOptions = {}
  ): Promise<() => void> {
    const {
      syncWithBackend = true,
      timeIntervalMs = 15000,
      distanceIntervalMeters = 25,
    } = options;

    if (onUpdate) {
      this.subscribers.add(onUpdate);
    }

    // Obtain initial fix or fallback immediately
    await this.getCurrentLocation(syncWithBackend);

    // Start watchPositionAsync if not already watching
    if (!this.watchSubscription) {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          this.watchSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: timeIntervalMs,
              distanceInterval: distanceIntervalMeters,
            },
            (pos) => {
              const updated: LiveCoordinates = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                isFallback: false,
                updatedAt: Date.now(),
              };
              this.notifySubscribers(updated);
              if (syncWithBackend) {
                void this.syncWithBackend(updated.latitude, updated.longitude);
              }
            }
          );
        }
      } catch {
        // Fallback coordinates remain active
      }
    }

    return () => {
      if (onUpdate) {
        this.subscribers.delete(onUpdate);
      }
      if (this.subscribers.size === 0 && this.watchSubscription) {
        this.watchSubscription.remove();
        this.watchSubscription = null;
      }
    };
  }

  public stopAllWatches() {
    if (this.watchSubscription) {
      this.watchSubscription.remove();
      this.watchSubscription = null;
    }
    this.subscribers.clear();
  }
}

export const locationService = new LocationService();

export function useContinuousLocation(options: ContinuousLocationOptions = {}) {
  const [coords, setCoords] = useState<LiveCoordinates>(() =>
    locationService.getLastKnownCoords()
  );
  const [loading, setLoading] = useState<boolean>(true);
  const syncRef = useRef(options.syncWithBackend ?? true);

  const refreshLocation = useCallback(async () => {
    setLoading(true);
    try {
      const latest = await locationService.getCurrentLocation(syncRef.current);
      setCoords(latest);
      return latest;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let mounted = true;

    (async () => {
      setLoading(true);
      cleanup = await locationService.startContinuousWatch(
        (updated) => {
          if (mounted) {
            setCoords(updated);
            setLoading(false);
          }
        },
        {
          syncWithBackend: syncRef.current,
          timeIntervalMs: options.timeIntervalMs,
          distanceIntervalMeters: options.distanceIntervalMeters,
        }
      );
      if (mounted) {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [options.timeIntervalMs, options.distanceIntervalMeters]);

  return {
    coords,
    latitude: coords.latitude,
    longitude: coords.longitude,
    isFallback: coords.isFallback,
    loading,
    refreshLocation,
  };
}

export default locationService;
