export type CartItemInput = {
  cartId: string;
  variantId: string;
  quantity: number;
  unitPriceAmount: number;
};

export type Cart = {
  id: string;
  userId: string | null;
  sessionId: string | null;
  status: "active" | "converted" | "abandoned";
};
