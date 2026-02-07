import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import swaggerUi from 'swagger-ui-express';

import { config } from './config';
import { prisma } from './db/client';
import membersRouter from './routes/members.routes';
import loansRouter from './routes/loans.routes';
import uploadsRouter from './routes/uploads.routes';
import { idempotencyMiddleware } from './middlewares/idempotency';
import { errorHandler } from './middlewares/errorHandler';
import { specs } from './docs/openapi';

export async function createApp() {
  const app = express();

  // Add this early (before any routes)
  app.use(cors({
    origin: '*',                           // ← allow all origins (dev only)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: '*',                    // ← allow all headers
    credentials: true,                     // if you ever add sessions/cookies
  }));

  // Handle preflight OPTIONS requests (usually automatic with cors package)
  app.options('*', cors());
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  app.use(idempotencyMiddleware);

  // Routes
  app.use('/api/members', membersRouter);
  app.use('/api/loans', loansRouter);
  app.use('/api/uploads', uploadsRouter);

  // Swagger Documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ReJoEs API Documentation',
  }));

  // CORS endpoint
  app.get('/api/cors-test', (req, res) => {
    res.json({
      message: 'CORS successful',
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });
  });

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
