import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  restaurantId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  image?: string;
  price: number;
  isAvailable: boolean;
  embedding?: number[];
  embeddingModel?: string;
  embeddingUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IMenuItem>(
  {
    restaurantId: {
      type: Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    embedding: {
      type: [Number],
      select: false,
    },
    embeddingModel: {
      type: String,
      select: false,
    },
    embeddingUpdatedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IMenuItem>("MenuItem", schema);
