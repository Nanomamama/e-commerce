import { updateUserProfile } from "@/modules/users/service";
import { jsonError, jsonOk, readJson, statusFromError } from "@/server/api";
import { requireAuth } from "@/server/auth/request";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(request);
    return jsonOk({ user });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Authentication required",
      401
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await requireAuth(request);
    const body = await readJson<{ name?: string; phone?: string | null }>(
      request
    );

    const user = await updateUserProfile(currentUser.id, {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      phone:
        typeof body.phone === "string" || body.phone === null
          ? body.phone
          : undefined
    });

    return jsonOk({ user });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update profile",
      statusFromError(error)
    );
  }
}
