export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export type CreatePaymentInput = {
  orderId: string;
  provider: string;
  transactionRef: string;
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  rawPayload?: Record<string, unknown>;
};

export type WebhookEventInput = {
  provider: string;
  eventId: string;
  paymentId?: string;
  payload: Record<string, unknown>;
};
