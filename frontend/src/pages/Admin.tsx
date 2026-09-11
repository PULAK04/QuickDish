import axios from "axios";
import { useEffect, useState } from "react";
import { adminService } from "../config";
import AdminRestaurantCard from "../components/AdminRestaurantCard";
import RiderAdmin from "../components/RiderAdmin";
import BrandLogo from "../components/BrandLogo";
import { useAppData } from "../context/AppContext";
import { BiCycling, BiLogOut, BiStore } from "react-icons/bi";
import toast from "react-hot-toast";

const Admin = () => {
  const [restaurants,setRestaurants]=useState<any[]>([]); const [riders,setRiders]=useState<any[]>([]); const [loading,setLoading]=useState(true); const [tab,setTab]=useState<"restaurant"|"rider">("restaurant"); const {setIsAuth,setUser}=useAppData();
  const fetchData=async()=>{try{const headers={Authorization:`Bearer ${localStorage.getItem("token")}`};const [restaurantResponse,riderResponse]=await Promise.all([axios.get(`${adminService}/api/v1/admin/restaurant/pending`,{headers}),axios.get(`${adminService}/api/v1/admin/rider/pending`,{headers})]);setRestaurants(restaurantResponse.data.restaurants||[]);setRiders(riderResponse.data.riders||[]);}catch(error){console.error(error);toast.error("Could not load verification queue");}finally{setLoading(false);}};
  useEffect(()=>{fetchData();},[]);
  const logout=()=>{localStorage.removeItem("token");setIsAuth(false);setUser(null);toast.success("Logged out");};
  return <main className="cm-page min-h-screen pb-12"><header className="border-b border-white/10 bg-[#0f1319]/88 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6"><BrandLogo/><div className="flex items-center gap-3"><span className="hidden rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 sm:inline">Admin Console</span><button className="cm-secondary !p-2.5" onClick={logout} aria-label="Logout"><BiLogOut/></button></div></div></header>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Verification center</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-100">Keep the marketplace trusted.</h1><p className="mt-2 text-sm text-slate-400">Review restaurant and delivery partner applications before they go live.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={()=>setTab("restaurant")} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${tab==="restaurant"?"border-orange-200 bg-orange-500/10":"border-white/10 bg-[#171c24]"}`}><span className="flex items-center gap-3"><BiStore className="text-2xl text-orange-500"/><span><span className="block text-sm font-black text-slate-100">Restaurants</span><span className="text-xs text-slate-400">Pending partner checks</span></span></span><strong className="text-xl text-slate-100">{restaurants.length}</strong></button><button onClick={()=>setTab("rider")} className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${tab==="rider"?"border-orange-200 bg-orange-500/10":"border-white/10 bg-[#171c24]"}`}><span className="flex items-center gap-3"><BiCycling className="text-2xl text-orange-500"/><span><span className="block text-sm font-black text-slate-100">Riders</span><span className="text-xs text-slate-400">Pending identity checks</span></span></span><strong className="text-xl text-slate-100">{riders.length}</strong></button></div>
      <section className="mt-6">{loading?<div className="cm-card p-10 text-center text-sm text-slate-400">Loading verification queue...</div>:tab==="restaurant"?(restaurants.length?<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{restaurants.map((r)=><AdminRestaurantCard key={r._id} restaurant={r} onVerify={fetchData}/>)}</div>:<div className="cm-card p-10 text-center text-sm text-slate-400">No restaurants are waiting for verification.</div>):(riders.length?<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{riders.map((r)=><RiderAdmin key={r._id} rider={r} onVerify={fetchData}/>)}</div>:<div className="cm-card p-10 text-center text-sm text-slate-400">No riders are waiting for verification.</div>)}</section>
    </div></main>;
};
export default Admin;
