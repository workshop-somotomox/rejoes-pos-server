import { type DbClient } from '../db/client';
import { prisma } from '../db/client';

export class LoanRepository {
  // Find loan by ID
  static async findById(loanId: string, client?: DbClient) {
    const db = client || prisma;
    return await db.loan.findUnique({ where: { id: loanId } });
  }

  // Find active loans by member
  static async findActiveByMember(memberId: string, client?: DbClient) {
    const db = client || prisma;
    return await db.loan.findMany({
      where: { memberId, returnedAt: null },
      orderBy: { checkoutAt: 'desc' },
      select: {
        id: true,
        memberId: true,
        storeLocation: true,
        checkoutAt: true,
        dueDate: true,
        returnedAt: true,
        photoUrl: true,
        thumbnailUrl: true,
        createdAt: true,
      },
    });
  }

  // Create new loan
  static async create(data: {
    memberId: string;
    storeLocation: string;
    photoUrl: string;
    thumbnailUrl: string;
    dueDate: Date;
  }, client?: DbClient) {
    const db = client || prisma;
    return await db.loan.create({ data });
  }

  // Update loan
  static async update(
    loanId: string,
    data: {
      returnedAt?: Date;
    },
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.loan.update({
      where: { id: loanId },
      data,
    });
  }

  // Update member counters
  static async updateMemberCounters(
    memberId: string,
    data: {
      itemsUsed?: { increment: number };
      swapsUsed?: { increment: number };
      itemsOut?: { increment: number };
    },
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.member.update({
      where: { id: memberId },
      data,
    });
  }

  // Update loan photo with loan ID
  static async updateLoanPhoto(
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
