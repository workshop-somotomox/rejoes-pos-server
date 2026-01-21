import { Router } from 'express';
import {
  checkoutLoan,
  returnLoan,
  swapLoan,
  getActiveLoans,
} from '../services/loan.service';

const router = Router();

router.post('/checkout', async (req, res, next) => {
  try {
    const { memberId, storeLocation, uploadId } = req.body;
    if (!memberId || !storeLocation || !uploadId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const loan = await checkoutLoan({ memberId, storeLocation, uploadId });
    return res.status(201).json(loan);
  } catch (error) {
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
    const { memberId, loanId, storeLocation, uploadId } = req.body;
    if (!memberId || !loanId || !storeLocation || !uploadId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const result = await swapLoan({ memberId, loanId, storeLocation, uploadId });
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
