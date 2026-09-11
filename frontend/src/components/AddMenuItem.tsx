import axios from "axios";
import { useState } from "react";
import { restaurantService } from "../config";
import toast from "react-hot-toast";
import { BiImageAdd, BiPlus } from "react-icons/bi";

const AddMenuItem = ({ restaurantId, onItemAdded }: { restaurantId: string; onItemAdded: () => void }) => {
  const [name, setName] = useState(""); const [description, setDescription] = useState(""); const [price, setPrice] = useState(""); const [image, setImage] = useState<File | null>(null); const [loading, setLoading] = useState(false);
  const reset = () => { setName(""); setDescription(""); setPrice(""); setImage(null); };
  const handleSubmit = async () => {
    const numericPrice = Number(price);
    if (!name.trim() || !image || !Number.isFinite(numericPrice) || numericPrice <= 0) { toast.error("Add an item name, valid price and image"); return; }
    const formData = new FormData(); formData.append("name", name.trim()); formData.append("description", description.trim()); formData.append("price", String(numericPrice)); formData.append("restaurantId", restaurantId); formData.append("file", image);
    try { setLoading(true); await axios.post(`${restaurantService}/api/item/new`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }); toast.success("Menu item added"); reset(); onItemAdded(); }
    catch (error) { toast.error(axios.isAxiosError(error) ? error.response?.data?.message || "Could not add item" : "Could not add item"); }
    finally { setLoading(false); }
  };
  return <div className="mx-auto max-w-xl"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-500">New dish</p><h2 className="mt-1 text-2xl font-black text-slate-100">Add to your menu</h2></div><div className="mt-6 space-y-4"><input className="cm-input" placeholder="Item name" value={name} onChange={(e)=>setName(e.target.value)}/><textarea className="cm-input min-h-24 resize-y" placeholder="Short description" value={description} onChange={(e)=>setDescription(e.target.value)}/><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span><input className="cm-input !pl-8" type="number" min="1" placeholder="Price" value={price} onChange={(e)=>setPrice(e.target.value)}/></div><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-[#11161d] p-4 text-sm font-semibold text-slate-400 hover:border-orange-300 hover:bg-orange-500/10"><BiImageAdd className="text-xl text-orange-500"/>{image ? image.name : "Upload food image"}<input type="file" accept="image/*" hidden onChange={(e)=>setImage(e.target.files?.[0] || null)}/></label><button disabled={loading} onClick={handleSubmit} className="cm-primary w-full"><BiPlus/>{loading ? "Adding item..." : "Add menu item"}</button></div></div>;
};
export default AddMenuItem;
