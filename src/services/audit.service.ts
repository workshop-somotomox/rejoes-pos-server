import { Prisma } from '@prisma/client';
import type { DbClient } from '../db/client';
import { prisma } from '../db/client';
import { AuditRepository } from '../repositories/audit.repo';

interface AuditMetadata {
  [key: string]: unknown;
}

export async function logEvent(
  memberId: string,
  action: string,
  metadata: AuditMetadata = {},
  client?: DbClient
) {
  await AuditRepository.createAuditEvent(memberId, action, metadata, client);
}
