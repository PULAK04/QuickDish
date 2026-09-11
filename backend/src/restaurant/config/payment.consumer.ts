import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import { getChannel } from "../../shared/rabbitmq.js";
import { emitRealtime } from "../../shared/realtime.js";

export const startPaymentConsumer = async () => {
  const channel = getChannel();

  channel.consume(process.env.PAYMENT_QUEUE || "payment_event", async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());

      if (event.type !== "PAYMENT_SUCCESS") {
        channel.ack(msg);
        return;
      }

      const { orderId } = event.data;
      const existingOrder = await Order.findById(orderId);

      if (!existingOrder) {
        channel.ack(msg);
        return;
      }

      if (existingOrder.paymentStatus === "paid") {
        await Cart.deleteMany({ userId: existingOrder.userId, restaurantId: existingOrder.restaurantId });
        channel.ack(msg);
        return;
      }

      existingOrder.paymentStatus = "paid";
      existingOrder.status = "placed";
      await existingOrder.save();
      await Order.updateOne({ _id: existingOrder._id }, { $unset: { expiresAt: 1 } });

      // Clear the cart only after payment is confirmed.
      await Cart.deleteMany({ userId: existingOrder.userId, restaurantId: existingOrder.restaurantId });

      emitRealtime(`restaurant:${existingOrder.restaurantId}`, "order:new", { orderId: existingOrder._id });

      channel.ack(msg);
    } catch (error) {
      console.error("Payment consumer error:", error);
      // Do not acknowledge failed processing so RabbitMQ can retry it.
    }
  });
};
