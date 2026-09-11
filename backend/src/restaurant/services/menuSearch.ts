import mongoose from "mongoose";
import MenuItems from "../models/MenuItems.js";
import {
  generateMenuQueryEmbedding,
  generateSearchSummary,
} from "./menuEmbedding.js";

const VECTOR_INDEX =
  process.env.MENU_VECTOR_INDEX ||
  "menuItemVectorIndex";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

type SearchFilters = {
  minPrice?: number;
  maxPrice?: number;
  isAvailable?: boolean;
  restaurantId?: mongoose.Types.ObjectId;
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const parseMenuSearch = (
  query: string,
  restaurantId?: string
) => {
  const filters: SearchFilters = {};

  const normalized =
    query.trim().replace(/\s+/g, " ");

  if (
    restaurantId &&
    mongoose.Types.ObjectId.isValid(
      restaurantId
    )
  ) {
    filters.restaurantId =
      new mongoose.Types.ObjectId(
        restaurantId
      );
  }

  const between = normalized.match(
    /(?:between)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:and|-)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i
  );

  if (between) {
    const low = Number(between[1]);
    const high = Number(between[2]);

    filters.minPrice =
      Math.min(low, high);

    filters.maxPrice =
      Math.max(low, high);
  } else {
    const maxMatch =
      normalized.match(
        /(?:under|below|less than|upto|up to|at most|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i
      );

    const minMatch =
      normalized.match(
        /(?:over|above|more than|starting from|from|at least)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i
      );

    if (maxMatch) {
      filters.maxPrice =
        Number(maxMatch[1]);
    }

    if (minMatch) {
      filters.minPrice =
        Number(minMatch[1]);
    }
  }

  if (
    /(?:available|in stock|currently available|ready now)/i.test(
      normalized
    )
  ) {
    filters.isAvailable = true;
  }

  const semanticQuery =
    normalized
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
    semanticQuery:
      semanticQuery || normalized,
  };
};

const buildMongoFilter = (
  filters: SearchFilters
) => {
  const filter: Record<string, any> = {};

  if (filters.restaurantId) {
    filter.restaurantId =
      filters.restaurantId;
  }

  if (
    filters.isAvailable !== undefined
  ) {
    filter.isAvailable =
      filters.isAvailable;
  }

  if (
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined
  ) {
    const price: Record<string, number> =
      {};

    if (
      filters.minPrice !== undefined
    ) {
      price.$gte =
        filters.minPrice;
    }

    if (
      filters.maxPrice !== undefined
    ) {
      price.$lte =
        filters.maxPrice;
    }

    filter.price = price;
  }

  return filter;
};

const buildVectorFilter = (
  filters: SearchFilters
) => {
  const clauses:
    Record<string, unknown>[] = [];

  if (filters.restaurantId) {
    clauses.push({
      restaurantId: {
        $eq: filters.restaurantId,
      },
    });
  }

  if (
    filters.isAvailable !== undefined
  ) {
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
    const price: Record<string, number> =
      {};

    if (
      filters.minPrice !== undefined
    ) {
      price.$gte =
        filters.minPrice;
    }

    if (
      filters.maxPrice !== undefined
    ) {
      price.$lte =
        filters.maxPrice;
    }

    clauses.push({
      price,
    });
  }

  return clauses.length
    ? { $and: clauses }
    : undefined;
};

const keywordSearch = async (
  query: string,
  filters: SearchFilters,
  limit: number
) => {
  const filter =
    buildMongoFilter(filters);

  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9₹]+/i)
    .map((token) => token.trim())
    .filter(
      (token) => token.length >= 2
    )
    .slice(0, 8);

  if (tokens.length) {
    filter.$or = tokens.flatMap(
      (token) => {
        const regex =
          new RegExp(
            escapeRegex(token),
            "i"
          );

        return [
          { name: regex },
          { description: regex },
        ];
      }
    );
  }

  const documents =
    await MenuItems.find(filter)
      .sort({
        isAvailable: -1,
        price: 1,
        createdAt: -1,
      })
      .limit(
        Math.min(
          limit * 3,
          75
        )
      )
      .lean();

  const scored = documents
    .map((item) => {
      const haystack =
        `${item.name} ${item.description || ""
          }`.toLowerCase();

      const score =
        tokens.reduce(
          (sum, token) =>
            sum +
            (haystack.includes(
              token
            )
              ? 1
              : 0),
          0
        );

      return {
        ...item,
        score: tokens.length
          ? score / tokens.length
          : 0,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(a.price) -
        Number(b.price)
    )
    .slice(0, limit);

  return {
    results: scored,
    mode: "keyword" as const,
  };
};

export const searchMenuItems =
  async ({
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
    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) ||
          DEFAULT_LIMIT,
          1
        ),
        MAX_LIMIT
      );

    const parsed =
      parseMenuSearch(
        query,
        restaurantId
      );

    const vectorFilter =
      buildVectorFilter(
        parsed.filters
      );

    let results: any[] = [];

    let mode:
      | "vector"
      | "keyword" =
      "vector";

    try {
      const embedding =
        await generateMenuQueryEmbedding(
          parsed.semanticQuery
        );

      /*
       * Use any[] here because MongoDB Atlas
       * $vectorSearch is a valid aggregation
       * stage but Mongoose's PipelineStage
       * typings may not include it.
       */
      const pipeline: any[] = [
        {
          $vectorSearch: {
            index: VECTOR_INDEX,
            path: "embedding",
            queryVector:
              embedding,
            numCandidates:
              Math.max(
                safeLimit * 15,
                75
              ),
            limit: safeLimit,
            ...(vectorFilter
              ? {
                filter:
                  vectorFilter,
              }
              : {}),
          },
        },
        {
          $project: {
            embedding: 0,
            score: {
              $meta:
                "vectorSearchScore",
            },
          },
        },
      ];

      results =
        await MenuItems.aggregate(
          pipeline
        );
    } catch (error) {
      mode = "keyword";

      console.error(
        "Semantic menu search unavailable, using keyword fallback:",
        error
      );

      return keywordSearch(
        parsed.semanticQuery,
        parsed.filters,
        safeLimit
      ).then(
        async (fallback) => ({
          ...fallback,
          summary:
            includeSummary
              ? await safeSummary(
                query,
                fallback.results
              )
              : "",
          filters:
            parsed.filters,
        })
      );
    }

    const summary =
      includeSummary
        ? await safeSummary(
          query,
          results
        )
        : "";

    return {
      results,
      mode,
      filters:
        parsed.filters,
      summary,
    };
  };

const safeSummary = async (
  query: string,
  results: any[]
) => {
  try {
    return await generateSearchSummary(
      query,
      results
        .slice(0, 8)
        .map((item) => ({
          name: item.name,
          description:
            item.description,
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