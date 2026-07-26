// Global type definitions for EventConnect Mobile

import { NavigationProp } from '@react-navigation/native';

declare global {
  namespace ReactNavigation {
    interface RootParamList {
      Home: undefined;
      Login: undefined;
      Register: undefined;
      Profile: { userId?: string };
      Event: { eventId: string };
      // Add more routes as needed
    }
  }
}

export interface MobileApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  deviceId: string;
}

export {};