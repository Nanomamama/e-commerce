import pg from "pg";
import { loadLocalEnv } from "../env";

const { Pool } = pg;

let cachedPool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (cachedPool) {
    return cachedPool;
  }

  loadLocalEnv();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  cachedPool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

  return cachedPool;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, property) {
    const activePool = getPool();
    const value = activePool[property as keyof pg.Pool];

    if (typeof value === "function") {
      return value.bind(activePool);
    }

    return value;
  }
});

export type DbClient = pg.PoolClient;
