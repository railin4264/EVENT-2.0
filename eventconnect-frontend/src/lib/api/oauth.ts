import { apiClient } from './client'

export type OAuthProvider = 'google' | 'apple' | 'facebook' | 'github'

export interface OAuthProviderInfo {
  provider?: string
  name: string
  enabled: boolean
  authUrl?: string
}

export const oauthService = {
  // List available OAuth providers and their authorization URLs
  getProviders: async () => {
    const res = await apiClient.get('/oauth/providers')
    return res.data as { success: boolean; data: { providers: OAuthProviderInfo[] } }
  },

  // Begin OAuth flow — returns the provider's authorization URL to redirect to
  getAuthUrl: async (provider: OAuthProvider, redirect = '/events') => {
    const res = await apiClient.get(`/oauth/${provider}/auth`, { params: { redirect_url: redirect } })
    return res.data as { success: boolean; authUrl?: string; state?: string; data?: { authUrl: string; state?: string } }
  },

  // Handle the OAuth callback (frontend receives ?code=&state= from provider redirect)
  handleCallback: async (provider: OAuthProvider, code: string, state?: string) => {
    const res = await apiClient.post(`/oauth/${provider}/callback`, { code, state })
    return res.data
  },

  // Link an OAuth account to the currently authenticated user
  linkAccount: async (provider: OAuthProvider, code: string, state: string) => {
    const res = await apiClient.post(`/oauth/${provider}/link`, { code, state })
    return res.data
  },

  // Unlink an OAuth account from the current user
  unlinkAccount: async (provider: OAuthProvider) => {
    const res = await apiClient.delete(`/oauth/${provider}/unlink`)
    return res.data
  },

  // List the user's linked OAuth accounts
  getAccounts: async () => {
    const res = await apiClient.get('/oauth/accounts')
    return res.data
  },
}

export default oauthService
