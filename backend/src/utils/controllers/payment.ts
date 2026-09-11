import { Response } from "express";
import { razorpay } from "../config/razorpay.js";
import { verifyRazorpaySignature } from "../config/verifyRazorpay.js";
import { publishPaymentSuccess } from "../config/payment.producer.js";
import Order from "../../restaurant/models/Order.js";
import { AuthenticatedRequest } from "../../shared/isAuth.js";

export const createRazorpayOrder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: "Order id is required" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== req.user?._id) return res.status(403).json({ message: "This order does not belong to you" });
    if (order.paymentStatus !== "pending") return res.status(400).json({ message: "Order is no longer awaiting payment" });
    const rpOrder = await razorpay.orders.create({ amount: Math.round(order.totalAmount * 100), currency: "INR", receipt: order._id.toString() });
    res.json({ razorpayOrderId: rpOrder.id, key: process.env.RAZORPAY_KEY_ID, amount: rpOrder.amount });
  } catch (error) { console.error("Razorpay create failed", error); res.status(500).json({ message: "Could not start Razorpay checkout" }); }
};

export const verifyRazorpayPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) return res.status(400).json({ message: "Incomplete payment details" });
    if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) return res.status(400).json({ message: "Payment verification failed" });
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userId !== req.user?._id) return res.status(403).json({ message: "This order does not belong to you" });
    if (order.paymentStatus === "paid") return res.json({ message: "Payment already verified" });
    const [gatewayOrder,gatewayPayment]=await Promise.all([razorpay.orders.fetch(razorpay_order_id),razorpay.payments.fetch(razorpay_payment_id)]);
    if(String(gatewayOrder.receipt)!==String(orderId))return res.status(400).json({message:"Payment does not match this order"});
    if(String(gatewayPayment.order_id)!==String(razorpay_order_id))return res.status(400).json({message:"Payment does not match the Razorpay order"});
    if(gatewayPayment.status!=="captured")return res.status(400).json({message:"Razorpay payment is not captured"});
    if(Number(gatewayOrder.amount)!==Math.round(order.totalAmount*100))return res.status(400).json({message:"Payment amount mismatch"});
    await publishPaymentSuccess({orderId,paymentId:razorpay_payment_id,provider:"razorpay"});
    res.json({message:"Payment verified successfully"});
  } catch(error){console.error("Razorpay verification failed",error);res.status(500).json({message:"Payment verification failed"});}
};
