create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  name text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('shipping', 'billing')),
  recipient_name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  subdistrict text,
  district text not null,
  province text not null,
  postal_code text not null,
  country_code char(2) not null default 'TH',
  tax_id text,
  company_name text,
  branch_name text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger addresses_set_updated_at
before update on addresses
for each row execute function set_updated_at();

create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_set_updated_at
before update on categories
for each row execute function set_updated_at();

create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  attributes jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on products(category_id);
create index products_search_document_idx on products using gin(search_document);

create trigger products_set_updated_at
before update on products
for each row execute function set_updated_at();

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  name text,
  options jsonb not null default '{}'::jsonb,
  price_amount integer not null check (price_amount >= 0),
  compare_at_price_amount integer check (compare_at_price_amount is null or compare_at_price_amount >= 0),
  currency char(3) not null default 'THB',
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  status text not null default 'active' check (status in ('active', 'disabled', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_variants_product_id_idx on product_variants(product_id);

create trigger product_variants_set_updated_at
before update on product_variants
for each row execute function set_updated_at();

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  object_key text not null,
  public_url text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on product_images(product_id);

create table warehouses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  address_summary text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger warehouses_set_updated_at
before update on warehouses
for each row execute function set_updated_at();

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete restrict,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  safety_stock integer not null default 0 check (safety_stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, warehouse_id),
  check (reserved <= on_hand)
);

create index inventory_items_variant_id_idx on inventory_items(variant_id);
create index inventory_items_warehouse_id_idx on inventory_items(warehouse_id);

create trigger inventory_items_set_updated_at
before update on inventory_items
for each row execute function set_updated_at();

create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  session_id text,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  currency char(3) not null default 'THB',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);

create index carts_user_id_idx on carts(user_id);
create index carts_session_id_idx on carts(session_id);

create trigger carts_set_updated_at
before update on carts
for each row execute function set_updated_at();

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price_amount integer not null check (unit_price_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create trigger cart_items_set_updated_at
before update on cart_items
for each row execute function set_updated_at();

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references users(id) on delete set null,
  cart_id uuid references carts(id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  customer_phone text,
  shipping_address jsonb not null,
  billing_address jsonb,
  status text not null default 'pending_payment' check (
    status in ('pending_payment', 'paid', 'preparing', 'shipped', 'completed', 'cancelled', 'refunded')
  ),
  payment_status text not null default 'unpaid' check (
    payment_status in ('unpaid', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded')
  ),
  fulfillment_status text not null default 'unfulfilled' check (
    fulfillment_status in ('unfulfilled', 'preparing', 'shipped', 'delivered', 'returned')
  ),
  currency char(3) not null default 'THB',
  subtotal_amount integer not null check (subtotal_amount >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  shipping_fee_amount integer not null default 0 check (shipping_fee_amount >= 0),
  tax_amount integer not null default 0 check (tax_amount >= 0),
  grand_total_amount integer not null check (grand_total_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on orders(user_id);
create index orders_status_idx on orders(status);

create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  sku text not null,
  options jsonb not null default '{}'::jsonb,
  quantity integer not null check (quantity > 0),
  unit_price_amount integer not null check (unit_price_amount >= 0),
  line_total_amount integer not null check (line_total_amount >= 0),
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on order_items(order_id);

create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('percentage', 'fixed_amount', 'free_shipping')),
  value integer not null check (value >= 0),
  rules jsonb not null default '{}'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (usage_limit is null or used_count <= usage_limit)
);

create trigger promotions_set_updated_at
before update on promotions
for each row execute function set_updated_at();

create table coupons (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions(id) on delete cascade,
  code text not null unique,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (usage_limit is null or used_count <= usage_limit)
);

create trigger coupons_set_updated_at
before update on coupons
for each row execute function set_updated_at();

create table order_discounts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  coupon_id uuid references coupons(id) on delete set null,
  label text not null,
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index order_discounts_order_id_idx on order_discounts(order_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  provider text not null,
  transaction_ref text not null unique,
  amount integer not null check (amount >= 0),
  currency char(3) not null default 'THB',
  status text not null default 'pending' check (
    status in ('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  raw_payload jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_id_idx on payments(order_id);

create trigger payments_set_updated_at
before update on payments
for each row execute function set_updated_at();

create table payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payment_id uuid references payments(id) on delete set null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index payment_webhook_events_payment_id_idx on payment_webhook_events(payment_id);

create table shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  carrier text not null,
  tracking_number text,
  status text not null default 'pending' check (
    status in ('pending', 'ready_to_ship', 'shipped', 'delivered', 'failed', 'returned')
  ),
  shipping_fee_amount integer not null default 0 check (shipping_fee_amount >= 0),
  raw_payload jsonb not null default '{}'::jsonb,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_order_id_idx on shipments(order_id);
create index shipments_tracking_number_idx on shipments(tracking_number);

create trigger shipments_set_updated_at
before update on shipments
for each row execute function set_updated_at();

create table order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  actor_user_id uuid references users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index order_status_events_order_id_idx on order_status_events(order_id);
