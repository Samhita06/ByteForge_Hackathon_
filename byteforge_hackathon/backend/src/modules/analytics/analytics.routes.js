import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as controller from './analytics.controller.js';

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth);
analyticsRouter.get('/summary', controller.getDashboard);
