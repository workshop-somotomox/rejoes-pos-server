import { type DbClient } from '../db/client';
import { prisma } from '../db/client';

export class MemberRepository {
  // Find member by card token
  static async findByCard(cardToken: string, client?: DbClient) {
    const db = client || prisma;
    // console.log("DEBUG MemberRepository.findByCard called with:", cardToken);
    const result = await db.member.findUnique({
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
    // console.log("DEBUG MemberRepository.findByCard result:", result && {
    //   id: result.id,
    //   cardToken: result.cardToken,
    //   shopifyCustomerId: result.shopifyCustomerId,
    // });
    return result;
  }

  // Find member by Shopify customer ID
  static async findByShopifyCustomerId(shopifyCustomerId: string, client?: DbClient) {
    const db = client || prisma;
    return await db.member.findFirst({
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

  // Update a member's status (ACTIVE, PAUSED, CANCELLED)
  static async updateStatus(memberId: string, status: string, client?: DbClient) {
    const db = client || prisma;
    return await db.member.update({
      where: { id: memberId },
      data: { status },
    });
  }

  // Find all active members (status=ACTIVE AND cycleEnd > now),
  // optionally filtered by store location and/or tier. Returns active loan
  // count alongside each member so the admin table can render directly.
  static async findAllActive(
    params: { limit: number; offset: number; storeLocation?: string; tier?: string },
    client?: DbClient
  ): Promise<{ rows: any[]; total: number }> {
    const db = client || prisma;
    const where: any = {
      status: 'ACTIVE',
      cycleEnd: { gt: new Date() },
    };
    if (params.storeLocation) {
      where.storeLocation = params.storeLocation;
    }
    if (params.tier) {
      where.tier = params.tier;
    }

    const [rows, total] = await Promise.all([
      db.member.findMany({
        where,
        orderBy: { cycleEnd: 'asc' },
        skip: params.offset,
        take: params.limit,
        include: {
          _count: {
            select: {
              loans: { where: { returnedAt: null } },
            },
          },
        },
      }),
      db.member.count({ where }),
    ]);

    return { rows, total };
  }
}
