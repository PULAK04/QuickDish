import getBuffer from "../config/datauri.js";
import { uploadImage } from "../../shared/cloudinary.js";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Restaurant from "../models/Restaurant.js";
import MenuItems from "../models/MenuItems.js";
import { generateMenuItemEmbedding } from "../services/menuEmbedding.js";
import { searchMenuItems } from "../services/menuSearch.js";
import mongoose from "mongoose";

const getOwnedRestaurant = async (userId: string, restaurantId: string) => {
  if (!mongoose.Types.ObjectId.isValid(restaurantId)) return null;
  return Restaurant.findOne({ _id: restaurantId, ownerId: userId });
};

export const addMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { name, description, price, restaurantId } = req.body;
  const numericPrice = Number(price);

  if (
    !name?.trim() ||
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    !restaurantId
  ) {
    return res.status(400).json({
      message: "Restaurant, item name and a valid positive price are required",
    });
  }

  const restaurant = await getOwnedRestaurant(req.user._id.toString(), restaurantId);
  if (!restaurant) {
    return res.status(404).json({
      message: "Restaurant not found or you do not own it",
    });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "Please give image" });
  }

  const fileBuffer = getBuffer(file);
  if (!fileBuffer?.content) {
    return res.status(500).json({ message: "Failed to create file buffer" });
  }

  const imageUrl = await uploadImage(fileBuffer.content);
  const cleanName = name.trim();
  const cleanDescription = description?.trim() || "";

  let embedding: number[] | undefined;
  try {
    embedding = await generateMenuItemEmbedding(cleanName, cleanDescription);
  } catch (error) {
    // Indexing failure must not prevent the menu item from being created.
    console.error("Menu embedding generation failed during create:", error);
  }

  const item = await MenuItems.create({
    name: cleanName,
    description: cleanDescription,
    price: numericPrice,
    restaurantId: restaurant._id,
    image: imageUrl,
    ...(embedding ? { embedding, embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2", embeddingUpdatedAt: new Date() } : {}),
  });

  res.status(201).json({
    message: "Item Added Successfully",
    item,
  });
});

export const updateMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { itemId } = req.params;
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: "Invalid item id" });
  }

  const item = await MenuItems.findById(itemId);
  if (!item) {
    return res.status(404).json({ message: "No item found" });
  }

  const restaurant = await Restaurant.findOne({
    _id: item.restaurantId,
    ownerId: req.user._id,
  });

  if (!restaurant) {
    return res.status(403).json({
      message: "You can only update items from your own restaurant",
    });
  }

  const { name, description, price, isAvailable } = req.body;
  let contentChanged = false;

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }
    if (item.name !== name.trim()) contentChanged = true;
    item.name = name.trim();
  }

  if (description !== undefined) {
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    if (item.description !== cleanDescription) contentChanged = true;
    item.description = cleanDescription;
  }

  if (price !== undefined) {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({ message: "Price must be a positive number" });
    }
    item.price = numericPrice;
  }

  if (isAvailable !== undefined) {
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be boolean" });
    }
    item.isAvailable = isAvailable;
  }

  if (contentChanged) {
    try {
      const embedding = await generateMenuItemEmbedding(item.name, item.description || "");
      item.embedding = embedding;
      item.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
      item.embeddingUpdatedAt = new Date();
    } catch (error) {
      console.error("Menu embedding generation failed during update:", error);
      // Preserve existing embedding rather than deleting a previously working vector.
    }
  }

  await item.save();

  res.json({
    message: "Menu item updated successfully",
    item,
  });
});

export const getAllItems = TryCatch(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Valid restaurant id is required" });
  }

  const items = await MenuItems.find({ restaurantId: id }).select("-embedding");
  res.json(items);
});

export const deleteMenuItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { itemId } = req.params;
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: "Invalid item id" });
  }

  const item = await MenuItems.findById(itemId);
  if (!item) {
    return res.status(404).json({ message: "No item found" });
  }

  const restaurant = await Restaurant.findOne({
    _id: item.restaurantId,
    ownerId: req.user._id,
  });

  if (!restaurant) {
    return res.status(404).json({ message: "NO Restaurant found" });
  }

  await item.deleteOne();

  res.json({ message: "Menu item deleted successfully" });
});

export const toggleMenuItemAvailability = TryCatch(async (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Please login" });
  }

  const { itemId } = req.params;
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ message: "Invalid item id" });
  }

  const item = await MenuItems.findById(itemId);
  if (!item) {
    return res.status(404).json({ message: "No item found" });
  }

  const restaurant = await Restaurant.findOne({
    _id: item.restaurantId,
    ownerId: req.user._id,
  });

  if (!restaurant) {
    return res.status(404).json({ message: "NO Restaurant found" });
  }

  item.isAvailable = !item.isAvailable;
  await item.save();

  res.json({
    message: `Item Marked as ${item.isAvailable ? "available" : "unavailable"}`,
    item,
  });
});

export const searchMenu = TryCatch(async (req, res) => {
  const {
    query,
    limit = 10,
    restaurantId,
    includeSummary = false,
  } = req.body as {
    query?: string;
    limit?: number;
    restaurantId?: string;
    includeSummary?: boolean;
  };

  if (!query?.trim()) {
    return res.status(400).json({
      message: "A natural-language menu query is required",
    });
  }

  if (restaurantId && !mongoose.Types.ObjectId.isValid(restaurantId)) {
    return res.status(400).json({ message: "Invalid restaurant id" });
  }

  const result = await searchMenuItems({
    query: query.trim(),
    limit,
    restaurantId,
    includeSummary: Boolean(includeSummary),
  });

  res.json({
    success: true,
    query: query.trim(),
    ...result,
  });
});
