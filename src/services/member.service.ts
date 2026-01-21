import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { addMonths } from '../utils/dates';
import { getTierConfig } from '../utils/tiers';
import { AppError } from '../utils/errors';
import { ActiveLoanThumbnail, MemberStatus, SubscriptionTier } from '../types';

type DbClient = Prisma.TransactionClient | typeof prisma;
type MemberRecord = {
  id: string;
  shopifyCustomerId: string;
  cardToken: string;
  tier: SubscriptionTier;
  status: MemberStatus;
  cycleStart: Date;
  cycleEnd: Date;
  itemsUsed: number;
  swapsUsed: number;
  itemsOut: number;
  createdAt: Date;
  updatedAt: Date;
};

type MemberDbRow = Omit<MemberRecord, 'tier' | 'status'> & {
  tier: string;
  status: string;
};

type MemberWithLoans = MemberRecord & {
  loans: ActiveLoanThumbnail[];
};

function getClient(client?: DbClient) {
  return client ?? prisma;
}

const TIER_NORMALIZER: Record<string, SubscriptionTier> = {
  basic: 'BASIC',
  plus: 'PLUS',
  premium: 'PREMIUM',
};

const STATUS_NORMALIZER: Record<string, MemberStatus> = {
  active: 'ACTIVE',
  paused: 'PAUSED',
  cancelled: 'CANCELLED',
};

function normalizeTier(tier: string): SubscriptionTier {
  const key = tier.toLowerCase();
  return TIER_NORMALIZER[key] ?? 'BASIC';
}

function normalizeStatus(status: string): MemberStatus {
  const key = status.toLowerCase();
  return STATUS_NORMALIZER[key] ?? 'ACTIVE';
}

function mapMemberRecord(member: MemberDbRow): MemberRecord {
  return {
    ...member,
    tier: normalizeTier(member.tier),
    status: normalizeStatus(member.status),
  };
}

export async function getMemberByCard(cardToken: string) {
  const memberWithLoans = await prisma.member.findUnique({
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

  if (!memberWithLoans) {
    throw new AppError(404, 'Member not found');
  }

  const baseMember = mapMemberRecord(memberWithLoans);
  const { loans } = memberWithLoans;
  const normalizedMember: MemberWithLoans = {
    ...baseMember,
    loans,
  };

  const allowances = getTierConfig(normalizedMember.tier);
  const activeLoans = loans.map((loan: ActiveLoanThumbnail) => ({
    id: loan.id,
    thumbnailUrl: loan.thumbnailUrl,
  }));

  return { member: normalizedMember, allowances, activeLoans };
}

export async function resetCountersIfNewCycle(member: MemberRecord, client?: DbClient) {
  const now = new Date();
  if (now < member.cycleEnd) {
    return member;
  }

  const db = getClient(client);
  const newCycleStart = member.cycleEnd;
  const newCycleEnd = addMonths(newCycleStart, 1);

  const updated = await db.member.update({
    where: { id: member.id },
    data: {
      cycleStart: newCycleStart,
      cycleEnd: newCycleEnd,
      itemsUsed: 0,
      swapsUsed: 0,
    },
  });

  return mapMemberRecord(updated as MemberDbRow);
}

export function validateMemberActive(member: { status: MemberStatus }) {
  if (member.status !== 'ACTIVE') {
    if (member.status === 'PAUSED') {
      throw new AppError(400, 'Subscription is paused - no new loans allowed');
    }
    throw new AppError(400, 'Subscription inactive');
  }
}

export function validateMemberCanCheckout(member: MemberRecord) {
  validateMemberActive(member);
  const allowances = getTierConfig(member.tier);

  if (member.itemsUsed >= allowances.itemsPerMonth) {
    const remaining = allowances.itemsPerMonth - member.itemsUsed;
    throw new AppError(400, `${member.tier} plan: ${remaining} of ${allowances.itemsPerMonth} items remaining this month`);
  }

  if (member.itemsOut >= allowances.maxItemsOut) {
    throw new AppError(400, `${member.tier} plan: Maximum ${allowances.maxItemsOut} items allowed out. Return items to continue.`);
  }
}

export function validateSwapAllowance(member: MemberRecord) {
  validateMemberActive(member);
  const allowances = getTierConfig(member.tier);
  if (member.swapsUsed >= allowances.swaps) {
    const remaining = allowances.swaps - member.swapsUsed;
    throw new AppError(400, `${member.tier} plan: ${remaining} of ${allowances.swaps} swaps remaining this month`);
  }

  if (member.itemsUsed >= allowances.itemsPerMonth) {
    throw new AppError(400, `${member.tier} plan: Monthly item limit reached`);
  }

  if (member.itemsOut <= 0) {
    throw new AppError(400, 'No items out to swap');
  }
}

export async function getMemberById(memberId: string, client?: DbClient): Promise<MemberRecord> {
  const db = getClient(client);
  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member) {
    throw new AppError(404, 'Member not found');
  }
  return mapMemberRecord(member as MemberDbRow);
}
