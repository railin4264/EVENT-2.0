import { useState, useEffect, useCallback } from 'react';
import { tribesService, Tribe, TribesResponse, CreateTribeRequest } from '../services/tribesService';
import { useAuth } from '../contexts/AuthContext';

export interface UseTribesOptions {
  autoFetch?: boolean;
  category?: string;
  search?: string;
  limit?: number;
}

export const useTribes = (options: UseTribesOptions = {}) => {
  const { autoFetch = true, category, search, limit = 10 } = options;
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    hasMore: false,
  });

  const fetchTribes = useCallback(async (page = 1, append = false) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await tribesService.getTribes({
        page,
        limit,
        category,
        search,
      });

      if (response.success) {
        const newTribes = response.tribes;
        
        if (append) {
          setTribes(prev => [...prev, ...newTribes]);
        } else {
          setTribes(newTribes);
        }

        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            pages: response.pagination.pages,
            total: response.pagination.total,
            hasMore: response.pagination.page < response.pagination.pages,
          });
        }
      }
    } catch (err: any) {
      console.error('Error fetching tribes:', err);
      setError(err.response?.data?.message || 'Error loading tribes');
    } finally {
      setLoading(false);
    }
  }, [category, search, limit, loading]);

  const loadMore = useCallback(() => {
    if (pagination.hasMore && !loading) {
      fetchTribes(pagination.page + 1, true);
    }
  }, [pagination.hasMore, pagination.page, loading, fetchTribes]);

  const refresh = useCallback(() => {
    fetchTribes(1, false);
  }, [fetchTribes]);

  useEffect(() => {
    if (autoFetch) {
      fetchTribes();
    }
  }, [autoFetch, fetchTribes]);

  return {
    tribes,
    loading,
    error,
    pagination,
    fetchTribes,
    loadMore,
    refresh,
  };
};

export const useTribe = (tribeId?: string) => {
  const [tribe, setTribe] = useState<Tribe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTribe = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await tribesService.getTribe(id);
      if (response.success) {
        setTribe(response.tribe);
      }
    } catch (err: any) {
      console.error('Error fetching tribe:', err);
      setError(err.response?.data?.message || 'Error loading tribe');
    } finally {
      setLoading(false);
    }
  }, []);

  const joinTribe = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await tribesService.joinTribe(id);
      
      if (response.success) {
        // Refresh tribe data to update membership status
        await fetchTribe(id);
        return { success: true, message: response.message };
      }
    } catch (err: any) {
      console.error('Error joining tribe:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Error joining tribe' 
      };
    } finally {
      setLoading(false);
    }
  }, [fetchTribe]);

  const leaveTribe = useCallback(async (id: string) => {
    try {
      setLoading(true);
      const response = await tribesService.leaveTribe(id);
      
      if (response.success) {
        // Refresh tribe data to update membership status
        await fetchTribe(id);
        return { success: true, message: response.message };
      }
    } catch (err: any) {
      console.error('Error leaving tribe:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Error leaving tribe' 
      };
    } finally {
      setLoading(false);
    }
  }, [fetchTribe]);

  useEffect(() => {
    if (tribeId) {
      fetchTribe(tribeId);
    }
  }, [tribeId, fetchTribe]);

  return {
    tribe,
    loading,
    error,
    fetchTribe,
    joinTribe,
    leaveTribe,
  };
};

export const useUserTribes = () => {
  const { user } = useAuth();
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserTribes = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await tribesService.getUserTribes();
      if (response.success) {
        setTribes(response.tribes);
      }
    } catch (err: any) {
      console.error('Error fetching user tribes:', err);
      setError(err.response?.data?.message || 'Error loading your tribes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserTribes();
  }, [fetchUserTribes]);

  return {
    tribes,
    loading,
    error,
    refresh: fetchUserTribes,
  };
};

export const useCreateTribe = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTribe = useCallback(async (data: CreateTribeRequest) => {
    try {
      setLoading(true);
      setError(null);

      const response = await tribesService.createTribe(data);
      
      if (response.success) {
        return { success: true, tribe: response.tribe };
      }
    } catch (err: any) {
      console.error('Error creating tribe:', err);
      const errorMessage = err.response?.data?.message || 'Error creating tribe';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createTribe,
    loading,
    error,
  };
};
