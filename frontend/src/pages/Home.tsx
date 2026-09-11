import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useState } from "react";
import type { IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import RestaurantCard from "../components/RestaurantCard";
import { BiCurrentLocation, BiMapPin } from "react-icons/bi";
import { IoFastFoodOutline } from "react-icons/io5";
import { MdOutlineDeliveryDining } from "react-icons/md";

const Home = () => {
  const {
    location,
    loadingLocation,
    locationError,
    requestLocation,
    city,
  } = useAppData();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || "";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const getDistanceKm = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(1);
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!location) return;

      try {
        setLoading(true);
        setFetchError(null);

        const { data } = await axios.get(
          `${restaurantService}/api/restaurant/all`,
          {
            params: {
              latitude: location.latitude,
              longitude: location.longitude,
              search,
            },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setRestaurants(data.restaurants ?? []);
      } catch (error) {
        console.error(error);
        setFetchError("Could not load nearby restaurants. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [location, search]);

  return (
    <main className="pb-16">
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 sm:pt-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0a0d12] px-6 py-9 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-10 sm:py-12">
          <div className="absolute -right-14 -top-16 h-64 w-64 rounded-full bg-orange-500/100/25 blur-2xl" />
          <div className="absolute -bottom-24 right-28 h-60 w-60 rounded-full bg-rose-500/100/20 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#171c24]/10 px-3 py-1.5 text-xs font-semibold text-orange-100 backdrop-blur">
              <MdOutlineDeliveryDining className="h-4 w-4" /> Fast delivery, real-time tracking
            </span>
            <h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
              Whatever you’re craving,
              <span className="block bg-gradient-to-r from-orange-300 to-rose-300 bg-clip-text text-transparent">
                your mate is on it.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Discover verified restaurants around {city === "Locating you..." ? "you" : city}, build your cart, pay securely, and follow your order live.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
              {["Nearby picks", "Secure payments", "Live rider tracking"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-[#171c24]/5 px-3 py-2"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
          <IoFastFoodOutline className="absolute -bottom-6 -right-3 hidden h-52 w-52 rotate-[-10deg] text-white/[0.055] md:block" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-9 sm:px-6">
        {!location && !loadingLocation ? (
          <div className="cm-card mx-auto max-w-2xl p-7 text-center sm:p-9">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-orange-600">
              <BiMapPin className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold text-slate-100">
              We need your location to find food nearby
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
              {locationError ||
                "Enable location access so QuickDish can show verified restaurants in your delivery area."}
            </p>
            <button onClick={requestLocation} className="cm-primary mt-5">
              <BiCurrentLocation className="h-5 w-5" /> Try location again
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
                  Curated around you
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
                  {search ? `Results for “${search}”` : "Restaurants near you"}
                </h2>
              </div>
              {!loading && restaurants.length > 0 && (
                <span className="hidden rounded-full bg-[#171c24] px-3 py-1.5 text-xs font-semibold text-slate-400 shadow-sm sm:inline">
                  {restaurants.length} found
                </span>
              )}
            </div>

            {loading || loadingLocation ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#171c24]"
                  >
                    <div className="h-48 animate-pulse bg-[#1c232d]" />
                    <div className="space-y-3 p-4">
                      <div className="h-5 w-2/3 animate-pulse rounded bg-[#1c232d]" />
                      <div className="h-4 w-full animate-pulse rounded bg-[#1c232d]" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-[#1c232d]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="cm-card p-7 text-center text-sm text-slate-400">
                <p>{fetchError}</p>
                <button onClick={() => window.location.reload()} className="cm-secondary mt-4">
                  Retry
                </button>
              </div>
            ) : restaurants.length > 0 && location ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {restaurants.map((restaurant) => {
                  const [resLng, resLat] = restaurant.autoLocation.coordinates;
                  const distance = getDistanceKm(
                    location.latitude,
                    location.longitude,
                    resLat,
                    resLng
                  );

                  return (
                    <RestaurantCard
                      key={restaurant._id}
                      id={restaurant._id}
                      name={restaurant.name}
                      image={restaurant.image ?? ""}
                      distance={`${distance}`}
                      isOpen={restaurant.isOpen}
                      description={restaurant.description}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="cm-card py-14 text-center">
                <span className="text-4xl">🍽️</span>
                <h3 className="mt-3 text-lg font-bold text-slate-100">
                  No restaurants found
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {search
                    ? "Try a different restaurant name."
                    : "There are no verified restaurants in this area yet."}
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default Home;
