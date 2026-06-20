import type { DbClient } from "@/server/db/pool";
import type { CreateOrderInput } from "./types";

export async function insertOrder(
  client: DbClient,
  input: CreateOrderInput
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      insert into orders (
        order_number,
        user_id,
        cart_id,
        customer_email,
        customer_name,
        customer_phone,
        shipping_address,
        billing_address,
        subtotal_amount,
        discount_amount,
        shipping_fee_amount,
        tax_amount,
        grand_total_amount
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      returning id
    `,
    [
      input.orderNumber,
      input.userId ?? null,
      input.cartId ?? null,
      input.customerEmail,
      input.customerName,
      input.customerPhone ?? null,
      input.shippingAddress,
      input.billingAddress ?? null,
      input.totals.subtotalAmount,
      input.totals.discountAmount,
      input.totals.shippingFeeAmount,
      input.totals.taxAmount,
      input.totals.grandTotalAmount
    ]
  );

  return result.rows[0].id;
}

export async function insertOrderItems(
  client: DbClient,
  orderId: string,
  items: CreateOrderInput["items"]
) {
  for (const item of items) {
    await client.query(
      `
        insert into order_items (
          order_id,
          variant_id,
          product_name,
          variant_name,
          sku,
          options,
          quantity,
          unit_price_amount,
          line_total_amount
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        orderId,
        item.variantId,
        item.productName,
        item.variantName,
        item.sku,
        item.options,
        item.quantity,
        item.unitPriceAmount,
        item.quantity * item.unitPriceAmount
      ]
    );
  }
}

export async function logOrderStatus(
  client: DbClient,
  orderId: string,
  toStatus: string,
  note?: string
) {
  await client.query(
    `
      insert into order_status_events (order_id, to_status, note)
      values ($1, $2, $3)
    `,
    [orderId, toStatus, note ?? null]
  );
}
