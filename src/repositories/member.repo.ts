import { type DbClient } from '../db/client';
import { prisma } from '../db/client';

export class MemberRepository {
  // Find member by card token with active loans
  static async findByCard(cardToken: string, client?: DbClient) {
    const db = client || prisma;
    return await db.member.findUnique({
      where: { cardToken },
      include: {
        loans: {
          where: { returnedAt: null },
          select: {
            id: true,
            thumbnailUrl: true,
          },
        },
      },
    });
  }

  // Find member by Shopify customer ID
  static async findByShopifyCustomerId(shopifyCustomerId: string, client?: DbClient) {
    const db = client || prisma;
    return await db.member.findUnique({
      where: { shopifyCustomerId },
    });
  }

  // Find member by either cardToken or shopifyCustomerId
  static async findByCardOrShopify(cardToken: string, shopifyCustomerId?: string, client?: DbClient) {
    const db = client || prisma;
    const whereConditions: any[] = [{ cardToken }];
    
    if (shopifyCustomerId) {
      whereConditions.push({ shopifyCustomerId });
    }
    
    return await db.member.findFirst({
      where: {
        OR: whereConditions
      },
    });
  }

  // Create new member
  static async create(data: any, client?: DbClient) {
    const db = client || prisma;
    return await db.member.create({ data });
  }

  // Update member (used for counter resets)
  static async updateCounters(
    memberId: string,
    data: {
      cycleStart: Date;
      cycleEnd: Date;
      itemsUsed: number;
      swapsUsed: number;
    },
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.member.update({
      where: { id: memberId },
      data,
    });
  }

  // Find member by ID
  static async findById(memberId: string, client?: DbClient) {
    const db = client || prisma;
    return await db.member.findUnique({ where: { id: memberId } });
  }
}
