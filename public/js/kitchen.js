// Kitchen board: live columns, advance buttons, new-order highlight + optional chime.
import { getActiveOrders, setStatus } from './api.js';
import { h, nextStatus, bindLiveIndicator } from './ui.js';

const COLUMNS = ['received', 'preparing', 'ready'];
const ACTION = { preparing: 'Start preparing', ready: 'Mark ready', collected: 'Collected' };
const EMPTY = {
  received: ['No new orders', 'New orders show up here.'],
  preparing: ['Nothing cooking', 'Tap Start preparing on an order.'],
  ready: ['Nothing waiting', 'Ready orders wait here for pickup.'],
};
const LATE_MINUTES = 10;

const orders = new Map();
const pending = new Set();
const fresh = new Set();

const summaryEl = document.getElementById('summary');
const errorEl = document.getElementById('error');
const soundBtn = document.getElementById('sound');
const columns = Object.fromEntries(
  COLUMNS.map((status) => {
    const col = document.querySelector(`.col[data-status="${status}"]`);
    return [status, { list: col.querySelector('[data-list]'), count: col.querySelector('[data-count]') }];
  }),
);

function minutesSince(ts) {
  return Math.max(0, Math.floor((Date.now() - ts) / 60000));
}

function setAge(el, createdAt) {
  const m = minutesSince(createdAt);
  el.textContent = m < 1 ? 'Just now' : `${m} min`;
  el.toggleAttribute('data-late', m >= LATE_MINUTES);
}

function renderCard(order) {
  const to = nextStatus(order.status);
  const age = h('span', { class: 'card-age num', dataset: { created: order.createdAt } });
  setAge(age, order.createdAt);

  return h('li', { class: fresh.has(order.id) ? 'card is-new' : 'card', dataset: { id: order.id } },
    h('div', { class: 'card-head' },
      h('span', { class: 'card-num num' }, `#${order.number}`),
      age,
    ),
    h('p', { class: 'card-table' }, order.table ? `Table ${order.table}` : 'Takeaway'),
    h('ul', { class: 'card-items' },
      order.items.map((item) => h('li', { translate: 'no' }, h('span', { class: 'qty num' }, `${item.qty}×`), ' ', item.name)),
    ),
    order.note && h('p', { class: 'card-note' }, order.note),
    h('button', {
      type: 'button',
      class: 'btn advance',
      dataset: { to },
      disabled: pending.has(order.id),
      onclick: () => advance(order.id, to),
    }, pending.has(order.id) ? 'Updating…' : ACTION[to]),
  );
}

function render() {
  const byStatus = { received: [], preparing: [], ready: [] };
  const sorted = [...orders.values()].sort((a, b) => a.createdAt - b.createdAt);
  for (const order of sorted) byStatus[order.status]?.push(order);

  for (const status of COLUMNS) {
    const list = byStatus[status];
    const [title, hint] = EMPTY[status];
    columns[status].list.replaceChildren(
      ...(list.length ? list.map(renderCard) : [h('li', { class: 'col-empty' }, h('strong', {}, title), hint)]),
    );
    columns[status].count.textContent = list.length;
  }

  summaryEl.textContent = orders.size === 0 ? 'No active orders' : `${orders.size} active`;
}

function upsert(order) {
  if (order.status === 'collected') orders.delete(order.id);
  else orders.set(order.id, order);
}

let errorTimer;
function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => { errorEl.hidden = true; }, 6000);
}

async function resync() {
  try {
    const list = await getActiveOrders();
    orders.clear();
    list.forEach(upsert);
    render();
  } catch (err) {
    showError(err.message);
  }
}

async function advance(id, to) {
  if (!to || pending.has(id)) return;
  pending.add(id);
  render();
  try {
    upsert(await setStatus(id, to));
  } catch (err) {
    // Usually another screen moved it first. Show why, then resync.
    showError(err.message);
    await resync();
  } finally {
    pending.delete(id);
    render();
  }
}

function markFresh(id) {
  fresh.add(id);
  setTimeout(() => fresh.delete(id), 3000);
}

// Sound: off by default, remembered per screen. Browsers need a tap before audio plays.
let soundOn = false;
let audioCtx = null;
try { soundOn = localStorage.getItem('kitchen-sound') === 'on'; } catch { /* storage blocked */ }

function syncSoundButton() {
  soundBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
  soundBtn.setAttribute('aria-pressed', String(soundOn));
}

function chime() {
  if (!soundOn || !window.AudioContext) return;
  audioCtx ??= new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const t = audioCtx.currentTime;
  [[660, 0], [880, 0.15]].forEach(([freq, delay]) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.08, t + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.45);
  });
}

soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  try { localStorage.setItem('kitchen-sound', soundOn ? 'on' : 'off'); } catch { /* storage blocked */ }
  syncSoundButton();
  chime();
});
document.addEventListener('pointerdown', () => audioCtx?.resume(), { passive: true });
syncSoundButton();

// Minutes since ordered, refreshed in place.
setInterval(() => {
  document.querySelectorAll('.card-age').forEach((el) => setAge(el, Number(el.dataset.created)));
}, 30000);

// Live updates. On every connect: re-join the room and refetch (covers missed events).
const socket = io();
bindLiveIndicator(socket, document.getElementById('live'));

socket.on('connect', () => {
  socket.emit('kitchen:join');
  resync();
});

socket.on('order:new', (order) => {
  const isNew = !orders.has(order.id);
  upsert(order);
  if (isNew) {
    markFresh(order.id);
    chime();
  }
  render();
});

socket.on('order:updated', (order) => {
  upsert(order);
  render();
});
