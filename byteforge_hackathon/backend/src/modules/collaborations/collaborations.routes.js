import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  collaborationCreateSchema,
  collaborationUpdateSchema,
  collaborationListQuery,
  idParamSchema,
} from './collaborations.schema.js';
import * as controller from './collaborations.controller.js';

export const collaborationsRouter = Router();

collaborationsRouter.use(requireAuth);
collaborationsRouter.get('/', validate({ query: collaborationListQuery }), controller.list);
collaborationsRouter.post('/', validate({ body: collaborationCreateSchema }), controller.create);
collaborationsRouter.get('/:id', validate({ params: idParamSchema }), controller.getById);
collaborationsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: collaborationUpdateSchema }),
  controller.update,
);
collaborationsRouter.delete('/:id', validate({ params: idParamSchema }), controller.remove);
