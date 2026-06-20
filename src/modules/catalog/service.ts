import { pool } from "@/server/db/pool";
import { findActiveProducts, findVariantBySku } from "./repository";

export async function listActiveProducts(limit?: number) {
  const client = await pool.connect();

  try {
    return await findActiveProducts(client, limit);
  } finally {
    client.release();
  }
}

export async function getActiveVariantBySku(sku: string) {
  const client = await pool.connect();

  try {
    return await findVariantBySku(client, sku);
  } finally {
    client.release();
  }
}
