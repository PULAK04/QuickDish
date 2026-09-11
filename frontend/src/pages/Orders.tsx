import { useCallback, useEffect, useState } from "react";
import type { IOrder } from "../types";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { restaurantService } from "../config";
import { BsArrowRight } from "react-icons/bs";
import { MdOutlineDeliveryDining } from "react-icons/md";

const ACTIVE_STATUSES = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_rider",
  "rider_assigned",
  "picked_up",
];

const statusStyles: Record<string, string> = {
  placed: "bg-amber-500/10 text-amber-700",
  accepted: "bg-orange-500/10 text-orange-700",
  preparing: "bg-blue-50 text-blue-700",
  ready_for_rider: "bg-indigo-50 text-indigo-700",
  rider_assigned: "bg-violet-50 text-violet-700",
  picked_up: "bg-fuchsia-50 text-fuchsia-700",
  delivered: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-rose-500/10 text-rose-700",
};

const Orders = () => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/myorder`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOrders(data.orders || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchOrders();
    socket.on("order:update", refresh);
    socket.on("order:rider_assigned", refresh);
    return () => {
      socket.off("order:update", refresh);
      socket.off("order:rider_assigned", refresh);
    };
  }, [socket, fetchOrders]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-[#1c232d]" />)}
        </div>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <div className="cm-card p-9">
          <MdOutlineDeliveryDining className="mx-auto h-12 w-12 text-orange-500" />
          <h1 className="mt-4 text-2xl font-black text-slate-100">No orders yet</h1>
          <p className="mt-2 text-sm text-slate-400">Once you order, live status and delivery tracking will appear here.</p>
          <button onClick={() => navigate("/")} className="cm-primary mt-6">Find food <BsArrowRight /></button>
        </div>
      </main>
    );
  }

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const completedOrders = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">Order history</p>
        <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-100">Your orders</h1>
        <p className="mt-2 text-sm text-slate-400">Track active deliveries and revisit your completed orders.</p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-100">Active orders</h2>
          <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-700">{activeOrders.length}</span>
        </div>
        {activeOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#171c24]/60 p-6 text-sm text-slate-400">No active orders right now.</div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map((order) => <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />)}
          </div>
        )}
      </section>

      <section className="mt-9">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-100">Past orders</h2>
          <span className="rounded-full bg-[#1c232d] px-2.5 py-1 text-xs font-bold text-slate-400">{completedOrders.length}</span>
        </div>
        {completedOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#171c24]/60 p-6 text-sm text-slate-400">Completed orders will appear here.</div>
        ) : (
          <div className="space-y-3">
            {completedOrders.map((order) => <OrderRow key={order._id} order={order} onClick={() => navigate(`/order/${order._id}`)} />)}
          </div>
        )}
      </section>
    </main>
  );
};

const OrderRow = ({ order, onClick }: { order: IOrder; onClick: () => void }) => (
  <button onClick={onClick} className="cm-card flex w-full flex-col gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-orange-200 sm:flex-row sm:items-center">
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-extrabold text-slate-100">{order.restaurantName || `Order #${order._id.slice(-6)}`}</p>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${statusStyles[order.status] || "bg-[#1c232d] text-slate-400"}`}>{order.status.replaceAll("_", " ")}</span>
      </div>
      <p className="mt-2 line-clamp-1 text-sm text-slate-400">{order.items.map((item) => `${item.name} × ${item.quauntity}`).join(", ")}</p>
      <p className="mt-2 text-xs text-slate-400">Order #{order._id.slice(-6)} · {new Date(order.createdAt).toLocaleDateString()}</p>
    </div>
    <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
      <div className="text-right"><p className="text-xs text-slate-400">Total</p><p className="font-black text-slate-100">₹{order.totalAmount}</p></div>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/10 text-orange-600"><BsArrowRight /></span>
    </div>
  </button>
);

export default Orders;
