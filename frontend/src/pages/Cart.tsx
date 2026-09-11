import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppContext";
import { useState } from "react";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import axios from "axios";
import { restaurantService } from "../config";
import toast from "react-hot-toast";
import { VscLoading } from "react-icons/vsc";
import { BiMinus, BiPlus, BiArrowBack, BiMapPin } from "react-icons/bi";
import { TbTrash } from "react-icons/tb";
import { BsArrowRight } from "react-icons/bs";

const Cart = () => {
  const { cart, subTotal, quauntity, fetchCart } = useAppData();
  const navigate = useNavigate();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  if (!cart || cart.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="cm-card p-9">
          <span className="text-5xl">🛒</span>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-100">Your cart is waiting for a craving</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Explore nearby restaurants and add something delicious.</p>
          <button onClick={() => navigate("/")} className="cm-primary mt-6">
            Browse restaurants <BsArrowRight />
          </button>
        </div>
      </main>
    );
  }

  const restaurant = cart[0].restaurantId as IRestaurant;
  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subTotal + deliveryFee + platformFee;

  const updateQty = async (itemId: string, action: "inc" | "dec") => {
    try {
      setLoadingItemId(itemId);
      await axios.put(
        `${restaurantService}/api/cart/${action}`,
        { itemId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      await fetchCart();
    } catch (error) {
      console.error(error);
      toast.error("Could not update cart quantity");
    } finally {
      setLoadingItemId(null);
    }
  };

  const clearCart = async () => {
    if (!window.confirm("Clear every item from your cart?")) return;

    try {
      setClearingCart(true);
      await axios.delete(`${restaurantService}/api/cart/clear`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      await fetchCart();
      toast.success("Cart cleared");
    } catch (error) {
      console.error(error);
      toast.error("Could not clear your cart");
    } finally {
      setClearingCart(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-orange-600"
      >
        <BiArrowBack /> Continue browsing
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <section className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Your basket</p>
            <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-100">Review your order</h1>
          </div>

          <div className="cm-card overflow-hidden">
            <div className="border-b border-white/10 bg-gradient-to-r from-orange-50 to-rose-50 px-5 py-4 sm:px-6">
              <h2 className="text-lg font-extrabold text-slate-100">{restaurant.name}</h2>
              <p className="mt-1 flex items-start gap-1.5 text-xs leading-5 text-slate-400">
                <BiMapPin className="mt-0.5 shrink-0 text-orange-500" />
                {restaurant.autoLocation.formattedAddress}
              </p>
            </div>

            <div className="divide-y divide-slate-100 px-5 sm:px-6">
              {cart.map((cartItem: ICart) => {
                const item = cartItem.itemId as IMenuItem;
                const isLoading = loadingItemId === item._id;

                return (
                  <div key={item._id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-orange-500/10">
                        {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-2xl">🍽️</div>}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-extrabold text-slate-100">{item.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-400">₹{item.price} each</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="flex items-center rounded-xl border border-white/10 bg-[#171c24] p-1 shadow-sm">
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateQty(item._id, "dec")}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-orange-500/10 hover:text-orange-600 disabled:opacity-50"
                          aria-label={`Decrease ${item.name}`}
                        >
                          {isLoading ? <VscLoading className="animate-spin" /> : <BiMinus />}
                        </button>
                        <span className="min-w-8 text-center text-sm font-black text-slate-200">{cartItem.quauntity}</span>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => updateQty(item._id, "inc")}
                          className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-orange-500/10 hover:text-orange-600 disabled:opacity-50"
                          aria-label={`Increase ${item.name}`}
                        >
                          {isLoading ? <VscLoading className="animate-spin" /> : <BiPlus />}
                        </button>
                      </div>
                      <p className="w-20 text-right font-black text-slate-100">₹{item.price * cartItem.quauntity}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="cm-card p-5 lg:sticky lg:top-28">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-slate-100">Bill details</h2>
            <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-700">{quauntity} items</span>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-400">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-semibold text-slate-200">₹{subTotal}</span></div>
            <div className="flex justify-between"><span>Delivery fee</span><span className={`font-semibold ${deliveryFee === 0 ? "text-emerald-600" : "text-slate-200"}`}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span></div>
            <div className="flex justify-between"><span>Platform fee</span><span className="font-semibold text-slate-200">₹{platformFee}</span></div>
          </div>

          {subTotal < 250 && (
            <div className="mt-4 rounded-xl bg-orange-500/10 px-3 py-2.5 text-xs font-medium text-orange-800">
              Add ₹{250 - subTotal} more for free delivery.
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-lg font-black text-slate-100">
            <span>Total</span><span>₹{grandTotal}</span>
          </div>

          <button
            onClick={() => navigate("/checkout")}
            className="cm-primary mt-5 w-full"
            disabled={!restaurant.isOpen}
          >
            {restaurant.isOpen ? <>Proceed to checkout <BsArrowRight /></> : "Restaurant is closed"}
          </button>
          <button
            onClick={clearCart}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
            disabled={clearingCart}
          >
            {clearingCart ? <VscLoading className="animate-spin" /> : <TbTrash />}
            Clear cart
          </button>
        </aside>
      </div>
    </main>
  );
};

export default Cart;
