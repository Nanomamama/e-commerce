export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderTotals = {
  subtotalAmount: number;
  discountAmount: number;
  shippingFeeAmount: number;
  taxAmount: number;
  grandTotalAmount: number;
};

export type OrderItemInput = {
  variantId: string | null;
  productName: string;
  variantName: string | null;
  sku: string;
  options: Record<string, unknown>;
  quantity: number;
  unitPriceAmount: number;
};

export type CreateOrderInput = {
  orderNumber: string;
  userId?: string;
  cartId?: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  shippingAddress: Record<string, unknown>;
  billingAddress?: Record<string, unknown>;
  totals: OrderTotals;
  items: OrderItemInput[];
};
