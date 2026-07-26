import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Guard: AsyncStorage and NetInfo don't work in Node.js SSR (Expo web SSR)
const IS_WEB_SSR = Platform.OS === 'web' && typeof window === 'undefined';

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

interface UserProperties {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  plan?: string;
  signupDate?: string;
  location?: string;
  preferences?: Record<string, any>;
}

interface PerformanceMetrics {
  screenName: string;
  loadTime: number;
  renderTime: number;
  interactionTime?: number;
  errorCount: number;
  timestamp: number;
}

class AnalyticsService {
  private sessionId: string;
  private userId: string | null = null;
  private isEnabled: boolean = true;
  private queue: AnalyticsEvent[] = [];
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private screenStartTime: number = Date.now();
  private isOnline: boolean = true;
  private API_URL: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '';
    this.initializeService();
  }

  private generateSessionId(): string {
    return `mobile_session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async initializeService(): Promise<void> {
    // Skip initialization in SSR / Node.js context (Expo web SSR)
    if (IS_WEB_SSR) return;

    // Check if analytics is enabled
    this.isEnabled = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true';

    if (!this.isEnabled) return;

    // Set up network listener (native + browser only)
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.flushQueue();
      }
    });

    // Load stored events
    await this.loadStoredEvents();

    // Track app start
    this.track('app_start', {
      platform: Device.osName,
      osVersion: Device.osVersion,
      deviceModel: Device.modelName,
      appVersion: Constants.expoConfig?.version
    });
  }

  private async loadStoredEvents(): Promise<void> {
    if (IS_WEB_SSR) return;
    try {
      const stored = await AsyncStorage.getItem('analytics_queue');
      if (stored) {
        this.queue = JSON.parse(stored);
        await AsyncStorage.removeItem('analytics_queue');
        if (this.isOnline) {
          this.flushQueue();
        }
      }
    } catch (error) {
      console.warn('Failed to load stored analytics events:', error);
    }
  }

  // Public methods
  setUserId(userId: string): void {
    this.userId = userId;
  }

  setUserProperties(properties: UserProperties): void {
    this.track('user_properties_updated', properties);
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  // Core tracking method
  track(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        platform: Device.osName,
        deviceModel: Device.modelName,
        appVersion: Constants.expoConfig?.version,
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      timestamp: Date.now(),
      userId: this.userId || undefined,
      sessionId: this.sessionId
    };

    this.queue.push(event);
    this.processQueue();
  }

  // Screen tracking
  trackScreenView(screenName: string, properties: Record<string, any> = {}): void {
    this.track('screen_view', {
      screenName,
      ...properties
    });
    this.screenStartTime = Date.now();
  }

  // Performance tracking
  trackPerformance(metrics: Partial<PerformanceMetrics>): void {
    const screenName = metrics.screenName || 'unknown';
    const performanceData: PerformanceMetrics = {
      screenName,
      loadTime: 0,
      renderTime: 0,
      errorCount: 0,
      timestamp: Date.now(),
      ...metrics
    };

    this.performanceMetrics.set(screenName, performanceData);
    this.track('performance_metric', performanceData);
  }

  // Event-specific tracking methods
  trackEvent(category: string, action: string, label?: string, value?: number): void {
    this.track('custom_event', {
      category,
      action,
      label,
      value
    });
  }

  trackPress(element: string, properties: Record<string, any> = {}): void {
    this.track('press', {
      element,
      ...properties
    });
  }

  trackSwipe(direction: string, screenName: string, properties: Record<string, any> = {}): void {
    this.track('swipe', {
      direction,
      screenName,
      ...properties
    });
  }

  trackError(error: string, context: Record<string, any> = {}): void {
    this.track('error', {
      error,
      context,
      stack: new Error().stack
    });
  }

  // Business-specific tracking
  trackEventInteraction(action: string, eventId: string, properties: Record<string, any> = {}): void {
    this.track('event_interaction', {
      action, // 'view', 'join', 'leave', 'share', 'like'
      eventId,
      platform: 'mobile',
      ...properties
    });
  }

  trackSocialInteraction(action: string, targetUserId: string, properties: Record<string, any> = {}): void {
    this.track('social_interaction', {
      action, // 'follow', 'unfollow', 'message', 'profile_view'
      targetUserId,
      platform: 'mobile',
      ...properties
    });
  }

  trackFeatureUsage(featureName: string, usage: 'start' | 'complete' | 'abandon', properties: Record<string, any> = {}): void {
    this.track('feature_usage', {
      featureName,
      usage,
      platform: 'mobile',
      ...properties
    });
  }

  trackLocation(location: { latitude: number; longitude: number; accuracy?: number }): void {
    this.track('location_update', {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      platform: 'mobile'
    });
  }

  trackPurchase(productId: string, amount: number, currency: string, properties: Record<string, any> = {}): void {
    this.track('purchase', {
      productId,
      amount,
      currency,
      platform: 'mobile',
      ...properties
    });
  }

  // Queue processing
  private processQueue(): void {
    if (!this.isOnline || this.queue.length === 0) return;

    // Process queue in batches
    const batchSize = 10;
    if (this.queue.length >= batchSize) {
      this.flushQueue();
    } else {
      // Debounced flush
      setTimeout(() => this.flushQueue(), 2000);
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      await this.sendEvents(events);
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Re-queue events if send failed
      this.queue.unshift(...events);
      
      // Store events for later if offline
      if (!this.isOnline) {
        await this.storeEventsLocally(events);
      }
    }
  }

  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    if (!this.API_URL) {
      console.warn('Analytics API URL not configured');
      return;
    }

    // Store in AsyncStorage for offline support
    try {
      await this.storeEventsLocally(events);
    } catch (error) {
      console.warn('Failed to store events locally:', error);
    }

    // Send to backend analytics endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${this.API_URL}/api/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send events to backend:', error);
      throw error;
    }
  }

  private async storeEventsLocally(events: AnalyticsEvent[]): Promise<void> {
    if (IS_WEB_SSR) return;
    try {
      const existingData = await AsyncStorage.getItem('analytics_local_storage');
      const existingEvents = existingData ? JSON.parse(existingData) : [];
      const allEvents = [...existingEvents, ...events];
      const recentEvents = allEvents.slice(-1000);
      await AsyncStorage.setItem('analytics_local_storage', JSON.stringify(recentEvents));
    } catch (error) {
      console.warn('Failed to store events locally:', error);
    }
  }

  // Screen lifecycle tracking
  onScreenFocus(screenName: string): void {
    this.trackScreenView(screenName);
    this.screenStartTime = Date.now();
  }

  onScreenBlur(screenName: string): void {
    const duration = Date.now() - this.screenStartTime;
    this.track('screen_blur', {
      screenName,
      duration
    });
  }

  // App lifecycle tracking
  onAppStateChange(nextAppState: string): void {
    this.track('app_state_change', {
      state: nextAppState
    });
    
    if (nextAppState === 'background' && this.queue.length > 0 && !IS_WEB_SSR) {
      AsyncStorage.setItem('analytics_queue', JSON.stringify(this.queue));
    }
  }

  // Analytics utilities
  getSessionId(): string {
    return this.sessionId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  getPerformanceMetrics(): PerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  // Export data for debugging
  async exportLocalData(): Promise<AnalyticsEvent[]> {
    if (IS_WEB_SSR) return [];
    try {
      const data = await AsyncStorage.getItem('analytics_local_storage');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to export local analytics data:', error);
      return [];
    }
  }

  async clearLocalData(): Promise<void> {
    if (IS_WEB_SSR) return;
    try {
      await AsyncStorage.multiRemove(['analytics_queue', 'analytics_local_storage']);
      this.queue = [];
      this.performanceMetrics.clear();
    } catch (error) {
      console.error('Failed to clear local analytics data:', error);
    }
  }
}

// Global analytics instance
export const analyticsService = new AnalyticsService();
export default analyticsService;