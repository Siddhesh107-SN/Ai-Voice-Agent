import { MockStorage, simulateLatency } from './storage';
import { BusinessProfile, BusinessProfileUpdateInput } from '@/lib/types';

export const mockClientsService = {
  async getMyBusiness(): Promise<BusinessProfile> {
    await simulateLatency(150);
    return MockStorage.getBusiness();
  },

  async updateMyBusiness(input: BusinessProfileUpdateInput): Promise<BusinessProfile> {
    await simulateLatency(250);

    const current = MockStorage.getBusiness();
    const updated: BusinessProfile = {
      ...current,
      business_name: input.business_name ? input.business_name.trim() : current.business_name,
      phone: input.phone ? input.phone.trim() : current.phone,
      address: input.address ? input.address.trim() : current.address,
      timezone: input.timezone ? input.timezone : current.timezone,
    };

    MockStorage.setBusiness(updated);
    return updated;
  },
};
