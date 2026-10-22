import { apiClient } from './client'

export interface PlanEvent {
  id: string
  title: string
  date: string
  endDate?: string
  location: string
  price?: { amount: number; currency: string }
}
export interface GroupPlan {
  title: string
  shareToken: string
  status: 'open' | 'expired' | 'decided'
  expiresAt: string
  totalVotes: number
  isOwner: boolean
  myVote: string | null
  selectedOptionId?: string
  options: { id: string; votes: number; available: boolean; event: PlanEvent | null }[]
}
const config = { withCredentials: true }
export const plansApi = {
  async mine(): Promise<GroupPlan[]> { return (await apiClient.get('/plans/mine', config)).data.data },
  async create(title: string, eventIds: string[], hours: number): Promise<GroupPlan> {
    return (await apiClient.post('/plans', { title, eventIds, hours }, config)).data.data
  },
  async get(token: string): Promise<GroupPlan> { return (await apiClient.get(`/plans/${token}`, config)).data.data },
  async vote(token: string, optionId: string): Promise<GroupPlan> {
    return (await apiClient.post(`/plans/${token}/vote`, { optionId }, config)).data.data
  },
  async decide(token: string, optionId: string): Promise<GroupPlan> {
    return (await apiClient.post(`/plans/${token}/decide`, { optionId }, config)).data.data
  }
}
