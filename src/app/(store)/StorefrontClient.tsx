"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  variantId: string;
  sku: string;
  variantName: string | null;
  priceAmount: number;
  currency: string;
  available: number;
};

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Cart = {
  id: string;
  status: "active" | "converted" | "abandoned";
  items: Array<{
    id: string;
    variantId: string;
    productName: string;
    variantName: string | null;
    sku: string;
    quantity: number;
    unitPriceAmount: number;
    lineTotalAmount: number;
    available: number;
  }>;
  subtotalAmount: number;
};

type CheckoutResult = {
  orderId: string;
  orderNumber: string;
  totals: {
    subtotalAmount: number;
    shippingFeeAmount: number;
    taxAmount: number;
    grandTotalAmount: number;
  };
};

function formatMoney(amount: number, currency = "THB") {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency
  }).format(amount / 100);
}

function getSessionId() {
  const existing = window.localStorage.getItem("commerce-session-id");

  if (existing) return existing;

  const next = crypto.randomUUID();
  window.localStorage.setItem("commerce-session-id", next);
  return next;
}

export default function StorefrontClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(
    null
  );
  const [checkout, setCheckout] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    line1: "",
    district: "",
    province: "",
    postalCode: ""
  });
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    sort: "newest"
  });

  const itemCount = useMemo(
    () => cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0,
    [cart]
  );

  async function loadCatalog(nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.q.trim()) params.set("q", nextFilters.q.trim());
    if (nextFilters.category) params.set("category", nextFilters.category);
    if (nextFilters.sort) params.set("sort", nextFilters.sort);

    const response = await fetch(`/api/catalog?${params.toString()}`, {
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load products");
    }

    setProducts(data.products);
  }

  async function loadCategories() {
    const response = await fetch("/api/catalog/categories", {
      cache: "no-store"
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to load categories");
    }

    setCategories(data.categories);
  }

  async function ensureCart() {
    const existingCartId = window.localStorage.getItem("commerce-cart-id");

    if (existingCartId) {
      const response = await fetch(`/api/cart?cartId=${existingCartId}`, {
        cache: "no-store"
      });

      if (response.ok) {
        const data = await response.json();

        if (data.cart?.status === "active") {
          setCart(data.cart);
          return data.cart as Cart;
        }
      }
    }

    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getSessionId() })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Unable to create cart");
    }

    const nextCart = { ...data.cart, items: [], subtotalAmount: 0 } as Cart;
    window.localStorage.setItem("commerce-cart-id", data.cart.id);
    setCart(nextCart);
    return nextCart;
  }

  useEffect(() => {
    Promise.all([loadCatalog(), loadCategories(), ensureCart()])
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "Unable to load");
      })
      .finally(() => setLoading(false));
  }, []);

  async function addToCart(product: Product) {
    setBusy(true);
    setMessage("");

    try {
      const activeCart = cart ?? (await ensureCart());
      const response = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: activeCart.id,
          variantId: product.variantId,
          quantity: 1,
          unitPriceAmount: product.priceAmount
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to add product");
      }

      setCart(data.cart);
      setMessage(`${product.name} added to cart`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add item");
    } finally {
      setBusy(false);
    }
  }

  async function changeQuantity(item: Cart["items"][number], quantity: number) {
    if (!cart || quantity < 1) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/cart/items/${item.variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: cart.id, quantity })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to update quantity");
      }

      setCart(data.cart);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to update quantity"
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(item: Cart["items"][number]) {
    if (!cart) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/cart/items/${item.variantId}?cartId=${cart.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to remove item");
      }

      setCart(data.cart);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove");
    } finally {
      setBusy(false);
    }
  }

  async function clearActiveCart() {
    if (!cart) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/cart?cartId=${cart.id}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to clear cart");
      }

      setCart(data.cart);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to clear");
    } finally {
      setBusy(false);
    }
  }

  async function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await loadCatalog(filters);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to filter");
    } finally {
      setBusy(false);
    }
  }

  async function submitCheckout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart) return;

    setBusy(true);
    setMessage("");
    setCheckoutResult(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cart.id,
          customerName: checkout.customerName,
          customerEmail: checkout.customerEmail,
          customerPhone: checkout.customerPhone,
          shippingAddress: {
            recipientName: checkout.customerName,
            phone: checkout.customerPhone,
            line1: checkout.line1,
            district: checkout.district,
            province: checkout.province,
            postalCode: checkout.postalCode,
            countryCode: "TH"
          }
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to checkout");
      }

      window.localStorage.removeItem("commerce-cart-id");
      setCheckoutResult(data);
      setMessage(`Order ${data.orderNumber} created`);
      await ensureCart();
      await loadCatalog();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to checkout");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="store-app">
      <header className="topbar">
        <div>
          <span className="eyebrow">Commerce</span>  
          <h1>Storefront</h1>
        </div>
        <div className="topbar-actions">
          <Link href="/admin">Admin</Link>
          <span>{itemCount} items</span>
        </div>
      </header>

      {message ? <div className="notice">{message}</div> : null}

      <section className="store-grid">
        <div className="workspace">
          <div className="section-heading">
            <div>
              <h2>Products</h2>
              <p>Search, filter, and add available products to cart.</p>
            </div>
            <span>{products.length} SKU</span>
          </div>

          <form className="catalog-filter" onSubmit={applyFilters}>
            <label>
              Search
              <input
                placeholder="Product name or SKU"
                value={filters.q}
                onChange={(event) =>
                  setFilters({ ...filters, q: event.target.value })
                }
              />
            </label>
            <label>
              Category
              <select
                value={filters.category}
                onChange={(event) =>
                  setFilters({ ...filters, category: event.target.value })
                }
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select
                value={filters.sort}
                onChange={(event) =>
                  setFilters({ ...filters, sort: event.target.value })
                }
              >
                <option value="newest">Newest</option>
                <option value="name">Name</option>
                <option value="price_asc">Price low to high</option>
                <option value="price_desc">Price high to low</option>
              </select>
            </label>
            <button disabled={busy} type="submit">
              Apply
            </button>
          </form>

          {loading ? (
            <div className="empty-state">Loading products</div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              No active products yet. Add products in Admin.
            </div>
          ) : (
            <div className="product-list">
              {products.map((product) => (
                <article className="product-row product-row-with-image" key={product.variantId}>
                  <div className="product-thumb">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={product.name} src={product.imageUrl} />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>
                  <div>
                    <h3>
                      <Link href={`/products/${product.slug}`}>
                        {product.name}
                      </Link>
                    </h3>
                    <p>{product.description ?? product.variantName ?? product.sku}</p>
                    <span>{product.sku}</span>
                  </div>
                  <div className="product-meta">
                    <strong>{formatMoney(product.priceAmount, product.currency)}</strong>
                    <span>Stock {product.available}</span>
                    <button
                      disabled={busy || product.available <= 0}
                      onClick={() => addToCart(product)}
                      type="button"
                    >
                      Add
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="checkout-panel">
          <div className="section-heading compact">
            <div>
              <h2>Cart</h2>
              <p>Review items before creating an order.</p>
            </div>
            {cart?.items.length ? (
              <button
                className="secondary-button"
                disabled={busy}
                onClick={clearActiveCart}
                type="button"
              >
                Clear
              </button>
            ) : null}
          </div>

          {!cart || cart.items.length === 0 ? (
            <div className="empty-state small">Your cart is empty</div>
          ) : (
            <div className="cart-lines">
              {cart.items.map((item) => (
                <div className="cart-line" key={item.id}>
                  <div>
                    <strong>{item.productName}</strong>
                    <span>
                      {item.quantity} x {formatMoney(item.unitPriceAmount)}
                    </span>
                    <div className="quantity-controls">
                      <button
                        className="secondary-button"
                        disabled={busy || item.quantity <= 1}
                        onClick={() => changeQuantity(item, item.quantity - 1)}
                        type="button"
                      >
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        className="secondary-button"
                        disabled={busy || item.quantity >= item.available}
                        onClick={() => changeQuantity(item, item.quantity + 1)}
                        type="button"
                      >
                        +
                      </button>
                      <button
                        className="secondary-button"
                        disabled={busy}
                        onClick={() => removeItem(item)}
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <strong>{formatMoney(item.lineTotalAmount)}</strong>
                </div>
              ))}
              <div className="total-line">
                <span>Subtotal</span>
                <strong>{formatMoney(cart.subtotalAmount)}</strong>
              </div>
            </div>
          )}

          <form className="checkout-form" onSubmit={submitCheckout}>
            <label>
              Recipient name
              <input
                required
                value={checkout.customerName}
                onChange={(event) =>
                  setCheckout({ ...checkout, customerName: event.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={checkout.customerEmail}
                onChange={(event) =>
                  setCheckout({ ...checkout, customerEmail: event.target.value })
                }
              />
            </label>
            <label>
              Phone
              <input
                value={checkout.customerPhone}
                onChange={(event) =>
                  setCheckout({ ...checkout, customerPhone: event.target.value })
                }
              />
            </label>
            <label>
              Address
              <textarea
                required
                value={checkout.line1}
                onChange={(event) =>
                  setCheckout({ ...checkout, line1: event.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                District
                <input
                  required
                  value={checkout.district}
                  onChange={(event) =>
                    setCheckout({ ...checkout, district: event.target.value })
                  }
                />
              </label>
              <label>
                Province
                <input
                  required
                  value={checkout.province}
                  onChange={(event) =>
                    setCheckout({ ...checkout, province: event.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Postal code
              <input
                required
                value={checkout.postalCode}
                onChange={(event) =>
                  setCheckout({ ...checkout, postalCode: event.target.value })
                }
              />
            </label>
            <button disabled={busy || !cart || cart.items.length === 0} type="submit">
              Create order
            </button>
          </form>

          {checkoutResult ? (
            <div className="receipt">
              <strong>{checkoutResult.orderNumber}</strong>
              <span>
                Total {formatMoney(checkoutResult.totals.grandTotalAmount)}
              </span>
            </div>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
