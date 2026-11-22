const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;
let reconnectTimer = null;

const EXCHANGE_NAME = "facebook_events";
const RECONNECT_DELAY_MS = 5000;
const subscriptions = []; // [routingKey, callback], re-bound after every reconnect

function scheduleReconnect() {
  if (reconnectTimer) return;
  logger.warn(`Reconnecting to RabbitMQ in ${RECONNECT_DELAY_MS / 1000}s`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectToRabbitMQ();
  }, RECONNECT_DELAY_MS);
}

async function subscribe(routingKey, callback) {
  const ch = channel;
  // named durable queue: events wait here while this service is down
  const { queue } = await ch.assertQueue(`media-service.${routingKey}`, { durable: true });
  await ch.bindQueue(queue, EXCHANGE_NAME, routingKey);
  await ch.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      await callback(JSON.parse(msg.content.toString()));
    } catch (error) {
      logger.error("Error handling event", { routingKey, error: error.message });
    }
    // ack only after handling, so a crash mid-handler redelivers the event
    try {
      ch.ack(msg);
    } catch (error) {
      logger.warn("Could not ack event (channel closed); it will be redelivered", { routingKey });
    }
  });
  logger.info("Listening for RabbitMQ events", { routingKey });
}

// Never throws: on failure it keeps retrying in the background.
async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    connection.on("error", (error) =>
      logger.error("RabbitMQ connection error", { error: error.message }),
    );
    connection.on("close", () => {
      connection = null;
      channel = null;
      scheduleReconnect();
    });
    channel = await connection.createChannel();
    await channel.prefetch(10);
    // durable: survives a broker restart (with the volume in docker-compose)
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    for (const [routingKey, callback] of subscriptions) {
      await subscribe(routingKey, callback);
    }
    logger.info("Connected to RabbitMQ");
  } catch (error) {
    logger.error("Error connecting to RabbitMQ", { error: error.message });
    channel = null;
    if (connection) connection.close().catch(() => {}); // its close event schedules the retry
    else scheduleReconnect();
  }
}

async function consumeEvent(routingKey, callback) {
  subscriptions.push([routingKey, callback]);
  if (channel) await subscribe(routingKey, callback);
}

module.exports = {
  connectToRabbitMQ,
  consumeEvent,
};
