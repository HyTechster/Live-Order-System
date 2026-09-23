// Fetch wrappers for the REST API. Throw ApiError with the server's message.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError('Can’t reach the shop right now. Check your connection.', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong', res.status);
  return data;
}

export const getMenu = () => request('/api/menu');

export const getOrder = (id) => request(`/api/orders/${encodeURIComponent(id)}`);

export const getActiveOrders = () => request('/api/orders?active=1');

export const createOrder = (body) =>
  request('/api/orders', { method: 'POST', body: JSON.stringify(body) });

export const setStatus = (id, status) =>
  request(`/api/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
