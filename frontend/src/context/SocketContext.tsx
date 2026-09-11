import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAppData } from "./AppContext";
import { realtimeService } from "../config";

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { isAuth } = useAppData();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!isAuth) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const nextSocket = io(realtimeService, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 8,
    });

    setSocket(nextSocket);

    nextSocket.on("connect_error", (error) => {
      console.error("Realtime connection error:", error.message);
    });

    return () => {
      nextSocket.disconnect();
      setSocket(null);
    };
  }, [isAuth]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
