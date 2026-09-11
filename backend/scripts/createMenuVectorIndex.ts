import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "QuickDish";
const indexName = process.env.MENU_VECTOR_INDEX || "menuItemVectorIndex";
const dimensions = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);

if (!uri) throw new Error("MONGO_URI is required");

await mongoose.connect(uri, { dbName });

const collection = mongoose.connection.db?.collection("menuitems");
if (!collection) throw new Error("MenuItem collection is unavailable");

const existing = await collection.listSearchIndexes().toArray();
const found = existing.find((index) => index.name === indexName);

const definition = {
  fields: [
    {
      type: "vector",
      path: "embedding",
      numDimensions: dimensions,
      similarity: "cosine",
    },
    { type: "filter", path: "restaurantId" },
    { type: "filter", path: "price" },
    { type: "filter", path: "isAvailable" },
  ],
};

if (!found) {
  await collection.createSearchIndex({
    name: indexName,
    type: "vectorSearch",
    definition,
  });
  console.log(`Created Vector Search index: ${indexName}`);
} else {
  console.log(`Vector Search index already exists: ${indexName}`);
}

await mongoose.disconnect();
