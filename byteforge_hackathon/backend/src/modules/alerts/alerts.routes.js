import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as controller from './alerts.controller.js';

export const alertsRouter = Router();

alertsRouter.use(requireAuth);
alertsRouter.get('/', controller.list);
