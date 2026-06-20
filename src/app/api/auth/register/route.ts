import { createUser, getUserByEmail } from "@/modules/users/service";
import { jsonError, jsonOk, readJson, requireString } from "@/server/api";
import { signAuthToken } from "@/server/auth/jwt";
import { hashPassword } from "@/server/auth/password";

export async function POST(request: Request) {
  try {
    const body = await readJson<{
      email?: string;
      password?: string;
      name?: string;
      phone?: string;
    }>(request);

    const email = requireString(body.email, "email").toLowerCase();
    const existing = await getUserByEmail(email);

    if (existing) {
      return jsonError("Email is already registered", 409);
    }

    const user = await createUser({
      email,
      passwordHash: await hashPassword(requireString(body.password, "password")),
      name: requireString(body.name, "name"),
      phone: body.phone
    });
    const token = await signAuthToken({ userId: user.id, role: user.role });
    const response = jsonOk({ user, token }, 201);

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to register"
    );
  }
}
