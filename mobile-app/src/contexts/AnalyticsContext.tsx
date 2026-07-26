import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { analyticsService } from '@/services/AnalyticsService';

interface AnalyticsContextType {
  track: typeof analyticsService.track;
  trackScreenView: typeof analyticsService.trackScreenView;
  trackPress: typeof analyticsService.trackPress;
  trackEvent: typeof analyticsService.trackEvent;
  trackSwipe: typeof analyticsService.trackSwipe;
  trackError: typeof analyticsService.trackError;
  trackEventInteraction: typeof analyticsService.trackEventInteraction;
  trackSocialInteraction: typeof analyticsService.trackSocialInteraction;
  trackFeatureUsage: typeof analyticsService.trackFeatureUsage;
  trackLocation: typeof analyticsService.trackLocation;
  trackPurchase: typeof analyticsService.trackPurchase;
  setUserId: typeof analyticsService.setUserId;
  setUserProperties: typeof analyticsService.setUserProperties;
  onScreenFocus: typeof analyticsService.onScreenFocus;
  onScreenBlur: typeof analyticsService.onScreenBlur;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

interface AnalyticsProviderProps {
  children: ReactNode;
  userId?: string;
  userProperties?: Record<string, any>;
}

export function AnalyticsProvider({ 
  children, 
  userId,
  userProperties 
}: AnalyticsProviderProps) {
  useEffect(() => {
    // Set user data if provided
    if (userId) {
      analyticsService.setUserId(userId);
    }
    
    if (userProperties) {
      analyticsService.setUserProperties(userProperties);
    }

    // Set up app state change listener
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      analyticsService.onAppStateChange(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [userId, userProperties]);

  const contextValue: AnalyticsContextType = {
    track: analyticsService.track.bind(analyticsService),
    trackScreenView: analyticsService.trackScreenView.bind(analyticsService),
    trackPress: analyticsService.trackPress.bind(analyticsService),
    trackEvent: analyticsService.trackEvent.bind(analyticsService),
    trackSwipe: analyticsService.trackSwipe.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackEventInteraction: analyticsService.trackEventInteraction.bind(analyticsService),
    trackSocialInteraction: analyticsService.trackSocialInteraction.bind(analyticsService),
    trackFeatureUsage: analyticsService.trackFeatureUsage.bind(analyticsService),
    trackLocation: analyticsService.trackLocation.bind(analyticsService),
    trackPurchase: analyticsService.trackPurchase.bind(analyticsService),
    setUserId: analyticsService.setUserId.bind(analyticsService),
    setUserProperties: analyticsService.setUserProperties.bind(analyticsService),
    onScreenFocus: analyticsService.onScreenFocus.bind(analyticsService),
    onScreenBlur: analyticsService.onScreenBlur.bind(analyticsService)
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

// HOC for automatic screen tracking
export function withScreenTracking<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  screenName: string,
  trackingProps?: {
    customProperties?: Record<string, any>;
  }
) {
  return function WrappedComponent(props: T) {
    const { onScreenFocus, onScreenBlur } = useAnalytics();

    useEffect(() => {
      // Track screen focus
      onScreenFocus(screenName);

      return () => {
        // Track screen blur
        onScreenBlur(screenName);
      };
    }, [onScreenFocus, onScreenBlur]);

    return <Component {...props} />;
  };
}

// HOC for automatic press tracking
export function withPressTracking<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  trackingProps?: {
    elementName?: string;
    category?: string;
    customProperties?: Record<string, any>;
  }
) {
  return function WrappedComponent(props: T) {
    const { trackPress } = useAnalytics();

    const handlePress = () => {
      const elementName = trackingProps?.elementName || Component.displayName || 'Unknown';
      const properties = {
        category: trackingProps?.category || 'UI',
        ...trackingProps?.customProperties,
      };

      trackPress(elementName, properties);

      // Call original onPress if it exists
      if (props.onPress) {
        props.onPress();
      }
    };

    return <Component {...props} onPress={handlePress} />;
  };
}

// Hook for gesture tracking
export function useGestureTracking(screenName: string) {
  const { trackSwipe } = useAnalytics();

  return {
    onSwipeLeft: (properties?: Record<string, any>) => {
      trackSwipe('left', screenName, properties);
    },
    onSwipeRight: (properties?: Record<string, any>) => {
      trackSwipe('right', screenName, properties);
    },
    onSwipeUp: (properties?: Record<string, any>) => {
      trackSwipe('up', screenName, properties);
    },
    onSwipeDown: (properties?: Record<string, any>) => {
      trackSwipe('down', screenName, properties);
    }
  };
}