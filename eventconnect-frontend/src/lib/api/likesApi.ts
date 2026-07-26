import { API_URL } from '@/lib/config';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export const likesApi = {
  // Post likes
  togglePostLike: async (postId: string) => {
    const response = await fetch(`${API_URL}/api/feed/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to toggle post like');
    }

    return response.json();
  },

  getPostLikes: async (postId: string) => {
    const response = await fetch(`${API_URL}/api/feed/${postId}/likes`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch post likes');
    }

    return response.json();
  },

  // Event likes
  toggleEventLike: async (eventId: string) => {
    const response = await fetch(`${API_URL}/api/events/${eventId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to toggle event like');
    }

    return response.json();
  },

  getEventLikes: async (eventId: string) => {
    const response = await fetch(`${API_URL}/api/events/${eventId}/likes`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch event likes');
    }

    return response.json();
  },

  // Comment likes
  toggleCommentLike: async (commentId: string) => {
    const response = await fetch(`${API_URL}/api/comments/${commentId}/like`, {
      method: 'POST',
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to toggle comment like');
    }

    return response.json();
  },

  getCommentLikes: async (commentId: string) => {
    const response = await fetch(`${API_URL}/api/comments/${commentId}/likes`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch comment likes');
    }

    return response.json();
  }
};
