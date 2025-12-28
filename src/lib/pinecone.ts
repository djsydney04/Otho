import { Pinecone } from "@pinecone-database/pinecone";

// Initialize Pinecone client
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "default-index";

/**
 * Get Pinecone client instance
 * Throws error if API key is not configured
 */
export function getPineconeClient() {
  if (!PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not configured");
  }
  return new Pinecone({ apiKey: PINECONE_API_KEY });
}

/**
 * Get Pinecone index instance
 * Throws error if API key is not configured
 */
export function getPineconeIndex(indexName?: string) {
  const client = getPineconeClient();
  return client.index(indexName || PINECONE_INDEX_NAME);
}

/**
 * Check if Pinecone is configured
 */
export function isPineconeConfigured() {
  return !!PINECONE_API_KEY;
}

/**
 * Type-safe helper for accessing search result fields
 */
export function getSearchHitFields<T = Record<string, any>>(
  hit: { fields: object }
): T {
  return hit.fields as T;
}

