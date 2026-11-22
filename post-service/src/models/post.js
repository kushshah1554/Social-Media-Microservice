const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // outbox: events not yet published to RabbitMQ (hidden from normal queries)
    pendingEvents: {
      type: [{ routingKey: String, payload: Object }],
      select: false,
    },
    // soft delete: set together with the post.deleted event; the row is removed once the event is published
    deletedAt: {
      type: Date,
      default: null,
    },
    mediaIds: [
      {
        type: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);


postSchema.index({ content: "text" });

module.exports = mongoose.model("Post", postSchema);
