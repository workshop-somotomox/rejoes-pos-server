import dotenv from 'dotenv';
import path from 'path';

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
  r2: {
    endpoint: process.env.R2_ENDPOINT || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    bucket: process.env.R2_BUCKET || '',
  },
};
