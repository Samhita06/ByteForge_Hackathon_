import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { profileUpdateSchema } from './creators.schema.js';
import * as controller from './creators.controller.js';

export const creatorsRouter = Router();

creatorsRouter.use(requireAuth);
creatorsRouter.get('/', controller.getProfile);
creatorsRouter.patch('/', validate({ body: profileUpdateSchema }), controller.patchProfile);
