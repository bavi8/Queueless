const Queue = require('../models/Queue');
const QueueEntry = require('../models/QueueEntry');

// Helper to compute queue state and broadcast to all subscribers
async function broadcastQueueUpdate(io, queueId) {
  const queue = await Queue.findById(queueId).populate('currentServing');
  const entries = await QueueEntry.find({
    queue: queueId,
    status: { $in: ['waiting', 'called', 'serving', 'on_hold'] },
  }).sort({ position: 1 });

  const waitingCount = entries.filter((e) => e.status === 'waiting').length;

  // Broadcast full queue state to the queue room (staff + users)
  io.to(`queue:${queueId}`).emit('queue:update', {
    queue: { ...queue.toObject(), waitingCount },
    entries: entries.map((e) => ({
      _id: e._id,
      name: e.name,
      position: e.position,
      status: e.status,
      joinedAt: e.joinedAt,
      guestId: e.guestId,
    })),
  });

  // Send personalized position updates to each waiting user
  for (const entry of entries) {
    const ahead = entries.filter(
      (e) => e.position < entry.position && ['waiting', 'called', 'on_hold'].includes(e.status)
    ).length;
    const eta = ahead * (queue.avgServiceTime || 5);

    io.to(`user:${entry.guestId}:${queueId}`).emit('position:update', {
      entryId: entry._id,
      status: entry.status,
      position: entry.position,
      ahead,
      eta,
      queueStatus: queue.status,
    });
  }
}

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── User joins a queue room to track their position ───────────────────
    socket.on('user:join-queue-room', async ({ queueId, guestId }) => {
      socket.join(`queue:${queueId}`);
      socket.join(`user:${guestId}:${queueId}`);
      console.log(`👤 User ${guestId} tracking queue ${queueId}`);

      // Send current position immediately
      try {
        const entry = await QueueEntry.findOne({
          queue: queueId,
          guestId,
          status: { $nin: ['completed', 'skipped', 'left'] },
        });

        if (entry) {
          const queue = await Queue.findById(queueId);
          const entries = await QueueEntry.find({
            queue: queueId,
            status: { $in: ['waiting', 'called', 'on_hold'] },
          }).sort({ position: 1 });

          const ahead = entries.filter((e) => e.position < entry.position).length;
          const eta = ahead * (queue.avgServiceTime || 5);

          socket.emit('position:update', {
            entryId: entry._id,
            status: entry.status,
            position: entry.position,
            ahead,
            eta,
            queueStatus: queue.status,
          });
        }
      } catch (err) {
        console.error('Error sending initial position:', err);
      }
    });

    // ─── Staff joins queue room to manage it ───────────────────────────────
    socket.on('staff:join-queue-room', async ({ queueId }) => {
      socket.join(`queue:${queueId}`);
      socket.join(`staff:${queueId}`);
      console.log(`👨‍💼 Staff managing queue ${queueId}`);

      // Send current full queue state
      try {
        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error sending initial queue state:', err);
      }
    });

    // ─── Staff: Call next person ────────────────────────────────────────────
    socket.on('staff:call-next', async ({ queueId }) => {
      try {
        const nextEntry = await QueueEntry.findOne({
          queue: queueId,
          status: 'waiting',
        }).sort({ position: 1 });

        if (!nextEntry) {
          socket.emit('error', { message: 'No one waiting in queue' });
          return;
        }

        // Mark previous serving as completed
        await QueueEntry.updateMany(
          { queue: queueId, status: 'serving' },
          { status: 'completed', servedAt: new Date() }
        );

        // Call the next person
        nextEntry.status = 'called';
        nextEntry.calledAt = new Date();
        await nextEntry.save();

        // Update queue's currentServing
        await Queue.findByIdAndUpdate(queueId, { currentServing: nextEntry._id });

        // Notify the specific user
        io.to(`user:${nextEntry.guestId}:${queueId}`).emit('your-turn', {
          entry: nextEntry,
          message: `${nextEntry.name}, it's your turn! Please proceed to the counter.`,
        });

        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error calling next:', err);
        socket.emit('error', { message: err.message });
      }
    });

    // ─── Staff: Mark current as serving ────────────────────────────────────
    socket.on('staff:start-serving', async ({ entryId, queueId }) => {
      try {
        await QueueEntry.findByIdAndUpdate(entryId, { status: 'serving' });
        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error starting serve:', err);
      }
    });

    // ─── Staff: Complete serving ────────────────────────────────────────────
    socket.on('staff:complete', async ({ entryId, queueId }) => {
      try {
        await QueueEntry.findByIdAndUpdate(entryId, {
          status: 'completed',
          servedAt: new Date(),
        });
        await Queue.findByIdAndUpdate(queueId, { currentServing: null });
        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error completing entry:', err);
      }
    });

    // ─── Staff: Skip person ─────────────────────────────────────────────────
    socket.on('staff:skip', async ({ entryId, queueId }) => {
      try {
        const entry = await QueueEntry.findByIdAndUpdate(
          entryId,
          { status: 'skipped' },
          { new: true }
        );

        // Notify skipped user
        io.to(`user:${entry.guestId}:${queueId}`).emit('entry:skipped', {
          message: 'You were skipped. Please contact staff if this was a mistake.',
        });

        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error skipping entry:', err);
      }
    });

    // ─── Staff: Put on hold ─────────────────────────────────────────────────
    socket.on('staff:hold', async ({ entryId, queueId }) => {
      try {
        const entry = await QueueEntry.findByIdAndUpdate(
          entryId,
          { status: 'on_hold' },
          { new: true }
        );

        io.to(`user:${entry.guestId}:${queueId}`).emit('entry:on-hold', {
          message: 'Your position is temporarily on hold.',
        });

        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error holding entry:', err);
      }
    });

    // ─── Staff: Resume from hold ────────────────────────────────────────────
    socket.on('staff:resume', async ({ entryId, queueId }) => {
      try {
        await QueueEntry.findByIdAndUpdate(entryId, { status: 'waiting' });
        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error resuming entry:', err);
      }
    });

    // ─── Staff: Toggle queue status ─────────────────────────────────────────
    socket.on('staff:toggle-queue', async ({ queueId, status }) => {
      try {
        const queue = await Queue.findByIdAndUpdate(queueId, { status }, { new: true });
        io.to(`queue:${queueId}`).emit('queue:status-changed', { status: queue.status });
        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error toggling queue:', err);
      }
    });

    // ─── User: Leave queue ──────────────────────────────────────────────────
    socket.on('user:leave-queue', async ({ entryId, queueId, guestId }) => {
      try {
        await QueueEntry.findByIdAndUpdate(entryId, { status: 'left' });
        socket.leave(`user:${guestId}:${queueId}`);
        await broadcastQueueUpdate(io, queueId);
      } catch (err) {
        console.error('Error leaving queue:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketHandlers, broadcastQueueUpdate };
