import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { contentCreateSchema, contentUpdateSchema, contentListQuery, idParamSchema } from './content.schema.js';
import * as controller from './content.controller.js';

export const contentRouter = Router();

contentRouter.use(requireAuth);
contentRouter.get('/', validate({ query: contentListQuery }), controller.list);
contentRouter.post('/', validate({ body: contentCreateSchema }), controller.create);
contentRouter.patch('/:id', validate({ params: idParamSchema, body: contentUpdateSchema }), controller.update);
contentRouter.delete('/:id', validate({ params: idParamSchema }), controller.remove);
