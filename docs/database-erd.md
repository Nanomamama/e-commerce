# Database ERD

```mermaid
erDiagram
  users ||--o{ addresses : has
  users ||--o{ carts : owns
  users ||--o{ orders : places

  categories ||--o{ categories : parent
  categories ||--o{ products : contains
  products ||--o{ product_variants : has
  products ||--o{ product_images : has

  warehouses ||--o{ inventory_items : stores
  product_variants ||--o{ inventory_items : tracked_by

  carts ||--o{ cart_items : contains
  product_variants ||--o{ cart_items : selected

  orders ||--o{ order_items : contains
  orders ||--o{ payments : paid_by
  orders ||--o{ shipments : ships_by
  orders ||--o{ order_status_events : logs
  product_variants ||--o{ order_items : snapshot_from

  promotions ||--o{ coupons : issues
  coupons ||--o{ order_discounts : applied_as
  orders ||--o{ order_discounts : has

  payments ||--o{ payment_webhook_events : receives
```

## Design Notes

- UUID primary keys are generated with `gen_random_uuid()` from `pgcrypto`.
- Money values are stored as integer minor units, such as satang for THB.
- Order items store product, variant, SKU, option, and price snapshots.
- Inventory uses `on_hand`, `reserved`, and `safety_stock`; availability is `on_hand - reserved - safety_stock`.
- Stock reservation code locks `inventory_items` with `select ... for update`.
- Payment webhooks are idempotent through unique `(provider, event_id)`.
- Promotions and coupons have separate usage counters and usage limits.
