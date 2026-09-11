import getBuffer from "../config/datauri.js";
import { uploadImage } from "../../shared/cloudinary.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import mongoose from "mongoose";

export const addRestraunt = TryCatch(async (req: AuthenticatedRequest, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const { name, description, latitude, longitude, formattedAddress, phone } =
    req.body;

  const phoneText = String(phone || "").replace(/\D/g, "");
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!name?.trim() || !/^\d{10}$/.test(phoneText) || !formattedAddress?.trim()) {
    return res.status(400).json({ message: "Name, valid 10-digit phone number and location are required" });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ message: "Invalid restaurant location" });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({
      message: "Please give image",
    });
  }

  const fileBuffer = getBuffer(file);

  if (!fileBuffer?.content) {
    return res.status(500).json({
      message: "Failed to create file buffer",
    });
  }

  const imageUrl = await uploadImage(fileBuffer.content);

  const restaurant = await Restaurant.create({
    name: name.trim(),
    description: description?.trim() || "",
    phone: Number(phoneText),
    image: imageUrl,
    ownerId: user._id,
    autoLocation: {
      type: "Point",
      coordinates: [lng, lat],
      formattedAddress: formattedAddress.trim(),
    },
    isVerified: false,
  });

  return res.status(201).json({
    message: "Restaurant created successfully",
    restaurant,
  });
});

export const fetchMyRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Please Login" });
    }

    const restaurants = await Restaurant.find({
      ownerId: req.user._id.toString(),
    }).sort({ createdAt: -1 });

    res.json({
      restaurants,
      count: restaurants.length,
      // Backward-compatible first restaurant for older clients.
      restaurant: restaurants[0] || null,
    });
  }
);

export const updateStatusRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(403).json({ message: "Please Login" });
    }

    const { status, restaurantId } = req.body as {
      status?: boolean;
      restaurantId?: string;
    };

    if (typeof status !== "boolean") {
      return res.status(400).json({ message: "Status must be boolean" });
    }

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Valid restaurant id is required" });
    }

    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      ownerId: req.user._id.toString(),
    });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    if (status && !restaurant.isVerified) {
      return res.status(403).json({
        message: "Restaurant must be verified before opening",
      });
    }

    restaurant.isOpen = status;
    await restaurant.save();

    res.json({
      message: "Restaurant status updated",
      restaurant,
    });
  }
);

export const updateRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(403).json({ message: "Please Login" });
    }

    const { name, description, restaurantId } = req.body as {
      name?: string;
      description?: string;
      restaurantId?: string;
    };

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Valid restaurant id is required" });
    }

    if (!name?.trim()) {
      return res.status(400).json({
        message: "Restaurant name is required",
      });
    }

    const restaurant = await Restaurant.findOneAndUpdate(
      { _id: restaurantId, ownerId: req.user._id.toString() },
      {
        name: name.trim(),
        description: description?.trim() || "",
      },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({
      message: "Restaurant updated",
      restaurant,
    });
  }
);

export const getNearbyRestaurant = TryCatch(async (req, res) => {
  const { latitude, longitude, radius = 5000, search = "" } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      message: "Latitude and longitude are required",
    });
  }

  const query: any = {
    isVerified: true,
  };

  if (search && typeof search === "string") {
    query.name = { $regex: search, $options: "i" };
  }

  const restaurants = await Restaurant.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [Number(longitude), Number(latitude)],
        },
        distanceField: "distance",
        maxDistance: Number(radius),
        spherical: true,
        query,
      },
    },
    {
      $sort: {
        isOpen: -1,
        distance: 1,
      },
    },
    {
      $addFields: {
        distanceKm: {
          $round: [{ $divide: ["$distance", 1000] }, 2],
        },
      },
    },
  ]);

  res.json({
    success: true,
    count: restaurants.length,
    restaurants,
  });
});

export const fetchSingleRestaurant = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const isOwner = req.user?._id?.toString() === restaurant.ownerId;
    if (!restaurant.isVerified && !isOwner) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json(restaurant);
  }
);
