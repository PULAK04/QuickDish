import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppContext";
import axios from "axios";
import { restaurantService, utilsService } from "../config";
import { useNavigate } from "react-router-dom";
import type { ICart, IMenuItem, IRestaurant } from "../types";
import toast from "react-hot-toast";
import { BiCreditCard, BiLoader, BiMapPin, BiPlus } from "react-icons/bi";
import { BsShieldCheck } from "react-icons/bs";

interface Address {
  _id: string;
  formattedAddress: string;
  mobile: number;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => Promise<void>;
  theme: { color: string };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const Checkout = () => {
  const { cart, subTotal, quauntity, fetchCart } = useAppData();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);
  const [loadingRazorpay, setLoadingRazorpay] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!cart || cart.length === 0) {
        setLoadingAddress(false);
        return;
      }

      try {
        const { data } = await axios.get(`${restaurantService}/api/address/all`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setAddresses(data || []);
        if (data?.length === 1) setSelectedAddressId(data[0]._id);
      } catch (error) {
        console.error(error);
        toast.error("Could not load delivery addresses");
      } finally {
        setLoadingAddress(false);
      }
    };

    fetchAddresses();
  }, [cart]);

  const restaurant = useMemo(
    () => (cart?.[0]?.restaurantId as IRestaurant | undefined) || null,
    [cart]
  );

  if (!cart || cart.length === 0 || !restaurant) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="cm-card p-8">
          <span className="text-4xl">🛒</span>
          <h1 className="mt-4 text-xl font-black text-slate-100">Your cart is empty</h1>
          <p className="mt-2 text-sm text-slate-400">Add some food before heading to checkout.</p>
          <button className="cm-primary mt-5" onClick={() => navigate("/")}>Browse restaurants</button>
        </div>
      </main>
    );
  }

  const deliveryFee = subTotal < 250 ? 49 : 0;
  const platformFee = 7;
  const grandTotal = subTotal + deliveryFee + platformFee;

  const createOrder = async () => {
    if (!selectedAddressId) {
      toast.error("Select a delivery address first");
      return null;
    }

    setCreatingOrder(true);
    try {
      const { data } = await axios.post(
        `${restaurantService}/api/order/new`,
        { paymentMethod: "razorpay", addressId: selectedAddressId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || "Failed to create order");
      } else {
        toast.error("Failed to create order");
      }
      return null;
    } finally {
      setCreatingOrder(false);
    }
  };

  const clearCartAfterPayment = async () => {
    try {
      await axios.delete(`${restaurantService}/api/cart/clear?restaurantId=${restaurant._id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      await fetchCart();
    } catch (error) {
      console.error("Payment succeeded but local cart refresh failed", error);
    }
  };

  const payWithRazorpay = async () => {
    if (!window.Razorpay) {
      toast.error("Razorpay checkout could not be loaded. Please refresh the page.");
      return;
    }

    try {
      setLoadingRazorpay(true);
      const order = await createOrder();
      if (!order) return;

      const { orderId, amount } = order;
      const { data } = await axios.post(`${utilsService}/api/payment/create`, { orderId });
      const { razorpayOrderId, key } = data;

      const options: RazorpayOptions = {
        key,
        amount: amount * 100,
        currency: "INR",
        name: "QuickDish",
        description: `Food order from ${restaurant.name}`,
        order_id: razorpayOrderId,
        handler: async (response) => {
          try {
            await axios.post(`${utilsService}/api/payment/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            });
            await clearCartAfterPayment();
            toast.success("Payment successful 🎉");
            navigate(`/paymentsuccess/${response.razorpay_payment_id}`, { replace: true });
          } catch (error) {
            console.error(error);
            toast.error("Payment verification failed. Contact support if money was debited.");
          }
        },
        theme: { color: "#f97316" },
      };

      new window.Razorpay(options).open();
    } catch (error) {
      console.error(error);
      toast.error("Razorpay checkout could not start");
    } finally {
      setLoadingRazorpay(false);
    }
  };


  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Secure checkout</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-100">One last step</h1>
        <p className="mt-2 text-sm text-slate-400">Choose where to deliver and how you want to pay.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_370px] lg:items-start">
        <section className="space-y-5">
          <div className="cm-card p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-500/10 text-orange-600"><BiMapPin /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Ordering from</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-100">{restaurant.name}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-400">{restaurant.autoLocation.formattedAddress}</p>
              </div>
            </div>
          </div>

          <div className="cm-card p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-500">Step 1</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-100">Delivery address</h2>
              </div>
              <button onClick={() => navigate("/address")} className="cm-secondary !rounded-xl !px-3 !py-2 text-xs"><BiPlus /> Add address</button>
            </div>

            <div className="mt-4 space-y-3">
              {loadingAddress ? (
                <div className="flex items-center gap-2 text-sm text-slate-400"><BiLoader className="animate-spin" /> Loading addresses...</div>
              ) : addresses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#11161d] p-5 text-center text-sm text-slate-400">No saved address yet. Add one to continue.</div>
              ) : (
                addresses.map((address) => (
                  <label
                    key={address._id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${
                      selectedAddressId === address._id
                        ? "border-orange-300 bg-orange-500/10 shadow-[0_0_0_3px_rgba(251,146,60,0.08)]"
                        : "border-white/10 bg-[#171c24] hover:border-orange-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery-address"
                      checked={selectedAddressId === address._id}
                      onChange={() => setSelectedAddressId(address._id)}
                      className="mt-1 accent-orange-500"
                    />
                    <div>
                      <p className="text-sm font-bold leading-5 text-slate-200">{address.formattedAddress}</p>
                      <p className="mt-1 text-xs text-slate-400">Mobile: {address.mobile}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="cm-card p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-orange-500">Step 2</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-100">Payment method</h2>
            <p className="mt-1 text-sm text-slate-400">Your cart stays intact if a payment is cancelled or fails.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                disabled={!selectedAddressId || loadingRazorpay || creatingOrder}
                onClick={payWithRazorpay}
                className="flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span><span className="block text-sm font-extrabold text-blue-900">Razorpay</span><span className="mt-1 block text-xs text-blue-600">UPI, cards & more</span></span>
                {loadingRazorpay ? <BiLoader className="animate-spin text-blue-600" /> : <BiCreditCard className="h-6 w-6 text-blue-600" />}
              </button>


            </div>

            <p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400"><BsShieldCheck className="text-emerald-500" /> Payment is verified server-side before your order is confirmed.</p>
          </div>
        </section>

        <aside className="cm-card p-5 lg:sticky lg:top-28">
          <h2 className="text-lg font-extrabold text-slate-100">Order summary</h2>
          <div className="mt-4 max-h-56 space-y-3 overflow-auto pr-1">
            {cart.map((cartItem: ICart) => {
              const item = cartItem.itemId as IMenuItem;
              return (
                <div className="flex justify-between gap-3 text-sm" key={cartItem._id}>
                  <span className="min-w-0 text-slate-400"><span className="font-semibold text-slate-200">{item.name}</span> × {cartItem.quauntity}</span>
                  <span className="shrink-0 font-bold text-slate-200">₹{item.price * cartItem.quauntity}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-sm text-slate-400">
            <div className="flex justify-between"><span>Items ({quauntity})</span><span className="font-semibold text-slate-200">₹{subTotal}</span></div>
            <div className="flex justify-between"><span>Delivery fee</span><span className={`font-semibold ${deliveryFee === 0 ? "text-emerald-600" : "text-slate-200"}`}>{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span></div>
            <div className="flex justify-between"><span>Platform fee</span><span className="font-semibold text-slate-200">₹{platformFee}</span></div>
          </div>
          {subTotal < 250 && <p className="mt-4 rounded-xl bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-800">Add ₹{250 - subTotal} more to unlock free delivery.</p>}
          <div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-lg font-black text-slate-100"><span>Total</span><span>₹{grandTotal}</span></div>
        </aside>
      </div>
    </main>
  );
};

export default Checkout;
