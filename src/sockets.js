// Socket.io rooms + emit helpers. Server to client broadcasts only.
let io = null;

const ID_PATTERN = /^[a-z0-9-]{1,36}$/i;

export function initSockets(server) {
  io = server;
  io.on('connection', (socket) => {
    socket.on('kitchen:join', () => {
      socket.join('kitchen');
    });

    socket.on('order:watch', (payload) => {
      const id = typeof payload?.id === 'string' ? payload.id : '';
      if (ID_PATTERN.test(id)) socket.join(`order:${id}`);
    });
  });
}

export function emitNewOrder(order) {
  io?.to('kitchen').emit('order:new', order);
}

export function emitOrderUpdated(order) {
  io?.to('kitchen').to(`order:${order.id}`).emit('order:updated', order);
}
