import { useEffect, useMemo, useRef, useState } from "react";
import type { IOrder } from "../types";
import { useSocket } from "../context/SocketContext";
import audio from "../assets/quack.mp3";
import axios from "axios";
import { restaurantService } from "../config";
import OrderCard from "./OrderCard";
import { BiBell, BiCheckCircle, BiReceipt, BiRupee } from "react-icons/bi";

const ACTIVE_STATUSES = ["placed", "accepted", "preparing", "ready_for_rider", "rider_assigned", "picked_up"];

const RestaurantOrders = ({ restaurantId }: { restaurantId: string }) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const { socket } = useSocket();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { audioRef.current = new Audio(audio); audioRef.current.load(); }, []);

  const unlockAudio = async () => {
    try {
      if (!audioRef.current) return;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
    } catch (error) { console.error(error); }
  };

  const fetchOrders = async () => {
    try {
      const { data } = await axios.get(`${restaurantService}/api/order/restaurant/${restaurantId}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setOrders(data.orders || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [restaurantId]);
  useEffect(() => {
    if (!socket) return;
    const refresh = () => {
      if (audioUnlocked && audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      fetchOrders();
    };
    socket.on("order:new", refresh);
    socket.on("order:rider_assigned", refresh);
    return () => { socket.off("order:new", refresh); socket.off("order:rider_assigned", refresh); };
  }, [socket, audioUnlocked, restaurantId]);

  const activeOrders = useMemo(() => orders.filter((o) => ACTIVE_STATUSES.includes(o.status)), [orders]);
  const completedOrders = useMemo(() => orders.filter((o) => o.status === "delivered"), [orders]);
  const revenue = completedOrders.reduce((sum, order) => sum + order.subtotal, 0);

  if (loading) return <p className="py-10 text-center text-sm font-medium text-slate-400">Loading orders...</p>;

  const stats = [
    { label: "Active orders", value: activeOrders.length, icon: <BiReceipt /> },
    { label: "Delivered", value: completedOrders.length, icon: <BiCheckCircle /> },
    { label: "Food revenue", value: `₹${revenue.toFixed(0)}`, icon: <BiRupee /> },
  ];

  return <div className="space-y-7">
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((stat) => <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#11161d]/70 p-4"><div className="text-xl text-orange-500">{stat.icon}</div><p className="mt-3 text-2xl font-black text-slate-100">{stat.value}</p><p className="text-xs font-semibold text-slate-400">{stat.label}</p></div>)}
    </div>

    {!audioUnlocked && <div className="flex flex-col gap-3 rounded-2xl border border-orange-400/15 bg-orange-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#171c24] p-2 text-xl text-orange-500"><BiBell /></span><div><p className="font-bold text-slate-100">Enable order sound</p><p className="text-sm text-slate-400">Hear an alert when a new paid order arrives.</p></div></div><button onClick={unlockAudio} className="cm-secondary">Enable sound</button></div>}

    <section><h3 className="text-lg font-black text-slate-100">Active orders</h3><p className="mt-1 text-sm text-slate-400">Move each order through the preparation workflow.</p><div className="mt-4 grid gap-4 lg:grid-cols-2">{activeOrders.length ? activeOrders.map((order) => <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />) : <p className="col-span-full rounded-2xl bg-[#11161d] p-6 text-center text-sm text-slate-400">No active orders right now.</p>}</div></section>
    <section><h3 className="text-lg font-black text-slate-100">Order history</h3><div className="mt-4 grid gap-4 lg:grid-cols-2">{completedOrders.length ? completedOrders.map((order) => <OrderCard key={order._id} order={order} onStatusUpdate={fetchOrders} />) : <p className="col-span-full rounded-2xl bg-[#11161d] p-6 text-center text-sm text-slate-400">No delivered orders yet.</p>}</div></section>
  </div>;
};

export default RestaurantOrders;
