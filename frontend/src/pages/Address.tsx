import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { restaurantService } from "../config";
import L from "leaflet";
import { LuLocateFixed } from "react-icons/lu";
import { BiLoader, BiMapPin, BiPlus, BiTrash } from "react-icons/bi";

// Leaflet's default marker asset paths need to be defined explicitly when bundled by Vite.
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Address { _id: string; formattedAddress: string; mobile: number; }

const LocationPicker = ({ setLocation }: { setLocation: (lat: number, lng: number) => void }) => {
  useMapEvents({ click(e) { setLocation(e.latlng.lat, e.latlng.lng); } });
  return null;
};

const LocateMeButton = ({ onLocate }: { onLocate: (lat: number, lng: number) => void }) => {
  const map = useMap();
  const locateUser = () => {
    if (!navigator.geolocation) { toast.error("Geolocation is not supported by this browser"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { map.flyTo([coords.latitude, coords.longitude], 16, { animate: true }); onLocate(coords.latitude, coords.longitude); },
      () => toast.error("Allow location access to use your current position"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };
  return <button type="button" onClick={locateUser} className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-xl bg-[#171c24] px-3 py-2 text-xs font-bold text-slate-300 shadow-lg transition hover:bg-orange-500/10 hover:text-orange-700"><LuLocateFixed size={16}/>Use my location</button>;
};

const AddAddressPage = () => {
  const [addresses,setAddresses]=useState<Address[]>([]); const [loading,setLoading]=useState(true); const [adding,setAdding]=useState(false); const [deletingId,setDeletingId]=useState<string|null>(null);
  const [mobile,setMobile]=useState(""); const [formattedAddress,setFormattedAddress]=useState(""); const [latitude,setLatitude]=useState<number|null>(null); const [longitude,setLongitude]=useState<number|null>(null); const [resolving,setResolving]=useState(false);
  const headers={Authorization:`Bearer ${localStorage.getItem("token")}`};

  const fetchFormattedAddress=async(lat:number,lng:number)=>{try{setResolving(true);const res=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);if(!res.ok)throw new Error("Reverse geocoding failed");const data=await res.json();setFormattedAddress(data.display_name||`${lat.toFixed(5)}, ${lng.toFixed(5)}`);}catch{setFormattedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);toast.error("Could not resolve the street address; coordinates were kept");}finally{setResolving(false);}};
  const setLocation=(lat:number,lng:number)=>{setLatitude(lat);setLongitude(lng);fetchFormattedAddress(lat,lng);};
  const fetchAddresses=async()=>{try{const {data}=await axios.get(`${restaurantService}/api/address/all`,{headers});setAddresses(data||[]);}catch{toast.error("Failed to load saved addresses");}finally{setLoading(false);}};
  useEffect(()=>{fetchAddresses();},[]);

  const addAddress=async()=>{if(!/^\d{10}$/.test(mobile.trim())){toast.error("Enter a valid 10-digit mobile number");return;}if(!formattedAddress||latitude===null||longitude===null){toast.error("Choose a delivery point on the map");return;}try{setAdding(true);await axios.post(`${restaurantService}/api/address/new`,{formattedAddress,mobile,latitude,longitude},{headers});toast.success("Delivery address saved");setMobile("");setFormattedAddress("");setLatitude(null);setLongitude(null);await fetchAddresses();}catch(error){toast.error(axios.isAxiosError(error)?error.response?.data?.message||"Failed to save address":"Failed to save address");}finally{setAdding(false);}};
  const deleteAddress=async(id:string)=>{if(!window.confirm("Delete this saved address?"))return;try{setDeletingId(id);await axios.delete(`${restaurantService}/api/address/${id}`,{headers});toast.success("Address removed");await fetchAddresses();}catch{toast.error("Failed to delete address");}finally{setDeletingId(null);}};

  return <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Delivery setup</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-100">Where should we deliver?</h1><p className="mt-2 text-sm text-slate-400">Click the map or use your current location, then save the address.</p></div>
    <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start"><section className="cm-card overflow-hidden p-3"><div className="relative h-[430px] overflow-hidden rounded-2xl"><MapContainer center={[latitude??22.8046,longitude??86.2029]} zoom={13} className="h-full w-full" style={{height:"100%",width:"100%"}}><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors"/><LocationPicker setLocation={setLocation}/><LocateMeButton onLocate={setLocation}/>{latitude!==null&&longitude!==null&&<Marker position={[latitude,longitude]}/>}</MapContainer></div>{(formattedAddress||resolving)&&<div className="mt-3 flex items-start gap-3 rounded-2xl bg-orange-500/10 p-4"><BiMapPin className="mt-0.5 shrink-0 text-xl text-orange-500"/><div><p className="text-xs font-bold uppercase tracking-wider text-orange-700">Selected location</p><p className="mt-1 text-sm font-semibold leading-5 text-slate-300">{resolving?"Finding address...":formattedAddress}</p></div></div>}</section>
      <aside className="space-y-5"><section className="cm-card p-5"><h2 className="text-lg font-black text-slate-100">Save this address</h2><input inputMode="numeric" maxLength={10} className="cm-input mt-4" placeholder="10-digit mobile number" value={mobile} onChange={(e)=>setMobile(e.target.value.replace(/\D/g,"").slice(0,10))}/><button disabled={adding||resolving} onClick={addAddress} className="cm-primary mt-3 w-full">{adding?<BiLoader className="animate-spin"/>:<BiPlus/>}{adding?"Saving...":"Save address"}</button></section>
        <section className="cm-card p-5"><div className="flex items-center justify-between"><h2 className="text-lg font-black text-slate-100">Saved addresses</h2><span className="rounded-full bg-[#1c232d] px-2.5 py-1 text-xs font-bold text-slate-400">{addresses.length}</span></div><div className="mt-4 space-y-3">{loading?<p className="text-sm text-slate-400">Loading...</p>:addresses.length===0?<p className="rounded-xl bg-[#11161d] p-4 text-sm text-slate-400">No saved addresses yet.</p>:addresses.map((addr)=><div key={addr._id} className="flex items-start gap-3 rounded-2xl border border-white/10 p-3"><BiMapPin className="mt-1 shrink-0 text-orange-500"/><div className="min-w-0 flex-1"><p className="text-sm font-semibold leading-5 text-slate-300">{addr.formattedAddress}</p><p className="mt-1 text-xs text-slate-400">+91 {addr.mobile}</p></div><button aria-label="Delete address" onClick={()=>deleteAddress(addr._id)} disabled={deletingId===addr._id} className="rounded-xl p-2 text-rose-500 hover:bg-rose-500/10">{deletingId===addr._id?<BiLoader className="animate-spin"/>:<BiTrash/>}</button></div>)}</div></section>
      </aside></div>
  </main>;
};
export default AddAddressPage;
