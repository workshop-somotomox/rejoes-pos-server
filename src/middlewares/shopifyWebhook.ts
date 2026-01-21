import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { config } from '../config';

const SHOPIFY_HMAC_HEADER = 'x-shopify-hmac-sha256';

export function verifyShopifyWebhook(req: Request, res: Response, next: NextFunction) {
  if (!config.shopify.webhookSecret) {
    return res.status(500).json({ message: 'Shopify webhook secret not configured' });
  }

  const signature = req.header(SHOPIFY_HMAC_HEADER);
  if (!signature || !req.rawBody) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  const computed = crypto
    .createHmac('sha256', config.shopify.webhookSecret)
    .update(req.rawBody)
    .digest('base64');

  if (computed !== signature) {
    return res.status(401).json({ message: 'Invalid webhook signature' });
  }

  return next();
}
