import { getUserWithPasswordByEmail } from "@/modules/users/service";
import { jsonError, jsonOk, readJson, requireString } from "@/server/api";
import { signAuthToken } from "@/server/auth/jwt";
import { verifyPassword } from "@/server/auth/password";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email?: string; password?: string }>(request);
    const user = await getUserWithPasswordByEmail(
      requireString(body.email, "email")
    );

    if (!user || user.status !== "active") {
      return jsonError("Invalid email or password", 401);
    }

    const passwordMatches = await verifyPassword(
      requireString(body.password, "password"),
      user.passwordHash
    );

    if (!passwordMatches) {
      return jsonError("Invalid email or password", 401);
    }

    const { passwordHash: _passwordHash, ...publicUser } = user;
    const token = await signAuthToken({
      userId: publicUser.id,
      role: publicUser.role
    });
    const response = jsonOk({ user: publicUser, token });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to login");
  }
}
