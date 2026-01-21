import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { AppError } from '../utils/errors';
import { logEvent } from './audit.service';
import {
  getMemberById,
  resetCountersIfNewCycle,
  validateMemberCanCheckout,
  validateSwapAllowance,
} from './member.service';

export interface CheckoutInput {
  memberId: string;
  storeLocation: string;
  uploadId: string;
}

export interface ReturnInput {
  memberId: string;
  loanId: string;
}

export interface SwapInput extends CheckoutInput {
  loanId: string;
}

type DbClient = Prisma.TransactionClient;
type LoanRecord = {
  id: string;
  memberId: string;
  storeLocation: string;
  photoUrl: string;
  thumbnailUrl: string;
  checkoutAt: Date;
  dueDate: Date;
  returnedAt: Date | null;
  createdAt: Date;
};

async function getLoanOrThrow(loanId: string, client: DbClient) {
  const loan = await client.loan.findUnique({ where: { id: loanId } });
  if (!loan) {
    throw new AppError(404, 'Loan not found');
  }
  return loan;
}

async function consumeLoanPhoto(uploadId: string, client: DbClient) {
  const photo = await client.loanPhoto.findUnique({ where: { id: uploadId } });
  if (!photo) {
    throw new AppError(400, 'Invalid upload reference');
  }

  await client.loanPhoto.delete({ where: { id: uploadId } });
  return photo;
}

export async function checkoutLoan(input: CheckoutInput): Promise<LoanRecord> {
  return prisma.$transaction(async (tx: DbClient) => {
    let member = await getMemberById(input.memberId, tx);
    member = await resetCountersIfNewCycle(member, tx);
    validateMemberCanCheckout(member);

    const photo = await consumeLoanPhoto(input.uploadId, tx);
    
    // Calculate due date (30 days from checkout)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const loan = await tx.loan.create({
      data: {
        memberId: member.id,
        storeLocation: input.storeLocation,
        photoUrl: photo.photoUrl,
        thumbnailUrl: photo.thumbnailUrl,
        dueDate,
      },
    });

    await tx.member.update({
      where: { id: member.id },
      data: {
        itemsUsed: { increment: 1 },
        itemsOut: { increment: 1 },
      },
    });

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

    const photo = await consumeLoanPhoto(input.uploadId, tx);

    // Calculate due date for new loan (30 days from swap)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const newLoan = await tx.loan.create({
      data: {
        memberId: member.id,
        storeLocation: input.storeLocation,
        photoUrl: photo.photoUrl,
        thumbnailUrl: photo.thumbnailUrl,
        checkoutAt: now,
        dueDate,
      },
    });

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
  return prisma.loan.findMany({
    where: { memberId, returnedAt: null },
    orderBy: { checkoutAt: 'desc' },
    select: {
      id: true,
      memberId: true,
      storeLocation: true,
      photoUrl: true,
      thumbnailUrl: true,
      checkoutAt: true,
      dueDate: true,
      returnedAt: true,
      createdAt: true,
    },
  });
}
