import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  deliverableCreateSchema,
  deliverableUpdateSchema,
  deliverableListQuery,
  idParamSchema,
} from './deliverables.schema.js';
import * as controller from './deliverables.controller.js';

export const deliverablesRouter = Router();

deliverablesRouter.use(requireAuth);
deliverablesRouter.get('/', validate({ query: deliverableListQuery }), controller.list);
deliverablesRouter.post('/', validate({ body: deliverableCreateSchema }), controller.create);
deliverablesRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: deliverableUpdateSchema }),
  controller.update,
);
deliverablesRouter.delete('/:id', validate({ params: idParamSchema }), controller.remove);
