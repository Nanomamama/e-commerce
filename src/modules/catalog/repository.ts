import type { DbClient } from "@/server/db/pool";
import type { ProductSummary, ProductVariant } from "./types";

export async function findActiveProducts(
  client: DbClient,
  limit = 24
): Promise<ProductSummary[]> {
  const result = await client.query<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: ProductSummary["status"];
    category_id: string | null;
  }>(
    `
      select id, slug, name, description, status, category_id
      from products
      where status = 'active'
      order by created_at desc
      limit $1
    `,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    categoryId: row.category_id
  }));
}

export async function findVariantBySku(
  client: DbClient,
  sku: string
): Promise<ProductVariant | null> {
  const result = await client.query<{
    id: string;
    product_id: string;
    sku: string;
    name: string | null;
    options: Record<string, unknown>;
    price_amount: number;
    currency: string;
  }>(
    `
      select id, product_id, sku, name, options, price_amount, currency
      from product_variants
      where sku = $1 and status = 'active'
    `,
    [sku]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    options: row.options,
    priceAmount: row.price_amount,
    currency: row.currency
  };
}
