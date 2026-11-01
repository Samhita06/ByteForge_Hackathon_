import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth.middleware.js';
import * as controller from './youtube.controller.js';

export const youtubeRouter = Router();

youtubeRouter.get('/callback', controller.callback);
youtubeRouter.use(requireAuth);
youtubeRouter.post('/connect', controller.start);
youtubeRouter.get('/', controller.status);
youtubeRouter.get('/stats', controller.statistics);
youtubeRouter.delete('/', controller.disconnect);
