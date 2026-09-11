import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";
import { HiOutlineReceiptLong } from "react-icons/hi2";
import BrandLogo from "./BrandLogo";

const Navbar = () => {
  const { isAuth, city, quauntity, user } = useAppData();
  const currLocation = useLocation();
  const isHomePage = currLocation.pathname === "/";

  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (search.trim()) next.set("search", search.trim());
      else next.delete("search");
      setSearchParams(next, { replace: true });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search]);

  return (
    <header className="sticky top-0 z-[1000] border-b border-orange-400/15/70 bg-[#171c24]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo />

        <nav className="flex items-center gap-1.5 sm:gap-2">
          {isAuth && (
            <Link
              to="/orders"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-orange-500/10 hover:text-orange-600 sm:flex"
            >
              <HiOutlineReceiptLong className="h-5 w-5" />
              Orders
            </Link>
          )}

          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition hover:bg-orange-500/10 hover:text-orange-600"
            aria-label="Cart"
          >
            <CgShoppingCart className="h-6 w-6" />
            {quauntity > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {quauntity > 99 ? "99+" : quauntity}
              </span>
            )}
          </Link>

          {isAuth ? (
            <Link
              to="/account"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#171c24] p-1.5 pr-2.5 text-sm font-semibold text-slate-300 shadow-sm transition hover:border-orange-200 hover:bg-orange-500/10"
            >
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name}
                  className="h-7 w-7 rounded-lg object-cover"
                />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-700">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              )}
              <span className="hidden max-w-24 truncate sm:inline">Account</span>
            </Link>
          ) : (
            <Link to="/login" className="cm-primary !rounded-xl !px-4 !py-2 text-sm">
              Login
            </Link>
          )}
        </nav>
      </div>

      {isHomePage && (
        <div className="border-t border-white/10 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-3xl items-stretch overflow-hidden rounded-2xl border border-white/10 bg-[#171c24] shadow-[0_10px_30px_rgba(15,23,42,0.06)] focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100">
            <div className="flex min-w-0 items-center gap-2 border-r border-white/10 px-3.5 text-slate-400 sm:min-w-44">
              <BiMapPin className="h-5 w-5 shrink-0 text-orange-500" />
              <span className="truncate text-xs font-semibold sm:text-sm">{city}</span>
            </div>
            <div className="flex flex-1 items-center gap-2 px-3.5">
              <BiSearch className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                type="search"
                placeholder="Search nearby restaurants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
