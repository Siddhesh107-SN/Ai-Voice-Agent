import { apiClient, isMockMode } from './client';
import { mockClientsService } from '@/lib/mock/clients';
import { BusinessProfile, BusinessProfileUpdateInput } from '@/lib/types';

export const clientsApi = {
  async getMyBusiness(): Promise<BusinessProfile> {
    if (isMockMode()) {
      return mockClientsService.getMyBusiness();
    }
    return apiClient<BusinessProfile>('/api/v1/clients/me');
  },

  async updateMyBusiness(input: BusinessProfileUpdateInput): Promise<BusinessProfile> {
    if (isMockMode()) {
      return mockClientsService.updateMyBusiness(input);
    }
    return apiClient<BusinessProfile>('/api/v1/clients/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },
};
