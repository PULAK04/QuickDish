import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../config";
import toast from "react-hot-toast";
import { MdOutlineDeliveryDining, MdOutlineStorefront } from "react-icons/md";
import { IoFastFoodOutline } from "react-icons/io5";
import BrandLogo from "../components/BrandLogo";

const roleOptions = [
  { value: "customer", title: "Order food", description: "Discover restaurants, pay online and track deliveries.", icon: IoFastFoodOutline },
  { value: "seller", title: "Run a restaurant", description: "Manage your menu, incoming orders and restaurant status.", icon: MdOutlineStorefront },
  { value: "rider", title: "Deliver orders", description: "Go online near hotspots, accept deliveries and navigate live.", icon: MdOutlineDeliveryDining },
] as const;

type Role = (typeof roleOptions)[number]["value"] | null;

const SelectRole = () => {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(false);
  const { setUser } = useAppData();
  const navigate = useNavigate();

  const addRole = async () => {
    if (!role) return;

    try {
      setLoading(true);
      const { data } = await axios.put(
        `${authService}/api/auth/add/role`,
        { role },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      localStorage.setItem("token", data.token);
      setUser(data.user);
      toast.success("Role selected");
      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Could not save your role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-74px)] max-w-5xl items-center px-4 py-10 sm:px-6">
      <section className="w-full">
        <div className="text-center">
          <BrandLogo link={false} />
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Set up your account</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-100 sm:text-4xl">How will you use QuickDish?</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Choose the workspace that matches what you want to do. This controls the dashboard and tools you see.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {roleOptions.map(({ value, title, description, icon: Icon }) => {
            const selected = role === value;
            return (
              <button key={value} onClick={() => setRole(value)} className={`rounded-[1.5rem] border p-5 text-left transition ${selected ? "border-orange-400 bg-orange-500/10 shadow-[0_12px_30px_rgba(249,115,22,0.12)] ring-4 ring-orange-100" : "border-white/10 bg-[#171c24] shadow-sm hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"}`}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl text-xl ${selected ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white" : "bg-[#1c232d] text-slate-400"}`}><Icon /></span>
                <h2 className="mt-5 text-lg font-extrabold text-slate-100">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                <span className={`mt-5 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${selected ? "bg-orange-200 text-orange-800" : "bg-[#1c232d] text-slate-400"}`}>{selected ? "Selected" : value}</span>
              </button>
            );
          })}
        </div>

        <button disabled={!role || loading} onClick={addRole} className="cm-primary mx-auto mt-7 flex min-w-48">
          {loading ? "Saving..." : "Continue"}
        </button>
      </section>
    </main>
  );
};

export default SelectRole;
