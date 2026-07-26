import apiClient from './client'
import type { ApiResponse } from '@/types/api.types'

/**
 * Servicio centralizado para manejar todas las subidas de archivos hacia el backend.
 * Evita la exposición directa de credenciales de Cloudinary en el cliente.
 */
export const uploadService = {
  /**
   * Sube una imagen de avatar para el usuario logueado.
   * Llama a POST /api/upload/avatar
   */
  uploadAvatar: async (file: File): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await apiClient.post('/upload/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Sube imágenes para la portada/galería de un evento.
   * Llama a POST /api/upload/event-images
   */
  uploadEventImages: async (files: File[]): Promise<ApiResponse<Array<{ url: string }>>> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('eventImages', file)
    })
    const response = await apiClient.post('/upload/event-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Sube imágenes para un Post (Feed/Stories).
   * Llama a POST /api/upload/post-images
   */
  uploadPostImages: async (files: File[]): Promise<ApiResponse<Array<{ url: string }>>> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('postImages', file)
    })
    const response = await apiClient.post('/upload/post-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}

