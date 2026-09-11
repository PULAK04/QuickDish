import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middlewares/isAuth.js";
import TryCatch from "../middlewares/trycatch.js";
import Address from "../models/Address.js";
import Cart from "../models/Cart.js";
import { IMenuItem } from "../models/MenuItems.js";
import Order from "../models/Order.js";
import Restaurant, { IRestaurant } from "../models/Restaurant.js";
import { publishEvent } from "../config/order.publisher.js";
import { emitRealtime } from "../../shared/realtime.js";

const PAYMENT_METHODS = ["razorpay"] as const;

const SELLER_TRANSITIONS: Record<string, string[]> = {
  placed: ["accepted"],
  accepted: ["preparing"],
  preparing: ["ready_for_rider"],
  ready_for_rider: ["ready_for_rider"],
};

const getDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );

  return +(R * c).toFixed(2);
};

export const createOrder = TryCatch(
  async (req: AuthenticatedRequest, res) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { paymentMethod, addressId } = req.body;

    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method",
      });
    }

    if (
      !addressId ||
      !mongoose.Types.ObjectId.isValid(addressId)
    ) {
      return res.status(400).json({
        message: "A valid address is required",
      });
    }

    const address = await Address.findOne({
      _id: addressId,
      userId: user._id,
    });

    if (!address) {
      return res.status(404).json({
        message: "Address not found",
      });
    }

    const cartItems = await Cart.find({
      userId: user._id,
    })
      .populate<{ itemId: IMenuItem }>("itemId")
      .populate<{ restaurantId: IRestaurant }>(
        "restaurantId"
      );

    if (cartItems.length === 0) {
      return res.status(400).json({
        message: "Cart is empty",
      });
    }

    const firstCartItem = cartItems[0];

    if (!firstCartItem?.restaurantId) {
      return res.status(400).json({
        message: "Invalid cart data",
      });
    }

    const restaurantId = firstCartItem.restaurantId._id;

    const restaurant = await Restaurant.findById(
      restaurantId
    );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    if (!restaurant.isVerified) {
      return res.status(409).json({
        message: "Restaurant is not verified yet",
      });
    }

    if (!restaurant.isOpen) {
      return res.status(409).json({
        message: "This restaurant is currently closed",
      });
    }

    const distance = getDistanceKm(
      address.location.coordinates[1],
      address.location.coordinates[0],
      restaurant.autoLocation.coordinates[1],
      restaurant.autoLocation.coordinates[0]
    );

    const invalidCartItem = cartItems.find(
      (cart) => !cart.itemId
    );

    if (invalidCartItem) {
      return res.status(409).json({
        message:
          "Your cart contains an item that no longer exists. Refresh your cart.",
      });
    }

    const unavailableItem = cartItems.find(
      (cart) =>
        cart.itemId && !cart.itemId.isAvailable
    );

    if (unavailableItem?.itemId) {
      return res.status(409).json({
        message: `${unavailableItem.itemId.name} is currently unavailable`,
      });
    }

    const mixedRestaurantItem = cartItems.find(
      (cart) =>
        cart.itemId &&
        cart.itemId.restaurantId.toString() !==
        restaurantId.toString()
    );

    if (mixedRestaurantItem) {
      return res.status(409).json({
        message:
          "Cart contains items from multiple restaurants. Refresh your cart.",
      });
    }

    let subtotal = 0;

    const orderItems = cartItems.map((cart) => {
      const item = cart.itemId!;

      subtotal +=
        item.price * cart.quauntity;

      return {
        itemId: item._id.toString(),
        name: item.name,
        price: item.price,
        quauntity: cart.quauntity,
      };
    });

    const deliveryFee =
      subtotal < 250 ? 49 : 0;

    const platfromFee = 7;

    const totalAmount =
      subtotal +
      deliveryFee +
      platfromFee;

    const expiresAt = new Date(
      Date.now() + 15 * 60 * 1000
    );

    const [
      longitude,
      latitude,
    ] = address.location.coordinates;

    const riderAmount =
      Math.ceil(distance) * 17;

    const order = await Order.create({
      userId: user._id.toString(),
      restaurantId: restaurantId.toString(),
      restaurantName: restaurant.name,
      riderId: null,
      distance,
      riderAmount,
      items: orderItems,
      subtotal,
      deliveryFee,
      platfromFee,
      totalAmount,
      addressId: address._id.toString(),
      deliveryAddress: {
        fromattedAddress:
          address.formattedAddress,
        mobile: address.mobile,
        latitude,
        longitude,
      },
      paymentMethod,
      paymentStatus: "pending",
      status: "placed",
      expiresAt,
    });

    // Keep cart until payment succeeds.
    // This prevents losing the basket after checkout cancellation.

    res.status(201).json({
      message: "Order created successfully",
      orderId: order._id.toString(),
      amount: totalAmount,
    });
  }
);

export const fetchOrderForPayment = TryCatch(
  async (req, res) => {
    if (
      !process.env.INTERNAL_SERVICE_KEY ||
      req.headers["x-internal-key"] !==
      process.env.INTERNAL_SERVICE_KEY
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const id =
      typeof req.params.id === "string"
        ? req.params.id
        : undefined;

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        message: "Invalid order id",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentStatus !== "pending") {
      return res.status(400).json({
        message:
          "Order is no longer awaiting payment",
      });
    }

    res.json({
      orderId: order._id,
      amount: order.totalAmount,
      currency: "INR",
    });
  }
);

export const fetchRestaurantOrders = TryCatch(
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    const user = req.user;

    const restaurantId =
      typeof req.params.restaurantId ===
        "string"
        ? req.params.restaurantId
        : undefined;

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!restaurantId) {
      return res.status(400).json({
        message: "Restaurant id is required",
      });
    }

    const restaurant =
      await Restaurant.findOne({
        _id: restaurantId,
        ownerId: user._id.toString(),
      });

    if (!restaurant) {
      return res.status(403).json({
        message:
          "You can only view orders for your own restaurant",
      });
    }

    const parsedLimit = Number(
      req.query.limit || 0
    );

    const limit =
      Number.isFinite(parsedLimit) &&
        parsedLimit > 0
        ? parsedLimit
        : 0;

    const orders = await Order.find({
      restaurantId,
      paymentStatus: "paid",
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  }
);

export const updateOrderStatus = TryCatch(
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    const user = req.user;

    const orderId =
      typeof req.params.orderId ===
        "string"
        ? req.params.orderId
        : undefined;

    const { status } =
      req.body as {
        status?: string;
      };

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    if (!orderId) {
      return res.status(400).json({
        message: "Order id is required",
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Order status is required",
      });
    }

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (order.paymentStatus !== "paid") {
      return res.status(409).json({
        message:
          "Order payment is not completed",
      });
    }

    const restaurant =
      await Restaurant.findById(
        order.restaurantId
      );

    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
      });
    }

    if (
      restaurant.ownerId !==
      user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "You cannot update this order",
      });
    }

    const allowedNextStatuses =
      SELLER_TRANSITIONS[
      order.status
      ] || [];

    if (
      !allowedNextStatuses.includes(
        status
      )
    ) {
      return res.status(400).json({
        message:
          `Cannot move order from ${order.status} to ${status}`,
      });
    }

    order.status =
      status as typeof order.status;

    await order.save();

    await emitRealtime(
      `user:${order.userId}`,
      "order:update",
      {
        orderId: order._id,
        status: order.status,
      }
    );

    if (
      status === "ready_for_rider"
    ) {
      await publishEvent(
        "ORDER_READY_FOR_RIDER",
        {
          orderId:
            order._id.toString(),
          restaurantId:
            restaurant._id.toString(),
          location:
            restaurant.autoLocation,
        }
      );
    }

    res.json({
      message:
        "Order status updated successfully",
      order,
    });
  }
);

export const getMyOrders = TryCatch(
  async (
    req: AuthenticatedRequest,
    res
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const orders =
      await Order.find({
        userId:
          req.user._id.toString(),
        paymentStatus: "paid",
      }).sort({
        createdAt: -1,
      });

    res.json({ orders });
  }
);

export const fetchSingleOrder =
  TryCatch(
    async (
      req: AuthenticatedRequest,
      res
    ) => {
      if (!req.user) {
        return res.status(401).json({
          message: "Unauthorized",
        });
      }

      const id =
        typeof req.params.id ===
          "string"
          ? req.params.id
          : undefined;

      if (
        !id ||
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          message: "Invalid order id",
        });
      }

      const order =
        await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          message: "Order not found",
        });
      }

      if (
        order.userId !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You cannot view this order",
        });
      }

      res.json(order);
    }
  );

export const assignRiderToOrder =
  TryCatch(async (req, res) => {
    if (
      !process.env.INTERNAL_SERVICE_KEY ||
      req.headers["x-internal-key"] !==
      process.env.INTERNAL_SERVICE_KEY
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const {
      orderId,
      riderId,
      riderName,
      riderPhone,
    } = req.body;

    if (
      !orderId ||
      !riderId ||
      !riderPhone
    ) {
      return res.status(400).json({
        message:
          "Missing rider assignment details",
      });
    }

    const orderAvailable =
      await Order.findOne({
        riderId,
        status: {
          $in: [
            "rider_assigned",
            "picked_up",
          ],
        },
      });

    if (orderAvailable) {
      return res.status(409).json({
        message:
          "Rider already has an active order",
      });
    }

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    if (
      order.paymentStatus !== "paid" ||
      order.status !== "ready_for_rider"
    ) {
      return res.status(409).json({
        message:
          "Order is not ready for rider assignment",
      });
    }

    if (order.riderId) {
      return res.status(409).json({
        message:
          "Order already has a rider",
      });
    }

    const orderUpdated =
      await Order.findOneAndUpdate(
        {
          _id: orderId,
          riderId: null,
          status: "ready_for_rider",
          paymentStatus: "paid",
        },
        {
          riderId,
          riderName:
            riderName ||
            "Delivery Partner",
          riderPhone,
          status: "rider_assigned",
        },
        { new: true }
      );

    if (!orderUpdated) {
      return res.status(409).json({
        message:
          "Order was taken by another rider",
      });
    }

    await Promise.all([
      emitRealtime(
        `user:${orderUpdated.userId}`,
        "order:rider_assigned",
        orderUpdated
      ),
      emitRealtime(
        `restaurant:${orderUpdated.restaurantId}`,
        "order:rider_assigned",
        orderUpdated
      ),
    ]);

    res.json({
      message:
        "Rider assigned successfully",
      success: true,
      order: orderUpdated,
    });
  });

export const getCurrentOrderForRider =
  TryCatch(async (req, res) => {
    if (
      !process.env.INTERNAL_SERVICE_KEY ||
      req.headers["x-internal-key"] !==
      process.env.INTERNAL_SERVICE_KEY
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const riderId =
      typeof req.query.riderId ===
        "string"
        ? req.query.riderId
        : undefined;

    if (!riderId) {
      return res.status(400).json({
        message:
          "Rider id is required",
      });
    }

    const order =
      await Order.findOne({
        riderId,
        status: {
          $in: [
            "rider_assigned",
            "picked_up",
          ],
        },
        paymentStatus: "paid",
      }).populate(
        "restaurantId"
      );

    if (!order) {
      return res.status(404).json({
        message:
          "No active order found",
      });
    }

    res.json(order);
  });

export const updateOrderStatusRider =
  TryCatch(async (req, res) => {
    if (
      !process.env.INTERNAL_SERVICE_KEY ||
      req.headers["x-internal-key"] !==
      process.env.INTERNAL_SERVICE_KEY
    ) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const {
      orderId,
      riderId,
    } = req.body;

    if (!orderId || !riderId) {
      return res.status(400).json({
        message:
          "Order id and rider id are required",
      });
    }

    const order =
      await Order.findOne({
        _id: orderId,
        riderId,
        paymentStatus: "paid",
      });

    if (!order) {
      return res.status(404).json({
        message:
          "Assigned order not found",
      });
    }

    if (
      order.status ===
      "rider_assigned"
    ) {
      order.status =
        "picked_up";
    } else if (
      order.status ===
      "picked_up"
    ) {
      order.status =
        "delivered";
    } else {
      return res.status(400).json({
        message:
          `Rider cannot update an order in ${order.status} status`,
      });
    }

    await order.save();

    await Promise.all([
      emitRealtime(
        `restaurant:${order.restaurantId}`,
        "order:update",
        order
      ),
      emitRealtime(
        `user:${order.userId}`,
        "order:update",
        order
      ),
    ]);

    return res.json({
      message:
        order.status ===
          "delivered"
          ? "Order delivered successfully"
          : "Order marked as picked up",
      status: order.status,
    });
  });