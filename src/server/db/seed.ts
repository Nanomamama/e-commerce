import { pool } from "./pool";
import { hashPassword } from "../auth/password";
import { loadLocalEnv } from "../env";

loadLocalEnv();

const products = [
  {
    slug: "everyday-cotton-shirt",
    name: "Everyday Cotton Shirt",
    description: "เสื้อคอตตอนทรงตรงสำหรับใส่ทำงานและวันหยุด",
    sku: "SHIRT-COTTON-WHITE",
    variantName: "White / M",
    priceAmount: 129000,
    onHand: 32
  },
  {
    slug: "canvas-market-tote",
    name: "Canvas Market Tote",
    description: "กระเป๋าผ้าแคนวาสหนา ช่องกว้าง พกของได้เยอะ",
    sku: "TOTE-CANVAS-NATURAL",
    variantName: "Natural",
    priceAmount: 89000,
    onHand: 48
  },
  {
    slug: "ceramic-desk-cup",
    name: "Ceramic Desk Cup",
    description: "แก้วเซรามิกผิวด้านสำหรับโต๊ะทำงาน",
    sku: "CUP-CERAMIC-MOSS",
    variantName: "Moss",
    priceAmount: 59000,
    onHand: 24
  }
];

async function run() {
  const client = await pool.connect();

  try {
    await client.query("begin");

    const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
    const adminPassword =
      process.env.ADMIN_PASSWORD ??
      (process.env.NODE_ENV === "production" ? undefined : "admin12345");

    if (adminPassword) {
      await client.query(
        `
          insert into users (email, password_hash, name, role, status)
          values ($1, $2, 'Admin', 'admin', 'active')
          on conflict (email) do update set
            password_hash = excluded.password_hash,
            role = 'admin',
            status = 'active'
        `,
        [adminEmail.toLowerCase(), await hashPassword(adminPassword)]
      );
    }

    const warehouse = await client.query<{ id: string }>(`
      insert into warehouses (code, name, address_summary)
      values ('MAIN', 'Main warehouse', 'Default fulfillment location')
      on conflict (code) do update set
        name = excluded.name,
        address_summary = excluded.address_summary
      returning id
    `);

    for (const item of products) {
      const product = await client.query<{ id: string }>(
        `
          insert into products (slug, name, description, status)
          values ($1, $2, $3, 'active')
          on conflict (slug) do update set
            name = excluded.name,
            description = excluded.description,
            status = 'active'
          returning id
        `,
        [item.slug, item.name, item.description]
      );

      const variant = await client.query<{ id: string }>(
        `
          insert into product_variants (
            product_id,
            sku,
            name,
            price_amount,
            status
          )
          values ($1, $2, $3, $4, 'active')
          on conflict (sku) do update set
            name = excluded.name,
            price_amount = excluded.price_amount,
            status = 'active'
          returning id
        `,
        [
          product.rows[0].id,
          item.sku,
          item.variantName,
          item.priceAmount
        ]
      );

      await client.query(
        `
          insert into inventory_items (variant_id, warehouse_id, on_hand)
          values ($1, $2, $3)
          on conflict (variant_id, warehouse_id) do update set
            on_hand = excluded.on_hand
        `,
        [variant.rows[0].id, warehouse.rows[0].id, item.onHand]
      );
    }

    await client.query("commit");
    console.log(`seeded ${products.length} products`);
    if (adminPassword) {
      console.log(`seeded admin user ${adminEmail}`);
    }
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
