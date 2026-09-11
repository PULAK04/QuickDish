import { getChannel } from "../../shared/rabbitmq.js";
export const publishEvent = async (type: string, data: unknown) => { getChannel().sendToQueue(process.env.ORDER_READY_QUEUE || "order_ready_queue", Buffer.from(JSON.stringify({type,data})), {persistent:true}); };
