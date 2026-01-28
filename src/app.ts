import path from 'path';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';

import { config } from './config';
import { prisma } from './prisma';
import membersRouter from './routes/members.routes';
import loansRouter from './routes/loans.routes';
import uploadsRouter from './routes/uploads.routes';
import { idempotencyMiddleware } from './middlewares/idempotency';
import { errorHandler } from './middlewares/errorHandler';

export async function createApp() {
  const app = express();

  // Most permissive CORS configuration
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    
    next();
  });
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.use('/test', express.static(path.resolve(process.cwd(), 'test')));

  app.use(idempotencyMiddleware);

  // Routes
  app.use('/api/members', membersRouter);
  app.use('/api/loans', loansRouter);
  app.use('/api/uploads', uploadsRouter);

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

  app.use(errorHandler);

  return app;
}
