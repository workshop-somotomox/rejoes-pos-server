import { Router } from 'express';
import { prisma } from '../prisma';
import {
  checkoutLoan,
  returnLoan,
  swapLoan,
  getActiveLoans,
} from '../services/loan.service';

const router = Router();

router.post('/checkout', async (req, res, next) => {
  try {
    const { memberId, storeId, uploadIds } = req.body;
    if (!memberId || !storeId || !uploadIds || !Array.isArray(uploadIds)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate that store exists
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive store' });
    }

    const loan = await checkoutLoan({ memberId, storeId, uploadIds });
    return res.status(201).json(loan);
  } catch (error) {
    // Log error details in test environment
    if (process.env.NODE_ENV === 'test') {
      const { memberId, storeId, uploadIds } = req.body;
      console.error('Loan checkout error:', {
        memberId,
        storeId,
        uploadIds,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    return next(error);
  }
});

router.post('/return', async (req, res, next) => {
  try {
    const { memberId, loanId } = req.body;
    if (!memberId || !loanId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const loan = await returnLoan({ memberId, loanId });
    return res.json(loan);
  } catch (error) {
    return next(error);
  }
});

router.post('/swap', async (req, res, next) => {
  try {
    const { memberId, loanId, storeId, uploadIds } = req.body;
    if (!memberId || !loanId || !storeId || !uploadIds || !Array.isArray(uploadIds)) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate that store exists
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive store' });
    }

    const result = await swapLoan({ memberId, loanId, storeId, uploadIds });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
});

router.get('/active/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    if (!memberId) {
      return res.status(400).json({ message: 'Missing memberId' });
    }

    const loans = await getActiveLoans(memberId);
    return res.json(loans);
  } catch (error) {
    return next(error);
  }
});

export default router;
