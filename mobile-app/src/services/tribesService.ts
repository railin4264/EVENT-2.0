import { apiClient } from './apiClient';

export interface Tribe {
  _id: string;
  name: string;
  description: string;
  category: string;
  creator: {
    _id: string;
    username: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  members: Array<{
    user: string;
    role: 'member' | 'moderator' | 'admin';
    joinedAt: string;
    status: 'active' | 'inactive' | 'banned';
  }>;
  location: {
    type: string;
    coordinates: [number, number];
    address?: string;
    isVirtual: boolean;
  };
  avatar?: {
    url: string;
    alt: string;
  };
  tags: string[];
  settings: {
    privacy: 'public' | 'private' | 'secret';
    membership: 'open' | 'approval_required' | 'invite_only';
  };
  stats: {
    totalMembers: number;
    totalEvents: number;
    averageRating: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isMember?: boolean;
  isAdmin?: boolean;
  membersCount: number;
}

export interface CreateTribeRequest {
  name: string;
  description: string;
  category: string;
  tags?: string[];
  location?: {
    coordinates: [number, number];
    address?: string;
    isVirtual?: boolean;
  };
  settings?: {
    privacy?: 'public' | 'private' | 'secret';
    membership?: 'open' | 'approval_required' | 'invite_only';
  };
}

export interface TribesResponse {
  success: boolean;
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  tribes: Tribe[];
}

export interface TribeResponse {
  success: boolean;
  tribe: Tribe;
}

export class TribesService {
  async getTribes(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }): Promise<TribesResponse> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);

    const response = await apiClient.get(`/tribes?${queryParams.toString()}`);
    return response.data;
  }

  async getTribe(id: string): Promise<TribeResponse> {
    const response = await apiClient.get(`/tribes/${id}`);
    return response.data;
  }

  async createTribe(data: CreateTribeRequest): Promise<TribeResponse> {
    const response = await apiClient.post('/tribes', data);
    return response.data;
  }

  async updateTribe(id: string, data: Partial<CreateTribeRequest>): Promise<TribeResponse> {
    const response = await apiClient.put(`/tribes/${id}`, data);
    return response.data;
  }

  async deleteTribe(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/tribes/${id}`);
    return response.data;
  }

  async joinTribe(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/tribes/${id}/join`);
    return response.data;
  }

  async leaveTribe(id: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/tribes/${id}/leave`);
    return response.data;
  }

  async getUserTribes(): Promise<TribesResponse> {
    const response = await apiClient.get('/tribes/user/me');
    return response.data;
  }

  async getNearbyTribes(
    latitude: number,
    longitude: number,
    radius?: number
  ): Promise<TribesResponse> {
    const queryParams = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
    });

    if (radius) queryParams.append('radius', radius.toString());

    const response = await apiClient.get(`/tribes/nearby?${queryParams.toString()}`);
    return response.data;
  }

  // Tribe Posts
  async createTribePost(
    tribeId: string,
    data: { content: string; images?: { url: string; alt?: string }[] }
  ): Promise<{ success: boolean; message: string; post: any }> {
    const response = await apiClient.post(`/tribes/${tribeId}/posts`, data);
    return response.data;
  }

  async getTribePosts(
    tribeId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ success: boolean; posts: any[]; total: number; pagination: any }> {
    const response = await apiClient.get(`/tribes/${tribeId}/posts?page=${page}&limit=${limit}`);
    return response.data;
  }

  async deleteTribePost(tribeId: string, postId: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/tribes/${tribeId}/posts/${postId}`);
    return response.data;
  }

  async likeTribePost(tribeId: string, postId: string): Promise<{ success: boolean; liked: boolean; likesCount: number }> {
    const response = await apiClient.post(`/tribes/${tribeId}/posts/${postId}/like`);
    return response.data;
  }

  // Tribe Stories
  async createTribeStory(
    tribeId: string,
    data: { media: { url: string; type: 'image' | 'video'; thumbnail?: string }; duration?: number }
  ): Promise<{ success: boolean; message: string; story: any }> {
    const response = await apiClient.post(`/tribes/${tribeId}/stories`, data);
    return response.data;
  }

  async getTribeStories(tribeId: string): Promise<{ success: boolean; stories: any[]; count: number }> {
    const response = await apiClient.get(`/tribes/${tribeId}/stories`);
    return response.data;
  }

  async viewTribeStory(tribeId: string, storyId: string): Promise<{ success: boolean; viewsCount: number }> {
    const response = await apiClient.post(`/tribes/${tribeId}/stories/${storyId}/view`);
    return response.data;
  }
}

export const tribesService = new TribesService();

// Categorías disponibles
export const TRIBE_CATEGORIES = [
  { value: 'music', label: 'Música', icon: '🎵' },
  { value: 'sports', label: 'Deportes', icon: '⚽' },
  { value: 'technology', label: 'Tecnología', icon: '💻' },
  { value: 'art', label: 'Arte', icon: '🎨' },
  { value: 'food', label: 'Comida', icon: '🍕' },
  { value: 'travel', label: 'Viajes', icon: '✈️' },
  { value: 'education', label: 'Educación', icon: '📚' },
  { value: 'business', label: 'Negocios', icon: '💼' },
  { value: 'health', label: 'Salud', icon: '🏥' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'reading', label: 'Lectura', icon: '📖' },
  { value: 'photography', label: 'Fotografía', icon: '📸' },
  { value: 'cooking', label: 'Cocina', icon: '👨‍🍳' },
  { value: 'dancing', label: 'Baile', icon: '💃' },
  { value: 'writing', label: 'Escritura', icon: '✍️' },
  { value: 'volunteering', label: 'Voluntariado', icon: '🤝' },
  { value: 'outdoors', label: 'Aire Libre', icon: '🏕️' },
  { value: 'fashion', label: 'Moda', icon: '👗' },
  { value: 'networking', label: 'Networking', icon: '🌐' },
  { value: 'professional', label: 'Profesional', icon: '🏢' },
  { value: 'hobby', label: 'Hobbies', icon: '🎯' },
  { value: 'cultural', label: 'Cultural', icon: '🏛️' },
  { value: 'spiritual', label: 'Espiritual', icon: '🧘' },
  { value: 'other', label: 'Otros', icon: '📋' },
];

export default tribesService;
