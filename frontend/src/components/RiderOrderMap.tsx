import type { IOrder } from "../types";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import axios from "axios";
import { riderService } from "../config";

const riderIcon = new L.DivIcon({ html: "🛵", iconSize: [30, 30], className: "" });
const deliveryIcon = new L.DivIcon({ html: "📦", iconSize: [30, 30], className: "" });

interface Props {
  order: IOrder;
}

const Routing = ({ from, to }: { from: [number, number]; to: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    const routing = (L as typeof L & { Routing?: { control: (options: unknown) => L.Control; osrmv1: (options: unknown) => unknown } }).Routing;
    if (!routing) return;

    const control = routing.control({
      waypoints: [L.latLng(from), L.latLng(to)],
      lineOptions: { styles: [{ color: "#f97316", weight: 5 }] },
      addWaypoints: false,
      draggableWaypoints: false,
      show: false,
      createMarker: () => null,
      router: routing.osrmv1({
        serviceUrl: "https://router.project-osrm.org/route/v1",
      }),
    });

    control.addTo(map);
    return () => map.removeControl(control);
  }, [from, to, map]);

  return null;
};

const RiderOrderMap = ({ order }: Props) => {
  const [riderLocation, setRiderLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (
      order.deliveryAddress.latitude == null ||
      order.deliveryAddress.longitude == null ||
      !navigator.geolocation
    ) {
      return;
    }

    const publishLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          setRiderLocation([latitude, longitude]);

          try {
            await axios.post(
              `${riderService}/api/rider/order/location/${order._id}`,
              { latitude, longitude },
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
          } catch (error) {
            console.error("Could not broadcast rider location", error);
          }
        },
        (error) => console.error("Rider location error:", error.message),
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    };

    publishLocation();
    const interval = window.setInterval(publishLocation, 10000);
    return () => window.clearInterval(interval);
  }, [order._id, order.deliveryAddress.latitude, order.deliveryAddress.longitude]);

  if (
    !riderLocation ||
    order.deliveryAddress.latitude == null ||
    order.deliveryAddress.longitude == null
  ) {
    return null;
  }

  const deliveryLocation: [number, number] = [
    order.deliveryAddress.latitude,
    order.deliveryAddress.longitude,
  ];

  return (
    <div className="cm-card overflow-hidden p-3">
      <div className="mb-3 px-1">
        <p className="font-extrabold text-slate-100">Delivery route</p>
        <p className="text-xs text-slate-400">Your location is shared only for your currently assigned order.</p>
      </div>
      <MapContainer center={riderLocation} zoom={14} className="h-87.5 w-full rounded-2xl">
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={riderLocation} icon={riderIcon}><Popup>You (Rider)</Popup></Marker>
        <Marker position={deliveryLocation} icon={deliveryIcon}><Popup>Delivery location</Popup></Marker>
        <Routing from={riderLocation} to={deliveryLocation} />
      </MapContainer>
    </div>
  );
};

export default RiderOrderMap;
