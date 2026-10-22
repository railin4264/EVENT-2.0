import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { clearTicketPasses } from '../utils/ticketPassStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginForm, RegisterForm, ApiResponse } from '@/types';
import { authService, AuthData } from '@/services/AuthService';
import { onSessionChange } from '@/services/apiClient';
import { STORAGE_KEYS } from '@/constants';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (credentials: LoginForm) => Promise<void>;
  verifyTwoFactor: (tempToken: string, code: string) => Promise<void>;
  register: (userData: RegisterForm) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const passOwnerRef = useRef<string | null>(null);
  passOwnerRef.current = user?._id || user?.id || passOwnerRef.current;

  useEffect(() => onSessionChange(nextToken => {
    setToken(nextToken);
    if (nextToken) authService.setAuthToken(nextToken);
    else {
      if (passOwnerRef.current) void clearTicketPasses(passOwnerRef.current).catch(() => undefined);
      passOwnerRef.current = null;
      setUser(null);
      authService.clearAuthToken();
      queryClient.clear();
    }
  }), [queryClient]);

  // Check if user is authenticated on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);

      if (token && userData) {
        const parsedUser = JSON.parse(userData) as User;
        setUser(parsedUser);
        setToken(token);
        authService.setAuthToken(token);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginForm) => authService.login(credentials),
    onSuccess: async (response: ApiResponse<{ user: User; token: string }>) => {
      if (response.success && response.data) {
        const { user: userData, token, refreshToken } = response.data as { user: User; token: string; refreshToken: string };

        // Store auth data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

        // Update state
        setUser(userData);
        setToken(token);
        authService.setAuthToken(token);

        // Invalidate and refetch user-related queries
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
  });

  const twoFactorMutation = useMutation({
    mutationFn: ({ tempToken, code }: { tempToken: string; code: string }) => authService.verifyTwoFactor(tempToken, code),
    onSuccess: async (response: ApiResponse<AuthData>) => {
      if (!response.success || !response.data) throw new Error('No se pudo completar la sesión.');
      const { user: userData, token: accessToken, refreshToken } = response.data;
      await AsyncStorage.multiSet([
        [STORAGE_KEYS.AUTH_TOKEN, accessToken],
        [STORAGE_KEYS.REFRESH_TOKEN, refreshToken],
        [STORAGE_KEYS.USER_DATA, JSON.stringify(userData)],
      ]);
      setUser(userData);
      setToken(accessToken);
      authService.setAuthToken(accessToken);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterForm) => authService.register(userData),
    onSuccess: async (response: ApiResponse<{ user: User; token: string }>) => {
      if (response.success && response.data) {
        const { user: userData, token, refreshToken } = response.data as { user: User; token: string; refreshToken: string };

        // Store auth data
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));

        // Update state
        setUser(userData);
        setToken(token);
        authService.setAuthToken(token);

        // Invalidate and refetch user-related queries
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
    onError: (error) => {
      console.error('Register error:', error);
      throw error;
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (userData: Partial<User>) => authService.updateProfile(userData),
    onSuccess: async (response: ApiResponse<User>) => {
      if (response.success && response.data) {
        const updatedUser = response.data;

        // Update stored user data
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));

        // Update state
        setUser(updatedUser);

        // Invalidate and refetch user-related queries
        queryClient.invalidateQueries({ queryKey: ['user'] });
      }
    },
    onError: (error) => {
      console.error('Update profile error:', error);
      throw error;
    },
  });

  // User query
  const { data: currentUser, refetch: refetchUser } = useQuery({
    queryKey: ['user', 'current'],
    queryFn: () => authService.getCurrentUser(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update user when query data changes
  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    }
  }, [currentUser]);

  const login = async (credentials: LoginForm) => {
    await loginMutation.mutateAsync(credentials);
  };

  const register = async (userData: RegisterForm) => {
    await registerMutation.mutateAsync(userData);
  };

  const logout = async () => {
    const passOwner = user?._id || user?.id;
    passOwnerRef.current = null;
    setUser(null);
    setToken(null);
    queryClient.clear();
    if (passOwner) await clearTicketPasses(String(passOwner)).catch(() => undefined);
    try {
      await authService.logout().catch(() => undefined);
      // Clear stored data
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER_DATA,
      ]);

      // Clear auth token from service
      authService.clearAuthToken();

      // Update state
      setUser(null);
      setToken(null);

      // Clear all queries
      queryClient.clear();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      authService.clearAuthToken();
      queryClient.clear();
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    await updateProfileMutation.mutateAsync(userData);
  };

  const refreshToken = async () => {
    try {
      const response = await authService.refreshToken();
      if (response.success && response.data) {
        const { token } = response.data;
        await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        setToken(token);
        authService.setAuthToken(token);
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout user
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending || twoFactorMutation.isPending,
    login,
    verifyTwoFactor: async (tempToken, code) => { await twoFactorMutation.mutateAsync({ tempToken, code }); },
    register,
    logout,
    updateProfile,
    updateUser: (updates: Partial<User>) => setUser((prev) => (prev ? { ...prev, ...updates } as User : null)),
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
