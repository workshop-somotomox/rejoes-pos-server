import { Router } from 'express';
import { getMemberByCard } from '../services/member.service';
import { MemberRepository } from '../repositories/member.repo';
import { addMonths } from '../utils/dates';
import { AppError } from '../utils/errors';
import { MemberStatus, MemberTier } from '../types/member.types';
import { success } from '../types/api.types';

const router = Router();

/**
 * @swagger
 * /api/members/add:
 *   post:
 *     summary: Create a new member
 *     tags: [Members]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cardToken, tier, storeLocation]
 *             properties:
 *               cardToken:
 *                 type: string
 *                 example: "member-123"
 *               tier:
 *                 type: string
 *                 example: "PREMIUM"
 *               storeLocation:
 *                 type: string
 *                 example: "Main Store"
 *     responses:
 *       201:
 *         description: Member created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Member created successfully"
 *                     member:
 *                       $ref: '#/components/schemas/Member'
 */
router.post('/add', async (req, res, next) => {
  try {
    const { cardToken, tier = 'BASIC', storeLocation, shopifyCustomerId } = req.body;
    
    if (!cardToken) {
      return next(new AppError(400, 'cardToken is required'));
    }

    // Check if member already exists by cardToken or shopifyCustomerId
    const existingMember = await MemberRepository.findByCardOrShopify(cardToken, shopifyCustomerId);
    
    if (existingMember) {
      return next(new AppError(409, 'Member with this card token or Shopify customer ID already exists'));
    }

    const now = new Date();
    const cycleEnd = addMonths(now, 1);

    const member = await MemberRepository.create({
      cardToken,
      tier: MemberTier[tier.toUpperCase() as keyof typeof MemberTier] || MemberTier.BASIC,
      status: MemberStatus.ACTIVE,
      cycleStart: now,
      cycleEnd,
      itemsUsed: 0,
      swapsUsed: 0,
      itemsOut: 0,
      storeLocation: storeLocation || 'Main Store', // Use separate storeLocation field
      shopifyCustomerId: shopifyCustomerId || null, // Use separate shopifyCustomerId field
    });

    res.json(success({
      message: 'Member created successfully',
      member: {
        id: member.id,
        cardToken: member.cardToken,
        shopifyCustomerId: member.shopifyCustomerId,
        tier: member.tier,
        status: member.status,
        cycleStart: member.cycleStart,
        cycleEnd: member.cycleEnd,
        itemsUsed: member.itemsUsed,
        swapsUsed: member.swapsUsed,
        itemsOut: member.itemsOut,
        storeLocation: member.storeLocation, // Use separate storeLocation field
      }
    }));
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/members/by-card/{cardToken}:
 *   get:
 *     summary: Get member by card token
 *     tags: [Members]
 *     parameters:
 *       - in: path
 *         name: cardToken
 *         required: true
 *         schema:
 *           type: string
 *         description: Card token of the member
 *     responses:
 *       200:
 *         description: Member retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     member:
 *                       $ref: '#/components/schemas/Member'
 *                     allowances:
 *                       type: object
 *                     activeLoans:
 *                       type: array
 *                       items:
 *                         type: object
 */
router.get('/by-card/:cardToken', async (req, res, next) => {
  try {
    const { cardToken } = req.params;
    const payload = await getMemberByCard(cardToken);
    res.json(success({
      member: payload.member,
      allowances: payload.allowances,
      activeLoans: payload.activeLoans,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
