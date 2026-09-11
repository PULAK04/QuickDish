import { Server } from "socket.io";
import http from "http";
import jwt from "jsonwebtoken";
import Restaurant from "../restaurant/models/Restaurant.js";

type AuthSocketUser = {
  _id: string;
  role?: string | null;
  restaurantId?: string;
};

let io: Server;

export const initSocket = (server: http.Server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
    },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Unauthorized"));

      const decoded = jwt.verify(token, process.env.JWT_SEC!) as {
        user?: AuthSocketUser;
      };

      if (!decoded?.user) return next(new Error("Unauthorized"));

      socket.data.user = decoded.user;
      next();
    } catch (error) {
      console.log("❌ Socket auth failed:", error);
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user as AuthSocketUser | undefined;
    if (!user) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${user._id}`);

    // A seller can own multiple restaurants. Join every owned restaurant room.
    if (user.role === "seller") {
      const restaurants = await Restaurant.find({ ownerId: user._id }).select("_id").lean();
      for (const restaurant of restaurants) {
        socket.join(`restaurant:${restaurant._id.toString()}`);
      }
    } else if (user.restaurantId) {
      socket.join(`restaurant:${user.restaurantId}`);
    }

    console.log(`User connected: ${user._id}`);
    console.log("Socket rooms:", [...socket.rooms]);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${user._id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
