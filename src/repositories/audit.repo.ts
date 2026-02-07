import { type DbClient } from '../db/client';
import { prisma } from '../db/client';

export interface AuditEvent {
  [key: string]: unknown;
}

export class AuditRepository {
  // Create audit event
  static async createAuditEvent(
    memberId: string,
    action: string,
    metadata: AuditEvent = {},
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.auditEvent.create({
      data: {
        memberId,
        action,
        metadata: JSON.stringify(metadata),
      },
    });
  }

  // Find audit events by member
  static async findAuditEventsByMember(
    memberId: string,
    limit?: number,
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.auditEvent.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Find audit events by action
  static async findAuditEventsByAction(
    action: string,
    limit?: number,
    client?: DbClient
  ) {
    const db = client || prisma;
    return await db.auditEvent.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
