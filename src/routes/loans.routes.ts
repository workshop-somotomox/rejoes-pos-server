import { Router } from 'express';
import {
  checkoutLoan,
  returnLoan,
  swapLoan,
  getActiveLoans,
} from '../services/loan.service';
import { success } from '../types/api.types';

const router = Router();

/**
 * @swagger
 * /api/loans/checkout:
 *   post:
 *     summary: Checkout a new loan
 *     tags: [Loans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, storeLocation, uploadIds]
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: "cm123abc"
 *               storeLocation:
 *                 type: string
 *                 example: "Main Store"
 *               uploadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["upload123", "upload456"]
 *     responses:
 *       201:
 *         description: Loan created successfully
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
 *                     id:
 *                       type: string
 *                       example: "loan123"
 *                     memberId:
 *                       type: string
 *                       example: "cm123abc"
 *                     storeLocation:
 *                       type: string
 *                       example: "Main Store"
 *                     checkoutAt:
 *                       type: string
 *                       format: date-time
 *                     dueDate:
 *                       type: string
 *                       format: date-time
 *                     returnedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     photoUrl:
 *                       type: string
 *                       example: "loans/loan123/photo.jpg"
 *                     thumbnailUrl:
 *                       type: string
 *                       example: "loans/loan123/thumb.jpg"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - missing fields or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 */
router.post('/checkout', async (req, res, next) => {
  try {
    const { memberId, storeLocation, uploadIds } = req.body;
    if (!memberId || !storeLocation || !uploadIds || !Array.isArray(uploadIds)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const loan = await checkoutLoan({ memberId, storeLocation, uploadIds });
    return res.status(201).json(success(loan));
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/loans/return:
 *   post:
 *     summary: Return an existing loan
 *     tags: [Loans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, loanId]
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: "cm123abc"
 *               loanId:
 *                 type: string
 *                 example: "loan123"
 *     responses:
 *       200:
 *         description: Loan returned successfully
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
 *                     id:
 *                       type: string
 *                       example: "loan123"
 *                     memberId:
 *                       type: string
 *                       example: "cm123abc"
 *                     storeLocation:
 *                       type: string
 *                       example: "Main Store"
 *                     checkoutAt:
 *                       type: string
 *                       format: date-time
 *                     dueDate:
 *                       type: string
 *                       format: date-time
 *                     returnedAt:
 *                       type: string
 *                       format: date-time
 *                     photoUrl:
 *                       type: string
 *                       example: "loans/loan123/photo.jpg"
 *                     thumbnailUrl:
 *                       type: string
 *                       example: "loans/loan123/thumb.jpg"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - missing fields or invalid member/loan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 *       404:
 *         description: Loan not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Loan not found"
 */
router.post('/return', async (req, res, next) => {
  try {
    const { memberId, loanId } = req.body;
    if (!memberId || !loanId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const loan = await returnLoan({ memberId, loanId });
    return res.json(success(loan));
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/loans/swap:
 *   post:
 *     summary: Swap an active loan for a new one
 *     tags: [Loans]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [memberId, loanId, storeLocation, uploadIds]
 *             properties:
 *               memberId:
 *                 type: string
 *                 example: "cm123abc"
 *               loanId:
 *                 type: string
 *                 example: "loan123"
 *               storeLocation:
 *                 type: string
 *                 example: "Main Store"
 *               uploadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["upload789"]
 *     responses:
 *       200:
 *         description: Loan swapped successfully
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
 *                     returnedLoan:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "loan123"
 *                         memberId:
 *                           type: string
 *                           example: "cm123abc"
 *                         returnedAt:
 *                           type: string
 *                           format: date-time
 *                     newLoan:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "loan456"
 *                         memberId:
 *                           type: string
 *                           example: "cm123abc"
 *                         storeLocation:
 *                           type: string
 *                           example: "Main Store"
 *                         checkoutAt:
 *                           type: string
 *                           format: date-time
 *                         dueDate:
 *                           type: string
 *                           format: date-time
 *                         photoUrl:
 *                           type: string
 *                           example: "loans/loan456/photo.jpg"
 *                         thumbnailUrl:
 *                           type: string
 *                           example: "loans/loan456/thumb.jpg"
 *       400:
 *         description: Bad request - missing fields or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing required fields"
 *       404:
 *         description: Loan not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Loan not found"
 */
router.post('/swap', async (req, res, next) => {
  try {
    const { memberId, loanId, storeLocation, uploadIds } = req.body;
    if (!memberId || !loanId || !storeLocation || !uploadIds || !Array.isArray(uploadIds)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const result = await swapLoan({ memberId, loanId, storeLocation, uploadIds });
    return res.json(success(result));
  } catch (error) {
    return next(error);
  }
});

/**
 * @swagger
 * /api/loans/active/{memberId}:
 *   get:
 *     summary: Get active loans for a member
 *     tags: [Loans]
 *     parameters:
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID to get active loans for
 *     responses:
 *       200:
 *         description: Active loans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "loan123"
 *                       memberId:
 *                         type: string
 *                         example: "cm123abc"
 *                       storeLocation:
 *                         type: string
 *                         example: "Main Store"
 *                       checkoutAt:
 *                         type: string
 *                         format: date-time
 *                       dueDate:
 *                         type: string
 *                         format: date-time
 *                       returnedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                       photoUrl:
 *                         type: string
 *                         example: "loans/loan123/photo.jpg"
 *                       thumbnailUrl:
 *                         type: string
 *                         example: "loans/loan123/thumb.jpg"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       gallery:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               example: "photo123"
 *                             r2Key:
 *                               type: string
 *                               example: "loans/loan123/gallery/photo.jpg"
 *       400:
 *         description: Bad request - missing memberId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Missing memberId"
 */
router.get('/active/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    if (!memberId) {
      return res.status(400).json({ message: 'Missing memberId' });
    }

    const loans = await getActiveLoans(memberId);
    return res.json(success(loans));
  } catch (error) {
    return next(error);
  }
});

export default router;
