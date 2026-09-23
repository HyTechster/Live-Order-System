// REST endpoints. Validate + mutate via store, then broadcast via sockets.
import { Router } from 'express';
import { MENU } from './menu.js';
import * as store from './store.js';
import { emitNewOrder, emitOrderUpdated } from './sockets.js';

export const router = Router();

const log = (order) => console.log(`[order] #${order.number} ${order.status}`);

router.get('/menu', (req, res) => {
  res.json(MENU);
});

router.post('/orders', (req, res) => {
  const order = store.createOrder(req.body);
  log(order);
  emitNewOrder(order);
  res.status(201).json(order);
});

router.get('/orders', (req, res) => {
  res.json(store.listOrders({ activeOnly: req.query.active === '1' }));
});

router.get('/orders/:id', (req, res) => {
  const order = store.getOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

router.patch('/orders/:id/status', (req, res) => {
  const order = store.advanceStatus(req.params.id, req.body?.status);
  log(order);
  emitOrderUpdated(order);
  res.json(order);
});
