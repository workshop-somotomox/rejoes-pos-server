// index.ts
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

declare global {
  namespace Express {
    interface Request {
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
