export type ProductStatus = "draft" | "active" | "archived";

export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: ProductStatus;
  categoryId: string | null;
};

export type ProductVariant = {
  id: string;
  productId: string;
  sku: string;
  name: string | null;
  options: Record<string, unknown>;
  priceAmount: number;
  currency: string;
};
