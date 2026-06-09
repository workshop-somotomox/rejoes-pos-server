import { addMonths } from '../utils/dates';
import { getTierConfig } from '../utils/tiers';
import { AppError } from '../utils/errors';
import { ActiveLoanThumbnail, MemberStatus, MemberTier, MemberRecord, MemberWithLoans } from '../types/member.types';
import { type DbClient } from '../db/client';
import { MemberRepository } from '../repositories/member.repo';

export async function getMemberByCard(cardToken: string) {
  const memberWithLoans = await MemberRepository.findByCard(cardToken);

  if (!memberWithLoans) {
    throw new AppError(404, 'Member not found');
  }

  const normalizedMember = memberWithLoans as MemberWithLoans;
  const { loans = [] } = normalizedMember;

  const allowances = getTierConfig(normalizedMember.tier as MemberTier);
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

  const newCycleStart = member.cycleEnd;
  const newCycleEnd = addMonths(newCycleStart, 1);

  const updated = await MemberRepository.updateCounters(member.id, {
    cycleStart: newCycleStart,
    cycleEnd: newCycleEnd,
    itemsUsed: 0,
    swapsUsed: 0,
  }, client);

  return updated;
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
  validateMemberActive({ status: member.status as MemberStatus });
  const allowances = getTierConfig(member.tier as MemberTier);

  if (member.itemsUsed >= allowances.itemsPerMonth) {
    const remaining = allowances.itemsPerMonth - member.itemsUsed;
    throw new AppError(400, `${member.tier} plan: ${remaining} of ${allowances.itemsPerMonth} items remaining this month`);
  }

  if (member.itemsOut >= allowances.maxItemsOut) {
    throw new AppError(400, `${member.tier} plan: Maximum ${allowances.maxItemsOut} items allowed out. Return items to continue.`);
  }
}

export function validateSwapAllowance(member: MemberRecord) {
  validateMemberActive({ status: member.status as MemberStatus });
  const allowances = getTierConfig(member.tier as MemberTier);
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
  const member = await MemberRepository.findById(memberId, client);
  if (!member) {
    throw new AppError(404, 'Member not found');
  }
  return member as MemberRecord;
}

export interface ActiveMemberListItem {
  id: string;
  cardToken: string;
  shopifyCustomerId: string | null;
  tier: string;
  status: string;
  storeLocation: string | null;
  cycleStart: Date;
  cycleEnd: Date;
  itemsUsed: number;
  swapsUsed: number;
  itemsOut: number;
  activeLoanCount: number;
  createdAt: Date;
}

export async function listActiveMembers(params: {
  limit: number;
  offset: number;
  storeLocation?: string;
  tier?: string;
}): Promise<{ items: ActiveMemberListItem[]; total: number; limit: number; offset: number }> {
  const { rows, total } = await MemberRepository.findAllActive(params);
  const items: ActiveMemberListItem[] = rows.map((m: any) => ({
    id: m.id,
    cardToken: m.cardToken,
    shopifyCustomerId: m.shopifyCustomerId ?? null,
    tier: m.tier,
    status: m.status,
    storeLocation: m.storeLocation ?? null,
    cycleStart: m.cycleStart,
    cycleEnd: m.cycleEnd,
    itemsUsed: m.itemsUsed,
    swapsUsed: m.swapsUsed,
    itemsOut: m.itemsOut,
    activeLoanCount: m._count?.loans ?? 0,
    createdAt: m.createdAt,
  }));

  return { items, total, limit: params.limit, offset: params.offset };
}
