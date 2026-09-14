import mongoose from "mongoose";
import MenuItems from "../models/MenuItems.js";
import {
  generateMenuQueryEmbedding,
  generateSearchSummary,
} from "./menuEmbedding.js";

const VECTOR_INDEX =
  process.env.MENU_VECTOR_INDEX || "menuItemVectorIndex";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

type SearchFilters = {
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  restaurantId?: mongoose.Types.ObjectId;
};

type SearchMode = "vector" | "hybrid" | "keyword";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------------------------------------------------------
   Parse natural-language search into:
   1. structured filters
   2. semantic query
--------------------------------------------------------- */
export const parseMenuSearch = (
  query: string,
  restaurantId?: string
) => {
  const filters: SearchFilters = {};

  const normalized = query.trim().replace(/\s+/g, " ");

  if (
    restaurantId &&
    mongoose.Types.ObjectId.isValid(restaurantId)
  ) {
    filters.restaurantId = new mongoose.Types.ObjectId(
      restaurantId
    );
  }

  /* -------------------------------------------------------
     Price: between ₹100 and ₹300
  ------------------------------------------------------- */
  const betweenMatch = normalized.match(
    /(?:between)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:and|-)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i
  );

  if (betweenMatch) {
    const first = Number(betweenMatch[1]);
    const second = Number(betweenMatch[2]);

    filters.minPrice = Math.min(first, second);
    filters.maxPrice = Math.max(first, second);
  } else {
    /* -----------------------------------------------------
       Maximum price:
       under 300
       below 300
       less than 300
       upto 300
       up to 300
       at most 300
       within 300
    ----------------------------------------------------- */
    const maxMatch = normalized.match(
      /(?:under|below|less than|upto|up to|at most|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i
    );

    /* -----------------------------------------------------
       Minimum price:
       over 300
       above 300
       more than 300
       starting from 300
       from 300
       at least 300
    ----------------------------------------------------- */
    const minMatch = normalized.match(
      /(?:over|above|more than|starting from|from|at least)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i
    );

    if (maxMatch) {
      filters.maxPrice = Number(maxMatch[1]);
    }

    if (minMatch) {
      filters.minPrice = Number(minMatch[1]);
    }
  }

  /* -------------------------------------------------------
     Availability
  ------------------------------------------------------- */
  if (
    /(?:available|in stock|currently available|ready now)/i.test(
      normalized
    )
  ) {
    filters.isAvailable = true;
  }

  /* -------------------------------------------------------
     Remove structured filter text from semantic query.
     
     Example:
     "spicy food under ₹300"
     
     becomes:
     "spicy food"
  ------------------------------------------------------- */
  const semanticQuery = normalized
    .replace(
      /(?:between)\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*(?:and|-)\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?/gi,
      ""
    )
    .replace(
      /(?:under|below|less than|upto|up to|at most|within|over|above|more than|starting from|from|at least)\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?/gi,
      ""
    )
    .replace(
      /(?:available|in stock|currently available|ready now)/gi,
      ""
    )
    .replace(/[₹₨]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    filters,
    semanticQuery: semanticQuery || normalized,
  };
};

/* ---------------------------------------------------------
   MongoDB normal filter
--------------------------------------------------------- */
const buildMongoFilter = (
  filters: SearchFilters
): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};

  if (filters.restaurantId) {
    filter.restaurantId = filters.restaurantId;
  }

  if (filters.isAvailable !== undefined) {
    filter.isAvailable = filters.isAvailable;
  }

  if (
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  ) {
    const price: Record<string, number> = {};

    if (filters.minPrice !== undefined) {
      price.$gte = filters.minPrice;
    }

    if (filters.maxPrice !== undefined) {
      price.$lte = filters.maxPrice;
    }

    filter.price = price;
  }

  return filter;
};

/* ---------------------------------------------------------
   MongoDB Atlas Vector Search filter
--------------------------------------------------------- */
const buildVectorFilter = (
  filters: SearchFilters
) => {
  const clauses: Record<string, unknown>[] = [];

  if (filters.restaurantId) {
    clauses.push({
      restaurantId: {
        $eq: filters.restaurantId,
      },
    });
  }

  if (filters.isAvailable !== undefined) {
    clauses.push({
      isAvailable: {
        $eq: filters.isAvailable,
      },
    });
  }

  if (
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  ) {
    const priceFilter: Record<string, number> = {};

    if (filters.minPrice !== undefined) {
      priceFilter.$gte = filters.minPrice;
    }

    if (filters.maxPrice !== undefined) {
      priceFilter.$lte = filters.maxPrice;
    }

    clauses.push({
      price: priceFilter,
    });
  }

  if (clauses.length === 0) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return {
    $and: clauses,
  };
};

/* ---------------------------------------------------------
   Keyword fallback

   This is used when:
   - embeddings don't exist
   - vector index is unavailable
   - vector search returns nothing
   - Gemini embedding request fails
--------------------------------------------------------- */
const keywordSearch = async (
  query: string,
  filters: SearchFilters,
  limit: number
) => {
  const filter = buildMongoFilter(filters);

  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9₹]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 10);

  /*
   * Do not add an empty $or.
   */
  if (tokens.length > 0) {
    filter.$or = tokens.flatMap((token) => {
      const regex = new RegExp(
        escapeRegex(token),
        "i"
      );

      return [
        {
          name: regex,
        },
        {
          description: regex,
        },
      ];
    });
  }

  const documents = await MenuItems.find(filter)
    .sort({
      isAvailable: -1,
      price: 1,
      createdAt: -1,
    })
    .limit(Math.min(limit * 5, 100))
    .lean();

  const scored = documents
    .map((item) => {
      const haystack =
        `${item.name} ${item.description || ""}`.toLowerCase();

      const score = tokens.reduce(
        (sum, token) =>
          sum + (haystack.includes(token) ? 1 : 0),
        0
      );

      return {
        ...item,
        score:
          tokens.length > 0
            ? score / tokens.length
            : 0,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(a.price) - Number(b.price)
    )
    .slice(0, limit);

  return {
    results: scored,
    mode: "keyword" as const,
  };
};

/* ---------------------------------------------------------
   Main menu search
--------------------------------------------------------- */
export const searchMenuItems = async ({
  query,
  limit = DEFAULT_LIMIT,
  restaurantId,
  includeSummary = false,
}: {
  query: string;
  limit?: number;
  restaurantId?: string;
  includeSummary?: boolean;
}) => {
  const safeLimit = Math.min(
    Math.max(
      Number(limit) || DEFAULT_LIMIT,
      1
    ),
    MAX_LIMIT
  );

  const parsed = parseMenuSearch(
    query,
    restaurantId
  );

  const vectorFilter = buildVectorFilter(
    parsed.filters
  );

  let vectorResults: any[] = [];

  /*
   * -------------------------------------------------------
   * Try semantic vector search
   * -------------------------------------------------------
   */
  try {
    const embedding =
      await generateMenuQueryEmbedding(
        parsed.semanticQuery
      );

    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: VECTOR_INDEX,
          path: "embedding",
          queryVector: embedding,

          /*
           * Search a larger candidate set than the final
           * result count for better recall.
           */
          numCandidates: Math.max(
            safeLimit * 30,
            150
          ),

          limit: safeLimit,

          ...(vectorFilter
            ? {
              filter: vectorFilter,
            }
            : {}),
        },
      },

      {
        $project: {
          embedding: 0,

          score: {
            $meta: "vectorSearchScore",
          },
        },
      },
    ];

    vectorResults =
      await MenuItems.aggregate(pipeline);

    /*
     * -----------------------------------------------------
     * IMPORTANT FIX
     *
     * Vector search may succeed technically but return
     * ZERO results if:
     *
     * - embeddings are missing
     * - index has not populated yet
     * - filters exclude everything
     *
     * Previously this case returned [] directly.
     * Now we use keyword fallback.
     * -----------------------------------------------------
     */
    if (vectorResults.length > 0) {
      const summary = includeSummary
        ? await safeSummary(
          query,
          vectorResults
        )
        : "";

      return {
        results: vectorResults,
        mode: "vector" as SearchMode,
        filters: parsed.filters,
        summary,
      };
    }

    console.warn(
      `Vector search returned 0 results for query: "${query}". Using keyword fallback.`
    );
  } catch (error) {
    console.error(
      "Semantic menu search failed:",
      error
    );
  }

  /*
   * -------------------------------------------------------
   * Keyword fallback
   * -------------------------------------------------------
   */
  const fallback = await keywordSearch(
    parsed.semanticQuery,
    parsed.filters,
    safeLimit
  );

  const summary = includeSummary
    ? await safeSummary(
      query,
      fallback.results
    )
    : "";

  return {
    results: fallback.results,
    mode: fallback.results.length
      ? ("hybrid" as SearchMode)
      : ("keyword" as SearchMode),
    filters: parsed.filters,
    summary,
  };
};

/* ---------------------------------------------------------
   Safe Gemini summary
--------------------------------------------------------- */
const safeSummary = async (
  query: string,
  results: any[]
) => {
  try {
    if (!results.length) {
      return "";
    }

    return await generateSearchSummary(
      query,
      results.slice(0, 8).map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
      }))
    );
  } catch (error) {
    console.error(
      "Menu result summary generation failed:",
      error
    );

    return "";
  }
};