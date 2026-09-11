import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authService, restaurantService } from "../config";
import type { AppContextType, ICart, LocationData, User } from "../types";
import { Toaster } from "react-hot-toast";

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  const [location, setLocation] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [city, setCity] = useState("Locating you...");

  const [cart, setCart] = useState<ICart[]>([]);
  const [subTotal, setSubTotal] = useState(0);
  const [quauntity, setQuauntity] = useState(0);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setUser(null);
      setIsAuth(false);
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${authService}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(data);
      setIsAuth(true);
    } catch (error) {
      console.error("Unable to restore session", error);
      localStorage.removeItem("token");
      setUser(null);
      setIsAuth(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCart = useCallback(async () => {
    if (!user || user.role !== "customer") {
      setCart([]);
      setSubTotal(0);
      setQuauntity(0);
      return;
    }

    try {
      const { data } = await axios.get(`${restaurantService}/api/cart/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      setCart(data.cart || []);
      setSubTotal(data.subtotal || 0);
      setQuauntity(data.cartLength || 0);
    } catch (error) {
      console.error("Unable to load cart", error);
    }
  }, [user]);

  const requestLocation = useCallback(() => {
    setLocationError(null);

    if (!navigator.geolocation) {
      setLoadingLocation(false);
      setCity("Location unavailable");
      setLocationError("Your browser does not support location services.");
      return;
    }

    setLoadingLocation(true);
    setCity("Locating you...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let formattedAddress = "Current location";
        let resolvedCity = "Your location";

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "en" } }
          );

          if (res.ok) {
            const data = await res.json();
            formattedAddress = data.display_name || formattedAddress;
            resolvedCity =
              data.address?.city ||
              data.address?.town ||
              data.address?.village ||
              data.address?.state_district ||
              resolvedCity;
          }
        } catch (error) {
          console.error("Reverse geocoding failed", error);
        }

        setLocation({ latitude, longitude, formattedAddress });
        setCity(resolvedCity);
        setLoadingLocation(false);
        setLocationError(null);
      },
      (error) => {
        setLocation(null);
        setLoadingLocation(false);
        setCity("Location unavailable");

        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission is blocked. Allow location access to discover nearby restaurants."
            : "We could not determine your location. Please try again.";

        setLocationError(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5 * 60 * 1000,
      }
    );
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return (
    <AppContext.Provider
      value={{
        isAuth,
        loading,
        setIsAuth,
        setLoading,
        setUser,
        user,
        location,
        loadingLocation,
        locationError,
        requestLocation,
        city,
        cart,
        fetchCart,
        quauntity,
        subTotal,
      }}
    >
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3200,
          style: {
            borderRadius: "14px",
            padding: "12px 16px",
            color: "#e8edf5",
            background: "#171c24",
            border: "1px solid rgba(148, 163, 184, 0.14)",
          },
        }}
      />
    </AppContext.Provider>
  );
};

export const useAppData = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppData must be used within AppProvider");
  }
  return context;
};
