import { pool } from "@/server/db/pool";
import { findActiveCoupon } from "./repository";

export async function getActiveCoupon(code: string) {
  const client = await pool.connect();

  try {
    return await findActiveCoupon(client, code);
  } finally {
    client.release();
  }
}
