import { pool } from "@/server/db/pool";
import { withTransaction } from "@/server/db/tx";

export type StorefrontProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "archived";
  imageUrl: string | null;
  variantId: string;
  sku: string;
  variantName: string | null;
  priceAmount: number;
  currency: string;
  available: number;
};

export type StorefrontCategory = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type StorefrontProductFilters = {
  query?: string;
  categorySlug?: string;
  minPriceAmount?: number;
  maxPriceAmount?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  limit?: number;
};

export type CreateAdminProductInput = {
  name: string;
  slug: string;
  description?: string;
  sku: string;
  variantName?: string;
  priceAmount: number;
  onHand: number;
  status?: "draft" | "active" | "archived";
};

export type UpdateAdminProductInput = CreateAdminProductInput & {
  productId: string;
  variantId: string;
};

export async function listStorefrontProducts(
  filter: StorefrontProductFilters = {}
): Promise<StorefrontProduct[]> {
  const result = await pool.query<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: StorefrontProduct["status"];
    variant_id: string;
    sku: string;
    variant_name: string | null;
    price_amount: number;
    currency: string;
    available: number;
    image_url: string | null;
  }>(
    `
    select
      p.id,
      p.slug,
      p.name,
      p.description,
      p.status,
      v.id as variant_id,
      v.sku,
      v.name as variant_name,
      v.price_amount,
      v.currency,
      image.public_url as image_url,
      coalesce(sum(i.on_hand - i.reserved - i.safety_stock), 0)::int as available
    from products p
    join product_variants v on v.product_id = p.id
    left join inventory_items i on i.variant_id = v.id
    left join lateral (
      select public_url
      from product_images
      where product_id = p.id
      order by sort_order asc, created_at desc
      limit 1
    ) image on true
    left join categories c on c.id = p.category_id
    where p.status = 'active'
      and v.status = 'active'
      and ($1::text is null or p.search_document @@ plainto_tsquery('simple', $1) or p.name ilike '%' || $1 || '%' or v.sku ilike '%' || $1 || '%')
      and ($2::text is null or c.slug = $2)
      and ($3::int is null or v.price_amount >= $3)
      and ($4::int is null or v.price_amount <= $4)
    group by p.id, v.id, image.public_url
    order by
      case when $5 = 'price_asc' then v.price_amount end asc,
      case when $5 = 'price_desc' then v.price_amount end desc,
      case when $5 = 'name' then p.name end asc,
      p.created_at desc,
      v.created_at asc
    limit $6
  `,
    [
      filter.query?.trim() || null,
      filter.categorySlug ?? null,
      filter.minPriceAmount ?? null,
      filter.maxPriceAmount ?? null,
      filter.sort ?? "newest",
      filter.limit ?? 48
    ]
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    imageUrl: row.image_url,
    variantId: row.variant_id,
    sku: row.sku,
    variantName: row.variant_name,
    priceAmount: row.price_amount,
    currency: row.currency,
    available: row.available
  }));
}

export async function getStorefrontProductBySlug(slug: string) {
  const products = await listStorefrontProducts({ limit: 200 });
  const product = products.find((item) => item.slug === slug);

  if (!product) return null;

  const [variants, images, category] = await Promise.all([
    pool.query<{
      id: string;
      sku: string;
      name: string | null;
      options: Record<string, unknown>;
      price_amount: number;
      compare_at_price_amount: number | null;
      currency: string;
      available: number;
    }>(
      `
        select
          v.id,
          v.sku,
          v.name,
          v.options,
          v.price_amount,
          v.compare_at_price_amount,
          v.currency,
          coalesce(sum(i.on_hand - i.reserved - i.safety_stock), 0)::int as available
        from product_variants v
        left join inventory_items i on i.variant_id = v.id
        where v.product_id = $1 and v.status = 'active'
        group by v.id
        order by v.created_at asc
      `,
      [product.id]
    ),
    pool.query<{
      id: string;
      public_url: string | null;
      alt_text: string | null;
      sort_order: number;
    }>(
      `
        select id, public_url, alt_text, sort_order
        from product_images
        where product_id = $1
        order by sort_order asc, created_at desc
      `,
      [product.id]
    ),
    pool.query<StorefrontCategory>(
      `
        select c.id, c.parent_id as "parentId", c.slug, c.name,
          c.description, c.sort_order as "sortOrder"
        from products p
        join categories c on c.id = p.category_id
        where p.id = $1 and c.is_active = true
      `,
      [product.id]
    )
  ]);

  return {
    ...product,
    category: category.rows[0] ?? null,
    variants: variants.rows.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      name: variant.name,
      options: variant.options,
      priceAmount: variant.price_amount,
      compareAtPriceAmount: variant.compare_at_price_amount,
      currency: variant.currency,
      available: variant.available
    })),
    images: images.rows.map((image) => ({
      id: image.id,
      publicUrl: image.public_url,
      altText: image.alt_text,
      sortOrder: image.sort_order
    }))
  };
}

export async function listCategories(): Promise<StorefrontCategory[]> {
  const result = await pool.query<StorefrontCategory>(
    `
      select id, parent_id as "parentId", slug, name, description,
        sort_order as "sortOrder"
      from categories
      where is_active = true
      order by sort_order asc, name asc
    `
  );

  return result.rows;
}

export async function getCategoryBySlug(slug: string) {
  const result = await pool.query<StorefrontCategory>(
    `
      select id, parent_id as "parentId", slug, name, description,
        sort_order as "sortOrder"
      from categories
      where slug = $1 and is_active = true
    `,
    [slug]
  );

  return result.rows[0] ?? null;
}

export async function getSearchSuggestions(query: string) {
  const result = await pool.query<{ label: string }>(
    `
      select label
      from (
        select p.name as label, p.created_at
        from products p
        where p.status = 'active'
          and ($1::text = '' or p.name ilike '%' || $1 || '%')
        union all
        select v.sku as label, v.created_at
        from product_variants v
        join products p on p.id = v.product_id
        where p.status = 'active'
          and v.status = 'active'
          and ($1::text = '' or v.sku ilike '%' || $1 || '%')
      ) suggestions
      order by created_at desc
      limit 8
    `,
    [query.trim()]
  );

  return result.rows.map((row) => row.label);
}

export async function listAdminProducts(): Promise<StorefrontProduct[]> {
  const result = await pool.query<{
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: StorefrontProduct["status"];
    variant_id: string;
    sku: string;
    variant_name: string | null;
    price_amount: number;
    currency: string;
    available: number;
    image_url: string | null;
  }>(`
    select
      p.id,
      p.slug,
      p.name,
      p.description,
      p.status,
      v.id as variant_id,
      v.sku,
      v.name as variant_name,
      v.price_amount,
      v.currency,
      image.public_url as image_url,
      coalesce(sum(i.on_hand - i.reserved - i.safety_stock), 0)::int as available
    from products p
    join product_variants v on v.product_id = p.id
    left join inventory_items i on i.variant_id = v.id
    left join lateral (
      select public_url
      from product_images
      where product_id = p.id
      order by sort_order asc, created_at desc
      limit 1
    ) image on true
    group by p.id, v.id, image.public_url
    order by p.created_at desc, v.created_at asc
  `);

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    imageUrl: row.image_url,
    variantId: row.variant_id,
    sku: row.sku,
    variantName: row.variant_name,
    priceAmount: row.price_amount,
    currency: row.currency,
    available: row.available
  }));
}

export async function createAdminProduct(input: CreateAdminProductInput) {
  return withTransaction(async (client) => {
    const warehouse = await client.query<{ id: string }>(`
      insert into warehouses (code, name, address_summary)
      values ('MAIN', 'Main warehouse', 'Default fulfillment location')
      on conflict (code) do update set name = excluded.name
      returning id
    `);

    const product = await client.query<{ id: string }>(
      `
        insert into products (slug, name, description, status)
        values ($1, $2, $3, $4)
        returning id
      `,
      [
        input.slug,
        input.name,
        input.description ?? null,
        input.status ?? "active"
      ]
    );

    const variant = await client.query<{ id: string }>(
      `
        insert into product_variants (product_id, sku, name, price_amount)
        values ($1, $2, $3, $4)
        returning id
      `,
      [
        product.rows[0].id,
        input.sku,
        input.variantName ?? null,
        input.priceAmount
      ]
    );

    await client.query(
      `
        insert into inventory_items (variant_id, warehouse_id, on_hand)
        values ($1, $2, $3)
        on conflict (variant_id, warehouse_id)
        do update set on_hand = excluded.on_hand
      `,
      [variant.rows[0].id, warehouse.rows[0].id, input.onHand]
    );

    return {
      productId: product.rows[0].id,
      variantId: variant.rows[0].id
    };
  });
}

export async function updateAdminProduct(input: UpdateAdminProductInput) {
  return withTransaction(async (client) => {
    const warehouse = await client.query<{ id: string }>(`
      insert into warehouses (code, name, address_summary)
      values ('MAIN', 'Main warehouse', 'Default fulfillment location')
      on conflict (code) do update set name = excluded.name
      returning id
    `);

    await client.query(
      `
        update products
        set slug = $2,
            name = $3,
            description = $4,
            status = $5
        where id = $1
      `,
      [
        input.productId,
        input.slug,
        input.name,
        input.description ?? null,
        input.status ?? "active"
      ]
    );

    await client.query(
      `
        update product_variants
        set sku = $2,
            name = $3,
            price_amount = $4,
            status = case when $5 = 'active' then 'active' else 'archived' end
        where id = $1 and product_id = $6
      `,
      [
        input.variantId,
        input.sku,
        input.variantName ?? null,
        input.priceAmount,
        input.status ?? "active",
        input.productId
      ]
    );

    await client.query(
      `
        insert into inventory_items (variant_id, warehouse_id, on_hand)
        values ($1, $2, $3)
        on conflict (variant_id, warehouse_id)
        do update set on_hand = excluded.on_hand
      `,
      [input.variantId, warehouse.rows[0].id, input.onHand]
    );

    return {
      productId: input.productId,
      variantId: input.variantId
    };
  });
}

export async function archiveAdminProduct(productId: string) {
  await withTransaction(async (client) => {
    await client.query(
      "update products set status = 'archived' where id = $1",
      [productId]
    );
    await client.query(
      "update product_variants set status = 'archived' where product_id = $1",
      [productId]
    );
  });
}

export async function attachProductImage(input: {
  productId: string;
  objectKey: string;
  publicUrl: string;
  altText?: string;
}) {
  await withTransaction(async (client) => {
    await client.query(
      `
        update product_images
        set sort_order = sort_order + 1
        where product_id = $1
      `,
      [input.productId]
    );

    await client.query(
      `
        insert into product_images (
          product_id,
          object_key,
          public_url,
          alt_text,
          sort_order
        )
        values ($1, $2, $3, $4, 0)
      `,
      [
        input.productId,
        input.objectKey,
        input.publicUrl,
        input.altText ?? null
      ]
    );
  });
}
