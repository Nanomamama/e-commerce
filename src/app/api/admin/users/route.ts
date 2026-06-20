import {
  changeUserRole,
  disableUser,
  enableUser,
  listUsers
} from "@/modules/users/service";
import {
  jsonError,
  jsonOk,
  readJson,
  requireString,
  statusFromError
} from "@/server/api";
import { requireAdmin } from "@/server/auth/request";
import type { UserRole, UserStatus } from "@/modules/users/types";

const roles: UserRole[] = ["customer", "admin"];
const statuses: UserStatus[] = ["active", "disabled"];

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const url = new URL(request.url);
    const role = url.searchParams.get("role") as UserRole | null;
    const status = url.searchParams.get("status") as UserStatus | null;

    if (role && !roles.includes(role)) {
      return jsonError("Invalid role");
    }

    if (status && !statuses.includes(status)) {
      return jsonError("Invalid status");
    }

    const users = await listUsers({
      query: url.searchParams.get("query") ?? undefined,
      role: role ?? undefined,
      status: status ?? undefined
    });

    return jsonOk({ users });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load users",
      statusFromError(error)
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);

    const body = await readJson<{
      userId?: string;
      role?: UserRole;
      status?: UserStatus;
    }>(request);
    const userId = requireString(body.userId, "userId");

    if (body.role && !roles.includes(body.role)) {
      return jsonError("Invalid role");
    }

    if (body.status && !statuses.includes(body.status)) {
      return jsonError("Invalid status");
    }

    let user = body.role
      ? await changeUserRole(userId, body.role)
      : undefined;

    if (body.status === "active") {
      user = await enableUser(userId);
    }

    if (body.status === "disabled") {
      user = await disableUser(userId);
    }

    if (!user) {
      return jsonError("role or status is required");
    }

    return jsonOk({ user });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update user",
      statusFromError(error)
    );
  }
}
