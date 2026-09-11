import getBuffer from "../config/datauri.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import { Rider } from "../model/Rider.js";
import { uploadImage } from "../../shared/cloudinary.js";
import Order from "../../restaurant/models/Order.js";
import { emitRealtime } from "../../shared/realtime.js";

export const addRiderProfile = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user=req.user;
  if(!user) return res.status(401).json({message:"Unauthorized"});
  if(user.role!=="rider") return res.status(403).json({message:"Only riders can create rider profile"});
  if(!req.file) return res.status(400).json({message:"Rider Image is required"});
  const fileBuffer=getBuffer(req.file);
  if(!fileBuffer?.content) return res.status(500).json({message:"Failed to generate image buffer"});
  const imageUrl=await uploadImage(fileBuffer.content);
  const {phoneNumber,aadharNumber,drivingLicenseNumber,latitude,longitude}=req.body;
  if(!phoneNumber||!aadharNumber||!drivingLicenseNumber||latitude===undefined||longitude===undefined) return res.status(400).json({message:"All fields are required"});
  if(await Rider.findOne({userId:user._id})) return res.status(400).json({message:"Rider profile already exists"});
  const riderProfile=await Rider.create({userId:user._id,picture:imageUrl,phoneNumber,aadharNumber,drivingLicenseNumber,location:{type:"Point",coordinates:[Number(longitude),Number(latitude)]},isAvailble:false,isVerified:false});
  res.status(201).json({message:"Rider profile created successfully",riderProfile});
});

export const fetchMyProfile=TryCatch(async(req:AuthenticatedRequest,res)=>{ if(!req.user)return res.status(401).json({message:"Unauthorized"}); res.json(await Rider.findOne({userId:req.user._id})); });
export const toggleRiderAvailablity=TryCatch(async(req:AuthenticatedRequest,res)=>{
 const user=req.user; if(!user)return res.status(401).json({message:"Unauthorized"}); if(user.role!=="rider")return res.status(403).json({message:"Only riders can change availability"});
 const {isAvailble,latitude,longitude}=req.body; if(typeof isAvailble!=="boolean")return res.status(400).json({message:"isAvailble must be boolean"});
 if(latitude===undefined||longitude===undefined||!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude)))return res.status(400).json({message:"Valid location is required"});
 const rider=await Rider.findOne({userId:user._id}); if(!rider)return res.status(404).json({message:"Rider profile not found"});
 if(isAvailble&&!rider.isVerified)return res.status(403).json({message:"Rider is not verified"});
 rider.isAvailble=isAvailble; rider.location={type:"Point",coordinates:[Number(longitude),Number(latitude)]}; rider.lastActiveAt=new Date(); await rider.save();
 res.json({message:isAvailble?"Rider is now online":"Rider is now offline",rider});
});
export const acceptOrder=TryCatch(async(req:AuthenticatedRequest,res)=>{
 const userId=req.user?._id; const orderId=req.params.orderId; if(!userId)return res.status(401).json({message:"Please login"});
 const rider=await Rider.findOne({userId,isAvailble:true,isVerified:true}); if(!rider)return res.status(404).json({message:"Rider not found or unavailable"});
 const order=await Order.findOneAndUpdate({_id:orderId,paymentStatus:"paid",status:"ready_for_rider",riderId:null},{$set:{riderId:rider._id.toString(),riderName:req.user?.name||"Delivery Partner",riderPhone:Number(rider.phoneNumber),status:"rider_assigned"}},{new:true});
 if(!order)return res.status(409).json({message:"Order already taken or unavailable"});
 rider.isAvailble=false; await rider.save();
 emitRealtime(`user:${order.userId}`,"order:update",order); emitRealtime(`restaurant:${order.restaurantId}`,"order:update",order);
 res.json({message:"Order accepted"});
});
export const fetchMyCurrentOrder=TryCatch(async(req:AuthenticatedRequest,res)=>{
 const userId=req.user?._id; if(!userId)return res.status(401).json({message:"Please Login"});
 const rider=await Rider.findOne({userId,isVerified:true}); if(!rider)return res.status(404).json({message:"rider not found"});
 const order=await Order.findOne({riderId:rider._id.toString(),status:{$in:["rider_assigned","picked_up"]},paymentStatus:"paid"}).populate("restaurantId");
 if(!order)return res.status(404).json({message:"No active order"}); res.json({order});
});
export const updateOrderStatus=TryCatch(async(req:AuthenticatedRequest,res)=>{
 const userId=req.user?._id; if(!userId)return res.status(401).json({message:"Please Login"});
 const rider=await Rider.findOne({userId}); if(!rider)return res.status(404).json({message:"Rider profile not found"});
 const order=await Order.findOne({_id:req.params.orderId,riderId:rider._id.toString(),paymentStatus:"paid"}); if(!order)return res.status(404).json({message:"Assigned order not found"});
 if(order.status==="rider_assigned")order.status="picked_up"; else if(order.status==="picked_up")order.status="delivered"; else return res.status(400).json({message:`Rider cannot update an order in ${order.status} status`});
 await order.save(); emitRealtime(`restaurant:${order.restaurantId}`,"order:update",order); emitRealtime(`user:${order.userId}`,"order:update",order);
 res.json({message:order.status==="delivered"?"Order delivered successfully":"Order marked as picked up",status:order.status});
});
export const broadcastRiderLocation=TryCatch(async(req:AuthenticatedRequest,res)=>{
 const userId=req.user?._id; const {latitude,longitude}=req.body; if(!userId)return res.status(401).json({message:"Please login"});
 if(!Number.isFinite(Number(latitude))||!Number.isFinite(Number(longitude)))return res.status(400).json({message:"Valid rider location is required"});
 const rider=await Rider.findOne({userId,isVerified:true}); if(!rider)return res.status(403).json({message:"Verified rider profile required"});
 const order=await Order.findOne({_id:req.params.orderId,riderId:rider._id.toString(),paymentStatus:"paid",status:{$in:["rider_assigned","picked_up"]}}); if(!order)return res.status(403).json({message:"This order is not assigned to you"});
 rider.location={type:"Point",coordinates:[Number(longitude),Number(latitude)]}; rider.lastActiveAt=new Date(); await rider.save();
 emitRealtime(`user:${order.userId}`,"rider:location",{orderId:req.params.orderId,latitude:Number(latitude),longitude:Number(longitude)}); res.json({success:true});
});
