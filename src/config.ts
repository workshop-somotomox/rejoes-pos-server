import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const rootDir = process.cwd();

export const config = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  uploadDirs: {
    originals: path.resolve(rootDir, 'uploads', 'originals'),
    thumbnails: path.resolve(rootDir, 'uploads', 'thumbnails'),
  },
  idempotencyHeader: 'x-idempotency-key',
  shopify: {
    webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
  },
};
