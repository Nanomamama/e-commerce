import type { DbClient } from "@/server/db/pool";
import type { CreateShipmentInput } from "./types";

export async function insertShipment(
  client: DbClient,
  input: CreateShipmentInput
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      insert into shipments (
        order_id,
        carrier,
        tracking_number,
        status,
        shipping_fee_amount,
        raw_payload
      )
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [
      input.orderId,
      input.carrier,
      input.trackingNumber ?? null,
      input.status ?? "pending",
      input.shippingFeeAmount ?? 0,
      input.rawPayload ?? {}
    ]
  );

  return result.rows[0].id;
}
