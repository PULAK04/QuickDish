import mongoose from "mongoose";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../../restaurant/models/Restaurant.js";
import { Rider } from "../../rider/model/Rider.js";

export const getPendingRestaurant = TryCatch(async (_req, res) => {
  const restaurants = await Restaurant.find({ isVerified: false }).sort({
    createdAt: -1,
  });

  res.json({
    count: restaurants.length,
    restaurants,
  });
});

export const getPendingRiders = TryCatch(async (_req, res) => {
  const riders = await Rider.find({ isVerified: false }).sort({
    createdAt: -1,
  });

  res.json({
    count: riders.length,
    riders,
  });
});

export const verifyRestaurant = TryCatch(async (req, res) => {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : undefined;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid restaurant id",
    });
  }

  const restaurant = await Restaurant.findByIdAndUpdate(
    id,
    { isVerified: true },
    { new: true }
  );

  if (!restaurant) {
    return res.status(404).json({
      message: "Restaurant not found",
    });
  }

  res.json({
    message: "Restaurant verified successfully",
    restaurant,
  });
});

export const verifyRider = TryCatch(async (req, res) => {
  const id =
    typeof req.params.id === "string"
      ? req.params.id
      : undefined;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      message: "Invalid rider id",
    });
  }

  const rider = await Rider.findByIdAndUpdate(
    id,
    { isVerified: true },
    { new: true }
  );

  if (!rider) {
    return res.status(404).json({
      message: "Rider not found",
    });
  }

  res.json({
    message: "Rider verified successfully",
    rider,
  });
});