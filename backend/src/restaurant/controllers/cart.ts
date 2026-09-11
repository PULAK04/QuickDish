import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Cart from "../models/Cart.js";
import MenuItems from "../models/MenuItems.js";
import Restaurant from "../models/Restaurant.js";

const MAX_ITEM_QUANTITY = 20;

export const addToCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  const { restaurantId, itemId } = req.body;
  if (!userId) return res.status(401).json({ message: "Please login" });
  if (!mongoose.Types.ObjectId.isValid(restaurantId) || !mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ message: "Invalid restaurant or item id" });

  const [restaurant, item] = await Promise.all([Restaurant.findById(restaurantId), MenuItems.findById(itemId)]);
  if (!restaurant || !restaurant.isVerified) return res.status(404).json({ message: "Restaurant is not available" });
  if (!restaurant.isOpen) return res.status(409).json({ message: "This restaurant is currently closed" });
  if (!item || item.restaurantId.toString() !== restaurantId.toString()) return res.status(400).json({ message: "This item does not belong to the selected restaurant" });
  if (!item.isAvailable) return res.status(409).json({ message: `${item.name} is currently unavailable` });

  const differentRestaurant = await Cart.findOne({ userId, restaurantId: { $ne: restaurantId } });
  if (differentRestaurant) return res.status(409).json({ message: "You can order from only one restaurant at a time. Clear your current cart first." });

  const existing = await Cart.findOne({ userId, restaurantId, itemId });
  if (existing && existing.quauntity >= MAX_ITEM_QUANTITY) return res.status(400).json({ message: `Maximum ${MAX_ITEM_QUANTITY} of one item per order` });

  const cartItem = await Cart.findOneAndUpdate(
    { userId, restaurantId, itemId },
    { $inc: { quauntity: 1 }, $setOnInsert: { userId, restaurantId, itemId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return res.json({ message: "Item added to cart", cart: cartItem });
});

export const fetchMyCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Please login" });

  const cartItems = await Cart.find({ userId }).populate("itemId").populate("restaurantId");
  const staleIds = cartItems.filter((cartItem) => !cartItem.itemId || !cartItem.restaurantId).map((cartItem) => cartItem._id);
  if (staleIds.length) await Cart.deleteMany({ _id: { $in: staleIds } });
  const validItems = cartItems.filter((cartItem) => cartItem.itemId && cartItem.restaurantId);

  let subtotal = 0; let cartLength = 0;
  for (const cartItem of validItems) {
    const item = cartItem.itemId as any;
    subtotal += Number(item.price || 0) * cartItem.quauntity;
    cartLength += cartItem.quauntity;
  }
  return res.json({ success: true, cartLength, subtotal, cart: validItems });
});

export const incrementCartItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id; const { itemId } = req.body;
  if (!userId || !mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ message: "Invalid request" });
  const cartItem = await Cart.findOne({ userId, itemId });
  if (!cartItem) return res.status(404).json({ message: "Item not found in cart" });
  if (cartItem.quauntity >= MAX_ITEM_QUANTITY) return res.status(400).json({ message: `Maximum ${MAX_ITEM_QUANTITY} of one item per order` });

  const [item, restaurant] = await Promise.all([MenuItems.findById(itemId), Restaurant.findById(cartItem.restaurantId)]);
  if (!item?.isAvailable) return res.status(409).json({ message: "This item is currently unavailable" });
  if (!restaurant?.isOpen || !restaurant.isVerified) return res.status(409).json({ message: "This restaurant is currently unavailable" });

  cartItem.quauntity += 1; await cartItem.save();
  res.json({ message: "Quantity increased", cartItem });
});

export const decrementCartItem = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id; const { itemId } = req.body;
  if (!userId || !mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ message: "Invalid request" });
  const cartItem = await Cart.findOne({ userId, itemId });
  if (!cartItem) return res.status(404).json({ message: "Item not found in cart" });
  if (cartItem.quauntity <= 1) { await Cart.deleteOne({ _id: cartItem._id }); return res.json({ message: "Item removed from cart" }); }
  cartItem.quauntity -= 1; await cartItem.save();
  res.json({ message: "Quantity decreased", cartItem });
});

export const clearCart = TryCatch(async (req: AuthenticatedRequest, res) => {
  const userId = req.user?._id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  const restaurantId = typeof req.query.restaurantId === "string" ? req.query.restaurantId : undefined;
  if (restaurantId && !mongoose.Types.ObjectId.isValid(restaurantId)) return res.status(400).json({ message: "Invalid restaurant id" });
  await Cart.deleteMany(restaurantId ? { userId, restaurantId } : { userId });
  res.json({ message: "Cart cleared successfully" });
});
