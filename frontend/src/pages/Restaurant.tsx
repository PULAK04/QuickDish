import { useEffect, useMemo, useState } from "react";
import type { IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import AddRestaurant from "../components/AddRestaurant";
import RestaurantProfile from "../components/RestaurantProfile";
import MenuItems from "../components/MenuItems";
import AddMenuItem from "../components/AddMenuItem";
import RestaurantOrders from "../components/RestaurantOrders";
import BrandLogo from "../components/BrandLogo";
import { BiDish, BiPlusCircle, BiReceipt, BiStore } from "react-icons/bi";

type SellerTab = "menu" | "add-item" | "orders";

const Restaurant = () => {
  const [restaurants, setRestaurants] = useState<IRestaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SellerTab>("orders");
  const [menuItems, setMenuItems] = useState<IMenuItem[]>([]);
  const [showCreateRestaurant, setShowCreateRestaurant] = useState(false);

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const fetchMyRestaurants = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/restaurant/my`, {
        headers: authHeaders(),
      });

      const nextRestaurants = (data.restaurants || (data.restaurant ? [data.restaurant] : [])) as IRestaurant[];
      setRestaurants(nextRestaurants);

      setSelectedRestaurantId((current) =>
        nextRestaurants.some((restaurant) => restaurant._id === current)
          ? current
          : nextRestaurants[0]?._id || ""
      );
    } catch (error) {
      console.error(error);
      setRestaurants([]);
      setSelectedRestaurantId("");
    } finally {
      setLoading(false);
    }
  };

  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant._id === selectedRestaurantId) || null,
    [restaurants, selectedRestaurantId]
  );

  const fetchMenuItems = async (restaurantId: string) => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/item/all/${restaurantId}`, {
        headers: authHeaders(),
      });
      setMenuItems(data || []);
    } catch (error) {
      console.error(error);
      setMenuItems([]);
    }
  };

  useEffect(() => {
    fetchMyRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurantId) fetchMenuItems(selectedRestaurantId);
    else setMenuItems([]);
  }, [selectedRestaurantId]);

  if (loading) {
    return (
      <div className="cm-shell grid min-h-screen place-items-center px-4">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-orange-500/20 border-t-orange-400" />
          <p className="mt-4 text-sm font-semibold text-slate-400">Loading your QuickDish workspace...</p>
        </div>
      </div>
    );
  }

  if (showCreateRestaurant || restaurants.length === 0) {
    return (
      <AddRestaurant
        fetchMyRestaurant={async () => {
          setShowCreateRestaurant(false);
          setLoading(true);
          await fetchMyRestaurants();
        }}
      />
    );
  }

  const tabs = [
    { key: "orders", label: "Orders", icon: <BiReceipt /> },
    { key: "menu", label: "Menu", icon: <BiDish /> },
    { key: "add-item", label: "Add item", icon: <BiPlusCircle /> },
  ] as const;

  return (
    <main className="cm-page min-h-screen pb-12">
      <div className="border-b border-white/10 bg-[#0f1319]/88 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-orange-400/20 bg-orange-500/100/10 px-3 py-1.5 text-xs font-bold text-orange-300">
              Seller Studio
            </span>
            <button
              className="cm-secondary !rounded-xl !px-3 !py-2 text-xs"
              onClick={() => setShowCreateRestaurant(true)}
            >
              <BiPlusCircle /> Add restaurant
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-7 sm:px-6">
        <section className="cm-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Your restaurants</p>
              <h2 className="mt-1 text-xl font-black text-slate-100">Manage multiple storefronts</h2>
              <p className="mt-1 text-sm text-slate-400">One seller account can own restaurants across different or the same location.</p>
            </div>
            <div className="flex items-center gap-2">
              <BiStore className="text-orange-400" />
              <select
                value={selectedRestaurantId}
                onChange={(event) => {
                  setSelectedRestaurantId(event.target.value);
                  setTab("orders");
                }}
                className="cm-input min-w-60 !bg-[#141a22] !py-2.5"
              >
                {restaurants.map((restaurant) => (
                  <option key={restaurant._id} value={restaurant._id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {selectedRestaurant && (
          <RestaurantProfile
            key={selectedRestaurant._id}
            restaurant={selectedRestaurant}
            onUpdate={(updated) =>
              setRestaurants((current) =>
                current.map((item) => (item._id === updated._id ? updated : item))
              )
            }
            isSeller
          />
        )}

        {selectedRestaurant && (
          <section className="cm-card overflow-hidden">
            <div className="flex overflow-x-auto border-b border-white/10 p-2">
              {tabs.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex min-w-32 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition duration-200 ${
                    tab === item.key
                      ? "bg-orange-500/100 text-white shadow-lg shadow-orange-500/15"
                      : "text-slate-400 hover:bg-[#171c24]/5 hover:text-slate-100"
                  }`}
                >
                  {item.icon}{item.label}
                </button>
              ))}
            </div>
            <div className="p-5 sm:p-6">
              {tab === "orders" && <RestaurantOrders restaurantId={selectedRestaurant._id} />}
              {tab === "menu" && (
                <MenuItems
                  items={menuItems}
                  onItemDeleted={() => fetchMenuItems(selectedRestaurant._id)}
                  isSeller
                />
              )}
              {tab === "add-item" && (
                <AddMenuItem
                  restaurantId={selectedRestaurant._id}
                  onItemAdded={() => {
                    fetchMenuItems(selectedRestaurant._id);
                    setTab("menu");
                  }}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default Restaurant;
