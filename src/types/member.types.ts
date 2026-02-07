export enum MemberTier {
  BASIC = 'BASIC',
  PLUS = 'PLUS',
  PREMIUM = 'PREMIUM',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
}

export type TierConfig = {
  itemsPerMonth: number;
  swaps: number;
  maxItemsOut: number;
};

export interface ActiveLoanThumbnail {
  id: string;
  thumbnailUrl: string;
}

export type MemberRecord = {
  id: string;
  cardToken: string;
  shopifyCustomerId: string | null;
  tier: string;
  status: string;
  cycleStart: Date;
  cycleEnd: Date;
  itemsUsed: number;
  swapsUsed: number;
  itemsOut: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MemberWithLoans = MemberRecord & {
  loans: ActiveLoanThumbnail[];
};
