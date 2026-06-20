import {
  listAdminOrders,
  updateAdminOrderStatus
} from "@/modules/orders/admin";
import {
  jsonError,
  jsonOk,
  readJson,
  requireString,
  statusFromError
} from "@/server/api";
import { requireAdmin } from "@/server/auth/request";
import type { OrderStatus } from "@/modules/orders/types";

const allowedStatuses: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "shipped",
  "completed",
  "cancelled",
  "refunded"
];

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const orders = await listAdminOrders();
    return jsonOk({ orders });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to load orders",
      statusFromError(error, 500)
    );
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);

    const body = await readJson<{
      orderId?: string;
      status?: OrderStatus;
      note?: string;
    }>(request);

    const status = requireString(body.status, "status") as OrderStatus;

    if (!allowedStatuses.includes(status)) {
      return jsonError("Invalid order status");
    }

    await updateAdminOrderStatus(
      requireString(body.orderId, "orderId"),
      status,
      body.note
    );

    return jsonOk({ updated: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unable to update order",
      statusFromError(error)
    );
  }
}
