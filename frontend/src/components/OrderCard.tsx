import { useEffect, useState } from "react";
import type { IOrder } from "../types";
import { ORDER_ACTIONS } from "../utils/orderflow";
import axios from "axios";
import { restaurantService } from "../config";
import toast from "react-hot-toast";
import { BiRefresh } from "react-icons/bi";

const statusStyle: Record<string,string> = {
  placed:"bg-amber-500/10 text-amber-700", accepted:"bg-orange-500/10 text-orange-700", preparing:"bg-blue-50 text-blue-700", ready_for_rider:"bg-violet-50 text-violet-700", rider_assigned:"bg-cyan-50 text-cyan-700", picked_up:"bg-fuchsia-50 text-fuchsia-700", delivered:"bg-emerald-500/10 text-emerald-700", cancelled:"bg-rose-500/10 text-rose-700"
};

const OrderCard=({order,onStatusUpdate}:{order:IOrder;onStatusUpdate?:()=>void})=>{
  const [loading,setLoading]=useState(false); const [retryVisible,setRetryVisible]=useState(false); const actions=ORDER_ACTIONS[order.status]||[];
  useEffect(()=>{if(order.status!=="ready_for_rider"){setRetryVisible(false);return;}const timer=window.setTimeout(()=>setRetryVisible(true),10000);return()=>window.clearTimeout(timer);},[order.status]);
  const updateStatus=async(status:string)=>{try{setLoading(true);setRetryVisible(false);await axios.put(`${restaurantService}/api/order/${order._id}`,{status},{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});toast.success("Order updated");onStatusUpdate?.();}catch(error){toast.error(axios.isAxiosError(error)?error.response?.data?.message||"Could not update order":"Could not update order");}finally{setLoading(false);}};
  return <article className="rounded-2xl border border-white/10 bg-[#171c24] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"><div className="flex items-center justify-between gap-3"><p className="text-sm font-black text-slate-100">Order #{order._id.slice(-6).toUpperCase()}</p><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${statusStyle[order.status]||"bg-[#1c232d] text-slate-400"}`}>{order.status.replaceAll("_"," ")}</span></div><div className="mt-4 space-y-1.5">{order.items.map((item,i)=><div key={`${item.itemId}-${i}`} className="flex justify-between gap-3 text-sm"><span className="text-slate-400">{item.name} × {item.quauntity}</span><span className="font-bold text-slate-200">₹{item.price*item.quauntity}</span></div>)}</div><div className="mt-4 flex items-end justify-between border-t border-white/10 pt-4"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payment</p><p className="mt-1 text-xs font-bold capitalize text-emerald-600">{order.paymentStatus}</p></div><div className="text-right"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</p><p className="mt-1 text-lg font-black text-slate-100">₹{order.totalAmount}</p></div></div>{order.paymentStatus==="paid"&&actions.length>0&&<div className="mt-4 flex flex-wrap gap-2">{actions.map((status)=><button key={status} disabled={loading} onClick={()=>updateStatus(status)} className="cm-primary flex-1 !rounded-xl !px-3 !py-2.5 text-xs">{loading?"Updating...":`Mark ${status.replaceAll("_"," ")}`}</button>)}</div>}{order.status==="ready_for_rider"&&retryVisible&&<button disabled={loading} className="cm-secondary mt-3 w-full !rounded-xl !py-2.5 text-xs" onClick={()=>updateStatus("ready_for_rider")}><BiRefresh/>Retry rider search</button>}</article>;
};
export default OrderCard;
