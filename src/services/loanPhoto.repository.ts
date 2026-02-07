import { Prisma } from '@prisma/client';
import type { DbClient } from '../db/client';
import { prisma } from '../db/client';
import { UploadRepository } from '../repositories/upload.repo';

const getClient = (client?: DbClient) => client ?? prisma;

export interface LoanPhotoRecord {
  id: string;
  r2Key: string;
  metadata: string;
}

export async function createLoanPhoto(r2Key: string, metadata: object): Promise<LoanPhotoRecord> {
  return await UploadRepository.createLoanPhoto(r2Key, metadata);
}

export async function updateLoanId(photoId: string, loanId: string, client?: DbClient): Promise<void> {
  await UploadRepository.updateLoanPhotoWithLoanId(photoId, loanId, client);
}
