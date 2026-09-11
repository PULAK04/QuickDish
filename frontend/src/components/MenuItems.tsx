import { useState } from "react";
import type { IMenuItem } from "../types";
import { FiEyeOff } from "react-icons/fi";
import { BsCartPlus, BsEye } from "react-icons/bs";
import { BiTrash } from "react-icons/bi";
import { VscLoading } from "react-icons/vsc";
import axios from "axios";
import { restaurantService } from "../config";
import toast from "react-hot-toast";
import { useAppData } from "../context/AppContext";

interface MenuItemsProps {
  items: IMenuItem[];
  onItemDeleted: () => void;
  isSeller: boolean;
  canOrder?: boolean;
}

const MenuItems = ({ items, onItemDeleted, isSeller, canOrder = true }: MenuItemsProps) => {
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const { fetchCart } = useAppData();

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Delete this menu item?")) return;

    try {
      setLoadingItemId(itemId);
      await axios.delete(`${restaurantService}/api/item/${itemId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      toast.success("Item deleted");
      onItemDeleted();
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete item");
    } finally {
      setLoadingItemId(null);
    }
  };

  const toggleAvailability = async (itemId: string) => {
    try {
      setLoadingItemId(itemId);
      const { data } = await axios.put(
        `${restaurantService}/api/item/status/${itemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success(data.message);
      onItemDeleted();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update item status");
    } finally {
      setLoadingItemId(null);
    }
  };

  const addToCart = async (restaurantId: string, itemId: string) => {
    try {
      setLoadingItemId(itemId);
      const { data } = await axios.post(
        `${restaurantService}/api/cart/add`,
        { restaurantId, itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success(data.message);
      await fetchCart();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Could not add this item");
      } else {
        toast.error("Could not add this item");
      }
    } finally {
      setLoadingItemId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-[#11161d] px-6 py-12 text-center">
        <span className="text-3xl">🍜</span>
        <p className="mt-3 font-bold text-slate-200">No menu items yet</p>
        <p className="mt-1 text-sm text-slate-400">
          {isSeller ? "Add your first dish to start receiving orders." : "This restaurant has not added its menu yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const isLoading = loadingItemId === item._id;

        return (
          <article
            key={item._id}
            className={`group overflow-hidden rounded-[1.35rem] border bg-[#171c24] shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] ${
              item.isAvailable ? "border-white/10" : "border-white/10 opacity-75"
            }`}
          >
            <div className="flex min-h-36 gap-4 p-4">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-orange-500/10">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${
                      !item.isAvailable ? "grayscale" : ""
                    }`}
                  />
                ) : (
                  <div className="grid h-full place-items-center text-3xl">🍽️</div>
                )}
                {!item.isAvailable && (
                  <span className="absolute inset-x-2 bottom-2 rounded-lg bg-[#0a0d12]/85 px-2 py-1 text-center text-[10px] font-bold text-white">
                    Unavailable
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-extrabold text-slate-100">{item.name}</h3>
                    <span className="shrink-0 text-sm font-black text-slate-100">₹{item.price}</span>
                  </div>
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">
                    {item.description || "Freshly prepared and made to order."}
                  </p>
                </div>

                <div className="mt-auto pt-3">
                  {isSeller ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => toggleAvailability(item._id)}
                        className="cm-secondary !rounded-xl !px-3 !py-2 text-xs"
                      >
                        {isLoading ? <VscLoading className="animate-spin" /> : item.isAvailable ? <BsEye /> : <FiEyeOff />}
                        {item.isAvailable ? "Visible" : "Hidden"}
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleDelete(item._id)}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-rose-400/15 bg-rose-500/10 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50"
                        aria-label={`Delete ${item.name}`}
                      >
                        <BiTrash />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!item.isAvailable || !canOrder || isLoading}
                      onClick={() => addToCart(item.restaurantId, item._id)}
                      className="cm-primary w-full !rounded-xl !py-2.5 text-xs"
                    >
                      {isLoading ? <VscLoading className="animate-spin" /> : <BsCartPlus />}
                      {!canOrder ? "Restaurant closed" : item.isAvailable ? "Add to cart" : "Unavailable"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default MenuItems;
