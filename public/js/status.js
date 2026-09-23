// Customer status page: live status for one order (?id=...).
import { getOrder } from './api.js';
import { h, formatRM, STATUSES, bindLiveIndicator } from './ui.js';

const COPY = {
  received: ['Order received', 'The kitchen has it. We’ll start soon.'],
  preparing: ['Being prepared', 'We’re cooking it now.'],
  ready: ['Ready to collect', 'Show this number at the counter.'],
  collected: ['Collected', 'Enjoy your meal. Terima kasih!'],
};

const id = new URLSearchParams(location.search).get('id');
let current = null;

const $ = (elId) => document.getElementById(elId);

function showMissing() {
  $('view').hidden = true;
  $('missing').hidden = false;
  document.body.dataset.status = 'missing';
  document.title = 'Order not found';
}

function showLoadError(message) {
  if (current) return; // keep showing the last known state
  $('headline').textContent = 'Can’t load your order';
  $('sub').textContent = `${message} We’ll keep trying.`;
}

function renderSteps(status) {
  const at = STATUSES.indexOf(status);
  document.querySelectorAll('#steps li').forEach((li, i) => {
    li.dataset.state = i < at ? 'done' : i === at ? 'current' : 'todo';
    if (i === at) li.setAttribute('aria-current', 'step');
    else li.removeAttribute('aria-current');
  });
}

function render(order) {
  // Ignore anything older than what is already on screen (REST and socket can race).
  if (current && order.updatedAt < current.updatedAt) return;
  const previous = current?.status;
  current = order;

  const [headline, sub] = COPY[order.status];
  document.body.dataset.status = order.status;
  $('number').textContent = order.number;
  $('headline').textContent = headline;
  $('sub').textContent = sub;
  renderSteps(order.status);

  $('meta').textContent = order.table ? `Table ${order.table}` : 'Takeaway';
  $('items').replaceChildren(
    ...order.items.map((item) =>
      h('li', {},
        h('span', { class: 'qty num' }, `${item.qty}×`),
        h('span', { class: 'name', translate: 'no' }, item.name),
        h('span', { class: 'price num' }, formatRM(item.qty * item.price)),
      ),
    ),
  );
  $('note').hidden = !order.note;
  $('note').textContent = order.note ? `Note: ${order.note}` : '';
  $('total').textContent = formatRM(order.total);
  $('receipt').hidden = false;

  document.title = order.status === 'ready' ? `Ready: #${order.number}` : `#${order.number} ${headline}`;

  if (previous && previous !== 'ready' && order.status === 'ready') {
    navigator.vibrate?.([200, 100, 200]);
  }
}

async function refresh() {
  try {
    render(await getOrder(id));
  } catch (err) {
    if (err.status === 404) showMissing();
    else showLoadError(err.message);
  }
}

if (!id) {
  showMissing();
} else {
  // On every connect: re-join the order room and refetch (covers missed events).
  const socket = io();
  bindLiveIndicator(socket, $('live'));
  socket.on('connect', () => {
    socket.emit('order:watch', { id });
    refresh();
  });
  socket.on('order:updated', (order) => {
    if (order.id === id) render(order);
  });
  // First paint does not wait for the socket.
  refresh();
}
