import { getChannel } from "../../shared/rabbitmq.js";
import { Rider } from "../model/Rider.js";
import { emitRealtime } from "../../shared/realtime.js";

export const startOrderReadyConsumer = async () => {
  const channel = getChannel();
  const queue = process.env.ORDER_READY_QUEUE || "order_ready_queue";
  console.log("Starting to consume from:", queue);
  await channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      if (event.type !== "ORDER_READY_FOR_RIDER") { channel.ack(msg); return; }
      const { orderId, restaurantId, location } = event.data;
      const riders = await Rider.find({
        isAvailble: true,
        isVerified: true,
        location: { $near: { $geometry: location, $maxDistance: 5000 } },
      });
      console.log(`Found ${riders.length} nearby riders`);
      if (!riders.length) { channel.ack(msg); return; }
      for (const rider of riders) emitRealtime(`user:${rider.userId}`, "order:available", { orderId, restaurantId });
      channel.ack(msg);
    } catch (error) {
      console.error("OrderReady consumer error:", error);
    }
  });
};
