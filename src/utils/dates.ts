import { MemberTier, TierConfig } from '../types/member.types';

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const desiredMonth = result.getMonth() + months;
  result.setMonth(desiredMonth);
  return result;
}
