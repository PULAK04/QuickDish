import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import MenuItems from "../components/MenuItems";
import { BiArrowBack, BiMapPin, BiTimeFive } from "react-icons/bi";

const RestaurantPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<IRestaurant | null>(null);
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const loadRestaurant = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };
        const [restaurantResponse, menuResponse] = await Promise.all([
          axios.get(`${restaurantService}/api/restaurant/${id}`, { headers }),
          axios.get(`${restaurantService}/api/item/all/${id}`, { headers }),
        ]);
        setRestaurant(restaurantResponse.data || null);
        setMenuItems(menuResponse.data || []);
      } catch (error) {
        console.error(error);
        setRestaurant(null);
      } finally {
        setLoading(false);
      }
    };

    loadRestaurant();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="h-72 animate-pulse rounded-[2rem] bg-[#1c232d]" />
        <div className="mt-7 h-8 w-44 animate-pulse rounded bg-[#1c232d]" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="cm-card p-8">
          <span className="text-4xl">🍽️</span>
          <h1 className="mt-4 text-xl font-black text-slate-100">Restaurant not found</h1>
          <p className="mt-2 text-sm text-slate-400">It may have been removed or is currently unavailable.</p>
          <button className="cm-secondary mt-5" onClick={() => navigate(-1)}>
            <BiArrowBack /> Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-orange-600"
      >
        <BiArrowBack /> Back to restaurants
      </button>

      <section className="relative overflow-hidden rounded-[2rem] bg-[#0a0d12] shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
        {restaurant.image && (
          <img src={restaurant.image} alt={restaurant.name} className="h-72 w-full object-cover sm:h-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${restaurant.isOpen ? "bg-emerald-500/100" : "bg-rose-500/100"}`}>
                  {restaurant.isOpen ? "Open now" : "Closed"}
                </span>
                <span className="rounded-full bg-[#171c24]/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">Verified partner</span>
              </div>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">{restaurant.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">{restaurant.description || "Fresh food prepared for your next craving."}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5"><BiMapPin className="text-orange-300" />{restaurant.autoLocation.formattedAddress || "Location unavailable"}</span>
                <span className="inline-flex items-center gap-1.5"><BiTimeFive className="text-orange-300" />Live delivery tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Menu</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-100">Pick something delicious</h2>
          {!restaurant.isOpen && <p className="mt-2 text-sm font-medium text-rose-600">This restaurant is currently closed. You can browse the menu, but ordering is unavailable.</p>}
        </div>
        <MenuItems isSeller={false} canOrder={restaurant.isOpen} items={menuItems} onItemDeleted={() => {}} />
      </section>
    </main>
  );
};

export default RestaurantPage;
