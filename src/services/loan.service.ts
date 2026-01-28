import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AppError } from '../utils/errors';
import { logEvent } from './audit.service';
import { updateLoanId } from './loanPhoto.repository';
import {
  getMemberById,
  resetCountersIfNewCycle,
  validateMemberCanCheckout,
  validateSwapAllowance,
} from './member.service';

export interface CheckoutInput {
  memberId: string;
  storeId: string;
  uploadIds: string[];
}

export interface ReturnInput {
  memberId: string;
  loanId: string;
}

export interface SwapInput {
  memberId: string;
  loanId: string;
  storeId: string;
  uploadIds: string[];
}

type DbClient = Prisma.TransactionClient;
type LoanRecord = {
  id: string;
  memberId: string;
  storeId: string;
  photoUrl: string;
  thumbnailUrl: string;
  checkoutAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  createdAt: Date;
  gallery?: { id: string; r2Key: string; metadata: string }[];
};

async function getLoanOrThrow(loanId: string, client: DbClient) {
  const loan = await client.loan.findUnique({ where: { id: loanId } });
  if (!loan) {
    throw new AppError(404, 'Loan not found');
  }
  return loan;
}

async function consumeLoanPhotos(uploadIds: string[], client: DbClient) {
  const photos = await client.loanPhoto.findMany({
    where: { id: { in: uploadIds } },
    select: { id: true, r2Key: true, metadata: true }
  });

  console.log('ConsumeLoanPhotos:', { uploadIds, photosFound: photos.length });
  if (photos.length === 0) {
    throw new Error('No photos found for the provided upload IDs');
  }

  if (photos.length !== uploadIds.length) {
    const missing = uploadIds.filter(id => !photos.some((p: any) => p.id === id));
    console.error('Photos not found for uploadIds:', missing);
    throw new AppError(400, 'Invalid upload reference(s)');
  }

  return photos;
}

async function consumeLoanPhoto(uploadId: string, client: DbClient) {
  try {
    const photo = await client.loanPhoto.findUnique({ 
      where: { id: uploadId },
      select: { id: true, r2Key: true }
    });
    
    if (!photo) {
      throw new Error(`Photo not found: ${uploadId}`);
    }
    
    if (!photo) {
      console.error('Photo not found for uploadId:', uploadId);
      throw new AppError(400, 'Invalid upload reference');
    }

    return photo;
  } catch (error) {
    console.error('Error in consumeLoanPhoto:', error);
    throw error;
  }
}

export async function checkoutLoan(input: CheckoutInput): Promise<LoanRecord> {
  console.log('checkoutLoan - Input:', JSON.stringify(input, null, 2));
  
  return prisma.$transaction(async (tx: DbClient) => {
    console.log('Transaction started');
    // Debug logging for input data
    console.log('Checkout Input:', { 
      memberId: input.memberId, 
      uploadIds: input.uploadIds, 
      storeId: input.storeId 
    });

    let member = await getMemberById(input.memberId, tx);
    
    // Debug logging for member object
    console.log('Member object:', {
      id: member.id,
      tier: member.tier,
      status: member.status
    });
    
    member = await resetCountersIfNewCycle(member, tx);
    
    // Debug logging
    console.log('Member after resetCountersIfNewCycle:', {
      id: member.id,
      tier: member.tier,
      status: member.status,
      itemsUsed: member.itemsUsed,
      itemsOut: member.itemsOut,
      cycleStart: member.cycleStart,
      cycleEnd: member.cycleEnd
    });
    
    try {
      validateMemberCanCheckout(member);
      console.log('Member validation passed');
    } catch (error) {
      console.error('Member validation failed:', error);
      throw error;
    }

    const photos = await consumeLoanPhotos(input.uploadIds, tx);
    
    // Use first photo as primary, rest go to gallery
    const primaryPhoto = photos[0];
    const galleryPhotos = photos.slice(1);
    
    // Debug logging for upload object
    console.log('Primary upload object:', primaryPhoto ? { r2Key: primaryPhoto.r2Key } : null);
    console.log('Gallery photos count:', galleryPhotos.length);
    
    // Calculate due date (30 days from checkout)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    let loan;
    const loanData = {
      memberId: member.id,
      storeId: input.storeId,
      photoUrl: primaryPhoto.r2Key,
      thumbnailUrl: primaryPhoto.r2Key,
      dueDate,
    };
    
    console.log('Attempting to create loan with data:', JSON.stringify(loanData, null, 2));
    
    try {
      loan = await tx.loan.create({
        data: loanData,
      });
      console.log('Loan created successfully:', loan.id);
    } catch (error) {
      console.error('Loan creation failed:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        data: loanData,
        memberId: member.id,
        photoId: primaryPhoto.id
      });
      throw error;
    }

    try {
      console.log('Updating loan photo with loan ID:', { uploadId: primaryPhoto.id, loanId: loan.id });
      await updateLoanId(primaryPhoto.id, loan.id, tx);
      console.log('Successfully updated loan photo');
      
      // Link gallery photos to the loan
      if (galleryPhotos.length > 0) {
        console.log('Linking gallery photos:', galleryPhotos.map((p: any) => (p as any).id));
        await Promise.all(
          galleryPhotos.map((photo: any) => 
            tx.loanPhoto.update({
              where: { id: photo.id },
              data: { loanId: loan.id }
            })
          )
        );
        console.log('Successfully linked gallery photos');
      }
    } catch (error) {
      console.error('Failed to update loan photo:', {
        error: error instanceof Error ? error.message : String(error),
        uploadId: primaryPhoto.id,
        loanId: loan.id
      });
      throw error;
    }

    try {
      console.log('Updating member counters:', { memberId: member.id });
      await tx.member.update({
        where: { id: member.id },
        data: {
          itemsUsed: { increment: 1 },
          itemsOut: { increment: 1 },
        },
      });
      console.log('Successfully updated member counters');
    } catch (error) {
      console.error('Failed to update member counters:', {
        error: error instanceof Error ? error.message : String(error),
        memberId: member.id
      });
      throw error;
    }

    // Log audit event
    await logEvent(member.id, 'loan_checkout', { loanId: loan.id }, tx);
    return loan;
  });
}

export async function returnLoan(input: ReturnInput): Promise<LoanRecord> {
  return prisma.$transaction(async (tx: DbClient) => {
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

    await logEvent(member.id, 'loan_return', { loanId: loan.id }, tx);
    return updatedLoan;
  });
}

export async function swapLoan(input: SwapInput) {
  return prisma.$transaction(async (tx: DbClient) => {
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
        storeId: input.storeId,
        photoUrl: primaryPhoto.r2Key,
        thumbnailUrl: primaryPhoto.r2Key,
        checkoutAt: now,
        dueDate,
      },
    });

    await updateLoanId(primaryPhoto.id, newLoan.id, tx);
    
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

    await logEvent(member.id, 'loan_swap', { oldLoanId: loan.id, newLoanId: newLoan.id }, tx);
    return { returnedLoan, newLoan };
  });
}

export async function getActiveLoans(memberId: string): Promise<LoanRecord[]> {
  const loans = await prisma.loan.findMany({
    where: { memberId, returnedAt: null },
    orderBy: { checkoutAt: 'desc' },
    select: {
      id: true,
      memberId: true,
      storeId: true,
      store: {
        select: {
          id: true,
          name: true,
          location: true
        }
      },
      photoUrl: true,
      thumbnailUrl: true,
      checkoutAt: true,
      dueDate: true,
      returnedAt: true,
      createdAt: true,
      loanPhotos: {
        select: {
          id: true,
          r2Key: true,
          metadata: true
        },
        where: {
          // Exclude the primary photo by checking loanId is not null (gallery photos have loanId set)
          loanId: {
            not: null
          }
        }
      }
    }
  });

  return loans.map((loan: any) => ({
    ...loan,
    gallery: Array.isArray(loan.loanPhoto) ? loan.loanPhoto : (loan.loanPhoto ? [loan.loanPhoto] : [])
  }));
}
