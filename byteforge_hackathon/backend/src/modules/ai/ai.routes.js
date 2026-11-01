import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as controller from './ai.controller.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);
aiRouter.get('/recommendations', controller.latest);
aiRouter.post('/recommendations', controller.generate);
