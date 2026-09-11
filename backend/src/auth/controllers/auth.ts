import User from "../model/User.js";
import jwt from "jsonwebtoken";
import TryCatch from "../middlewares/trycatch.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import { oauth2client } from "../config/googleConfig.js";
import axios from "axios";
import bcrypt from "bcryptjs";

const signToken = (user: any) => jwt.sign({ user: { _id:user._id, name:user.name, email:user.email, image:user.image, role:user.role } }, process.env.JWT_SEC as string, { expiresIn:"15d" });

export const loginUser = TryCatch(async (req,res) => {
  const {code}=req.body;
  if(!code) return res.status(400).json({message:"Authorization code is required"});
  const googleRes=await oauth2client.getToken(code); oauth2client.setCredentials(googleRes.tokens);
  if(!googleRes.tokens.access_token) return res.status(401).json({message:"Google did not return an access token"});
  const userRes=await axios.get("https://www.googleapis.com/oauth2/v1/userinfo?alt=json",{headers:{Authorization:`Bearer ${googleRes.tokens.access_token}`}});
  const {email,name,picture}=userRes.data; let user=await User.findOne({email});
  if(!user) user=await User.create({name,email,image:picture||`https://ui-avatars.com/api/?name=${encodeURIComponent(name||"QuickDish")}`,role:null});
  res.json({message:"Logged Success",token:signToken(user),user});
});
export const registerWithEmail = TryCatch(async(req,res)=>{
  const {name,email,password}=req.body as {name?:string;email?:string;password?:string};
  if(!name?.trim()||!email?.trim()||!password) return res.status(400).json({message:"Name, email and password are required"});
  const normalized=email.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return res.status(400).json({message:"Please enter a valid email address"});
  if(password.length<8) return res.status(400).json({message:"Password must be at least 8 characters"});
  if(await User.findOne({email:normalized})) return res.status(409).json({message:"An account with this email already exists. Please sign in instead."});
  const user=await User.create({name:name.trim(),email:normalized,image:`https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=f97316&color=fff`,password:await bcrypt.hash(password,12),role:null});
  res.status(201).json({message:"Account created successfully",token:signToken(user),user});
});
export const loginWithEmail = TryCatch(async(req,res)=>{
  const {email,password}=req.body as {email?:string;password?:string};
  if(!email?.trim()||!password) return res.status(400).json({message:"Email and password are required"});
  const user=await User.findOne({email:email.trim().toLowerCase()}).select("+password");
  if(!user) return res.status(401).json({message:"Invalid email or password"});
  if(!user.password) return res.status(400).json({message:"This account uses Google Sign-In. Please continue with Google."});
  if(!(await bcrypt.compare(password,user.password))) return res.status(401).json({message:"Invalid email or password"});
  const safeUser={_id:user._id,name:user.name,email:user.email,image:user.image,role:user.role};
  res.json({message:"Login successful",token:signToken(user),user:safeUser});
});
const allowedRoles=["customer","rider","seller"] as const; type Role=(typeof allowedRoles)[number];
export const addUserRole=TryCatch(async(req:AuthenticatedRequest,res)=>{
  if(!req.user?._id) return res.status(401).json({message:"Unauthorized"});
  const {role}=req.body as {role:Role}; if(!allowedRoles.includes(role)) return res.status(400).json({message:"Invalid role"});
  const current=await User.findById(req.user._id); if(!current) return res.status(404).json({message:"User not found"});
  if(current.role) return res.status(409).json({message:"Account role has already been selected"});
  const user=await User.findByIdAndUpdate(req.user._id,{role},{new:true});
  if(!user) return res.status(404).json({message:"User not found"});
  res.json({user,token:signToken(user)});
});
export const myProfile=TryCatch(async(req:AuthenticatedRequest,res)=>res.json(req.user));
