import type { DbClient } from "@/server/db/pool";
import type { CreatePaymentInput, WebhookEventInput } from "./types";

export async function insertPayment(
  client: DbClient,
  input: CreatePaymentInput
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      insert into payments (
        order_id,
        provider,
        transaction_ref,
        amount,
        currency,
        status,
        raw_payload
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id
    `,
    [
      input.orderId,
      input.provider,
      input.transactionRef,
      input.amount,
      input.currency ?? "THB",
      input.status ?? "pending",
      input.rawPayload ?? {}
    ]
  );

  return result.rows[0].id;
}

export async function insertWebhookEventIfNew(
  client: DbClient,
  input: WebhookEventInput
): Promise<boolean> {
  const result = await client.query<{ id: string }>(
    `
      insert into payment_webhook_events (provider, event_id, payment_id, payload)
      values ($1, $2, $3, $4)
      on conflict (provider, event_id) do nothing
      returning id
    `,
    [input.provider, input.eventId, input.paymentId ?? null, input.payload]
  );

  return result.rowCount === 1;
}

export async function markWebhookProcessed(
  client: DbClient,
  provider: string,
  eventId: string
) {
  await client.query(
    `
      update payment_webhook_events
      set processed_at = now()
      where provider = $1 and event_id = $2
    `,
    [provider, eventId]
  );
}
