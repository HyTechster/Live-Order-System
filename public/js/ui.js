// Small shared UI helpers. All text goes in via text nodes, never innerHTML.

export const STATUSES = ['received', 'preparing', 'ready', 'collected'];

export const STATUS_LABEL = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  collected: 'Collected',
};

export function formatRM(sen) {
  return `RM ${(sen / 100).toFixed(2)}`;
}

export function nextStatus(status) {
  return STATUSES[STATUSES.indexOf(status) + 1] || null;
}

// h('p', { class: 'x', dataset: { id: 1 } }, 'text', childNode)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

// Sets the live indicator text + state for a socket.
export function bindLiveIndicator(socket, el) {
  const set = (state, text) => {
    el.dataset.state = state;
    el.textContent = text;
  };
  socket.on('connect', () => set('online', 'Live'));
  socket.on('disconnect', () => set('offline', 'Reconnecting…'));
  socket.io.on('reconnect_attempt', () => set('offline', 'Reconnecting…'));
}
