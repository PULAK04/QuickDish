import { getChannel } from "../../shared/rabbitmq.js";
export const publishPaymentSuccess = async (payload:{orderId:string;paymentId:string;provider:"razorpay"}) => { getChannel().sendToQueue(process.env.PAYMENT_QUEUE || "payment_event",Buffer.from(JSON.stringify({type:"PAYMENT_SUCCESS",data:payload})),{persistent:true}); };
