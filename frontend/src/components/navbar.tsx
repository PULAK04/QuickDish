import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { CgShoppingCart } from "react-icons/cg";
import { BiMapPin, BiSearch } from "react-icons/bi";
import { HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { IoSparklesOutline } from "react-icons/io5";
import BrandLogo from "./BrandLogo";

const Navbar = () => {
  const { isAuth, city, quauntity, user } = useAppData();
  const currLocation = useLocation();
  const isHomePage = currLocation.pathname === "/";

  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [mode, setMode] = useState<"restaurant" | "menu">(
    searchParams.get("mode") === "menu" ? "menu" : "restaurant"
  );

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setMode(searchParams.get("mode") === "menu" ? "menu" : "restaurant");
  }, [searchParams]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const next = new URLSearchParams(searchParams);

    if (search.trim()) {
      next.set("search", search.trim());
    } else {
      next.delete("search");
    }

    next.set("mode", mode);

    setSearchParams(next, { replace: true });
  };

  const handleModeChange = (nextMode: "restaurant" | "menu") => {
    setMode(nextMode);
    setSearch("");

    const next = new URLSearchParams(searchParams);

    next.delete("search");
    next.set("mode", nextMode);

    setSearchParams(next, { replace: true });
  };

  return (
    <header className="sticky top-0 z-[1000] border-b border-white/10 bg-[#171c24]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <BrandLogo />

        <nav className="flex items-center gap-1.5 sm:gap-2">
          {isAuth && (
            <Link
              to="/orders"
              className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400 transition hover:bg-orange-500/10 hover:text-orange-400 sm:flex"
            >
              <HiOutlineClipboardDocumentList className="h-5 w-5" />
              Orders
            </Link>
          )}

          <Link
            to="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition hover:bg-orange-500/10 hover:text-orange-400"
            aria-label="Cart"
          >
            <CgShoppingCart className="h-6 w-6" />

            {quauntity > 0 && (
              <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#171c24]">
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
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-400">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </span>
              )}

              <span className="hidden max-w-24 truncate sm:inline">
                Account
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="cm-primary !rounded-xl !px-4 !py-2 text-sm"
            >
              Login
            </Link>
          )}
        </nav>
      </div>

      {isHomePage && (
        <div className="border-t border-white/10 px-4 py-3 sm:px-6">
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-[#171c24] shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition focus-within:border-orange-300 focus-within:ring-4 focus-within:ring-orange-100/10"
          >
            <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-stretch">
              {/* Search mode */}
              <div className="flex shrink-0 items-center gap-1 rounded-xl bg-[#141a22] p-1">
                <button
                  type="button"
                  onClick={() => handleModeChange("restaurant")}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:px-3.5 sm:text-sm ${mode === "restaurant"
                      ? "bg-orange-500/10 text-orange-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                >
                  Restaurants
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange("menu")}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition sm:px-3.5 sm:text-sm ${mode === "menu"
                      ? "bg-orange-500/10 text-orange-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                >
                  <IoSparklesOutline className="h-4 w-4" />
                  Food / AI Search
                </button>
              </div>

              {/* Search input */}
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 sm:px-3">
                <BiMapPin className="h-5 w-5 shrink-0 text-orange-500" />

                <span className="hidden max-w-44 truncate text-xs font-semibold text-slate-400 sm:block sm:text-sm">
                  {city}
                </span>

                <span className="hidden h-6 w-px bg-white/10 sm:block" />

                <BiSearch className="h-5 w-5 shrink-0 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    mode === "menu"
                      ? "Try: spicy vegetarian under ₹200..."
                      : "Search nearby restaurants..."
                  }
                  className="min-w-0 w-full bg-transparent py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                />

                <button
                  type="submit"
                  className="grid h-10 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 text-xs font-bold text-white shadow-sm transition hover:brightness-105"
                >
                  {mode === "menu" ? "Search food" : "Search"}
                </button>
              </div>
            </div>
          </form>

          {mode === "menu" && (
            <p className="mx-auto mt-2 max-w-4xl px-1 text-[11px] font-medium text-slate-500">
              AI search understands cravings, dietary preferences, price,
              availability and restaurant filters.
            </p>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;