import { pool } from "@/server/db/pool";
import type { OrderStatus } from "@/modules/orders/types";

export type DashboardRange = "7d" | "30d" | "90d";

export type DashboardSummary = {
  range: DashboardRange;
  sales: {
    orderCount: number;
    grossAmount: number;
    averageOrderAmount: number;
  };
  customers: {
    totalCustomers: number;
    newCustomers: number;
  };
  payments: {
    paidAmount: number;
    unpaidOrders: number;
  };
  fulfillment: {
    unfulfilledOrders: number;
    shippedOrders: number;
  };
  inventory: {
    lowStockCount: number;
  };
};

export type SalesChartPoint = {
  date: string;
  orderCount: number;
  grossAmount: number;
};

export type TopProduct = {
  productName: string;
  sku: string;
  quantitySold: number;
  grossAmount: number;
};

export type LowStockItem = {
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  available: number;
  safetyStock: number;
};

function daysForRange(range: DashboardRange) {
  if (range === "90d") return 90;
  if (range === "30d") return 30;
  return 7;
}

export function normalizeDashboardRange(value: string | null): DashboardRange {
  if (value === "30d" || value === "90d") {
    return value;
  }

  return "7d";
}

export async function getDashboardSummary(
  range: DashboardRange
): Promise<DashboardSummary> {
  const days = daysForRange(range);
  const result = await pool.query<{
    order_count: number;
    gross_amount: number;
    average_order_amount: number;
    total_customers: number;
    new_customers: number;
    paid_amount: number;
    unpaid_orders: number;
    unfulfilled_orders: number;
    shipped_orders: number;
    low_stock_count: number;
  }>(
    `
      select
        (
          select count(*)::int
          from orders
          where created_at >= now() - ($1::int * interval '1 day')
        ) as order_count,
        (
          select coalesce(sum(grand_total_amount), 0)::int
          from orders
          where created_at >= now() - ($1::int * interval '1 day')
            and status <> 'cancelled'
        ) as gross_amount,
        (
          select coalesce(avg(grand_total_amount), 0)::int
          from orders
          where created_at >= now() - ($1::int * interval '1 day')
            and status <> 'cancelled'
        ) as average_order_amount,
        (
          select count(*)::int
          from users
          where role = 'customer'
        ) as total_customers,
        (
          select count(*)::int
          from users
          where role = 'customer'
            and created_at >= now() - ($1::int * interval '1 day')
        ) as new_customers,
        (
          select coalesce(sum(amount), 0)::int
          from payments
          where status = 'paid'
            and created_at >= now() - ($1::int * interval '1 day')
        ) as paid_amount,
        (
          select count(*)::int
          from orders
          where payment_status = 'unpaid'
        ) as unpaid_orders,
        (
          select count(*)::int
          from orders
          where fulfillment_status in ('unfulfilled', 'preparing')
            and status not in ('cancelled', 'refunded')
        ) as unfulfilled_orders,
        (
          select count(*)::int
          from orders
          where fulfillment_status in ('shipped', 'delivered')
        ) as shipped_orders,
        (
          select count(*)::int
          from inventory_items
          where greatest(on_hand - reserved - safety_stock, 0) <= safety_stock
        ) as low_stock_count
    `,
    [days]
  );

  const row = result.rows[0];

  return {
    range,
    sales: {
      orderCount: row.order_count,
      grossAmount: row.gross_amount,
      averageOrderAmount: row.average_order_amount
    },
    customers: {
      totalCustomers: row.total_customers,
      newCustomers: row.new_customers
    },
    payments: {
      paidAmount: row.paid_amount,
      unpaidOrders: row.unpaid_orders
    },
    fulfillment: {
      unfulfilledOrders: row.unfulfilled_orders,
      shippedOrders: row.shipped_orders
    },
    inventory: {
      lowStockCount: row.low_stock_count
    }
  };
}

export async function getSalesChart(
  range: DashboardRange
): Promise<SalesChartPoint[]> {
  const days = daysForRange(range);
  const result = await pool.query<{
    date: string;
    order_count: number;
    gross_amount: number;
  }>(
    `
      with days as (
        select generate_series(
          current_date - ($1::int - 1),
          current_date,
          interval '1 day'
        )::date as date
      )
      select
        days.date::text,
        count(o.id)::int as order_count,
        coalesce(sum(o.grand_total_amount), 0)::int as gross_amount
      from days
      left join orders o
        on o.created_at::date = days.date
        and o.status <> 'cancelled'
      group by days.date
      order by days.date asc
    `,
    [days]
  );

  return result.rows.map((row) => ({
    date: row.date,
    orderCount: row.order_count,
    grossAmount: row.gross_amount
  }));
}

export async function getTopProducts(
  range: DashboardRange
): Promise<TopProduct[]> {
  const days = daysForRange(range);
  const result = await pool.query<TopProduct>(
    `
      select
        oi.product_name as "productName",
        oi.sku,
        coalesce(sum(oi.quantity), 0)::int as "quantitySold",
        coalesce(sum(oi.line_total_amount), 0)::int as "grossAmount"
      from order_items oi
      join orders o on o.id = oi.order_id
      where o.created_at >= now() - ($1::int * interval '1 day')
        and o.status <> 'cancelled'
      group by oi.product_name, oi.sku
      order by "quantitySold" desc, "grossAmount" desc
      limit 5
    `,
    [days]
  );

  return result.rows;
}

export async function getRecentOrders(limit = 5) {
  const result = await pool.query<{
    id: string;
    order_number: string;
    customer_email: string;
    customer_name: string;
    status: OrderStatus;
    grand_total_amount: number;
    created_at: Date;
  }>(
    `
      select
        id,
        order_number,
        customer_email,
        customer_name,
        status,
        grand_total_amount,
        created_at
      from orders
      order by created_at desc
      limit $1
    `,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    status: row.status,
    grandTotalAmount: row.grand_total_amount,
    createdAt: row.created_at.toISOString()
  }));
}

export async function getLowStockSummary(): Promise<LowStockItem[]> {
  const result = await pool.query<{
    variant_id: string;
    sku: string;
    product_name: string;
    variant_name: string | null;
    available: number;
    safety_stock: number;
  }>(`
    select
      v.id as variant_id,
      v.sku,
      p.name as product_name,
      v.name as variant_name,
      greatest(coalesce(sum(i.on_hand - i.reserved - i.safety_stock), 0), 0)::int as available,
      coalesce(max(i.safety_stock), 0)::int as safety_stock
    from product_variants v
    join products p on p.id = v.product_id
    left join inventory_items i on i.variant_id = v.id
    where p.status <> 'archived'
      and v.status <> 'archived'
    group by v.id, p.name
    having greatest(coalesce(sum(i.on_hand - i.reserved - i.safety_stock), 0), 0) <= coalesce(max(i.safety_stock), 0)
    order by available asc, p.name asc
    limit 10
  `);

  return result.rows.map((row) => ({
    variantId: row.variant_id,
    sku: row.sku,
    productName: row.product_name,
    variantName: row.variant_name,
    available: row.available,
    safetyStock: row.safety_stock
  }));
}
