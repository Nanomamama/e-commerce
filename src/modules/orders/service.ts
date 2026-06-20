import { withTransaction } from "@/server/db/tx";
import { insertOrder, insertOrderItems, logOrderStatus } from "./repository";
import type { CreateOrderInput } from "./types";

export async function createOrder(input: CreateOrderInput): Promise<string> {
  return withTransaction(async (client) => {
    const orderId = await insertOrder(client, input);
    await insertOrderItems(client, orderId, input.items);
    await logOrderStatus(client, orderId, "pending_payment", "Order created");
    return orderId;
  });
}
