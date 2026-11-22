const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    // forget the dead connection so the next publish reconnects
    connection.on("close", () => {
      connection = null;
      channel = null;
    });
    connection.on("error", (error) =>
      logger.error("RabbitMQ connection error", { error: error.message }),
    );
    // confirm channel: the broker tells us when it has accepted each message
    channel = await connection.createConfirmChannel();

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
  if (!channel) {
    throw new Error("RabbitMQ is not connected");
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message)),
    { persistent: true },
  );
  await channel.waitForConfirms();
  logger.info("Event published to RabbitMQ", { routingKey });
}

module.exports = {
  connectToRabbitMQ,
  publishEvent,
};
