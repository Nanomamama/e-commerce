export type PromotionType = "percentage" | "fixed_amount" | "free_shipping";

export type Coupon = {
  id: string;
  promotionId: string;
  code: string;
  isActive: boolean;
};
