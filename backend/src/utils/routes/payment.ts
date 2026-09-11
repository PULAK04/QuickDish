import express from "express";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controllers/payment.js";
import { isAuth } from "../../shared/isAuth.js";
const router=express.Router();
router.post("/create",isAuth,createRazorpayOrder);
router.post("/verify",isAuth,verifyRazorpayPayment);
export default router;
