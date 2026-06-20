import { pool } from "@/server/db/pool";
import { withTransaction } from "@/server/db/tx";

export type CartDetails = {
  id: string;
  status: "active" | "converted" | "abandoned";
  currency: string;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPriceAmount: number;
    lineTotalAmount: number;
    available: number;
  }>;
  subtotalAmount: number;
};

export async function getCartDetails(cartId: string): Promise<CartDetails | null> {
  const cart = await pool.query<{
    id: string;
    status: CartDetails["status"];
    currency: string;
  }>(
    `
      select id, status, currency
      from carts
      where id = $1
    `,
    [cartId]
  );

  const cartRow = cart.rows[0];
  if (!cartRow) return null;

  const items = await pool.query<{
    id: string;
    variant_id: string;
    product_name: string;
    variant_name: string | null;
    sku: string;
    quantity: number;
    unit_price_amount: number;
    available: number;
  }>(
    `
      select
        ci.id,
        ci.variant_id,
        p.name as product_name,
        v.name as variant_name,
        v.sku,
        ci.quantity,
        ci.unit_price_amount,
        coalesce(sum(ii.on_hand - ii.reserved - ii.safety_stock), 0)::int as available
      from cart_items ci
      join product_variants v on v.id = ci.variant_id
      join products p on p.id = v.product_id
      left join inventory_items ii on ii.variant_id = v.id
      where ci.cart_id = $1
      group by ci.id, p.name, v.name, v.sku
      order by ci.created_at asc
    `,
    [cartId]
  );

  const mappedItems = items.rows.map((row) => ({
    id: row.id,
    variantId: row.variant_id,
    productName: row.product_name,
    variantName: row.variant_name,
    sku: row.sku,
    quantity: row.quantity,
    unitPriceAmount: row.unit_price_amount,
    lineTotalAmount: row.quantity * row.unit_price_amount,
    available: row.available
  }));

  return {
    id: cartRow.id,
    status: cartRow.status,
    currency: cartRow.currency,
    items: mappedItems,
    subtotalAmount: mappedItems.reduce(
      (total, item) => total + item.lineTotalAmount,
      0
    )
  };
}

export async function markCartConverted(cartId: string) {
  await withTransaction((client) =>
    client
      .query(
        `
          update carts
          set status = 'converted'
          where id = $1 and status = 'active'
        `,
        [cartId]
      )
      .then(() => undefined)
  );
}
