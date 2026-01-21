import path from 'path';
import express, { Request } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';

import { config } from './config';
import { prisma } from './prisma';
import membersRouter from './routes/members.routes';
import loansRouter from './routes/loans.routes';
import uploadsRouter from './routes/uploads.routes';
import webhooksRouter from './routes/webhooks.routes';
import { idempotencyMiddleware } from './middlewares/idempotency';
import { errorHandler } from './middlewares/errorHandler';

export async function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: ['https://shopify.com', 'https://*.shopify.com'],
    credentials: true
  }));
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        if (buf?.length) {
          (req as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buf);
        }
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.use(idempotencyMiddleware);

  app.get('/', async (req, res) => {
    try {
      const dbStatus = await prisma.$queryRaw`SELECT 1 as status`;
      res.json({
        status: 'ok',
        server: 'ReJoEs Backend API',
        environment: config.env,
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        server: 'ReJoEs Backend API',
        environment: config.env,
        database: 'disconnected',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  app.use('/api/members', membersRouter);
  app.use('/api/loans', loansRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/webhooks', webhooksRouter);

  app.use(errorHandler);

  return app;
}
