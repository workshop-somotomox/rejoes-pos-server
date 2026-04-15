import { MemberTier, TierConfig } from '../types/member.types';

export const tierConfig: Record<MemberTier, TierConfig> = {
  [MemberTier.BASIC]: {
    itemsPerMonth: 1,
    swaps: 0,
    maxItemsOut: 1,
  },
  [MemberTier.PLUS]: {
    itemsPerMonth: 3,
    swaps: 2,
    maxItemsOut: 2,
  },
  [MemberTier.PREMIUM]: {
    itemsPerMonth: 6,
    swaps: 3,
    maxItemsOut: 4,
  },
};

export const getTierConfig = (tier: MemberTier): TierConfig => tierConfig[tier];
