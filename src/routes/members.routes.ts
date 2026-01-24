import { Router } from 'express';
import { getMemberByCard } from '../services/member.service';
import { prisma } from '../prisma';
import { addMonths } from '../utils/dates';
import { AppError } from '../utils/errors';
import { MemberStatus, MemberTier } from '../types';

const router = Router();

// DEV ONLY: Seed member for testing
router.post('/dev/seed-member', async (req, res, next) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return next(new AppError(403, 'Endpoint not available in production'));
  }

  try {
    const { cardToken, tier = 'BASIC' } = req.body;
    
    if (!cardToken) {
      return next(new AppError(400, 'cardToken is required'));
    }

    // Check if member already exists
    const existingMember = await prisma.member.findUnique({
      where: { cardToken }
    });

    if (existingMember) {
      return next(new AppError(409, 'Member with this card token already exists'));
    }

    const now = new Date();
    const cycleEnd = addMonths(now, 1);

    const member = await prisma.member.create({
      data: {
        cardToken,
        tier: MemberTier[tier.toUpperCase() as keyof typeof MemberTier] || MemberTier.BASIC,
        status: MemberStatus.ACTIVE,
        cycleStart: now,
        cycleEnd,
        itemsUsed: 0,
        swapsUsed: 0,
        itemsOut: 0,
      },
    });

    res.json({
      message: 'Test member created successfully',
      member: {
        id: member.id,
        cardToken: member.cardToken,
        tier: member.tier,
        status: member.status,
        cycleStart: member.cycleStart,
        cycleEnd: member.cycleEnd,
        itemsUsed: member.itemsUsed,
        swapsUsed: member.swapsUsed,
        itemsOut: member.itemsOut,
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get('/by-card/:cardToken', async (req, res, next) => {
  try {
    const { cardToken } = req.params;
    const payload = await getMemberByCard(cardToken);
    res.json({
      member: payload.member,
      allowances: payload.allowances,
      activeLoans: payload.activeLoans,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
