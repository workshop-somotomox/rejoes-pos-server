import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

interface AuditMetadata {
  [key: string]: unknown;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

function getClient(client?: DbClient) {
  return client ?? prisma;
}

export async function logEvent(
  memberId: string,
  action: string,
  metadata: AuditMetadata = {},
  client?: DbClient
) {
  const db = getClient(client);
  await db.auditEvent.create({
    data: {
      memberId,
      action,
      metadata: JSON.stringify(metadata),
    },
  });
}
