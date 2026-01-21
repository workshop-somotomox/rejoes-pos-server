import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { logEvent } from './audit.service';
import { MemberStatus, ShopifySubscriptionPayload, SubscriptionTier } from '../types';

const PLAN_HANDLE_TO_TIER: Record<string, SubscriptionTier> = {
  basic: 'BASIC',
  plus: 'PLUS',
  premium: 'PREMIUM',
};

export function mapShopifyPlanToTier(handle: string): SubscriptionTier {
  const key = handle.toLowerCase();
  const tier = PLAN_HANDLE_TO_TIER[key];
  if (!tier) {
    throw new Error(`Unsupported plan handle: ${handle}`);
  }
  return tier;
}

type DbClient = Prisma.TransactionClient | typeof prisma;
const getClient = (client?: DbClient) => client ?? prisma;

export async function handleSubscriptionEvent(payload: ShopifySubscriptionPayload) {
  const tier = mapShopifyPlanToTier(payload.data.planHandle);
  const status = payload.data.status.toUpperCase() as MemberStatus;
  const cycleStart = new Date(payload.data.cycleStart);
  const cycleEnd = new Date(payload.data.cycleEnd);

  const member = await prisma.member.upsert({
    where: { shopifyCustomerId: payload.data.shopifyCustomerId },
    update: {
      tier,
      status,
      cycleStart,
      cycleEnd,
      cardToken: payload.data.cardToken,
    },
    create: {
      shopifyCustomerId: payload.data.shopifyCustomerId,
      cardToken: payload.data.cardToken,
      tier,
      status,
      cycleStart,
      cycleEnd,
    },
  });

  await logEvent(member.id, `subscription_${payload.type}`, payload.data);
  return member;
}
