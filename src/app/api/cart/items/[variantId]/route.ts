import { getCartDetails } from "@/modules/cart/details";
import {
  removeCartItem,
  updateCartItemQuantity
} from "@/modules/cart/service";
import {
  jsonError,
  jsonOk,
  readJson,
  requirePositiveInteger,
  requireString
} from "@/server/api";

type RouteContext = {
  params: Promise<{ variantId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { variantId } = await context.params;
    const body = await readJson<{ cartId?: string; quantity?: number }>(
      request
    );
    const cartId = requireString(body.cartId, "cartId");

    await updateCartItemQuantity(
      cartId,
      requireString(variantId, "variantId"),
      requirePositiveInteger(body.quantity, "quantity")
    );

    const cart = await getCartDetails(cartId);
    return jsonOk({ cart });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update cart item"
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { variantId } = await context.params;
    const url = new URL(request.url);
    const cartId = requireString(url.searchParams.get("cartId"), "cartId");

    await removeCartItem(cartId, requireString(variantId, "variantId"));
    const cart = await getCartDetails(cartId);
    return jsonOk({ cart });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to remove cart item"
    );
  }
}
