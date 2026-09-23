// Customer order page: menu, qty steppers, cart bar, place order.
import { getMenu, createOrder } from './api.js';
import { h, formatRM } from './ui.js';

const GROUPS = [
  { category: 'food', title: 'Food' },
  { category: 'drink', title: 'Drinks' },
];
const MAX_QTY = 20;

const cart = new Map(); // menuId -> qty
let menu = [];
let submitting = false;

const form = document.getElementById('order-form');
const menuEl = document.getElementById('menu');
const menuError = document.getElementById('menu-error');
const noteEl = document.getElementById('note');
const noteCount = document.getElementById('note-count');
const tableEl = document.getElementById('table');
const countEl = document.getElementById('cart-count');
const totalEl = document.getElementById('cart-total');
const placeBtn = document.getElementById('place');
const submitError = document.getElementById('submit-error');

function setQty(menuId, qty) {
  const clamped = Math.max(0, Math.min(MAX_QTY, qty));
  if (clamped === 0) cart.delete(menuId);
  else cart.set(menuId, clamped);

  const item = menu.find((m) => m.id === menuId);
  const row = menuEl.querySelector(`[data-id="${menuId}"]`);
  const hadFocus = row.contains(document.activeElement);
  const control = renderControl(item);
  row.querySelector('.item-control').replaceWith(control);
  // Keep keyboard focus on the control after it re-renders.
  if (hadFocus) (control.querySelector('[data-step="+"]') || control).focus();
  updateCart();
}

function renderControl(item) {
  const qty = cart.get(item.id) || 0;
  if (qty === 0) {
    return h('button', {
      type: 'button',
      class: 'btn btn-ghost item-control add-btn',
      'aria-label': `Add ${item.name}`,
      onclick: () => setQty(item.id, 1),
    }, 'Add');
  }
  return h('div', { class: 'item-control stepper', role: 'group', 'aria-label': `${item.name} quantity` },
    h('button', {
      type: 'button',
      'data-step': '-',
      'aria-label': qty === 1 ? `Remove ${item.name}` : `One less ${item.name}`,
      onclick: () => setQty(item.id, qty - 1),
    }, '−'),
    h('output', { class: 'num', 'aria-live': 'polite' }, qty),
    h('button', {
      type: 'button',
      'data-step': '+',
      'aria-label': `One more ${item.name}`,
      disabled: qty >= MAX_QTY,
      onclick: () => setQty(item.id, qty + 1),
    }, '+'),
  );
}

function renderItem(item) {
  return h('li', { class: 'menu-item', dataset: { id: item.id } },
    h('div', { class: 'item-info' },
      h('p', { class: 'item-name', translate: 'no' }, item.name),
      item.description && h('p', { class: 'item-desc' }, item.description),
      h('p', { class: 'item-price num' }, formatRM(item.price)),
    ),
    renderControl(item),
  );
}

function renderMenu() {
  menuEl.replaceChildren(
    ...GROUPS.map(({ category, title }) => {
      const items = menu.filter((item) => item.category === category);
      if (!items.length) return null;
      return h('section', { class: 'menu-group', 'aria-label': title },
        h('h2', {}, title),
        h('ul', { class: 'menu-list' }, items.map(renderItem)),
      );
    }).filter(Boolean),
  );
  menuEl.setAttribute('aria-busy', 'false');
}

function updateCart() {
  let count = 0;
  let total = 0;
  for (const [menuId, qty] of cart) {
    const item = menu.find((m) => m.id === menuId);
    count += qty;
    total += qty * item.price;
  }
  countEl.textContent = count === 0 ? 'No items yet' : `${count} ${count === 1 ? 'item' : 'items'}`;
  totalEl.textContent = formatRM(total);
  placeBtn.disabled = count === 0 || submitting;
  if (count > 0) submitError.hidden = true;
}

async function loadMenu() {
  menuError.hidden = true;
  menuEl.hidden = false;
  try {
    menu = await getMenu();
    renderMenu();
    updateCart();
  } catch {
    menuEl.hidden = true;
    menuError.hidden = false;
  }
}

function showSubmitError(message) {
  submitError.textContent = message;
  submitError.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting || cart.size === 0) return;

  submitting = true;
  placeBtn.disabled = true;
  placeBtn.textContent = 'Placing order…';
  submitError.hidden = true;

  try {
    const order = await createOrder({
      items: [...cart].map(([menuId, qty]) => ({ menuId, qty })),
      table: tableEl.value.trim(),
      note: noteEl.value.trim(),
    });
    location.assign(`/status.html?id=${encodeURIComponent(order.id)}`);
  } catch (err) {
    showSubmitError(err.message);
    submitting = false;
    placeBtn.textContent = 'Place order';
    updateCart();
  }
});

noteEl.addEventListener('input', () => {
  noteCount.textContent = `${noteEl.value.length}/140`;
});

document.getElementById('menu-retry').addEventListener('click', loadMenu);

// Coming back from the status page via the back button restores this page from cache.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  submitting = false;
  placeBtn.textContent = 'Place order';
  updateCart();
});

loadMenu();
