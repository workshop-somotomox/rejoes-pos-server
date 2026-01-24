import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

const getClient = (client?: DbClient) => client ?? prisma;

export interface LoanPhotoRecord {
  id: string;
  r2Key: string;
  metadata: object;
}

export async function createLoanPhoto(r2Key: string, metadata: object): Promise<LoanPhotoRecord> {
  return prisma.loanPhoto.create({
    data: { 
      r2Key, 
      metadata: JSON.stringify(metadata) 
    },
    select: { id: true, r2Key: true, metadata: true },
  });
}

export async function updateLoanId(uploadId: string, loanId: string, client?: DbClient): Promise<void> {
  const db = getClient(client);
  await db.loanPhoto.update({
    where: { id: uploadId },
    data: { loanId },
  });
}
