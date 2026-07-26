import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService, type EventFilters, type CreateEventData } from '@/services/EventService';
import type { Event } from '@/types/api.types';

// Query Keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters: EventFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: string) => [...eventKeys.details(), id] as const,
  nearby: (lat: number, lng: number, radius: number) => [...eventKeys.all, 'nearby', { lat, lng, radius }] as const,
  trending: () => [...eventKeys.all, 'trending'] as const,
  userEvents: (userId?: string) => [...eventKeys.all, 'user', userId] as const,
  attendees: (eventId: string) => [...eventKeys.detail(eventId), 'attendees'] as const,
  comments: (eventId: string) => [...eventKeys.detail(eventId), 'comments'] as const,
};

// Hooks
export function useEvents(filters: EventFilters = {}) {
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => eventService.getEvents(filters),
  });
}

export function useEvent(eventId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: eventKeys.detail(eventId!),
    queryFn: () => eventService.getEventById(eventId!),
    enabled: !!eventId && enabled,
  });
}

export function useNearbyEvents(lat?: number, lng?: number, radius: number = 25, limit: number = 20) {
  return useQuery({
    queryKey: eventKeys.nearby(lat!, lng!, radius),
    queryFn: () => eventService.getNearbyEvents(lat!, lng!, radius, limit),
    enabled: !!lat && !!lng,
  });
}

export function useTrendingEvents(limit: number = 10) {
  return useQuery({
    queryKey: eventKeys.trending(),
    queryFn: () => eventService.getTrendingEvents(limit),
  });
}

export function useUserEvents(userId?: string) {
  return useQuery({
    queryKey: eventKeys.userEvents(userId),
    queryFn: () => eventService.getUserEvents(userId),
  });
}

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: eventKeys.attendees(eventId),
    queryFn: () => eventService.getEventAttendees(eventId),
    enabled: !!eventId,
  });
}

export function useEventComments(eventId: string) {
  return useQuery({
    queryKey: eventKeys.comments(eventId),
    queryFn: () => eventService.getEventComments(eventId),
    enabled: !!eventId,
  });
}

// Mutations
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventData) => eventService.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<CreateEventData> }) =>
      eventService.updateEvent(eventId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(variables.eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => eventService.deleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useAttendEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => eventService.attendEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.attendees(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useLeaveEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => eventService.leaveEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.attendees(eventId) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useFavoriteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => eventService.favoriteEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

export function useAddEventComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, content }: { eventId: string; content: string }) =>
      eventService.addComment(eventId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.comments(variables.eventId) });
    },
  });
}

export function useDeleteEventComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, commentId }: { eventId: string; commentId: string }) =>
      eventService.deleteComment(eventId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.comments(variables.eventId) });
    },
  });
}