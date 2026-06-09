import { Router } from 'express';
import { getMemberByCard, listActiveMembers } from '../services/member.service';
import { MemberRepository } from '../repositories/member.repo';
import { addMonths } from '../utils/dates';
import { AppError } from '../utils/errors';
import { MemberStatus, MemberTier } from '../types/member.types';
import { success } from '../types/api.types';
import { Prisma } from '@prisma/client';

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
 *             required: [cardToken, tier, shopifyCustomerId]
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
 *               shopifyCustomerId:
 *                 type: string
 *                 example: "gid://shopify/Customer/123"
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
    let { cardToken, tier = 'BASIC', storeLocation, shopifyCustomerId } = req.body;

    // console.log("RUNNING..1", req.body);

    // Accept both numbers and strings, convert to string, then trim.
    // Do NOT auto-generate any token.
    if (cardToken !== undefined && cardToken !== null) {
      cardToken = String(cardToken).trim();
    } else {
      cardToken = '';
    }
    
    // Right after reading and normalizing from req.body
    // console.log("DEBUG /api/members/add incoming body:", req.body);
    // console.log("DEBUG /api/members/add normalized cardToken:", cardToken);
    
    // Validation should be:
    if (!cardToken) {
      return next(new AppError(400, 'Card number is required'));
    }

    if (!shopifyCustomerId || !shopifyCustomerId.trim()) {
      return next(new AppError(400, 'shopifyCustomerId is required'));
    }

    // Check if member already exists by cardToken (one card = one member)
    const existingByCard = await MemberRepository.findByCard(cardToken);
    // console.log("DEBUG /api/members/add duplicate check:", {
    //   cardToken,
    //   existingByCard,
    // });
    
    if (existingByCard) {
      // console.log("DEBUG /api/members/add duplicate branch taken");
      return next(new AppError(400, 'This card number is already in use'));
    }

    const now = new Date();
    const cycleEnd = addMonths(now, 1);

    try {
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
        shopifyCustomerId: shopifyCustomerId.trim(), // Required field
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
    } catch (createError) {
      // Handle database-level unique constraint violation as a safety net
      if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') {
        const target = (createError.meta as any)?.target;
        if (target?.includes('cardToken')) {
          return next(new AppError(400, 'This card number is already in use'));
        }
        if (target?.includes('shopifyCustomerId')) {
          return next(new AppError(400, 'This Shopify customer is already registered'));
        }
        return next(new AppError(400, 'A record with this information already exists'));
      }
      throw createError;
    }
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
/**
 * @swagger
 * /api/members/active:
 *   get:
 *     summary: List all active members (status=ACTIVE AND cycleEnd > now)
 *     tags: [Members]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0, minimum: 0 }
 *       - in: query
 *         name: storeLocation
 *         schema: { type: string }
 *         description: Optional exact-match filter on Member.storeLocation
 *       - in: query
 *         name: tier
 *         schema: { type: string, enum: [BASIC, PLUS, PREMIUM] }
 *     responses:
 *       200:
 *         description: List of active members with active loan counts, sorted by cycleEnd ascending
 */
router.get('/active', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
    const storeLocation = typeof req.query.storeLocation === 'string' && req.query.storeLocation.trim().length > 0
      ? req.query.storeLocation.trim()
      : undefined;
    const tier = typeof req.query.tier === 'string' && req.query.tier.trim().length > 0
      ? req.query.tier.trim().toUpperCase()
      : undefined;

    const result = await listActiveMembers({ limit, offset, storeLocation, tier });
    res.json(success(result));
  } catch (error) {
    next(error);
  }
});

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
