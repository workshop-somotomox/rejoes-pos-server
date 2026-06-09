import { withTransaction, type DbClient } from '../db/client';
import { AppError } from '../utils/errors';
import {
  getMemberById,
  resetCountersIfNewCycle,
  validateMemberCanCheckout,
  validateSwapAllowance,
} from './member.service';
import { LoanRepository } from '../repositories/loan.repo';
import { UploadRepository } from '../repositories/upload.repo';
import { CheckoutInput, ReturnInput, SwapInput, LoanPhoto, type LoanRecord } from '../types/loan.types';

async function getLoanOrThrow(loanId: string, client: DbClient) {
  const loan = await LoanRepository.findById(loanId, client);
  if (!loan) {
    throw new AppError(404, 'Loan not found');
  }
  return loan;
}

async function consumeLoanPhotos(uploadIds: string[], client: DbClient): Promise<LoanPhoto[]> {
  const photos = await LoanRepository.findPhotosByIds(uploadIds, client);

  if (photos.length === 0) {
    throw new AppError(400, 'No photos found for the provided upload IDs');
  }

  if (photos.length !== uploadIds.length) {
    const missing = uploadIds.filter(id => !photos.some((p: LoanPhoto) => p.id === id));
    throw new AppError(400, 'Invalid upload reference(s)');
  }

  return photos;
}

export async function checkoutLoan(input: CheckoutInput): Promise<LoanRecord> {
  return withTransaction(async (tx: DbClient) => {
    let member = await getMemberById(input.memberId, tx);
    member = await resetCountersIfNewCycle(member, tx);
    
    validateMemberCanCheckout(member);

    const photos = await consumeLoanPhotos(input.uploadIds, tx);
    
    const primaryPhoto = photos[0];
    const galleryPhotos = photos.slice(1);
    
    // Calculate due date (30 days from checkout)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const loan = await LoanRepository.create(
      {
        memberId: member.id,
        storeLocation: input.storeLocation,
        photoUrl: primaryPhoto.r2Key,
        thumbnailUrl: primaryPhoto.r2Key,
        dueDate,
      },
      tx
    );

    // Update primary photo with loan ID using repository
    await UploadRepository.updateLoanPhotoWithLoanId(primaryPhoto.id, loan.id, tx);
    
    // Link gallery photos to the loan using repository
    if (galleryPhotos.length > 0) {
      await Promise.all(
        galleryPhotos.map((photo: LoanPhoto) =>
          UploadRepository.updateLoanPhotoWithLoanId(photo.id, loan.id, tx)
        )
      );
    }

    await LoanRepository.updateMemberCounters(
      member.id,
      {
        itemsUsed: { increment: 1 },
        itemsOut: { increment: 1 },
      },
      tx
    );

    // await logEvent(member.id, 'loan_checkout', { loanId: loan.id }, tx);
    return loan;
  });
}

export async function returnLoan(input: ReturnInput): Promise<LoanRecord> {
  return withTransaction(async (tx: DbClient) => {
    let member = await getMemberById(input.memberId, tx);
    member = await resetCountersIfNewCycle(member, tx);

    const loan = await getLoanOrThrow(input.loanId, tx);
    if (loan.memberId !== member.id) {
      throw new AppError(400, 'Loan does not belong to member');
    }
    if (loan.returnedAt) {
      throw new AppError(400, 'Loan already returned');
    }

    const updatedLoan = await LoanRepository.update(
      loan.id,
      { returnedAt: new Date() },
      tx
    );

    await LoanRepository.updateMemberCounters(
      member.id,
      {
        itemsOut: { decrement: 1 },
      },
      tx
    );

    // await logEvent(member.id, 'loan_return', { loanId: loan.id }, tx);
    return updatedLoan;
  });
}

export async function swapLoan(input: SwapInput): Promise<{ returnedLoan: LoanRecord; newLoan: LoanRecord }> {
  return withTransaction(async (tx: DbClient) => {
    let member = await getMemberById(input.memberId, tx);
    member = await resetCountersIfNewCycle(member, tx);
    validateSwapAllowance(member);

    const loan = await getLoanOrThrow(input.loanId, tx);
    if (loan.memberId !== member.id) {
      throw new AppError(400, 'Loan does not belong to member');
    }
    if (loan.returnedAt) {
      throw new AppError(400, 'Loan already returned');
    }

    const now = new Date();
    
    // Create new loan first
    const photos = await consumeLoanPhotos(input.uploadIds, tx);
    
    // Use first photo as primary, rest go to gallery
    const primaryPhoto = photos[0];
    const galleryPhotos = photos.slice(1);

    // Calculate due date for new loan (30 days from swap)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newLoan = await LoanRepository.create({
      memberId: member.id,
      storeLocation: input.storeLocation,
      photoUrl: primaryPhoto.r2Key,
      thumbnailUrl: primaryPhoto.r2Key,
      checkoutAt: now,
      dueDate,
      swappedFromId: loan.id, // Link to the old loan
    }, tx);

    // Now update the old loan with swap information
    const returnedLoan = await LoanRepository.update(
      loan.id,
      { 
        returnedAt: now,
        swappedAt: now,        // Mark when it was swapped
        swappedForId: newLoan.id // Link to the new loan
      },
      tx
    );

    // Update primary photo with loan ID
    await LoanRepository.updateLoanPhoto(primaryPhoto.id, newLoan.id, tx);
    
    // Link gallery photos to the new loan
    if (galleryPhotos.length > 0) {
      await Promise.all(
        galleryPhotos.map((photo: LoanPhoto) => 
          LoanRepository.updateLoanPhoto(photo.id, newLoan.id, tx)
        )
      );
    }

    await LoanRepository.updateMemberCounters(
      member.id,
      {
        swapsUsed: { increment: 1 },
        itemsUsed: { increment: 1 },
      },
      tx
    );

    // await logEvent(member.id, 'loan_swap', { oldLoanId: loan.id, newLoanId: newLoan.id }, tx);
    return { returnedLoan, newLoan };
  });
}

export async function getActiveLoans(memberId: string): Promise<LoanRecord[]> {
  const loans = await LoanRepository.findActiveByMember(memberId);

  return loans.map((loan: any) => {
    // The primary photo is the first one (based on photoUrl match)
    const primaryPhotoR2Key = loan.photoUrl;
    const allPhotos = loan.loanPhotos || [];
    
    // Gallery includes ALL photos (including primary)
    const gallery = allPhotos;
    
    return {
      ...loan,
      gallery,
      // Remove the loanPhotos array from the response to avoid confusion
      loanPhotos: undefined,
      // Include swap relationships if they exist
      swappedAt: loan.swappedAt || null,
      swappedFor: loan.swappedFor || null,
      swappedFrom: loan.swappedFrom || null,
    };
  });
}

export interface OutstandingLoanListItem {
  id: string;
  memberId: string;
  storeLocation: string;
  thumbnailUrl: string;
  photoUrl: string;
  checkoutAt: Date;
  dueDate: Date;
  isOverdue: boolean;
  member: {
    id: string;
    cardToken: string;
    shopifyCustomerId: string | null;
    tier: string;
    status: string;
    storeLocation: string | null;
  };
}

export async function listOutstandingLoans(params: {
  limit: number;
  offset: number;
  storeLocation?: string;
}): Promise<{ items: OutstandingLoanListItem[]; total: number; limit: number; offset: number }> {
  const { rows, total } = await LoanRepository.findAllOutstanding(params);
  const now = Date.now();
  const items: OutstandingLoanListItem[] = rows.map((loan: any) => ({
    id: loan.id,
    memberId: loan.memberId,
    storeLocation: loan.storeLocation,
    thumbnailUrl: loan.thumbnailUrl,
    photoUrl: loan.photoUrl,
    checkoutAt: loan.checkoutAt,
    dueDate: loan.dueDate,
    isOverdue: loan.dueDate ? new Date(loan.dueDate).getTime() < now : false,
    member: loan.member,
  }));

  return { items, total, limit: params.limit, offset: params.offset };
}

export async function getReturnedLoans(memberId: string): Promise<LoanRecord[]> {
  const loans = await LoanRepository.findReturnedByMember(memberId);

  return loans.map((loan: any) => ({
    ...loan,
    // Include all photos in the gallery
    gallery: loan.loanPhotos || [],
    // Remove the loanPhotos array from the response to avoid confusion
    loanPhotos: undefined,
    // Include swap relationships
    swappedAt: loan.swappedAt || null,
    swappedFor: loan.swappedFor || null,
    swappedFrom: loan.swappedFrom || null,
  }));
}
