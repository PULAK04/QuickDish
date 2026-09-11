import { useState } from "react";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import axios from "axios";
import { restaurantService } from "../config";
import { BiImageAdd, BiMapPin, BiStore } from "react-icons/bi";
import BrandLogo from "./BrandLogo";

const AddRestaurant = ({ fetchMyRestaurant }: { fetchMyRestaurant: () => Promise<void> }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { loadingLocation, location, locationError, requestLocation } = useAppData();

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !image || !location) { toast.error("Name, phone, image and location are required"); return; }
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description.trim());
    formData.append("latitude", String(location.latitude));
    formData.append("longitude", String(location.longitude));
    formData.append("formattedAddress", location.formattedAddress);
    formData.append("file", image);
    formData.append("phone", phone);
    try {
      setSubmitting(true);
      await axios.post(`${restaurantService}/api/restaurant/new`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      toast.success("Restaurant submitted for verification");
      await fetchMyRestaurant();
    } catch (error) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.message || "Could not add restaurant" : "Could not add restaurant");
    } finally { setSubmitting(false); }
  };

  return <main className="cm-page min-h-screen pb-12">
    <div className="border-b border-white/10 bg-[#0f1319]/88 backdrop-blur"><div className="mx-auto max-w-6xl px-4 py-4 sm:px-6"><BrandLogo /></div></div>
    <div className="mx-auto grid max-w-6xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      <section className="rounded-[2rem] bg-[#0a0d12] p-7 text-white"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/100 text-2xl"><BiStore /></span><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-orange-300">QuickDish Seller</p><h1 className="mt-2 text-3xl font-black tracking-tight">Bring your restaurant online.</h1><p className="mt-3 text-sm leading-6 text-slate-300">Create the storefront, add your menu, receive paid orders in real time, and manage preparation from one dashboard.</p></section>
      <section className="cm-card p-6 sm:p-8"><h2 className="text-2xl font-black text-slate-100">Restaurant details</h2><p className="mt-1 text-sm text-slate-400">Your restaurant becomes discoverable after admin verification.</p>
        <div className="mt-6 space-y-4"><input className="cm-input" placeholder="Restaurant name" value={name} onChange={(e)=>setName(e.target.value)} /><input className="cm-input" inputMode="tel" placeholder="Contact number" value={phone} onChange={(e)=>setPhone(e.target.value)} /><textarea className="cm-input min-h-28 resize-y" placeholder="Tell customers what makes your food special" value={description} onChange={(e)=>setDescription(e.target.value)} />
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#11161d] p-4 text-sm font-semibold text-slate-400 transition hover:border-orange-300 hover:bg-orange-500/10"><BiImageAdd className="text-xl text-orange-500"/><span className="min-w-0 truncate">{image ? image.name : "Upload restaurant cover image"}</span><input type="file" accept="image/*" hidden onChange={(e)=>setImage(e.target.files?.[0] || null)}/></label>
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#11161d] p-4"><BiMapPin className="mt-0.5 shrink-0 text-xl text-orange-500"/><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Detected location</p><p className="mt-1 text-sm font-semibold text-slate-300">{loadingLocation ? "Finding your location..." : location?.formattedAddress || locationError || "Location unavailable"}</p>{!loadingLocation && !location && <button onClick={requestLocation} className="mt-2 text-xs font-bold text-orange-600">Try location again</button>}</div></div>
          <button className="cm-primary w-full" disabled={submitting || loadingLocation} onClick={handleSubmit}>{submitting ? "Submitting..." : "Create restaurant"}</button>
        </div>
      </section>
    </div>
  </main>;
};
export default AddRestaurant;
