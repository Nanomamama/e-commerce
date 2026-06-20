import { withTransaction } from "@/server/db/tx";
import { reserveStock } from "@/modules/inventory/service";
import { createOrder } from "@/modules/orders/service";
import type { CreateOrderInput } from "@/modules/orders/types";
import { getCartDetails } from "@/modules/cart/details";
import { pool } from "@/server/db/pool";

export type CheckoutInput = {
  cartId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: Record<string, unknown>;
};

export async function checkoutCart(input: CheckoutInput) {
  const cart = await getCartDetails(input.cartId);

  if (!cart || cart.status !== "active") {
    throw new Error("Active cart not found");
  }

  if (cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  for (const item of cart.items) {
    if (item.available < item.quantity) {
      throw new Error(`${item.productName} does not have enough stock`);
    }
  }

  const shippingFeeAmount = cart.subtotalAmount >= 300000 ? 0 : 9900;
  const taxAmount = Math.round(cart.subtotalAmount * 0.07);
  const totals = {
    subtotalAmount: cart.subtotalAmount,
    discountAmount: 0,
    shippingFeeAmount,
    taxAmount,
    grandTotalAmount: cart.subtotalAmount + shippingFeeAmount + taxAmount
  };

  const warehouses = await pool.query<{
    variant_id: string;
    warehouse_id: string;
  }>(
    `
      select distinct on (variant_id)
        variant_id,
        warehouse_id
      from inventory_items
      where variant_id = any($1::uuid[])
        and on_hand - reserved - safety_stock > 0
      order by variant_id, on_hand - reserved - safety_stock desc
    `,
    [cart.items.map((item) => item.variantId)]
  );

  const warehouseByVariant = new Map(
    warehouses.rows.map((row) => [row.variant_id, row.warehouse_id])
  );

  await reserveStock(
    cart.items.map((item) => {
      const warehouseId = warehouseByVariant.get(item.variantId);

      if (!warehouseId) {
        throw new Error(`${item.productName} has no fulfillable stock`);
      }

      return {
        variantId: item.variantId,
        warehouseId,
        quantity: item.quantity
      };
    })
  );

  const orderInput: CreateOrderInput = {
    orderNumber: `ORD-${Date.now()}`,
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
      options: {},
      quantity: item.quantity,
      unitPriceAmount: item.unitPriceAmount
    }))
  };

  const orderId = await createOrder(orderInput);

  await withTransaction((client) =>
    client
      .query("update carts set status = 'converted' where id = $1", [cart.id])
      .then(() => undefined)
  );

  return {
    orderId,
    orderNumber: orderInput.orderNumber,
    totals
  };
}
