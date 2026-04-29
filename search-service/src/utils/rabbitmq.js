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


async function consumeEvent(routingKey,callback)
{
   if (!channel) {
    await connectToRabbitMQ();
  }
  const { queue } = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(queue, EXCHANGE_NAME, routingKey);
  channel.consume(queue, (msg) => {
    if (msg) {
      callback(JSON.parse(msg.content.toString()));
      channel.ack(msg);
    }
  });
  logger.info("Event consumed from RabbitMQ", { routingKey });
}

module.exports = {
  connectToRabbitMQ,
  consumeEvent,
};
