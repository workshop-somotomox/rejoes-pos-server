import { Router } from 'express';
import { prisma } from '../db/client';

const router = Router();

/**
 * GET /api/export-data
 * Export all database data as JSON
 */
router.get('/', async (req, res) => {
  try {
    // Fetch all data from all models
    const [members, loans, loanPhotos, auditEvents] = await Promise.all([
      prisma.member.findMany({
        include: {
          loans: true,
          auditEvents: true,
        },
      }),
      prisma.loan.findMany({
        include: {
          loanPhotos: true,
          member: true,
          swappedFor: true,
          swappedFrom: true,
        },
      }),
      prisma.loanPhoto.findMany({
        include: {
          loan: true,
        },
      }),
      prisma.auditEvent.findMany({
        include: {
          member: true,
        },
      }),
    ]);

    // Count stats
    const stats = {
      totalMembers: members.length,
      totalLoans: loans.length,
      totalLoanPhotos: loanPhotos.length,
      totalAuditEvents: auditEvents.length,
    };

    res.json({
      success: true,
      exportedAt: new Date().toISOString(),
      stats,
      data: {
        members,
        loans,
        loanPhotos,
        auditEvents,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export database',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
