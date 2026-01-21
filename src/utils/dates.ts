export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const desiredMonth = result.getMonth() + months;
  result.setMonth(desiredMonth);
  return result;
}

export function isSameOrAfter(date: Date, compareTo: Date): boolean {
  return date.getTime() >= compareTo.getTime();
}

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
