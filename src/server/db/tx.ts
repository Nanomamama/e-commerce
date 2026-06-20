import { pool, type DbClient } from "./pool";

export async function withTransaction<T>(
  handler: (client: DbClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await handler(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
