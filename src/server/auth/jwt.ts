import { SignJWT, jwtVerify } from "jose";
import { getConfig } from "@/server/config";

const issuer = "commerce-modular-monolith";

export type AuthTokenPayload = {
  userId: string;
  role: "customer" | "admin";
};

function secretKey() {
  return new TextEncoder().encode(getConfig().jwtSecret);
}

export async function signAuthToken(payload: AuthTokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyAuthToken(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, secretKey(), { issuer });

  if (typeof payload.userId !== "string") {
    throw new Error("Invalid auth token userId");
  }

  if (payload.role !== "customer" && payload.role !== "admin") {
    throw new Error("Invalid auth token role");
  }

  return {
    userId: payload.userId,
    role: payload.role
  };
}
