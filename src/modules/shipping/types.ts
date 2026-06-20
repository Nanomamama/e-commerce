export type ShipmentStatus =
  | "pending"
  | "ready_to_ship"
  | "shipped"
  | "delivered"
  | "failed"
  | "returned";

export type CreateShipmentInput = {
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  status?: ShipmentStatus;
  shippingFeeAmount?: number;
  rawPayload?: Record<string, unknown>;
};
