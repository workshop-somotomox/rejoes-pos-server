import path from 'path';
import express, { Request } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config';
import membersRouter from './routes/members.routes';
import loansRouter from './routes/loans.routes';
import uploadsRouter from './routes/uploads.routes';
import webhooksRouter from './routes/webhooks.routes';
import { idempotencyMiddleware } from './middlewares/idempotency';
import { errorHandler } from './middlewares/errorHandler';

export async function createApp() {
  const app = express();

  app.use(helmet());
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

  app.use('/api/members', membersRouter);
  app.use('/api/loans', loansRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/webhooks', webhooksRouter);

  app.use(errorHandler);

  return app;
}
