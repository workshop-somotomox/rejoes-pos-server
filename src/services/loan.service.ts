import { withTransaction, type DbClient } from '../db/client';
import { AppError } from '../utils/errors';
import {
  getMemberById,
  resetCountersIfNewCycle,
  validateMemberCanCheckout,
  validateSwapAllowance,
} from './member.service';

import { CheckoutInput, ReturnInput, SwapInput, type LoanRecord } from '../types/loan.types';
import { LoanRepository } from '../repositories/loan.repo';
import { UploadRepository } from '../repositories/upload.repo';

async function getLoanOrThrow(loanId: string, client: DbClient) {
  const loan = await LoanRepository.findById(loanId, client);
  if (!loan) {
    throw new AppError(404, 'Loan not found');
  }
  return loan;
}

async function consumeLoanPhotos(uploadIds: string[], client: DbClient) {
  const photos = await LoanRepository.findPhotosByIds(uploadIds, client);

  if (photos.length === 0) {
    throw new Error('No photos found for the provided upload IDs');
  }

  if (photos.length !== uploadIds.length) {
    const missing = uploadIds.filter(id => !photos.some((p: any) => p.id === id));
    throw new AppError(400, 'Invalid upload reference(s)');
  }

  return photos;
}

export async function checkoutLoan(input: CheckoutInput): Promise<LoanRecord> {
  return withTransaction(async (tx: DbClient) => {
    let member = await getMemberById(input.memberId, tx);
    member = await resetCountersIfNewCycle(member, tx);
    
    try {
      validateMemberCanCheckout(member);
    } catch (error) {
      throw error;
    }

    const photos = await consumeLoanPhotos(input.uploadIds, tx);
    
    const primaryPhoto = photos[0];
    const galleryPhotos = photos.slice(1);
    
    // Calculate due date (30 days from checkout)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    let loan;
    
    try {
      loan = await LoanRepository.create(
        {
          memberId: member.id,
          storeLocation: input.storeLocation,
          photoUrl: primaryPhoto.r2Key,
          thumbnailUrl: primaryPhoto.r2Key,
          dueDate,
        },
        tx
      );
    } catch (error) {
      throw error;
    }

    try {
      // Update primary photo with loan ID using repository
      await UploadRepository.updateLoanPhotoWithLoanId(primaryPhoto.id, loan.id, tx);
      
      // Link gallery photos to the loan using repository
      if (galleryPhotos.length > 0) {
        await Promise.all(
          galleryPhotos.map((photo) =>
            UploadRepository.updateLoanPhotoWithLoanId(photo.id, loan.id, tx)
          )
        );
      }
    } catch (error) {
      throw error;
    }

    try {
      await LoanRepository.updateMemberCounters(
        member.id,
        {
          itemsUsed: { increment: 1 },
          itemsOut: { increment: 1 },
        },
        tx
      );
    } catch (error) {
      throw error;
    }

    // Log audit event
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

    const updatedLoan = await tx.loan.update({
      where: { id: loan.id },
      data: { returnedAt: new Date() },
    });

    await tx.member.update({
      where: { id: member.id },
      data: {
        itemsOut: { decrement: 1 },
      },
    });

    // await logEvent(member.id, 'loan_return', { loanId: loan.id }, tx);
    return updatedLoan;
  });
}

export async function swapLoan(input: SwapInput) {
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
    const returnedLoan = await tx.loan.update({
      where: { id: loan.id },
      data: { returnedAt: now },
    });

    const photos = await consumeLoanPhotos(input.uploadIds, tx);
    
    // Use first photo as primary, rest go to gallery
    const primaryPhoto = photos[0];
    const galleryPhotos = photos.slice(1);

    // Calculate due date for new loan (30 days from swap)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newLoan = await tx.loan.create({
      data: {
        memberId: member.id,
        storeLocation: input.storeLocation,
        photoUrl: primaryPhoto.r2Key,
        thumbnailUrl: primaryPhoto.r2Key,
        checkoutAt: now,
        dueDate,
      },
    });

    await tx.loanPhoto.update({
      where: { id: primaryPhoto.id },
      data: { loanId: newLoan.id }
    });
    
    // Link gallery photos to the new loan
    if (galleryPhotos.length > 0) {
      await Promise.all(
        galleryPhotos.map((photo: any) => 
          tx.loanPhoto.update({
            where: { id: photo.id },
            data: { loanId: newLoan.id }
          })
        )
      );
    }

    await tx.member.update({
      where: { id: member.id },
      data: {
        swapsUsed: { increment: 1 },
        itemsUsed: { increment: 1 },
      },
    });

    // await logEvent(member.id, 'loan_swap', { oldLoanId: loan.id, newLoanId: newLoan.id }, tx);
    return { returnedLoan, newLoan };
  });
}

export async function getActiveLoans(memberId: string): Promise<LoanRecord[]> {
  const loans = await LoanRepository.findActiveByMember(memberId);

  return loans.map((loan: any) => ({
    ...loan,
    gallery: Array.isArray(loan.loanPhoto) ? loan.loanPhoto : (loan.loanPhoto ? [loan.loanPhoto] : [])
  }));
}
