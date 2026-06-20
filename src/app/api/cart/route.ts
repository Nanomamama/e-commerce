import {
  addCartItem,
  clearCart,
  getActiveCartBySession,
  startGuestCart
} from "@/modules/cart/service";
import { getCartDetails } from "@/modules/cart/details";
import {
  jsonError,
  jsonOk,
  readJson,
  requirePositiveInteger,
  requireString
} from "@/server/api";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ sessionId?: string }>(request);
    const sessionId = requireString(body.sessionId, "sessionId");
    const cart = (await getActiveCartBySession(sessionId)) ?? (await startGuestCart(sessionId));

    return jsonOk({ cart }, 201);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to create cart"
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJson<{
      cartId?: string;
      variantId?: string;
      quantity?: number;
      unitPriceAmount?: number;
    }>(request);

    await addCartItem({
      cartId: requireString(body.cartId, "cartId"),
      variantId: requireString(body.variantId, "variantId"),
      quantity: requirePositiveInteger(body.quantity, "quantity"),
      unitPriceAmount: requirePositiveInteger(
        body.unitPriceAmount,
        "unitPriceAmount"
      )
    });

    const cart = await getCartDetails(body.cartId as string);
    return jsonOk({ cart });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update cart"
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cartId = requireString(url.searchParams.get("cartId"), "cartId");
    const cart = await getCartDetails(cartId);

    if (!cart) {
      return jsonError("Cart not found", 404);
    }

    return jsonOk({ cart });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load cart"
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const cartId = requireString(url.searchParams.get("cartId"), "cartId");
    await clearCart(cartId);
    const cart = await getCartDetails(cartId);
    return jsonOk({ cart });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to clear cart"
    );
  }
}
