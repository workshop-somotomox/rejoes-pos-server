import { SubscriptionTier, TierConfig } from '../types';

export const tierConfig: Record<SubscriptionTier, TierConfig> = {
  BASIC: {
    itemsPerMonth: 1,
    swaps: 0,
    maxItemsOut: 1,
  },
  PLUS: {
    itemsPerMonth: 5,
    swaps: 2,
    maxItemsOut: 2,
  },
  PREMIUM: {
    itemsPerMonth: 10,
    swaps: 5,
    maxItemsOut: 4,
  },
};

export const getTierConfig = (tier: SubscriptionTier): TierConfig => tierConfig[tier];
