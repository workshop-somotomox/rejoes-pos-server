import { type DbClient } from '../db/client';
import { prisma } from '../db/client';

export class LoanRepository {
  // Find loan by ID
  static async findById(loanId: string, client?: DbClient): Promise<any> {
    const db = client || prisma;
    return await db.loan.findUnique({ where: { id: loanId } });
  }

  // Find active loans by member
  static async findActiveByMember(memberId: string, client?: DbClient): Promise<any[]> {
    const db = client || prisma;
    return await db.loan.findMany({
      where: { memberId, returnedAt: null },
      orderBy: { checkoutAt: 'desc' },
      include: {
        loanPhotos: {
          select: {
            id: true,
            r2Key: true,
            metadata: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        swappedFor: {
          select: {
            id: true,
            photoUrl: true,
            thumbnailUrl: true,
            checkoutAt: true,
            dueDate: true
          }
        },
        swappedFrom: {
          select: {
            id: true,
            photoUrl: true,
            thumbnailUrl: true,
            checkoutAt: true,
            dueDate: true
          }
        }
      },
    });
  }

  // Find returned loans by member
  static async findReturnedByMember(memberId: string, client?: DbClient): Promise<any[]> {
    const db = client || prisma;
    return await db.loan.findMany({
      where: { 
        memberId, 
        returnedAt: { not: null } 
      },
      orderBy: { returnedAt: 'desc' },
      include: {
        loanPhotos: {
          select: {
            id: true,
            r2Key: true,
            metadata: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        swappedFor: {
          select: {
            id: true,
            photoUrl: true,
            thumbnailUrl: true,
            checkoutAt: true,
            dueDate: true
          }
        },
        swappedFrom: {
          select: {
            id: true,
            photoUrl: true,
            thumbnailUrl: true,
            checkoutAt: true,
            dueDate: true
          }
        }
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
    checkoutAt?: Date;
    swappedFromId?: string;
  }, client?: DbClient): Promise<any> {
    const db = client || prisma;
    return await db.loan.create({ data });
  }

  // Update loan
  static async update(
    loanId: string,
    data: {
      returnedAt?: Date;
      swappedAt?: Date;
      swappedForId?: string;
      swappedFromId?: string;
    },
    client?: DbClient
  ): Promise<any> {
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
      itemsUsed?: { increment: number } | { decrement: number };
      swapsUsed?: { increment: number } | { decrement: number };
      itemsOut?: { increment: number } | { decrement: number };
    },
    client?: DbClient
  ): Promise<any> {
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
  ): Promise<any> {
    const db = client || prisma;
    return await db.loanPhoto.update({
      where: { id: photoId },
      data: { loanId },
    });
  }

  // Find loan photos by IDs
  static async findPhotosByIds(uploadIds: string[], client?: DbClient): Promise<any[]> {
    const db = client || prisma;
    return await db.loanPhoto.findMany({
      where: { id: { in: uploadIds } },
      select: { id: true, r2Key: true, metadata: true }
    });
  }

  // Find loan photo by ID
  static async findPhotoById(uploadId: string, client?: DbClient): Promise<any> {
    const db = client || prisma;
    return await db.loanPhoto.findUnique({
      where: { id: uploadId },
      select: { id: true, r2Key: true, metadata: true }
    });
  }
}
