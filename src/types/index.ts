export type SubscriptionTier = 'BASIC' | 'PLUS' | 'PREMIUM';
export type MemberStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export type TierConfig = {
  itemsPerMonth: number;
  swaps: number;
  maxItemsOut: number;
};

export type ShopifySubscriptionEventType =
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_cancelled';

export interface ShopifySubscriptionPayload {
  type: ShopifySubscriptionEventType;
  data: {
    shopifyCustomerId: string;
    cardToken: string;
    planHandle: string;
    status: 'active' | 'paused' | 'cancelled';
    cycleStart: string;
    cycleEnd: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
      idempotencyKey?: string;
    }
  }
}

export interface LoanResponse {
  id: string;
  memberId: string;
  storeLocation: string;
  photoUrl: string;
  thumbnailUrl: string;
  checkoutAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  createdAt: Date;
}

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

export interface ActiveLoanThumbnail {
  id: string;
  thumbnailUrl: string;
}
