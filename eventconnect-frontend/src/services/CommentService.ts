import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface Comment {
  _id: string;
  targetType: 'event' | 'post';
  targetId: string;
  author: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  content: string;
  parentId?: string | null;
  replies: Comment[] | string[];
  likes: string[];
  likesCount: number;
  repliesCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentData {
  targetType: 'event' | 'post';
  targetId: string;
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  content: string;
}

export interface CommentResponse {
  success: boolean;
  data: Comment;
  message?: string;
}

export interface CommentsListResponse {
  success: boolean;
  data: Comment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

class CommentService {
  private getAuthHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get comments for a specific target (event or post)
  async getComments(
    targetType: 'event' | 'post',
    targetId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<CommentsListResponse> {
    try {
      const response = await axios.get(
        `${API_URL}/comments/${targetType}/${targetId}`,
        {
          params: { page, limit },
          headers: this.getAuthHeader(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      throw error.response?.data || error;
    }
  }

  // Create a new comment
  async createComment(data: CreateCommentData): Promise<CommentResponse> {
    try {
      const response = await axios.post(
        `${API_URL}/comments`,
        data,
        {
          headers: this.getAuthHeader(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error creating comment:', error);
      throw error.response?.data || error;
    }
  }

  // Update a comment
  async updateComment(
    commentId: string,
    data: UpdateCommentData
  ): Promise<CommentResponse> {
    try {
      const response = await axios.put(
        `${API_URL}/comments/${commentId}`,
        data,
        {
          headers: this.getAuthHeader(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error updating comment:', error);
      throw error.response?.data || error;
    }
  }

  // Delete a comment
  async deleteComment(commentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.delete(
        `${API_URL}/comments/${commentId}`,
        {
          headers: this.getAuthHeader(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      throw error.response?.data || error;
    }
  }

  // Like/unlike a comment
  async toggleLike(commentId: string): Promise<{
    success: boolean;
    message: string;
    data: { liked: boolean; likesCount: number };
  }> {
    try {
      const response = await axios.post(
        `${API_URL}/comments/${commentId}/like`,
        {},
        {
          headers: this.getAuthHeader(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error toggling like:', error);
      throw error.response?.data || error;
    }
  }

  // Get user's comments
  async getUserComments(
    page: number = 1,
    limit: number = 10
  ): Promise<CommentsListResponse> {
    try {
      const response = await axios.get(
        `${API_URL}/comments/user/me`,
        {
          params: { page, limit },
          headers: this.getAuthHeader(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user comments:', error);
      throw error.response?.data || error;
    }
  }
}

export default new CommentService();
