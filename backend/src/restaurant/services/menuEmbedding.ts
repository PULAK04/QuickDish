import { GoogleGenAI } from "@google/genai";

const model = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-2";
const outputDimensionality = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS || 768);

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
};

const buildDocumentText = (name: string, description = "") =>
  `title: ${name} | text: ${description}`;

const buildQueryText = (query: string) =>
  `task: search result | query: ${query}`;

export const generateMenuItemEmbedding = async (
  name: string,
  description = ""
): Promise<number[]> => {
  const client = getClient();
  const response = await client.models.embedContent({
    model,
    contents: buildDocumentText(name, description),
    config: { outputDimensionality },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Gemini returned an empty menu-item embedding");
  }

  return values;
};

export const generateMenuQueryEmbedding = async (
  query: string
): Promise<number[]> => {
  const client = getClient();
  const response = await client.models.embedContent({
    model,
    contents: buildQueryText(query),
    config: { outputDimensionality },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Gemini returned an empty query embedding");
  }

  return values;
};

export const generateSearchSummary = async (
  query: string,
  results: Array<{ name: string; description?: string; price: number }>
): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || results.length === 0) return "";

  const client = new GoogleGenAI({ apiKey });
  const modelName = process.env.GEMINI_SUMMARY_MODEL || "gemini-3.8-flash";

  const context = results
    .map(
      (item, index) =>
        `${index + 1}. ${item.name} — ₹${item.price} — ${item.description || "No description"}`
    )
    .join("\n");

  const response = await client.models.generateContent({
    model: modelName,
    contents: [
      "You summarize retrieved restaurant menu results for a customer.",
      `Search query: ${query}`,
      "Retrieved menu items:",
      context,
      "Write exactly one concise, natural sentence. Only mention facts present in the retrieved items. Do not invent ratings, ingredients, dietary labels, or availability.",
    ].join("\n\n"),
    config: {
      temperature: 0.2,
      maxOutputTokens: 80,
    },
  });

  return (response.text || "").trim();
};
