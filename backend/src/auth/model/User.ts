import mongoose, { Document, Schema } from "mongoose";
export interface IUser extends Document { name:string; email:string; image:string; role:string|null; password?:string; }
const schema = new Schema<IUser>({
  name:{type:String,required:true,trim:true},
  email:{type:String,required:true,unique:true,lowercase:true,trim:true},
  image:{type:String,required:true},
  password:{type:String,select:false},
  role:{type:String,default:null},
},{timestamps:true});
export default mongoose.model<IUser>("User", schema);
