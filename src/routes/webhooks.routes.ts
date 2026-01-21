import { Router } from 'express';
import { verifyShopifyWebhook } from '../middlewares/shopifyWebhook';
import { handleSubscriptionEvent } from '../services/subscription.service';
import { prisma } from '../prisma';

const router = Router();

router.post('/subscription', verifyShopifyWebhook, async (req, res, next) => {
  try {
    const payload = req.body;
    await handleSubscriptionEvent(payload);
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return next(error);
  }
});

router.post('/customers/delete', verifyShopifyWebhook, async (req, res, next) => {
  try {
    const { shopifyCustomerId } = req.body;
    
    // Delete all loans and audit events for this customer
    await prisma.member.delete({
      where: { shopifyCustomerId }
    });
    
    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    return next(error);
  }
});

export default router;
