import { jsonOk } from "@/server/api";

export async function POST() {
  const response = jsonOk({ loggedOut: true });

  response.cookies.set("auth_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
