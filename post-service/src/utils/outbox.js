const Outbox = require("../models/outbox");
const { publishEvent } = require("./rabbitmq");
const logger = require("./logger");

const RETRY_INTERVAL_MS = 10 * 1000;
let flushing = false;

// Publishes saved events oldest first and stops at the first failure, so events keep their order.
// shortcut: the `flushing` flag only guards one process; use a DB lock before running several post-service instances.
async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const events = await Outbox.find().sort({ _id: 1 }).limit(50).lean();
      if (events.length === 0) break;
      for (const event of events) {
        await publishEvent(event.routingKey, event.payload);
        await Outbox.deleteOne({ _id: event._id });
      }
    }
  } catch (error) {
    logger.error("Outbox publish failed, will retry", { error: error.message });
  } finally {
    flushing = false;
  }
}

// Saves the event first, so it is retried if RabbitMQ is down.
// shortcut: the post write and this write are not in one transaction (standalone MongoDB has none);
// a crash between them loses the event. Use a replica set + session.withTransaction to close that gap.
async function addOutboxEvent(routingKey, payload) {
  await Outbox.create({ routingKey, payload });
  flushOutbox();
}

function startOutboxWorker() {
  flushOutbox();
  setInterval(flushOutbox, RETRY_INTERVAL_MS);
}

module.exports = { addOutboxEvent, startOutboxWorker };
