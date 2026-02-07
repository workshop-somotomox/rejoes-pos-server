import { PrismaClient, Prisma } from '@prisma/client';

export const prisma = new PrismaClient();

export type DbClient = Prisma.TransactionClient | PrismaClient;

export async function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}
