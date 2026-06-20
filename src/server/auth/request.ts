import { verifyAuthToken } from "./jwt";
import { getUserById } from "@/modules/users/service";
import type { User } from "@/modules/users/types";

export type CurrentUser = User;

function readCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  const match = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(match.slice(name.length + 1));
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  return authorization.slice("Bearer ".length).trim();
}

export async function requireAuth(request: Request): Promise<CurrentUser> {
  const token = readBearerToken(request) ?? readCookie(request, "auth_token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const payload = await verifyAuthToken(token);
  const user = await getUserById(payload.userId);

  if (!user || user.status !== "active") {
    throw new Error("Authentication required");
  }

  return user;
}

export async function requireAdmin(request: Request): Promise<CurrentUser> {
  const user = await requireAuth(request);

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}
