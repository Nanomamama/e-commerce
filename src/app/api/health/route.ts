import { NextResponse } from "next/server";
import { pool } from "@/server/db/pool";

export async function GET() {
  const startedAt = Date.now();

  try {
    await pool.query("select 1");

    return NextResponse.json({
      ok: true,
      db: "ok",
      latencyMs: Date.now() - startedAt
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 503 }
    );
  }
}
