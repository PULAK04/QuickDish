import { useSearchParams } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useEffect, useMemo, useState } from "react";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import RestaurantCard from "../components/RestaurantCard";
import {
  BiCurrentLocation,
  BiMapPin,
  BiSearch,
} from "react-icons/bi";
import { IoFastFoodOutline } from "react-icons/io5";
import { MdOutlineDeliveryDining } from "react-icons/md";
import { BsCartPlus } from "react-icons/bs";
import { VscLoading } from "react-icons/vsc";
import toast from "react-hot-toast";

interface MenuSearchResult extends IMenuItem {
  score?: number;
}

const Home = () => {
  const {
    location,
    loadingLocation,
    locationError,
    requestLocation,
    city,
    fetchCart,
  } = useAppData();

  const [searchParams] = useSearchParams();

  const search = searchParams.get("search") || "";

  const searchMode =
    searchParams.get("mode") === "menu" ? "menu" : "restaurant";

  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);

  const [menuResults, setMenuResults] = useState<MenuSearchResult[]>([]);

  const [restaurantLookup, setRestaurantLookup] = useState<
    Record<string, IRestaurant>
  >({});

  const [summary, setSummary] = useState("");

  const [resultMode, setResultMode] = useState<
    "vector" | "keyword" | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [loadingMenu, setLoadingMenu] = useState(false);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    }),
    []
  );

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

  // ---------------------------------------------------------
  // Restaurant search
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchRestaurants = async () => {
      if (!location || searchMode !== "restaurant") return;

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
            headers: authHeaders,
          }
        );

        setRestaurants(data.restaurants ?? []);
      } catch (error) {
        console.error(error);
        setFetchError(
          "Could not load nearby restaurants. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [location, search, searchMode, authHeaders]);

  // ---------------------------------------------------------
  // RAG / AI menu search
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchMenuResults = async () => {
      if (searchMode !== "menu") {
        setMenuResults([]);
        setRestaurantLookup({});
        setSummary("");
        setResultMode(null);
        setMenuError(null);
        return;
      }

      if (!search.trim()) {
        setMenuResults([]);
        setRestaurantLookup({});
        setSummary("");
        setResultMode(null);
        setMenuError(null);
        return;
      }

      try {
        setLoadingMenu(true);
        setMenuError(null);
        setSummary("");

        const { data } = await axios.post(
          `${restaurantService}/api/menu/search`,
          {
            query: search.trim(),
            limit: 10,
            includeSummary: true,
          },
          {
            headers: authHeaders,
          }
        );

        const results: MenuSearchResult[] = data.results ?? [];

        setMenuResults(results);

        setSummary(data.summary || "");

        setResultMode(
          data.mode === "keyword" ? "keyword" : "vector"
        );

        // -----------------------------------------------------
        // Fetch restaurant information for returned dishes
        // -----------------------------------------------------
        const restaurantIds = [
          ...new Set(
            results
              .map((item) => String(item.restaurantId || ""))
              .filter(Boolean)
          ),
        ];

        const restaurantResponses = await Promise.allSettled(
          restaurantIds.map((restaurantId) =>
            axios.get(
              `${restaurantService}/api/restaurant/${restaurantId}`,
              {
                headers: authHeaders,
              }
            )
          )
        );

        const nextLookup: Record<string, IRestaurant> = {};

        restaurantResponses.forEach((response, index) => {
          if (
            response.status === "fulfilled" &&
            response.value.data
          ) {
            nextLookup[restaurantIds[index]] =
              response.value.data;
          }
        });

        setRestaurantLookup(nextLookup);
      } catch (error) {
        console.error(error);

        const message = axios.isAxiosError(error)
          ? error.response?.data?.message ||
          "Could not search the menu. Please try again."
          : "Could not search the menu. Please try again.";

        setMenuError(message);
        setMenuResults([]);
        setRestaurantLookup({});
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenuResults();
  }, [search, searchMode, authHeaders]);

  // ---------------------------------------------------------
  // Add menu result to cart
  // ---------------------------------------------------------
  const addToCart = async (
    restaurantId: string,
    itemId: string
  ) => {
    try {
      setAddingItemId(itemId);

      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        {
          restaurantId,
          itemId,
        },
        {
          headers: authHeaders,
        }
      );

      toast.success(data.message || "Added to cart");

      await fetchCart();
    } catch (error) {
      console.error(error);

      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ||
        "Could not add this item"
        : "Could not add this item";

      toast.error(message);
    } finally {
      setAddingItemId(null);
    }
  };

  const menuResultCount = menuResults.length;

  return (
    <main className="pb-16">
      {/* ---------------------------------------------------
          Hero
      --------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-7 sm:px-6 sm:pt-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0a0d12] px-6 py-9 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)] sm:px-10 sm:py-12">
          <div className="absolute -right-14 -top-16 h-64 w-64 rounded-full bg-orange-500/20 blur-2xl" />

          <div className="absolute -bottom-24 right-28 h-60 w-60 rounded-full bg-rose-500/20 blur-3xl" />

          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#171c24]/10 px-3 py-1.5 text-xs font-semibold text-orange-100 backdrop-blur">
              <MdOutlineDeliveryDining className="h-4 w-4" />
              Fast delivery, real-time tracking
            </span>

            <h1 className="mt-5 text-3xl font-black leading-tight tracking-[-0.045em] sm:text-5xl">
              Whatever you’re craving,
              <span className="block bg-gradient-to-r from-orange-300 to-rose-300 bg-clip-text text-transparent">
                your mate is on it.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Discover verified restaurants around{" "}
              {city === "Locating you..." ? "you" : city},
              find exactly what you’re craving, pay securely, and
              follow your order live.
            </p>

            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-200">
              {[
                "Nearby picks",
                "AI food search",
                "Live rider tracking",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/10 bg-[#171c24]/5 px-3 py-2"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <IoFastFoodOutline className="absolute -bottom-6 -right-3 hidden h-52 w-52 rotate-[-10deg] text-white/[0.055] md:block" />
        </div>
      </section>

      {/* ---------------------------------------------------
          Main content
      --------------------------------------------------- */}
      <section className="mx-auto max-w-7xl px-4 pt-9 sm:px-6">
        {/* Restaurant mode needs location.
            Menu/RAG mode does NOT. */}
        {searchMode === "restaurant" &&
          !location &&
          !loadingLocation ? (
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

            <button
              onClick={requestLocation}
              className="cm-primary mt-5"
            >
              <BiCurrentLocation className="h-5 w-5" />
              Try location again
            </button>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------
                Section heading
            ------------------------------------------------ */}
            {searchMode === "restaurant" ? (
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
                    Curated around you
                  </p>

                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
                    {search
                      ? `Results for “${search}”`
                      : "Restaurants near you"}
                  </h2>
                </div>

                {!loading && restaurants.length > 0 && (
                  <span className="hidden rounded-full bg-[#171c24] px-3 py-1.5 text-xs font-semibold text-slate-400 shadow-sm sm:inline">
                    {restaurants.length} found
                  </span>
                )}
              </div>
            ) : (
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
                  AI-powered food discovery
                </p>

                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-100 sm:text-3xl">
                      {search
                        ? `Food results for “${search}”`
                        : "Describe what you want to eat"}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                      Try natural language such as “spicy
                      vegetarian under ₹200” or “healthy chicken
                      food under ₹300”.
                    </p>
                  </div>

                  {menuResultCount > 0 && (
                    <span className="rounded-full bg-[#171c24] px-3 py-1.5 text-xs font-semibold text-slate-400 shadow-sm">
                      {menuResultCount} dishes
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------
                Restaurant search UI
            ------------------------------------------------ */}
            {searchMode === "restaurant" &&
              (loading || loadingLocation) ? (
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
            ) : searchMode === "restaurant" && fetchError ? (
              <div className="cm-card p-7 text-center text-sm text-slate-400">
                <p>{fetchError}</p>

                <button
                  onClick={() => window.location.reload()}
                  className="cm-secondary mt-4"
                >
                  Retry
                </button>
              </div>
            ) : searchMode === "restaurant" &&
              restaurants.length > 0 &&
              location ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {restaurants.map((restaurant) => {
                  const [resLng, resLat] =
                    restaurant.autoLocation.coordinates;

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
            ) : searchMode === "restaurant" ? (
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
            ) : loadingMenu ? (
              /* ------------------------------------------------
                 RAG loading
              ------------------------------------------------ */
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#171c24] p-4"
                  >
                    <div className="flex gap-4">
                      <div className="h-28 w-28 shrink-0 animate-pulse rounded-2xl bg-[#1c232d]" />

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="h-5 w-2/3 animate-pulse rounded bg-[#1c232d]" />
                        <div className="h-4 w-full animate-pulse rounded bg-[#1c232d]" />
                        <div className="h-4 w-1/2 animate-pulse rounded bg-[#1c232d]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : menuError ? (
              /* ------------------------------------------------
                 RAG error
              ------------------------------------------------ */
              <div className="cm-card p-7 text-center text-sm text-slate-400">
                <p>{menuError}</p>

                <p className="mt-2 text-xs text-slate-500">
                  Make sure you are signed in as a customer and
                  the menu search service is available.
                </p>
              </div>
            ) : !search.trim() ? (
              /* ------------------------------------------------
                 RAG empty state
              ------------------------------------------------ */
              <div className="cm-card border-dashed py-14 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-500/10 text-2xl">
                  🍜
                </span>

                <h3 className="mt-4 text-lg font-bold text-slate-100">
                  Search by craving, not just dish name
                </h3>

                <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Use Food / AI Search above to find dishes by
                  taste, dietary preference, price, availability,
                  or restaurant.
                </p>

                <div className="mt-5 flex flex-wrap justify-center gap-2 text-xs font-semibold text-slate-300">
                  {[
                    "spicy vegetarian under ₹200",
                    "healthy chicken under ₹300",
                    "something cheesy",
                  ].map((example) => (
                    <span
                      key={example}
                      className="rounded-full border border-white/10 bg-[#171c24] px-3 py-2"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            ) : menuResults.length === 0 ? (
              /* ------------------------------------------------
                 No RAG matches
              ------------------------------------------------ */
              <div className="cm-card py-14 text-center">
                <span className="text-4xl">🔎</span>

                <h3 className="mt-3 text-lg font-bold text-slate-100">
                  No matching dishes found
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  Try a broader craving, different price range,
                  or another food preference.
                </p>
              </div>
            ) : (
              /* ------------------------------------------------
                 RAG results
              ------------------------------------------------ */
              <>
                {summary && (
                  <div className="mb-5 rounded-2xl border border-orange-400/10 bg-orange-500/5 px-5 py-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-orange-400">
                      <BiSearch className="h-4 w-4" />
                      AI recommendation summary
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {summary}
                    </p>

                    {resultMode === "keyword" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Semantic retrieval was unavailable, so
                        QuickDish used keyword fallback for this
                        search.
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {menuResults.map((item) => {
                    const restaurantId = String(
                      item.restaurantId
                    );

                    const restaurant =
                      restaurantLookup[restaurantId];

                    const isAdding =
                      addingItemId === item._id;

                    const canOrder = Boolean(
                      restaurant?.isOpen && item.isAvailable
                    );

                    return (
                      <article
                        key={item._id}
                        className="group overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#171c24] shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_16px_36px_rgba(249,115,22,0.08)]"
                      >
                        <div className="flex min-h-36 gap-4 p-4">
                          {/* Dish image */}
                          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-orange-500/10">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                loading="lazy"
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            ) : (
                              <div className="grid h-full place-items-center text-3xl">
                                🍽️
                              </div>
                            )}

                            {!item.isAvailable && (
                              <span className="absolute inset-x-2 bottom-2 rounded-lg bg-[#0a0d12]/85 px-2 py-1 text-center text-[10px] font-bold text-white">
                                Unavailable
                              </span>
                            )}
                          </div>

                          {/* Dish details */}
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="line-clamp-2 font-extrabold text-slate-100">
                                  {item.name}
                                </h3>

                                <span className="shrink-0 text-sm font-black text-slate-100">
                                  ₹{item.price}
                                </span>
                              </div>

                              <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">
                                {item.description ||
                                  "Freshly prepared and made to order."}
                              </p>
                            </div>

                            <div className="mt-auto pt-3">
                              {/* Restaurant linked to the dish */}
                              <p className="truncate text-xs font-semibold text-orange-400">
                                {restaurant?.name ||
                                  "Restaurant unavailable"}
                              </p>

                              <p className="mt-1 truncate text-[11px] text-slate-500">
                                {restaurant?.autoLocation
                                  ?.formattedAddress ||
                                  "Restaurant location unavailable"}
                              </p>

                              {/* Add to cart */}
                              <button
                                type="button"
                                disabled={!canOrder || isAdding}
                                onClick={() =>
                                  addToCart(
                                    restaurantId,
                                    item._id
                                  )
                                }
                                className="cm-primary mt-3 w-full !rounded-xl !py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isAdding ? (
                                  <VscLoading className="animate-spin" />
                                ) : (
                                  <BsCartPlus />
                                )}

                                {!restaurant
                                  ? "Restaurant unavailable"
                                  : !restaurant.isOpen
                                    ? "Restaurant closed"
                                    : !item.isAvailable
                                      ? "Unavailable"
                                      : "Add to cart"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default Home;