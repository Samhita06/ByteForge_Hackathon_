import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  invoiceCreateSchema,
  invoiceUpdateSchema,
  invoiceListQuery,
  transactionCreateSchema,
  transactionUpdateSchema,
  transactionListQuery,
  idParamSchema,
} from './finance.schema.js';
import * as controller from './finance.controller.js';

export const invoicesRouter = Router();
invoicesRouter.use(requireAuth);
invoicesRouter.get('/', validate({ query: invoiceListQuery }), controller.listInvoices);
invoicesRouter.post('/', validate({ body: invoiceCreateSchema }), controller.createInvoice);
invoicesRouter.patch('/:id', validate({ params: idParamSchema, body: invoiceUpdateSchema }), controller.updateInvoice);

export const transactionsRouter = Router();
transactionsRouter.use(requireAuth);
transactionsRouter.get('/', validate({ query: transactionListQuery }), controller.listTransactions);
transactionsRouter.post('/', validate({ body: transactionCreateSchema }), controller.createTransaction);
transactionsRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: transactionUpdateSchema }),
  controller.updateTransaction,
);
transactionsRouter.delete('/:id', validate({ params: idParamSchema }), controller.removeTransaction);
