import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import cloudinary from "cloudinary";
import connectDB from "./restaurant/config/db.js";
import { connectRabbitMQ } from "./shared/rabbitmq.js";
import { initSocket } from "./realtime/socket.js";
import authRoute from "./auth/routes/auth.js";
import restaurantRoutes from "./restaurant/routes/restaraunt.js";
import itemRoutes from "./restaurant/routes/menuitem.js";
import cartRoutes from "./restaurant/routes/cart.js";
import addressRoutes from "./restaurant/routes/address.js";
import orderRoutes from "./restaurant/routes/order.js";
import riderRoutes from "./rider/routes/rider.js";
import adminRoutes from "./admin/routes/admin.js";
import paymentRoutes from "./utils/routes/payment.js";
import menuSearchRoutes from "./restaurant/routes/menuSearch.js";
import { startPaymentConsumer } from "./restaurant/config/payment.consumer.js";
import { startOrderReadyConsumer } from "./rider/config/orderReady.consumer.js";

dotenv.config();
const app=express(); const server=http.createServer(app);
const PORT=Number(process.env.PORT||5000); const frontendUrl=process.env.FRONTEND_URL||"http://localhost:5173";
app.use(cors({origin:frontendUrl})); app.use(express.json({limit:"50mb"})); app.use(express.urlencoded({limit:"50mb",extended:true}));
app.get("/",(_req,res)=>res.json({name:"QuickDish",architecture:"modular-monolith",status:"running"}));
app.get("/health",(_req,res)=>res.status(200).json({status:"ok",service:"QuickDish Monolith"}));
app.use("/api/auth",authRoute); app.use("/api/restaurant",restaurantRoutes); app.use("/api/item",itemRoutes); app.use("/api/cart",cartRoutes); app.use("/api/address",addressRoutes); app.use("/api/order",orderRoutes); app.use("/api/rider",riderRoutes); app.use("/api/v1",adminRoutes); app.use("/api/payment",paymentRoutes);
app.use("/api/menu",menuSearchRoutes);

const configureCloudinary=()=>{ const {CLOUD_NAME,CLOUD_API_KEY,CLOUD_SECRET_KEY}=process.env; if(!CLOUD_NAME||!CLOUD_API_KEY||!CLOUD_SECRET_KEY)throw new Error("Missing Cloudinary environment variables"); cloudinary.v2.config({cloud_name:CLOUD_NAME,api_key:CLOUD_API_KEY,api_secret:CLOUD_SECRET_KEY}); };

const start=async()=>{ configureCloudinary(); await connectDB(); await connectRabbitMQ(); initSocket(server); await startPaymentConsumer(); await startOrderReadyConsumer(); server.listen(PORT,"0.0.0.0",()=>console.log(`QuickDish monolith is running on port ${PORT}`)); };
start().catch(error=>{console.error("QuickDish failed to start",error);process.exit(1);});
