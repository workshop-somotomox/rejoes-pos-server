import { type DbClient } from '../db/client';
import { prisma } from '../db/client';

export interface LoanPhotoRecord {
  id: string;
  r2Key: string;
  metadata: string;
}

export class UploadRepository {
  // Create loan photo
  static async createLoanPhoto(r2Key: string, metadata: object, client?: DbClient): Promise<LoanPhotoRecord> {
    const db = client || prisma;
    const result = await db.loanPhoto.create({
      data: { 
        r2Key, 
        metadata: JSON.stringify(metadata) 
      },
      select: {
        id: true,
        r2Key: true,
        metadata: true,
      },
    });
    return result;
  }

  // Update loan photo with r2Key and metadata
  static async updateLoanPhoto(
    photoId: string,
    data: {
      r2Key?: string;
      metadata?: string;
    },
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.loanPhoto.update({
      where: { id: photoId },
      data,
    });
  }

  // Update loan photo with loan ID
  static async updateLoanPhotoWithLoanId(
    photoId: string,
    loanId: string,
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.loanPhoto.update({
      where: { id: photoId },
      data: { loanId },
    });
  }

  // Find loan photos by IDs
  static async findPhotosByIds(uploadIds: string[], client?: DbClient) {
    const db = client || prisma;
    return await db.loanPhoto.findMany({
      where: { id: { in: uploadIds } },
      select: { id: true, r2Key: true, metadata: true }
    });
  }

  // Find loan photo by ID
  static async findPhotoById(uploadId: string, client?: DbClient) {
    const db = client || prisma;
    return await db.loanPhoto.findUnique({
      where: { id: uploadId },
      select: { id: true, r2Key: true, metadata: true }
    });
  }
}
