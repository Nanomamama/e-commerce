import type { DbClient } from "@/server/db/pool";
import type { Cart, CartItemInput } from "./types";

export async function createGuestCart(
  client: DbClient,
  sessionId: string
): Promise<Cart> {
  const result = await client.query<{
    id: string;
    user_id: string | null;
    session_id: string | null;
    status: Cart["status"];
  }>(
    `
      insert into carts (session_id)
      values ($1)
      returning id, user_id, session_id, status
    `,
    [sessionId]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    status: row.status
  };
}

export async function upsertCartItem(client: DbClient, item: CartItemInput) {
  await client.query(
    `
      insert into cart_items (cart_id, variant_id, quantity, unit_price_amount)
      values ($1, $2, $3, $4)
      on conflict (cart_id, variant_id)
      do update set
        quantity = cart_items.quantity + excluded.quantity,
        unit_price_amount = excluded.unit_price_amount
    `,
    [item.cartId, item.variantId, item.quantity, item.unitPriceAmount]
  );
}

export async function setCartItemQuantity(
  client: DbClient,
  cartId: string,
  variantId: string,
  quantity: number
) {
  const result = await client.query(
    `
      update cart_items
      set quantity = $3
      where cart_id = $1 and variant_id = $2
    `,
    [cartId, variantId, quantity]
  );

  if (result.rowCount === 0) {
    throw new Error("Cart item not found");
  }
}

export async function deleteCartItem(
  client: DbClient,
  cartId: string,
  variantId: string
) {
  const result = await client.query(
    "delete from cart_items where cart_id = $1 and variant_id = $2",
    [cartId, variantId]
  );

  if (result.rowCount === 0) {
    throw new Error("Cart item not found");
  }
}

export async function deleteCartItems(client: DbClient, cartId: string) {
  await client.query("delete from cart_items where cart_id = $1", [cartId]);
}

export async function findActiveCartBySession(
  client: DbClient,
  sessionId: string
): Promise<Cart | null> {
  const result = await client.query<{
    id: string;
    user_id: string | null;
    session_id: string | null;
    status: Cart["status"];
  }>(
    `
      select id, user_id, session_id, status
      from carts
      where session_id = $1 and status = 'active'
      order by created_at desc
      limit 1
    `,
    [sessionId]
  );

  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        status: row.status
      }
    : null;
}

export async function findActiveCartByUser(
  client: DbClient,
  userId: string
): Promise<Cart | null> {
  const result = await client.query<{
    id: string;
    user_id: string | null;
    session_id: string | null;
    status: Cart["status"];
  }>(
    `
      select id, user_id, session_id, status
      from carts
      where user_id = $1 and status = 'active'
      order by created_at desc
      limit 1
    `,
    [userId]
  );

  const row = result.rows[0];
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        sessionId: row.session_id,
        status: row.status
      }
    : null;
}
