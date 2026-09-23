// In-memory order store. The only place that creates or mutates orders.
import { randomUUID } from 'node:crypto';
import { findMenuItem } from './menu.js';

export const STATUSES = ['received', 'preparing', 'ready', 'collected'];

const MAX_QTY = 20;
const MAX_NOTE = 140;
const MAX_TABLE = 10;

const orders = new Map();
let nextNumber = 1001;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const bad = (message) => new HttpError(400, message);
const copy = (order) => structuredClone(order);

// Pure: turns a raw request body into clean { items, table, note } or throws 400.
export function parseOrderInput(body) {
  if (!body || typeof body !== 'object') throw bad('Body must be a JSON object');
  const { items, table = '', note = '' } = body;

  if (!Array.isArray(items) || items.length === 0) throw bad('Add at least one item');

  const merged = new Map();
  for (const entry of items) {
    const menuItem = findMenuItem(entry?.menuId);
    if (!menuItem) throw bad(`Unknown menu item: ${String(entry?.menuId)}`);
    const qty = entry.qty;
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw bad(`Quantity for ${menuItem.name} must be a whole number from 1 to ${MAX_QTY}`);
    }
    const total = (merged.get(menuItem.id)?.qty || 0) + qty;
    if (total > MAX_QTY) throw bad(`Max ${MAX_QTY} of ${menuItem.name} per order`);
    // Name and price always come from the menu, never the client.
    merged.set(menuItem.id, { menuId: menuItem.id, name: menuItem.name, qty: total, price: menuItem.price });
  }

  if (typeof table !== 'string' && typeof table !== 'number') throw bad('Table must be text');
  const cleanTable = String(table).trim();
  if (cleanTable.length > MAX_TABLE) throw bad(`Table must be ${MAX_TABLE} characters or fewer`);

  if (typeof note !== 'string') throw bad('Note must be text');
  const cleanNote = note.trim();
  if (cleanNote.length > MAX_NOTE) throw bad(`Note must be ${MAX_NOTE} characters or fewer`);

  return { items: [...merged.values()], table: cleanTable, note: cleanNote };
}

// Pure: sum of qty * price in sen.
export function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

// Pure: is `to` the single next step after `from`?
export function isNextStatus(from, to) {
  const i = STATUSES.indexOf(from);
  return i !== -1 && STATUSES[i + 1] === to;
}

function newId() {
  let id;
  do {
    id = randomUUID().slice(0, 6);
  } while (orders.has(id));
  return id;
}

export function createOrder(body) {
  const { items, table, note } = parseOrderInput(body);
  const now = Date.now();
  const order = {
    id: newId(),
    number: nextNumber++,
    table,
    items,
    note,
    total: computeTotal(items),
    status: 'received',
    createdAt: now,
    updatedAt: now,
  };
  orders.set(order.id, order);
  return copy(order);
}

export function getOrder(id) {
  const order = orders.get(id);
  return order ? copy(order) : null;
}

export function listOrders({ activeOnly = false } = {}) {
  return [...orders.values()]
    .filter((order) => !activeOnly || order.status !== 'collected')
    .sort((a, b) => a.createdAt - b.createdAt || a.number - b.number)
    .map(copy);
}

export function advanceStatus(id, status) {
  const order = orders.get(id);
  if (!order) throw new HttpError(404, 'Order not found');
  if (!STATUSES.includes(status)) throw bad(`Status must be one of: ${STATUSES.join(', ')}`);
  if (!isNextStatus(order.status, status)) {
    throw bad(`Cannot move order from ${order.status} to ${status}`);
  }
  order.status = status;
  order.updatedAt = Date.now();
  return copy(order);
}
