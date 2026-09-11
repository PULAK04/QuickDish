import amqp from "amqplib";

let channel: amqp.Channel | null = null;
let connection: amqp.ChannelModel | null = null;

export const connectRabbitMQ = async () => {
  if (channel) return channel;
  const url = process.env.RABBITMQ_URL;
  if (!url) throw new Error("RABBITMQ_URL is not configured");
  connection = await amqp.connect(url);
  channel = await connection.createChannel();
  await channel.assertQueue(process.env.PAYMENT_QUEUE || "payment_event", { durable: true });
  await channel.assertQueue(process.env.ORDER_READY_QUEUE || "order_ready_queue", { durable: true });
  await channel.assertQueue(process.env.RIDER_QUEUE || "rider_queue", { durable: true });
  console.log("🐇 RabbitMQ connected");
  return channel;
};

export const getChannel = () => {
  if (!channel) throw new Error("RabbitMQ channel is not initialized");
  return channel;
};
