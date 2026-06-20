import { withTransaction } from "@/server/db/tx";
import { getCartDetails } from "./details";
import {
  createGuestCart,
  deleteCartItem,
  deleteCartItems,
  findActiveCartBySession,
  findActiveCartByUser,
  setCartItemQuantity,
  upsertCartItem
} from "./repository";
import type { CartItemInput } from "./types";

export async function startGuestCart(sessionId: string) {
  return withTransaction((client) => createGuestCart(client, sessionId));
}

export async function addCartItem(input: CartItemInput) {
  await withTransaction((client) => upsertCartItem(client, input));
}

export async function getActiveCartBySession(sessionId: string) {
  return withTransaction((client) => findActiveCartBySession(client, sessionId));
}

export async function getActiveCartByUser(userId: string) {
  return withTransaction((client) => findActiveCartByUser(client, userId));
}

export async function updateCartItemQuantity(
  cartId: string,
  variantId: string,
  quantity: number
) {
  await withTransaction((client) =>
    setCartItemQuantity(client, cartId, variantId, quantity)
  );
}

export async function removeCartItem(cartId: string, variantId: string) {
  await withTransaction((client) => deleteCartItem(client, cartId, variantId));
}

export async function clearCart(cartId: string) {
  await withTransaction((client) => deleteCartItems(client, cartId));
}

export async function validateCart(cartId: string) {
  const cart = await getCartDetails(cartId);

  if (!cart) {
    throw new Error("Cart not found");
  }

  const issues = cart.items
    .filter((item) => item.available < item.quantity)
    .map((item) => ({
      variantId: item.variantId,
      sku: item.sku,
      requested: item.quantity,
      available: item.available,
      message: `${item.productName} has only ${item.available} available`
    }));

  return {
    cart,
    valid: issues.length === 0,
    issues
  };
}
