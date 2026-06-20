import { pool } from "@/server/db/pool";
import { withTransaction } from "@/server/db/tx";
import type { OrderStatus } from "./types";
import { logOrderStatus } from "./repository";

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: string;
  fulfillmentStatus: string;
  grandTotalAmount: number;
  createdAt: string;
  items: Array<{
    productName: string;
    sku: string;
    quantity: number;
    lineTotalAmount: number;
  }>;
};

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const result = await pool.query<{
    id: string;
    order_number: string;
    customer_email: string;
    customer_name: string;
    status: OrderStatus;
    payment_status: string;
    fulfillment_status: string;
    grand_total_amount: number;
    created_at: Date;
    items: AdminOrder["items"];
  }>(`
    select
      o.id,
      o.order_number,
      o.customer_email,
      o.customer_name,
      o.status,
      o.payment_status,
      o.fulfillment_status,
      o.grand_total_amount,
      o.created_at,
      coalesce(
        json_agg(
          json_build_object(
            'productName', oi.product_name,
            'sku', oi.sku,
            'quantity', oi.quantity,
            'lineTotalAmount', oi.line_total_amount
          )
          order by oi.created_at asc
        ) filter (where oi.id is not null),
        '[]'::json
      ) as items
    from orders o
    left join order_items oi on oi.order_id = o.id
    group by o.id
    order by o.created_at desc
    limit 50
  `);

  return result.rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfillmentStatus: row.fulfillment_status,
    grandTotalAmount: row.grand_total_amount,
    createdAt: row.created_at.toISOString(),
    items: row.items
  }));
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
) {
  await withTransaction(async (client) => {
    const current = await client.query<{ status: OrderStatus }>(
      "select status from orders where id = $1 for update",
      [orderId]
    );

    const previous = current.rows[0];
    if (!previous) {
      throw new Error("Order not found");
    }

    await client.query("update orders set status = $2 where id = $1", [
      orderId,
      status
    ]);

    await logOrderStatus(
      client,
      orderId,
      status,
      note ?? `Status changed from ${previous.status} to ${status}`
    );
  });
}
