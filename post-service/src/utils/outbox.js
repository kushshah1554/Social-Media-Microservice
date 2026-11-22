const Post = require("../models/post");
const { publishEvent } = require("./rabbitmq");
const logger = require("./logger");

// Outbox: each event is stored in post.pendingEvents in the same write as the post change
// (one document = atomic, no transaction needed). This worker publishes them and removes them.

const RETRY_INTERVAL_MS = 10 * 1000;
let flushing = false;

// Publishes each post's events in order; stops at the first failure and retries later.
// shortcut: the `flushing` flag only guards one process; use a DB lock before running several post-service instances.
async function flushOutbox() {
  if (flushing) return;
  flushing = true;
  try {
    for (;;) {
      const posts = await Post.find({
        $or: [{ "pendingEvents.0": { $exists: true } }, { deletedAt: { $ne: null } }],
      })
        .select("+pendingEvents")
        .limit(50)
        .lean();
      if (posts.length === 0) break;

      for (const post of posts) {
        for (const event of post.pendingEvents || []) {
          await publishEvent(event.routingKey, event.payload);
          await Post.updateOne(
            { _id: post._id },
            { $pull: { pendingEvents: { _id: event._id } } },
          );
        }
        // soft-deleted post: remove the row now that post.deleted is out
        if (post.deletedAt) await Post.deleteOne({ _id: post._id });
      }
    }
  } catch (error) {
    logger.error("Outbox publish failed, will retry", { error: error.message });
  } finally {
    flushing = false;
  }
}

function startOutboxWorker() {
  flushOutbox();
  setInterval(flushOutbox, RETRY_INTERVAL_MS);
}

module.exports = { flushOutbox, startOutboxWorker };
