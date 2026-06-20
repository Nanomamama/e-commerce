import type { DbClient } from "@/server/db/pool";
import type { Coupon } from "./types";

export async function findActiveCoupon(
  client: DbClient,
  code: string
): Promise<Coupon | null> {
  const result = await client.query<{
    id: string;
    promotion_id: string;
    code: string;
    is_active: boolean;
  }>(
    `
      select c.id, c.promotion_id, c.code, c.is_active
      from coupons c
      join promotions p on p.id = c.promotion_id
      where upper(c.code) = upper($1)
        and c.is_active = true
        and p.is_active = true
        and (p.starts_at is null or p.starts_at <= now())
        and (p.ends_at is null or p.ends_at > now())
        and (c.usage_limit is null or c.used_count < c.usage_limit)
        and (p.usage_limit is null or p.used_count < p.usage_limit)
    `,
    [code]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id,
    promotionId: row.promotion_id,
    code: row.code,
    isActive: row.is_active
  };
}
