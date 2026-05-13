const PURCHASE_HOLD_SECONDS = 300;
const PURCHASE_HOLD_MS = PURCHASE_HOLD_SECONDS * 1000;

const queueByRoom = new Map();
const socketAssignments = new Map();

const buildQueueRoomId = ({ eventSlug }) => `${eventSlug || 'event'}`;

const ensureRoom = (roomId) => {
  if (!queueByRoom.has(roomId)) {
    queueByRoom.set(roomId, {
      active: null,
      waiting: [],
    });
  }

  return queueByRoom.get(roomId);
};

const cleanupRoomIfEmpty = (roomId) => {
  const room = queueByRoom.get(roomId);
  if (!room) return;
  if (room.active || room.waiting.length > 0) return;
  queueByRoom.delete(roomId);
};

const getRemainingSeconds = (expiresAt) => Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

const estimateWaitSeconds = (room, position) => {
  const activeRemainingSeconds = room.active ? getRemainingSeconds(room.active.expiresAt) : 0;
  return activeRemainingSeconds + Math.max(position - 1, 0) * PURCHASE_HOLD_SECONDS;
};

const emitQueuePositions = (io, roomId) => {
  const room = queueByRoom.get(roomId);
  if (!room) return;

  const activeExpiresAt = room.active?.expiresAt ?? null;
  const queueLength = room.waiting.length + (room.active ? 1 : 0);

  room.waiting.forEach((entry, index) => {
    io.to(entry.socketId).emit('queue:update', {
      roomId,
      position: index + 1,
      estimatedWaitSeconds: estimateWaitSeconds(room, index + 1),
      activeExpiresAt,
      queueLength,
      holdSeconds: PURCHASE_HOLD_SECONDS,
    });
  });
};

const expireActiveTurn = (io, roomId, reason = 'timeout') => {
  const room = queueByRoom.get(roomId);
  if (!room?.active) return;

  const activeEntry = room.active;

  if (activeEntry.timer) {
    clearTimeout(activeEntry.timer);
  }

  room.active = null;
  socketAssignments.delete(activeEntry.socketId);

  io.to(activeEntry.socketId).emit('queue:expired', {
    roomId,
    reason,
    message: 'Tu turno de compra termino y se habilito el siguiente usuario en cola.',
  });

  const nextEntry = room.waiting.shift() ?? null;
  if (nextEntry) {
    const grantedAt = Date.now();
    const expiresAt = grantedAt + PURCHASE_HOLD_MS;

    room.active = {
      ...nextEntry,
      grantedAt,
      expiresAt,
      timer: setTimeout(() => {
        expireActiveTurn(io, roomId, 'timeout');
      }, PURCHASE_HOLD_MS),
    };

    socketAssignments.set(nextEntry.socketId, {
      roomId,
      role: 'active',
    });

    io.to(nextEntry.socketId).emit('queue:granted', {
      roomId,
      holdSeconds: PURCHASE_HOLD_SECONDS,
      expiresAt,
    });
  }

  emitQueuePositions(io, roomId);
  cleanupRoomIfEmpty(roomId);
};

const removeFromQueue = (io, socketId, reason = 'left') => {
  const assignment = socketAssignments.get(socketId);
  if (!assignment) return;

  const room = queueByRoom.get(assignment.roomId);
  socketAssignments.delete(socketId);

  if (!room) return;

  if (assignment.role === 'active') {
    if (room.active?.socketId === socketId) {
      if (room.active.timer) {
        clearTimeout(room.active.timer);
      }
      room.active = null;

      if (reason !== 'disconnect' && reason !== 'rejoin') {
        io.to(socketId).emit('queue:expired', {
          roomId: assignment.roomId,
          reason,
          message: 'Saliste de tu turno de compra.',
        });
      }

      const nextEntry = room.waiting.shift() ?? null;
      if (nextEntry) {
        const grantedAt = Date.now();
        const expiresAt = grantedAt + PURCHASE_HOLD_MS;

        room.active = {
          ...nextEntry,
          grantedAt,
          expiresAt,
          timer: setTimeout(() => {
            expireActiveTurn(io, assignment.roomId, 'timeout');
          }, PURCHASE_HOLD_MS),
        };

        socketAssignments.set(nextEntry.socketId, {
          roomId: assignment.roomId,
          role: 'active',
        });

        io.to(nextEntry.socketId).emit('queue:granted', {
          roomId: assignment.roomId,
          holdSeconds: PURCHASE_HOLD_SECONDS,
          expiresAt,
        });
      }
    }

    emitQueuePositions(io, assignment.roomId);
    cleanupRoomIfEmpty(assignment.roomId);
    return;
  }

  const waitingIndex = room.waiting.findIndex((entry) => entry.socketId === socketId);
  if (waitingIndex !== -1) {
    room.waiting.splice(waitingIndex, 1);
  }

  emitQueuePositions(io, assignment.roomId);
  cleanupRoomIfEmpty(assignment.roomId);
};

const completeTurn = (io, socket, payload = {}) => {
  const assignment = socketAssignments.get(socket.id);
  if (!assignment || assignment.role !== 'active') {
    socket.emit('queue:error', {
      message: 'No tienes un turno activo para completar la compra',
    });
    return;
  }

  const room = queueByRoom.get(assignment.roomId);
  if (!room?.active || room.active.socketId !== socket.id) {
    socket.emit('queue:error', {
      message: 'Tu turno activo ya no esta disponible',
    });
    return;
  }

  const expectedRoom = assignment.roomId;
  const payloadRoom = String(payload.roomId || '').trim();

  if (payloadRoom && payloadRoom !== expectedRoom) {
    socket.emit('queue:error', {
      message: 'La compra no coincide con la cola activa',
    });
    return;
  }

  if (room.active.timer) {
    clearTimeout(room.active.timer);
  }

  room.active = null;
  socketAssignments.delete(socket.id);

  socket.emit('queue:completed', {
    roomId: expectedRoom,
    message: 'Compra confirmada. Se habilitara el siguiente turno.',
  });

  const nextEntry = room.waiting.shift() ?? null;
  if (nextEntry) {
    const grantedAt = Date.now();
    const expiresAt = grantedAt + PURCHASE_HOLD_MS;

    room.active = {
      ...nextEntry,
      grantedAt,
      expiresAt,
      timer: setTimeout(() => {
        expireActiveTurn(io, expectedRoom, 'timeout');
      }, PURCHASE_HOLD_MS),
    };

    socketAssignments.set(nextEntry.socketId, {
      roomId: expectedRoom,
      role: 'active',
    });

    io.to(nextEntry.socketId).emit('queue:granted', {
      roomId: expectedRoom,
      holdSeconds: PURCHASE_HOLD_SECONDS,
      expiresAt,
    });
  }

  emitQueuePositions(io, expectedRoom);
  cleanupRoomIfEmpty(expectedRoom);
};

const joinQueue = (io, socket, payload = {}) => {
  const eventSlug = String(payload.eventSlug || '').trim();
  const tierId = String(payload.tierId || '').trim();
  const quantity = Number(payload.quantity || 1);
  const userEmail = String(payload.userEmail || '').trim();

  if (!eventSlug || !tierId || !Number.isFinite(quantity) || quantity < 1) {
    socket.emit('queue:error', {
      message: 'Datos incompletos para entrar a la cola',
    });
    return;
  }

  removeFromQueue(io, socket.id, 'rejoin');

  const roomId = buildQueueRoomId({ eventSlug });
  const room = ensureRoom(roomId);

  socket.join(roomId);

  const queueEntry = {
    socketId: socket.id,
    eventSlug,
    tierId,
    quantity,
    userEmail,
    joinedAt: Date.now(),
  };

  if (!room.active) {
    const grantedAt = Date.now();
    const expiresAt = grantedAt + PURCHASE_HOLD_MS;

    room.active = {
      ...queueEntry,
      grantedAt,
      expiresAt,
      timer: setTimeout(() => {
        expireActiveTurn(io, roomId, 'timeout');
      }, PURCHASE_HOLD_MS),
    };

    socketAssignments.set(socket.id, {
      roomId,
      role: 'active',
    });

    socket.emit('queue:joined', {
      roomId,
      position: 0,
      estimatedWaitSeconds: 0,
    });

    socket.emit('queue:granted', {
      roomId,
      holdSeconds: PURCHASE_HOLD_SECONDS,
      expiresAt,
    });

    emitQueuePositions(io, roomId);
    return;
  }

  room.waiting.push(queueEntry);

  socketAssignments.set(socket.id, {
    roomId,
    role: 'waiting',
  });

  const position = room.waiting.length;

  socket.emit('queue:joined', {
    roomId,
    position,
    estimatedWaitSeconds: estimateWaitSeconds(room, position),
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

    socket.on('queue:complete', (payload) => {
      completeTurn(io, socket, payload);
    });

    socket.on('queue:leave', () => {
      removeFromQueue(io, socket.id, 'left');
    });

    socket.on('disconnect', () => {
      removeFromQueue(io, socket.id, 'disconnect');
    });
  });
};

module.exports = {
  registerCheckoutQueueSocket,
};
