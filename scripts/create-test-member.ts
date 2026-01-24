import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { addMonths } from '../src/utils/dates';
import { MemberTier, MemberStatus } from '../src/types';

const prisma = new PrismaClient();

async function createTestMember() {
  try {
    const cardToken = 'E2E_TEST_CARD_001';
    const tier = MemberTier.PREMIUM;
    const status = MemberStatus.ACTIVE;
    
    // Check if member already exists
    const existingMember = await prisma.member.findUnique({
      where: { cardToken }
    });

    if (existingMember) {
      console.log('Test member already exists:');
      console.log({
        id: existingMember.id,
        cardToken: existingMember.cardToken,
        tier: existingMember.tier,
        status: existingMember.status,
        cycleStart: existingMember.cycleStart.toISOString(),
        cycleEnd: existingMember.cycleEnd.toISOString(),
        itemsUsed: existingMember.itemsUsed,
        swapsUsed: existingMember.swapsUsed,
        itemsOut: existingMember.itemsOut,
      });
      return;
    }

    const now = new Date();
    const cycleEnd = addMonths(now, 1);

    const member = await prisma.member.create({
      data: {
        cardToken,
        tier,
        status,
        cycleStart: now,
        cycleEnd,
        itemsUsed: 0,
        swapsUsed: 0,
        itemsOut: 0,
        shopifyCustomerId: `shopify-${Date.now()}`,
      },
    });

    console.log('Test member created successfully:');
    console.log({
      id: member.id,
      cardToken: member.cardToken,
      shopifyCustomerId: member.shopifyCustomerId,
      tier: member.tier,
      status: member.status,
      cycleStart: member.cycleStart.toISOString(),
      cycleEnd: member.cycleEnd.toISOString(),
      itemsUsed: member.itemsUsed,
      swapsUsed: member.swapsUsed,
      itemsOut: member.itemsOut,
    });

    // Test member lookup
    const lookupResult = await prisma.member.findUnique({
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

    console.log('\nMember lookup test:', lookupResult ? 'SUCCESS' : 'FAILED');
    
  } catch (error) {
    console.error('Error creating test member:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestMember();
