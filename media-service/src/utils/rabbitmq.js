const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    logger.error("Error connecting to RabbitMQ", error);
  }
}

async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)),
  );
  logger.info("Event published to RabbitMQ", { routingKey });
}

  
async function consumeEvent(routingKey,callback)
{
   if (!channel) {
    await connectToRabbitMQ();
  }
  // named durable queue: events wait here while this service is down
  const { queue } = await channel.assertQueue(`media-service.${routingKey}`, { durable: true });
  await channel.bindQueue(queue, EXCHANGE_NAME, routingKey);
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      await callback(JSON.parse(msg.content.toString()));
    } catch (error) {
      logger.error("Error handling event", { routingKey, error: error.message });
    }
    // ack only after handling, so a crash mid-handler redelivers the event
    channel.ack(msg);
  });
  logger.info("Event consumed from RabbitMQ", { routingKey });
}

module.exports = {
  connectToRabbitMQ,
  publishEvent,
  consumeEvent,
};
