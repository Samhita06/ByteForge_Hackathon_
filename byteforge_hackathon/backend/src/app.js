import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './modules/health/health.routes.js';
import { creatorsRouter } from './modules/creators/creators.routes.js';
import { collaborationsRouter } from './modules/collaborations/collaborations.routes.js';
import { deliverablesRouter } from './modules/deliverables/deliverables.routes.js';
import { contentRouter } from './modules/content/content.routes.js';
import { invoicesRouter, transactionsRouter } from './modules/finance/finance.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { alertsRouter } from './modules/alerts/alerts.routes.js';
import { youtubeRouter } from './modules/integrations/youtube/youtube.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN.split(',').map((value) => value.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '32kb' }));

  app.use('/api', healthRouter);
  app.use('/api/profile', creatorsRouter);
  app.use('/api/collaborations', collaborationsRouter);
  app.use('/api/deliverables', deliverablesRouter);
  app.use('/api/content', contentRouter);
  app.use('/api/invoices', invoicesRouter);
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/dashboard', analyticsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/integrations/youtube', youtubeRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
