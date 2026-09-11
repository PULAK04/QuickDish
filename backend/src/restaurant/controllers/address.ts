import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";

export const addAddress = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user; if (!user) return res.status(401).json({ message: "Unauthorized" });
  const { mobile, formattedAddress, latitude, longitude } = req.body;
  const lat=Number(latitude), lng=Number(longitude), mobileText=String(mobile||"").replace(/\D/g,"");
  if (!formattedAddress?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return res.status(400).json({ message: "A valid delivery location is required" });
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return res.status(400).json({ message: "Invalid delivery coordinates" });
  if (!/^\d{10}$/.test(mobileText)) return res.status(400).json({ message: "Enter a valid 10-digit mobile number" });
  const newAddress=await Address.create({userId:user._id.toString(),mobile:Number(mobileText),formattedAddress:formattedAddress.trim(),location:{type:"Point",coordinates:[lng,lat]}});
  res.status(201).json({ message: "Address added successfully", address: newAddress });
});

export const deleteAddress = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user=req.user;if(!user)return res.status(401).json({message:"Unauthorized"});const {id}=req.params;if(!id||!mongoose.Types.ObjectId.isValid(id))return res.status(400).json({message:"Invalid address id"});
  const address=await Address.findOne({_id:id,userId:user._id.toString()});if(!address)return res.status(404).json({message:"Address not found"});await address.deleteOne();res.json({message:"Address deleted successfully"});
});

export const getMyAddresses = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user=req.user;if(!user)return res.status(401).json({message:"Unauthorized"});const addresses=await Address.find({userId:user._id.toString()}).sort({createdAt:-1});res.json(addresses);
});
