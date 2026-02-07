export interface CheckoutInput {
  memberId: string;
  storeLocation: string;
  uploadIds: string[];
}

export interface ReturnInput {
  memberId: string;
  loanId: string;
}

export interface SwapInput {
  memberId: string;
  loanId: string;
  storeLocation: string;
  uploadIds: string[];
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

export type LoanRecord = {
  id: string;
  memberId: string;
  storeLocation: string;
  photoUrl: string;
  thumbnailUrl: string;
  checkoutAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  createdAt: Date;
  gallery?: { id: string; r2Key: string; metadata: string }[];
};
