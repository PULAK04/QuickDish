import dotenv from "dotenv";
import mongoose from "mongoose";
import MenuItems from "../src/restaurant/models/MenuItems.js";
import { generateMenuItemEmbedding } from "../src/restaurant/services/menuEmbedding.js";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "QuickDish";

if (!uri) throw new Error("MONGO_URI is required");

await mongoose.connect(uri, { dbName });

const items = await MenuItems.find({
  $or: [
    { embedding: { $exists: false } },
    { embedding: { $size: 0 } },
  ],
}).select("+embedding name description");

console.log(`Found ${items.length} menu items without embeddings.`);

let success = 0;
let failed = 0;

for (const item of items) {
  try {
    item.embedding = await generateMenuItemEmbedding(
      item.name,
      item.description || ""
    );
    item.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
    item.embeddingUpdatedAt = new Date();
    await item.save();
    success += 1;
    console.log(`Embedded ${item._id} (${item.name})`);
  } catch (error) {
    failed += 1;
    console.error(`Failed to embed ${item._id} (${item.name})`, error);
  }
}

console.log(`Backfill complete. Success: ${success}, Failed: ${failed}`);
await mongoose.disconnect();
