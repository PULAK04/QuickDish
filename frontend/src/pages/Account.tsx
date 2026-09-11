import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import toast from "react-hot-toast";
import { BiLogOut, BiMapPin, BiPackage } from "react-icons/bi";
import { BsChevronRight } from "react-icons/bs";

const Account = () => {
  const { user, setUser, setIsAuth } = useAppData();
  const navigate = useNavigate();

  const logoutHandler = () => {
    localStorage.removeItem("token");
    setUser(null);
    setIsAuth(false);
    navigate("/login", { replace: true });
    toast.success("Logged out successfully");
  };

  const actions = [
    { label: "Your orders", subtitle: "Track active and past orders", icon: BiPackage, onClick: () => navigate("/orders") },
    { label: "Saved addresses", subtitle: "Manage your delivery locations", icon: BiMapPin, onClick: () => navigate("/address") },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Profile</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-100">Your QuickDish account</h1>
      </div>

      <section className="cm-card overflow-hidden">
        <div className="relative overflow-hidden bg-[#0a0d12] p-6 text-white sm:p-8">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/100/25 blur-3xl" />
          <div className="relative flex items-center gap-4">
            {user?.image ? (
              <img src={user.image} alt={user.name} className="h-16 w-16 rounded-2xl border-2 border-white/20 object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 text-2xl font-black">{user?.name?.[0]?.toUpperCase() || "U"}</div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold">{user?.name}</h2>
              <p className="mt-1 truncate text-sm text-slate-300">{user?.email}</p>
              <span className="mt-2 inline-flex rounded-full bg-[#171c24]/10 px-2.5 py-1 text-[11px] font-bold capitalize text-orange-100">{user?.role || "member"}</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 p-2">
          {actions.map(({ label, subtitle, icon: Icon, onClick }) => (
            <button key={label} onClick={onClick} className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:bg-orange-500/10/70">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600"><Icon className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-extrabold text-slate-100">{label}</span><span className="mt-0.5 block text-xs text-slate-400">{subtitle}</span></span>
              <BsChevronRight className="text-slate-300" />
            </button>
          ))}

          <button onClick={logoutHandler} className="flex w-full items-center gap-4 rounded-2xl p-4 text-left transition hover:bg-rose-500/10">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600"><BiLogOut className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block font-extrabold text-slate-100">Logout</span><span className="mt-0.5 block text-xs text-slate-400">Sign out from this device</span></span>
            <BsChevronRight className="text-slate-300" />
          </button>
        </div>
      </section>
    </main>
  );
};

export default Account;
