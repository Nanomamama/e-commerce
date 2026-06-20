import { withTransaction } from "@/server/db/tx";
import {
  insertPayment,
  insertWebhookEventIfNew,
  markWebhookProcessed
} from "./repository";
import type { CreatePaymentInput, WebhookEventInput } from "./types";

export async function createPayment(input: CreatePaymentInput): Promise<string> {
  return withTransaction((client) => insertPayment(client, input));
}

export async function recordPaymentWebhook(input: WebhookEventInput) {
  return withTransaction(async (client) => {
    const isNew = await insertWebhookEventIfNew(client, input);

    if (!isNew) {
      return { duplicate: true };
    }

    await markWebhookProcessed(client, input.provider, input.eventId);
    return { duplicate: false };
  });
}
