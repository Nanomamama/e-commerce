import { validateCart } from "@/modules/cart/service";
import { jsonError, jsonOk, readJson, requireString } from "@/server/api";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ cartId?: string }>(request);
    const result = await validateCart(requireString(body.cartId, "cartId"));
    return jsonOk(result, result.valid ? 200 : 409);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to validate cart"
    );
  }
}
