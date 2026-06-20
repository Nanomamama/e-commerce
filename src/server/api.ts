import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function statusFromError(error: unknown, fallback = 400) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message === "Authentication required") {
    return 401;
  }

  if (error.message === "Admin access required") {
    return 403;
  }

  return fallback;
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function requireString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`);
  }

  return value.trim();
}

export function requirePositiveInteger(value: unknown, name: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return numberValue;
}

export function requireNonNegativeInteger(value: unknown, name: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }

  return numberValue;
}
