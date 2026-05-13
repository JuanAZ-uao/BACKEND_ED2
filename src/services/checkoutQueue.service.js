const WAIT_BASE_MS = 8000;
const WAIT_STEP_MS = 5000;
const WAIT_RANDOM_MS = 3000;
const PURCHASE_HOLD_SECONDS = 120;

const queueByRoom = new Map();

const buildQueueRoomId = ({ eventSlug, tierId }) => `${eventSlug || 'event'}::${tierId || 'tier'}`;

const estimateWaitSeconds = (position) =>
  Math.ceil((WAIT_BASE_MS + Math.max(position - 1, 0) * WAIT_STEP_MS) / 1000);

const emitQueuePositions = (io, roomId) => {
  const roomQueue = queueByRoom.get(roomId) || [];

  roomQueue.forEach((entry, index) => {
    io.to(entry.socketId).emit('queue:update', {
      roomId,
      position: index + 1,
      estimatedWaitSeconds: estimateWaitSeconds(index + 1),
    });
  });
};

const removeFromQueue = (io, socketId) => {
  for (const [roomId, roomQueue] of queueByRoom.entries()) {
    const entryIndex = roomQueue.findIndex((entry) => entry.socketId === socketId);
    if (entryIndex === -1) continue;

    const [entry] = roomQueue.splice(entryIndex, 1);
    if (entry?.timer) clearTimeout(entry.timer);

    if (roomQueue.length === 0) {
      queueByRoom.delete(roomId);
    } else {
      queueByRoom.set(roomId, roomQueue);
      emitQueuePositions(io, roomId);
    }

    return;
  }
};

const grantTurn = (io, roomId, socketId) => {
  const roomQueue = queueByRoom.get(roomId) || [];
  const entryIndex = roomQueue.findIndex((entry) => entry.socketId === socketId);

  if (entryIndex === -1) return;

  roomQueue.splice(entryIndex, 1);

  if (roomQueue.length === 0) {
    queueByRoom.delete(roomId);
  } else {
    queueByRoom.set(roomId, roomQueue);
  }

  io.to(socketId).emit('queue:granted', {
    roomId,
    holdSeconds: PURCHASE_HOLD_SECONDS,
    expiresAt: Date.now() + PURCHASE_HOLD_SECONDS * 1000,
  });

  emitQueuePositions(io, roomId);
};

const joinQueue = (io, socket, payload = {}) => {
  const eventSlug = String(payload.eventSlug || '').trim();
  const tierId = String(payload.tierId || '').trim();
  const quantity = Number(payload.quantity || 1);

  if (!eventSlug || !tierId) {
    socket.emit('queue:error', {
      message: 'Datos incompletos para entrar a la cola',
    });
    return;
  }

  removeFromQueue(io, socket.id);

  const roomId = buildQueueRoomId({ eventSlug, tierId });
  const roomQueue = queueByRoom.get(roomId) || [];
  const position = roomQueue.length + 1;

  const waitMs =
    WAIT_BASE_MS +
    Math.max(position - 1, 0) * WAIT_STEP_MS +
    Math.floor(Math.random() * WAIT_RANDOM_MS);

  const nextEntry = {
    socketId: socket.id,
    eventSlug,
    tierId,
    quantity,
    joinedAt: Date.now(),
    timer: null,
  };

  nextEntry.timer = setTimeout(() => {
    grantTurn(io, roomId, socket.id);
  }, waitMs);

  roomQueue.push(nextEntry);
  queueByRoom.set(roomId, roomQueue);

  socket.join(roomId);
  socket.emit('queue:joined', {
    roomId,
    position,
    estimatedWaitSeconds: Math.ceil(waitMs / 1000),
  });

  emitQueuePositions(io, roomId);
};

const registerCheckoutQueueSocket = (io) => {
  io.on('connection', (socket) => {
    socket.emit('queue:ready', {
      message: 'Socket de cola conectado',
    });

    socket.on('queue:join', (payload) => {
      joinQueue(io, socket, payload);
    });

    socket.on('queue:leave', () => {
      removeFromQueue(io, socket.id);
    });

    socket.on('disconnect', () => {
      removeFromQueue(io, socket.id);
    });
  });
};

module.exports = {
  registerCheckoutQueueSocket,
};
