import { randomUUID } from "node:crypto";
import type { DbClient } from "@/server/db/pool";
import { withTransaction } from "@/server/db/tx";
import {
  insertOrder,
  insertOrderItems,
  logOrderStatus
} from "@/modules/orders/repository";
import type { CreateOrderInput } from "@/modules/orders/types";

export type CheckoutInput = {
  cartId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: Record<string, unknown>;
};

type CheckoutCart = {
  id: string;
  status: "active" | "converted" | "abandoned";
  currency: string;
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    options: Record<string, unknown>;
    quantity: number;
    unitPriceAmount: number;
    lineTotalAmount: number;
    available: number;
  }>;
  subtotalAmount: number;
};

type InventoryRow = {
  variant_id: string;
  warehouse_id: string;
  available: number;
};

function createOrderNumber() {
  const date = new Date();
  const stamp = date
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  return `ORD-${stamp}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

async function getCheckoutCart(
  client: DbClient,
  cartId: string
): Promise<CheckoutCart | null> {
  const cart = await client.query<{
    id: string;
    status: CheckoutCart["status"];
    currency: string;
  }>(
    `
      select id, status, currency
      from carts
      where id = $1
      for update
    `,
    [cartId]
  );

  const cartRow = cart.rows[0];
  if (!cartRow) return null;

  const items = await client.query<{
    id: string;
    variant_id: string;
    product_name: string;
    variant_name: string | null;
    sku: string;
    options: Record<string, unknown>;
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
        v.options,
        ci.quantity,
        v.price_amount as unit_price_amount,
        coalesce(sum(ii.on_hand - ii.reserved - ii.safety_stock), 0)::int as available
      from cart_items ci
      join product_variants v on v.id = ci.variant_id
      join products p on p.id = v.product_id
      left join inventory_items ii on ii.variant_id = v.id
      where ci.cart_id = $1
        and p.status = 'active'
        and v.status = 'active'
      group by ci.id, ci.variant_id, p.name, v.name, v.sku, v.options, ci.quantity, v.price_amount
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
    options: row.options,
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

async function reserveCheckoutStock(client: DbClient, cart: CheckoutCart) {
  for (const item of cart.items) {
    if (item.available < item.quantity) {
      throw new Error(`${item.productName} does not have enough stock`);
    }

    let remaining = item.quantity;
    const inventory = await client.query<InventoryRow>(
      `
        select
          variant_id,
          warehouse_id,
          greatest(on_hand - reserved - safety_stock, 0)::int as available
        from inventory_items
        where variant_id = $1
          and on_hand - reserved - safety_stock > 0
        order by on_hand - reserved - safety_stock desc
        for update
      `,
      [item.variantId]
    );

    for (const row of inventory.rows) {
      if (remaining <= 0) break;

      const reservedQuantity = Math.min(remaining, row.available);
      await client.query(
        `
          update inventory_items
          set reserved = reserved + $3
          where variant_id = $1 and warehouse_id = $2
        `,
        [row.variant_id, row.warehouse_id, reservedQuantity]
      );
      remaining -= reservedQuantity;
    }

    if (remaining > 0) {
      throw new Error(`${item.productName} does not have enough stock`);
    }
  }
}

export async function checkoutCart(input: CheckoutInput) {
  return withTransaction(async (client) => {
    const cart = await getCheckoutCart(client, input.cartId);

    if (!cart || cart.status !== "active") {
      throw new Error("Active cart not found");
    }

    if (cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    await reserveCheckoutStock(client, cart);

    const shippingFeeAmount = cart.subtotalAmount >= 300000 ? 0 : 9900;
    const taxAmount = Math.round(cart.subtotalAmount * 0.07);
    const totals = {
      subtotalAmount: cart.subtotalAmount,
      discountAmount: 0,
      shippingFeeAmount,
      taxAmount,
      grandTotalAmount: cart.subtotalAmount + shippingFeeAmount + taxAmount
    };

    const orderInput: CreateOrderInput = {
      orderNumber: createOrderNumber(),
      cartId: cart.id,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      shippingAddress: input.shippingAddress,
      totals,
      items: cart.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        sku: item.sku,
        options: item.options,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount
      }))
    };

    const orderId = await insertOrder(client, orderInput);
    await insertOrderItems(client, orderId, orderInput.items);
    await logOrderStatus(client, orderId, "pending_payment", "Order created");
    await client.query(
      `
        update carts
        set status = 'converted'
        where id = $1 and status = 'active'
      `,
      [cart.id]
    );

    return {
      orderId,
      orderNumber: orderInput.orderNumber,
      totals
    };
  });
}
