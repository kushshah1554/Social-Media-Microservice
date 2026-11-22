const mongoose = require("mongoose");

// Events waiting to be published to RabbitMQ (transactional outbox)
const outboxSchema = new mongoose.Schema(
  {
    routingKey: { type: String, required: true },
    payload: { type: Object, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Outbox", outboxSchema);
